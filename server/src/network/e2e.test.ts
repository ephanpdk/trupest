// Server sungguhan + client WebSocket sungguhan (1-4 pemain sampai match selesai) + uji keamanan dasar.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { buildServer } from '../app';
import { LIMITS } from '../config';
import { parseClientMessage } from './protocol';
import { AutoPlayer, withTimeout } from '../tests/driver';

process.env.NODE_ENV = 'test';

let app: ReturnType<typeof buildServer>;
let url: string;

const NORMAL = { ...LIMITS };

beforeAll(async () => {
    LIMITS.msgsPerSec = 100_000; // pemain otomatis mengirim jauh lebih cepat dari manusia
    app = buildServer({ botDelayMs: 0, revealDelayMs: 0, trickResolveMs: 0, turnLimitMs: 60_000, nextRoundMs: 60_000 });
    await app.listen({ port: 0, host: '127.0.0.1' });
    url = `ws://127.0.0.1:${(app.server.address() as any).port}/game`;
});
afterAll(() => app.close());

function connect(roomId: string, name: string, token?: string) {
    const ws = new WebSocket(url);
    const player = new AutoPlayer(name, roomId, (type, payload) => ws.send(JSON.stringify({ type, payload })));
    const raw: any[] = [];
    ws.on('message', d => {
        const m = JSON.parse(d.toString());
        raw.push(m);
        player.handle(m);
    });
    const opened = new Promise<void>(res =>
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'JOIN_GAME', payload: { matchId: roomId, playerId: name, token } }));
            res();
        })
    );
    return { ws, player, raw, opened };
}

describe.each([1, 2, 3, 4])('WebSocket e2e: %i pemain', n => {
    it('bermain sampai match selesai', async () => {
        const room = `E2E-${n}`;
        const clients = Array.from({ length: n }, (_, i) => connect(room, `P${i + 1}`));
        await Promise.all(clients.map(c => c.opened));
        await new Promise(r => setTimeout(r, 100));

        clients[0].ws.send(JSON.stringify({ type: 'START_GAME', payload: { matchId: room } })); // host = pemain pertama

        const finals = await withTimeout(Promise.all(clients.map(c => c.player.done)), 20_000, `e2e ${n}`);
        finals.forEach(f => {
            expect(f.matchOver).toBe(true);
            expect(f.teamScores.some(w => w === 2)).toBe(true);
            expect(f.players).toHaveLength(4);
            expect(f.serverSeed).toBeTruthy();
        });
        expect(clients[0].raw.some(m => m.type === 'TRICK_RESOLVE')).toBe(true); // event freeze terkirim
        clients.forEach(c => c.ws.close());
    });
});

describe('WebSocket: keamanan dasar', () => {
    const open = (c: ReturnType<typeof connect>) => c.opened.then(() => new Promise(r => setTimeout(r, 80)));

    it('aksi sebelum JOIN ditolak; pesan rusak tidak menjatuhkan server', async () => {
        const c = connect('SEC-1', 'X');
        await c.opened;
        c.ws.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { matchId: 'SEC-1', action: 'PASS' } }));
        c.ws.send('bukan json');
        c.ws.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { matchId: 'SEC-1', action: 'HACK' } }));
        await new Promise(r => setTimeout(r, 100));
        expect(c.player.errors.length).toBeGreaterThanOrEqual(2);
        c.ws.close();
    });

    it('nama yang sudah dipakai butuh token', async () => {
        const a = connect('SEC-2', 'Alice');
        await open(a);
        const b = connect('SEC-2', 'Alice'); // mencoba memakai nama Alice tanpa token
        await open(b);
        expect(b.player.errors.join()).toContain('NAME_TAKEN');
        [a, b].forEach(c => c.ws.close());
    });

    it('playerId di payload aksi dibuang; identitas hanya dari koneksi', () => {
        const r = parseClientMessage(JSON.stringify({
            type: 'PLAYER_ACTION',
            payload: { matchId: 'R', action: 'PASS', data: { playerId: 'Alice' } },
        }));
        expect(r.ok && r.msg.type === 'PLAYER_ACTION' && 'playerId' in r.msg.payload.data).toBe(false);
    });

    it('reconnect dengan token mengambil alih sesi lama', async () => {
        const first = connect('SEC-3', 'Rina');
        await open(first);
        const closed = new Promise<number>(res => first.ws.on('close', code => res(code)));

        const again = connect('SEC-3', 'Rina', first.player.token);
        await open(again);
        expect(await withTimeout(closed, 2000, 'kick sesi lama')).toBe(4000);
        expect(again.player.snapshots.length).toBeGreaterThan(0);
        again.ws.close();
    });
});

describe('Batas penyalahgunaan', () => {
    it('membanjiri pesan memutus koneksi (1008)', async () => {
        LIMITS.msgsPerSec = NORMAL.msgsPerSec;
        const ws = new WebSocket(url);
        const closed = new Promise<number>(res => ws.on('close', code => res(code)));
        await new Promise(r => ws.on('open', r));
        for (let i = 0; i < 100; i++) ws.send('{}');
        expect(await withTimeout(closed, 3000, 'flood')).toBe(1008);
        LIMITS.msgsPerSec = 100_000;
    });

    it('koneksi ke-21 dari satu IP ditolak (1013)', async () => {
        const open = Array.from({ length: 20 }, () => new WebSocket(url));
        await Promise.all(open.map(w => new Promise(r => w.on('open', r))));
        const extra = new WebSocket(url);
        const code = await withTimeout(new Promise<number>(res => extra.on('close', c => res(c))), 3000, 'cap');
        expect(code).toBe(1013);
        open.forEach(w => w.close());
    });
});
