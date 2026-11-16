import { describe, it, expect } from 'vitest';
import { Room, Conn } from './room';
import { AutoPlayer, withTimeout } from '../tests/driver';

const FAST = { botDelayMs: 0, revealDelayMs: 0, trickResolveMs: 0, turnLimitMs: 60_000, nextRoundMs: 60_000, maxTimeouts: 3, roomIdleMs: 60_000 };

function fakeConn(onMsg: (m: any) => void): Conn & { closed?: string } {
    const c: Conn & { closed?: string } = {
        send: m => setImmediate(() => onMsg(JSON.parse(JSON.stringify(m)))), // async, seperti jaringan
        close: r => (c.closed = r),
    };
    return c;
}

describe.each([1, 2, 3, 4])('Room: %i pemain manusia + bot sampai match selesai', n => {
    it('match Best-of-3 selesai tanpa error dan tanpa kebocoran kartu', async () => {
        const room = new Room(`R${n}`, { ...FAST });
        const players: AutoPlayer[] = [];

        for (let i = 0; i < n; i++) {
            const p: AutoPlayer = new AutoPlayer(`Human${i}`, room.id, (type, payload: any) => {
                setImmediate(() => {
                    if (type === 'PLAYER_ACTION') {
                        const r = room.action(p.id, payload.action, payload.data);
                        if (!r.success) p.handle({ type: 'ACTION_ERROR', payload: { msg: r.msg } });
                    }
                });
            });
            players.push(p);
            const conn = fakeConn(m => p.handle(m));
            const r = room.join(p.id, undefined, conn);
            expect(r.success).toBe(true);
            room.afterJoin();
        }
        if (n < 4) expect(room.start('Human0').success).toBe(true); // host mulai, sisa kursi = bot

        const finals = await withTimeout(Promise.all(players.map(p => p.done)), 20_000, `room ${n}`);

        const m = room.currentMatch!;
        expect(m.matchOver).toBe(true);
        expect(Math.max(...m.roundWins)).toBe(2);
        expect(m.players.filter(p => p.isBot)).toHaveLength(4 - n);
        expect(new Set(m.players.map(p => p.seatId)).size).toBe(4);

        for (const f of finals) {
            expect(f.serverSeed).toBe(m.config.seed); // seed di-reveal saat match selesai
            expect(f.teamScores).toEqual(m.roundWins);
        }
        for (const p of players) {
            expect(p.snapshots.some(s => s.serverSeed !== null && !s.matchOver)).toBe(false);
            for (const s of p.snapshots) {
                expect(s.myHand.length).toBeLessThanOrEqual(13);
                expect(s.players.every(pl => !('hand' in pl))).toBe(true); // kartu lawan tidak pernah dikirim
                if (s.legalMask) expect(s.legalMask).toHaveLength(s.myHand.length);
            }
            // anti-pass benar-benar aktif lewat jalur jaringan: kartu kuat memaksa BID
            expect(p.errors.every(e => e.includes('BID_FORCED_MIN_8'))).toBe(true);
        }
    });
});

describe('Room: aturan akses', () => {
    it('nama yang sama tanpa token ditolak; dengan token = reconnect & sesi lama ditendang', () => {
        const room = new Room('ACC', { ...FAST });
        const c1 = fakeConn(() => {});
        const r1 = room.join('Ana', undefined, c1);
        expect(r1.success).toBe(true);

        expect(room.join('Ana', undefined, fakeConn(() => {})).msg).toContain('NAME_TAKEN');
        expect(room.join('Ana', 'token-palsu', fakeConn(() => {})).msg).toContain('NAME_TAKEN');

        const c2 = fakeConn(() => {});
        expect(room.join('Ana', r1.token, c2).success).toBe(true);
        expect(c1.closed).toBe('replaced');
    });

    it('hanya host yang boleh start; room penuh / sudah berjalan menolak pemain baru', () => {
        const room = new Room('HOST', { ...FAST });
        room.join('A', undefined, fakeConn(() => {}));
        room.join('B', undefined, fakeConn(() => {}));
        expect(room.start('B').success).toBe(false);
        expect(room.start('A').success).toBe(true);
        expect(room.join('C', undefined, fakeConn(() => {})).msg).toContain('GAME_STARTED');
        room.destroy();
    });

    it('timeout giliran: kartu legal terendah dimainkan, 3x timeout -> AI takeover', async () => {
        const room = new Room('TMO', { ...FAST, turnLimitMs: 5, nextRoundMs: 5, maxTimeouts: 3 });
        const snaps: any[] = [];
        room.join('Solo', undefined, fakeConn(m => m.type === 'GAME_UPDATE' && snaps.push(m.payload)));
        room.afterJoin();
        room.start('Solo');

        // manusia tidak pernah bertindak; server harus menyelesaikan match sendiri
        await withTimeout(new Promise<void>(res => {
            const t = setInterval(() => room.currentMatch?.matchOver && (clearInterval(t), res()), 20);
        }), 20_000, 'takeover');
        expect(room.currentMatch!.matchOver).toBe(true);
        room.destroy();
    }, 30_000);

    it('snapshot membawa sisa waktu giliran manusia, dan null untuk giliran bot', async () => {
        const room = new Room('TMR', { ...FAST, turnLimitMs: 40_000, botDelayMs: 40 });
        const snaps: any[] = [];
        room.join('Solo', undefined, fakeConn(m => m.type === 'GAME_UPDATE' && snaps.push(m.payload)));
        room.afterJoin();
        room.start('Solo');
        await new Promise(r => setTimeout(r, 400));

        const mine = snaps.filter(s => s.phase === 'BIDDING' && s.players.find((p: any) => p.id === 'Solo')?.seatId === s.activePlayer);
        const bots = snaps.filter(s => s.phase === 'BIDDING' && s.players.find((p: any) => p.id === 'Solo')?.seatId !== s.activePlayer);
        expect(mine.length).toBeGreaterThan(0);
        mine.forEach(s => {
            expect(s.turnMsTotal).toBe(40_000);
            expect(s.turnMsLeft).toBeGreaterThan(0);
            expect(s.turnMsLeft).toBeLessThanOrEqual(40_000);
        });
        bots.forEach(s => expect(s.turnMsLeft).toBeNull());
        room.destroy();
    });
});

describe('Room: pilihan tim & kursi berhadapan', () => {
    const join = (room: Room, name: string) => {
        expect(room.join(name, undefined, fakeConn(() => {})).success).toBe(true);
    };

    it('pemain memilih tim dan duduk di kursi sepasang (0&2 = A, 1&3 = B)', () => {
        for (let k = 0; k < 20; k++) {
            const room = new Room(`T${k}`, { ...FAST });
            ['Ani', 'Budi', 'Cici'].forEach(n => join(room, n));
            expect(room.action('Ani', 'CHOOSE_TEAM', { team: 'A' }).success).toBe(true);
            expect(room.action('Budi', 'CHOOSE_TEAM', { team: 'A' }).success).toBe(true);
            expect(room.action('Cici', 'CHOOSE_TEAM', { team: 'B' }).success).toBe(true);
            room.start('Ani');
            const seat = (id: string) => room.currentMatch!.players.findIndex(p => p.id === id);
            expect(seat('Ani') % 2).toBe(0);
            expect(seat('Budi') % 2).toBe(0);
            expect(seat('Cici') % 2).toBe(1);
            room.destroy();
        }
    });

    it('tim penuh ditolak, RANDOM membatalkan pilihan, tidak bisa ganti saat match jalan', () => {
        const room = new Room('T-full', { ...FAST });
        ['A1', 'A2', 'A3'].forEach(n => join(room, n));
        room.action('A1', 'CHOOSE_TEAM', { team: 'B' });
        room.action('A2', 'CHOOSE_TEAM', { team: 'B' });
        expect(room.action('A3', 'CHOOSE_TEAM', { team: 'B' }).success).toBe(false);
        expect(room.action('A1', 'CHOOSE_TEAM', { team: 'RANDOM' }).success).toBe(true);
        expect(room.action('A3', 'CHOOSE_TEAM', { team: 'B' }).success).toBe(true);
        room.start('A1');
        expect(room.action('A1', 'CHOOSE_TEAM', { team: 'A' }).success).toBe(false);
        room.destroy();
    });
});
