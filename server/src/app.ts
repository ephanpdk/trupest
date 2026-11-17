// Fastify + WebSocket. Identitas pemain diikat ke koneksi saat JOIN_GAME dan tidak bisa diganti
// lewat payload pesan berikutnya (mencegah penyamaran pemain lain).
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { LIMITS, REQUIRE_LOGIN, TIME } from './config';
import { Db, deleteCheckpoint, loadCheckpoints, saveCheckpoint, saveMatch } from './db';
import { NICK_RE, getUser, isNewAccount, login, nicknameTaken, register, signJwt, verifyJwt } from './auth';
import { RoomRegistry } from './game/manager';
import { Account, Conn, Room, RoomOptions } from './game/room';
import { parseClientMessage } from './network/protocol';

export function buildServer(roomOverrides: Partial<RoomOptions> = {}, db: Db | null = null) {
    // TRUST_PROXY=1 di belakang proxy (Render, Fly, nginx) supaya req.ip = alamat pemain, bukan alamat proxy.
    const app = Fastify({ logger: process.env.NODE_ENV !== 'test', trustProxy: process.env.TRUST_PROXY === '1' });
    const logErr = (what: string) => (e: Error) => console.error(`[DB] ${what} gagal:`, e.message);
    const rooms = new RoomRegistry({
        ...roomOverrides,
        ...(db && {
            onCheckpoint: (r, u) => void saveCheckpoint(db, r, u).catch(logErr('checkpoint')),
            onMatchEnd: (r, u) => void saveMatch(db, r, u).catch(logErr('simpan match')),
            onDiscard: id => void deleteCheckpoint(db, id).catch(logErr('hapus checkpoint')),
        }),
    });
    const connsPerIp = new Map<string, number>();

    app.register(websocket, { options: { maxPayload: 4096 } });

    // Satu proses untuk deploy: kalau client sudah di-build (client/dist), server ikut menyajikannya.
    const dist = path.resolve(__dirname, '../../client/dist');
    if (fs.existsSync(dist)) app.register(fastifyStatic, { root: dist });

    // Pulihkan match yang sedang berjalan sebelum restart (replay dari checkpoint).
    if (db) app.addHook('onReady', async () => {
        const n = rooms.restore(await loadCheckpoints(db));
        if (n) app.log.info(`${n} match dipulihkan dari database`);
    });

    // ---------- akun (hanya jika ada database) ----------
    const credentials = z.object({
        nickname: z.string().regex(NICK_RE, 'Nickname 1-20 karakter (huruf/angka/spasi/_.-)'),
        password: z.string().min(8, 'Password minimal 8 karakter').max(72, 'Password maksimal 72 karakter'),
    });
    const authTries = new Map<string, { n: number; reset: number }>();
    const tooMany = (ip: string) => {
        const now = Date.now();
        const t = authTries.get(ip);
        if (!t || t.reset < now) return authTries.set(ip, { n: 1, reset: now + 60_000 }) && false;
        return ++t.n > LIMITS.authPerMin;
    };
    const authTimer = setInterval(() => authTries.forEach((t, ip) => t.reset < Date.now() && authTries.delete(ip)), 60_000);
    authTimer.unref();

    if (db) {
        for (const route of ['register', 'login'] as const) {
            app.post(`/auth/${route}`, async (req, reply) => {
                if (tooMany(req.ip)) return reply.code(429).send({ error: 'Terlalu banyak percobaan, coba lagi sebentar' });
                const body = credentials.safeParse(req.body);
                if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message });
                const { nickname, password } = body.data;
                const user = route === 'register' ? await register(db, nickname, password) : await login(db, nickname, password);
                if (user === 'NAME_TAKEN') return reply.code(409).send({ error: 'Nickname sudah dipakai' });
                if (!user) return reply.code(401).send({ error: 'Nickname atau password salah' });
                return { accessToken: signJwt(user.id), nickname: user.nickname };
            });
        }
    }

    app.register(async f => {
        f.get('/health', async () => ({ status: 'ok', uptime: process.uptime(), rooms: rooms.size, accounts: !!db, requireLogin: !!db && REQUIRE_LOGIN }));

        f.get('/game', { websocket: true }, (connection, req) => {
            const ws = connection.socket;
            const ip = req.ip;
            if ((connsPerIp.get(ip) ?? 0) >= LIMITS.connPerIp) return void ws.close(1013, 'Terlalu banyak koneksi');
            connsPerIp.set(ip, (connsPerIp.get(ip) ?? 0) + 1);
            let joined: { room: Room; playerId: string } | null = null;
            let joining = false; // JOIN_GAME memakai await (DB): cegah dua JOIN berjalan bersamaan

            const conn: Conn = {
                send: msg => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg)),
                close: reason => ws.close(4000, reason),
            };
            const error = (msg: string) => conn.send({ type: 'ACTION_ERROR', payload: { msg } });

            // Heartbeat (SRS 6.4.2): tanpa pong berturut-turut -> putus.
            let missed = 0;
            ws.on('pong', () => (missed = 0));
            const heartbeat = setInterval(() => {
                if (++missed > TIME.heartbeatMissedLimit) return ws.terminate();
                ws.ping();
            }, TIME.heartbeatMs);

            let winSec = 0, winCount = 0;
            ws.on('message', async raw => {
                const sec = Math.floor(Date.now() / 1000);
                if (sec !== winSec) { winSec = sec; winCount = 0; }
                if (++winCount > LIMITS.msgsPerSec) return ws.close(1008, 'Terlalu banyak pesan');
                const parsed = parseClientMessage(raw.toString());
                if (!parsed.ok) return error(parsed.error);
                const { type, payload } = parsed.msg;

                if (type === 'JOIN_GAME') {
                    if (joined || joining) return error('Sudah join ke sebuah room');
                    joining = true;
                    try {
                        // Identitas: akun (JWT) atau tamu. Nama akun tidak bisa dipakai tamu.
                        let name = payload.playerId;
                        let account: Account | undefined;
                        if (payload.accessToken) {
                            const claims = db && verifyJwt(payload.accessToken);
                            const user = claims && (await getUser(db, claims.sub));
                            if (!user) return error('Sesi login tidak valid, silakan masuk lagi');
                            name = user.nickname;
                            account = { userId: user.id, newAccount: isNewAccount(user) };
                        } else if (db) {
                            if (REQUIRE_LOGIN) return error('Silakan masuk atau daftar dulu');
                            if (await nicknameTaken(db, name.trim())) return error('NAME_TAKEN: nama itu milik akun terdaftar, silakan masuk');
                        }
                        const room = rooms.getOrCreate(payload.matchId);
                        if (!room) return error('Server penuh, coba lagi nanti');

                        const r = room.join(name, payload.token, conn, account);
                        if (!r.success) return error(r.msg ?? 'Gagal join');
                        joined = { room, playerId: r.playerId as string };
                        conn.send({ type: 'JOINED', payload: { roomId: room.id, playerId: r.playerId, token: r.token } });
                        return room.afterJoin();
                    } catch (e) {
                        app.log.error(e);
                        return error('Gagal join, coba lagi');
                    } finally {
                        joining = false;
                    }
                }

                if (!joined) return error('Join dulu sebelum mengirim aksi');
                if (payload.matchId !== joined.room.id) return error('Room tidak cocok');

                const r = type === 'START_GAME'
                    ? joined.room.start(joined.playerId)
                    : joined.room.action(joined.playerId, payload.action, payload.data);
                if (!r.success) error(r.msg ?? 'Aksi ditolak');
            });

            ws.on('close', () => {
                clearInterval(heartbeat);
                const n = (connsPerIp.get(ip) ?? 1) - 1;
                if (n > 0) connsPerIp.set(ip, n); else connsPerIp.delete(ip);
                if (joined) joined.room.leave(joined.playerId, conn);
            });
        });
    });

    app.addHook('onClose', async () => {
        clearInterval(authTimer);
        rooms.closeAll();
    });
    return app;
}
