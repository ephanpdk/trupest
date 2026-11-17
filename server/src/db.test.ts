// Tes ke Postgres sungguhan. Dilewati jika DATABASE_URL_TEST tidak diisi (CI mengisinya lewat service container).
//   DATABASE_URL_TEST=postgres://postgres@127.0.0.1:5433/trupest_test npm test
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import WebSocket from 'ws';
import { buildServer } from './app';
import { LIMITS } from './config';
import { Db, loadCheckpoints, migrate, openDb } from './db';
import { MatchState } from './game/engine/state';
import { verifyRecord } from './game/matchLog';
import { RoomRegistry } from './game/manager';
import { AutoPlayer, withTimeout } from './tests/driver';

process.env.NODE_ENV = 'test';
const URL = process.env.DATABASE_URL_TEST;
const FAST = { botDelayMs: 0, revealDelayMs: 0, trickResolveMs: 0, turnLimitMs: 60_000, nextRoundMs: 60_000 };

describe.skipIf(!URL)('Postgres: akun, log match, pemulihan', () => {
    let db: Db;
    let app: ReturnType<typeof buildServer>;
    let wsUrl: string;
    const post = (path: string, payload: object) => app.inject({ method: 'POST', url: path, payload });

    beforeAll(async () => {
        LIMITS.msgsPerSec = 100_000;
        LIMITS.authPerMin = 100_000;
        db = openDb(URL)!;
        await migrate(db);
        await migrate(db); // aman diulang
    });
    beforeEach(async () => {
        await db.query('TRUNCATE users, match_log, active_match');
        app = buildServer(FAST, db);
        await app.listen({ port: 0, host: '127.0.0.1' });
        wsUrl = `ws://127.0.0.1:${(app.server.address() as any).port}/game`;
    });
    afterAll(async () => {
        await db.end();
    });

    // Sambung dan join; `asId` = nama yang diharapkan di snapshot (nama akun, bukan payload).
    const join = (room: string, name: string, accessToken?: string, asId = name) =>
        new Promise<any>((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            const player = new AutoPlayer(asId, room, (type, payload) => ws.send(JSON.stringify({ type, payload })));
            let first = true;
            ws.on('open', () => ws.send(JSON.stringify({ type: 'JOIN_GAME', payload: { matchId: room, playerId: name, accessToken } })));
            ws.on('message', raw => {
                const m = JSON.parse(raw.toString());
                player.handle(m);
                if (first && (m.type === 'JOINED' || m.type === 'ACTION_ERROR')) {
                    first = false;
                    resolve({ ws, player, ...m });
                }
            });
            ws.on('error', reject);
        });

    it('daftar, nickname kembar (huruf besar/kecil) ditolak, masuk dengan password benar/salah', async () => {
        expect((await post('/auth/register', { nickname: 'Budi', password: 'password-1' })).statusCode).toBe(200);
        expect((await post('/auth/register', { nickname: 'BUDI', password: 'password-2' })).statusCode).toBe(409);
        expect((await post('/auth/register', { nickname: 'Sari', password: 'pendek' })).statusCode).toBe(400);
        expect((await post('/auth/login', { nickname: 'budi', password: 'password-1' })).json().nickname).toBe('Budi');
        expect((await post('/auth/login', { nickname: 'Budi', password: 'salah-salah' })).statusCode).toBe(401);
        expect((await post('/auth/login', { nickname: 'tidak-ada', password: 'password-1' })).statusCode).toBe(401);
        const { password_hash } = (await db.query('SELECT password_hash FROM users')).rows[0];
        expect(password_hash).toMatch(/^scrypt\$/);
        expect(password_hash).not.toContain('password-1');
    });

    it('WebSocket: JWT memaksa nickname akun; tamu tidak bisa memakai nama akun; JWT palsu ditolak', async () => {
        const { accessToken } = (await post('/auth/register', { nickname: 'Budi', password: 'password-1' })).json();

        const a = await join('R1', 'nama-bebas', accessToken);
        expect(a.type).toBe('JOINED');
        expect(a.payload.playerId).toBe('Budi'); // nama dari akun, bukan dari payload

        const guest = await join('R2', 'budi');
        expect(guest.type).toBe('ACTION_ERROR');
        expect(guest.payload.msg).toMatch(/NAME_TAKEN/);

        const fake = await join('R3', 'Budi', accessToken.slice(0, -2) + 'xx');
        expect(fake.type).toBe('ACTION_ERROR');

        const ok = await join('R4', 'Tamu Baru');
        expect(ok.type).toBe('JOINED');
        [a, guest, fake, ok].forEach(x => x.ws.close());
    });

    it('match selesai: log tersimpan, replay dari DB identik, total_matches akun naik, checkpoint terhapus', async () => {
        const { accessToken } = (await post('/auth/register', { nickname: 'Budi', password: 'password-1' })).json();
        const a = await join('R5', 'x', accessToken, 'Budi');
        a.ws.send(JSON.stringify({ type: 'START_GAME', payload: { matchId: 'R5' } }));
        await withTimeout(a.player.done, 30_000, 'match selesai');
        await new Promise(r => setTimeout(r, 300)); // tulis DB berjalan async

        const log = (await db.query('SELECT * FROM match_log')).rows;
        expect(log).toHaveLength(1);
        const m = verifyRecord({ matchId: log[0].match_id, seed: log[0].seed, players: log[0].players, result: log[0].result, events: log[0].events });
        expect(m.matchOver).toBe(true);
        expect((await db.query('SELECT total_matches FROM users')).rows[0].total_matches).toBe(1);
        expect(await loadCheckpoints(db)).toHaveLength(0);
        a.ws.close();
    });

    it('server restart: match berjalan dipulihkan dari checkpoint dan state sama persis', async () => {
        const { accessToken } = (await post('/auth/register', { nickname: 'Budi', password: 'password-1' })).json();
        const a = await join('R6', 'x', accessToken, 'Budi');
        a.ws.send(JSON.stringify({ type: 'START_GAME', payload: { matchId: 'R6' } }));

        // tunggu sampai ada checkpoint (minimal 1 trick selesai)
        let rows = await loadCheckpoints(db);
        for (let i = 0; i < 400 && !rows.length; i++) {
            await new Promise(r => setTimeout(r, 25));
            rows = await loadCheckpoints(db);
        }
        expect(rows).toHaveLength(1);
        a.ws.close();
        await app.close();

        const saved = (await loadCheckpoints(db))[0]; // keadaan terakhir setelah server berhenti
        const registry = new RoomRegistry({ ...FAST, turnLimitMs: 600_000 });
        expect(registry.restore([saved])).toBe(1);
        const restored = registry.getOrCreate('R6')!.currentMatch as MatchState;
        expect(restored.events).toHaveLength(saved.events.length);
        expect(restored.players.map(p => p.id)).toEqual(saved.players.map(p => p.id));
        expect(saved.userIds.filter(Boolean)).toHaveLength(1); // userId akun ikut tersimpan
        registry.closeAll();
    });
});
