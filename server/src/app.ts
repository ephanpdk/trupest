// Fastify + WebSocket. Identitas pemain diikat ke koneksi saat JOIN_GAME dan tidak bisa diganti
// lewat payload pesan berikutnya (mencegah penyamaran pemain lain).
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fs from 'fs';
import path from 'path';
import { LIMITS, TIME } from './config';
import { RoomRegistry } from './game/manager';
import { Conn, Room, RoomOptions } from './game/room';
import { parseClientMessage } from './network/protocol';

export function buildServer(roomOverrides: Partial<RoomOptions> = {}) {
    // TRUST_PROXY=1 di belakang proxy (Render, Fly, nginx) supaya req.ip = alamat pemain, bukan alamat proxy.
    const app = Fastify({ logger: process.env.NODE_ENV !== 'test', trustProxy: process.env.TRUST_PROXY === '1' });
    const rooms = new RoomRegistry(roomOverrides);
    const connsPerIp = new Map<string, number>();

    app.register(websocket, { options: { maxPayload: 4096 } });

    // Satu proses untuk deploy: kalau client sudah di-build (client/dist), server ikut menyajikannya.
    const dist = path.resolve(__dirname, '../../client/dist');
    if (fs.existsSync(dist)) app.register(fastifyStatic, { root: dist });

    app.register(async f => {
        f.get('/health', async () => ({ status: 'ok', uptime: process.uptime(), rooms: rooms.size }));

        f.get('/game', { websocket: true }, (connection, req) => {
            const ws = connection.socket;
            const ip = req.ip;
            if ((connsPerIp.get(ip) ?? 0) >= LIMITS.connPerIp) return void ws.close(1013, 'Terlalu banyak koneksi');
            connsPerIp.set(ip, (connsPerIp.get(ip) ?? 0) + 1);
            let joined: { room: Room; playerId: string } | null = null;

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
            ws.on('message', raw => {
                const sec = Math.floor(Date.now() / 1000);
                if (sec !== winSec) { winSec = sec; winCount = 0; }
                if (++winCount > LIMITS.msgsPerSec) return ws.close(1008, 'Terlalu banyak pesan');
                const parsed = parseClientMessage(raw.toString());
                if (!parsed.ok) return error(parsed.error);
                const { type, payload } = parsed.msg;

                if (type === 'JOIN_GAME') {
                    if (joined) return error('Sudah join ke sebuah room');
                    const room = rooms.getOrCreate(payload.matchId);
                    if (!room) return error('Server penuh, coba lagi nanti');

                    const r = room.join(payload.playerId, payload.token, conn);
                    if (!r.success) return error(r.msg ?? 'Gagal join');

                    joined = { room, playerId: r.playerId as string };
                    conn.send({ type: 'JOINED', payload: { roomId: room.id, playerId: r.playerId, token: r.token } });
                    return room.afterJoin();
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

    app.addHook('onClose', async () => rooms.closeAll());
    return app;
}
