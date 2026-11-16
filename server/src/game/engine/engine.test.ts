import { describe, it, expect, beforeEach } from 'vitest';
import { MatchState } from './state';
import { isEligibleBid8 } from './bidding';
import { getLegalMask } from './trick';
import { seedHash } from './deck';
import { Card, Suit } from '../../../../shared/types';

const hand = (codes: string[]): Card[] =>
    codes.map(c => ({ rank: c.slice(0, -1) as Card['rank'], suit: c.slice(-1) as Suit }));

const STRONG = hand(['AS', 'KS', 'QS', 'JS', '10S', 'AH', 'KH', 'AD', 'KD', 'AC', '2C', '3C', '4C']);
const WEAK = hand(['2S', '3S', '4S', '5S', '2H', '3H', '4H', '5H', '2D', '3D', '4D', '5D', '6C']);

const newMatch = (seed = 'TEST', init: any[] = ['P1', 'P2', 'P3', 'P4'], cfg: any = {}) => {
    const m = new MatchState({ matchId: 'M1', seed, ...cfg }, init);
    m.startRound();
    return m;
};

describe('Bidding & anti-pass (SRS 4.3)', () => {
    it('mendeteksi tangan layak Bid 8', () => {
        expect(isEligibleBid8(STRONG)).toBe(true);
        expect(isEligibleBid8(WEAK)).toBe(false);
    });

    it('menolak PASS untuk tangan kuat (akun lama)', () => {
        const m = newMatch();
        m.players[m.activePlayerIndex].hand = STRONG;
        const r = m.playerPass(m.activePlayerIndex);
        expect(r.success).toBe(false);
        expect(r.msg).toContain('BID_FORCED_MIN_8');
    });

    it('newAccount: 1 override PASS per match, lalu ditolak', () => {
        const m = newMatch('TEST', [1, 2, 3, 4].map(i => ({ id: `P${i}`, newAccount: true })));
        const first = m.activePlayerIndex;
        m.players[first].hand = STRONG;
        expect(m.playerPass(first).success).toBe(true);
        expect(m.players[first].passOverridesLeft).toBe(0);

        // kuota habis: ronde berikutnya tangan kuat yang sama ditolak (kuota reset per match, bukan per ronde)
        m.phase = 'BIDDING';
        m.currentBid = 0;
        m.biddingTurnCount = 0;
        m.activePlayerIndex = first;
        expect(m.playerPass(first).msg).toContain('BID_FORCED_MIN_8');
    });

    it('override tidak terpakai jika tangan lemah', () => {
        const m = newMatch('TEST', [1, 2, 3, 4].map(i => ({ id: `P${i}`, newAccount: true })));
        const a = m.activePlayerIndex;
        m.players[a].hand = WEAK;
        m.playerPass(a);
        expect(m.players[a].passOverridesLeft).toBe(1);
    });

    it('custom room: override OFF secara default, ON jika creator mengaktifkan', () => {
        const init = [1, 2, 3, 4].map(i => ({ id: `P${i}`, newAccount: true }));
    });

    it('bot tidak pernah mendapat override', () => {
        const m = newMatch('T', [1, 2, 3, 4].map(i => ({ id: `B${i}`, isBot: true, newAccount: true })));
        expect(m.players.every(p => p.passOverridesLeft === 0)).toBe(true);
    });

    it('menolak bid tidak valid', () => {
        const m = newMatch();
        const a = m.activePlayerIndex;
        expect(m.playerBid(a, 7).success).toBe(false);
        expect(m.playerBid(a, 14).success).toBe(false);
        expect(m.playerBid(a, 8.5).success).toBe(false);
        expect(m.playerBid((a + 1) % 4, 8).success).toBe(false); // bukan giliran
    });

    it('PASS ALL -> kontrak 7/7, declarer = pemain pertama', () => {
        const m = newMatch();
        const first = m.activePlayerIndex;
        m.players.forEach(p => (p.hand = WEAK));
        for (let i = 0; i < 4; i++) expect(m.playerPass(m.activePlayerIndex).success).toBe(true);
        expect(m.phase).toBe('TRUMP_SELECTION');
        expect(m.currentBid).toBe(7);
        expect(m.bidWinner).toBe(first);
    });
});

describe('Data untuk UI meja: bids & canPass', () => {
    it('bids mencatat bid dan PASS per kursi, kosong untuk yang belum jalan', () => {
        const m = newMatch();
        const [a, b] = [m.activePlayerIndex, (m.activePlayerIndex + 1) % 4];
        m.players[a].hand = WEAK;
        m.players[b].hand = WEAK;
        expect(m.getPublicState(0).bids).toEqual([null, null, null, null]);
        m.playerBid(a, 9);
        m.playerPass(b);
        const bids = m.getPublicState(0).bids;
        expect(bids[a]).toBe(9);
        expect(bids[b]).toBe('PASS');
        expect(bids.filter(x => x === null)).toHaveLength(2);
    });

    it('canPass: hanya untuk pemain yang sedang giliran, dan false jika tangan kuat tanpa override', () => {
        const m = newMatch();
        const a = m.activePlayerIndex;
        m.players[a].hand = STRONG;
        expect(m.getPublicState(a).canPass).toBe(false);          // tangan layak Bid 8
        expect(m.getPublicState((a + 1) % 4).canPass).toBe(false); // bukan gilirannya
        m.players[a].hand = WEAK;
        expect(m.getPublicState(a).canPass).toBe(true);
    });

    it('canPass true untuk newAccount yang masih punya override, dan sesudah ada bid >= 8', () => {
        const m = newMatch('T', [1, 2, 3, 4].map(i => ({ id: `P${i}`, newAccount: true })));
        const a = m.activePlayerIndex;
        m.players[a].hand = STRONG;
        expect(m.getPublicState(a).canPass).toBe(true);
        m.players[a].passOverridesLeft = 0;
        expect(m.getPublicState(a).canPass).toBe(false);
        m.currentBid = 8; // sudah ada yang bid: PASS selalu boleh
        expect(m.getPublicState(a).canPass).toBe(true);
    });

    it('bids di-reset di ronde baru', () => {
        const m = newMatch();
        m.playerBid(m.activePlayerIndex, 8);
        m.phase = 'FINISHED';
        m.startNextRound();
        expect(m.bids).toEqual([null, null, null, null]);
    });
});

describe('Seed & dealing (SRS 3.3, 4.1)', () => {
    it('seed sama -> dealer & kartu identik; seed beda -> beda', () => {
        const a = newMatch('seed-A');
        const b = newMatch('seed-A');
        const c = newMatch('seed-B');
        expect(a.dealerIndex).toBe(b.dealerIndex);
        expect(a.players.map(p => p.hand)).toEqual(b.players.map(p => p.hand));
        expect(a.players.map(p => p.hand)).not.toEqual(c.players.map(p => p.hand));
    });

    it('52 kartu unik, 13 per pemain, bidder pertama di kiri dealer', () => {
        const m = newMatch('seed-X');
        const all = m.players.flatMap(p => p.hand.map(c => c.rank + c.suit));
        expect(new Set(all).size).toBe(52);
        m.players.forEach(p => expect(p.hand.length).toBe(13));
        expect(m.activePlayerIndex).toBe((m.dealerIndex + 1) % 4);
    });

    it('seedHash di-commit sejak awal dan cocok dengan seed yang di-reveal', () => {
        const m = newMatch('seed-H');
        expect(m.getPublicState(0).serverSeed).toBeNull();
        expect(m.getPublicState(0).seedHash).toBe(seedHash('seed-H'));
    });

    it('dealer ronde berikutnya berotasi', () => {
        const m = newMatch('seed-R');
        const d = m.dealerIndex;
        m.phase = 'FINISHED';
        m.startNextRound();
        expect(m.dealerIndex).toBe((d + 1) % 4);
    });
});

describe('Scoring (SRS 4.7, 4.8)', () => {
    const score = (bid: number, declarerSeat: number, tricks: number[]) => {
        const m = newMatch();
        m.bidWinner = declarerSeat;
        m.currentBid = bid;
        m.trickScores = tricks;
        return m.calculateScore();
    };

    it('target lawan = 14 - bid', () => {
        [7, 8, 9, 10, 11, 12, 13].forEach(b => expect(score(b, 0, [b, 13 - b]).opponentTarget).toBe(14 - b));
    });

    it('declarer menang jika tricks >= bid', () => {
        const r = score(8, 0, [8, 5]);
        expect(r.isSuccess).toBe(true);
        expect(r.winnerTeam).toBe(0);
    });

    it('declarer gagal -> tim lawan menang ronde', () => {
        const r = score(9, 1, [6, 7]); // tim 1 bid 9 hanya dapat 7
        expect(r.isSuccess).toBe(false);
        expect(r.winnerTeam).toBe(0);
        expect(r.opponentTricks).toBeGreaterThanOrEqual(r.opponentTarget);
    });

    it('Best-of-3: match berakhir di 2 kemenangan dan seed di-reveal', () => {
        const m = newMatch('seed-BO3');
        for (let round = 0; round < 3 && !m.matchOver; round++) {
            m.bidWinner = 0;
            m.currentBid = 8;
            m.trickScores = [9, 4];
            m.players.forEach(p => (p.hand = [])); // ronde dianggap habis
            m.resolving = { cards: [], starter: 0, winner: 0, winningCard: { suit: 'S', rank: 'A' } };
            m.finishTrick();
            if (!m.matchOver) m.startNextRound();
        }
        expect(m.matchOver).toBe(true);
        expect(m.matchWinner).toBe(0);
        expect(m.roundWins).toEqual([2, 0]);
        expect(m.startNextRound().success).toBe(false);
        expect(m.getPublicState(0).serverSeed).toBe('seed-BO3');
    });
});

describe('Trick engine (SRS 4.5, 4.6)', () => {
    let m: MatchState;

    const toTrick = () => {
        m = newMatch('seed-T');
        const first = m.activePlayerIndex;
        m.players.forEach(p => (p.hand = WEAK));
        m.playerBid(first, 8);
        for (let i = 0; i < 3; i++) m.playerPass(m.activePlayerIndex);
        m.playerSelectTrump(first, 'S');
        return first;
    };

    it('legalMask: wajib follow suit & dikirim hanya ke pemain yang sedang giliran', () => {
        const first = toTrick();
        m.players[first].hand = hand(['AH']);
        m.players[(first + 1) % 4].hand = hand(['2H', '3S']);
        m.playCard(first, 0);
        const next = (first + 1) % 4;

        expect(m.getPublicState(next).legalMask).toEqual([true, false]);
        expect(m.getPublicState(first).legalMask).toBeNull();
        expect(getLegalMask(m.players[next].hand, 'H')).toEqual([true, false]);
        expect(m.playCard(next, 1).msg).toContain('ERROR_ILLEGAL_PLAY');
    });

    it('kartu ke-4 membekukan meja dan menampilkan pemenang sampai finishTrick()', () => {
        const first = toTrick();
        const seats = [0, 1, 2, 3].map(i => (first + i) % 4);
        const cards = [['AH'], ['2H'], ['3H'], ['4S']]; // trump S memotong di akhir
        seats.forEach((s, i) => (m.players[s].hand = hand(cards[i].concat(['5D']))));

        seats.forEach(s => expect(m.playCard(s, 0).success).toBe(true));

        expect(m.resolving?.winner).toBe(seats[3]);
        expect(m.getPublicState(first).currentTrick).toHaveLength(4); // kartu ke-4 terlihat client
        expect(m.playCard(seats[3], 0).msg).toContain('di-resolve'); // input beku

        m.finishTrick();
        expect(m.resolving).toBeNull();
        expect(m.currentTrick).toEqual([]);
        expect(m.activePlayerIndex).toBe(seats[3]);
        expect(m.trickScores[seats[3] % 2]).toBe(1);
    });

    it('hidden trump selalu aktif: kartu trump tertutup, non-trump terbuka, sampai kartu ke-4', () => {
        const first = toTrick();
        expect(m.isTrumpHidden).toBe(true);
        m.players[first].hand = hand(['AS', '2D']);
        m.playCard(first, 0);

        const seen = m.getPublicState((first + 1) % 4).currentTrick[0];
        expect(seen).toEqual({ suit: 'S', rank: '?', isHidden: true });

        // kartu non-trump tetap terbuka
        m.players[(first + 1) % 4].hand = hand(['7H', '8D']); // tanpa suit S, boleh membuang
        expect(m.playCard((first + 1) % 4, 0).success).toBe(true);
        expect(m.getPublicState(first).currentTrick[1]).toEqual({ suit: 'H', rank: '7' });
    });

    it('kartu ke-4 trump ikut tertutup, semua dibuka bersamaan lewat revealTrick', () => {
        const first = toTrick();
        const seats = [0, 1, 2, 3].map(i => (first + i) % 4);
        seats.forEach((s, i) => (m.players[s].hand = hand([['AS', '2S', '3S', '4S'][i], '5D'])));
        seats.slice(0, 3).forEach(s => m.playCard(s, 0));
        expect(m.getPublicState(first).currentTrick.every(c => c.rank === '?')).toBe(true);
        m.playCard(seats[3], 0);
        let snap = m.getPublicState(first);
        expect(snap.currentTrick.every(c => c.rank === '?')).toBe(true); // 4 kartu di meja, semua masih tertutup
        expect(snap.tableFrozen).toBe(true);
        expect(snap.trickResolve).toBeNull();
        m.revealTrick();
        snap = m.getPublicState(first);
        expect(snap.currentTrick.map(c => c.rank)).toEqual(['A', '2', '3', '4']);
        expect(snap.trickResolve?.winner).toBe(seats[0]);
    });

    it('bid maksimal 10', () => {
        const mm = newMatch('seed-MAXBID');
        const seat = mm.activePlayerIndex;
        expect(mm.playerBid(seat, 11).success).toBe(false);
        expect(mm.playerBid(seat, 10).success).toBe(true);
    });

    it('ronde langsung selesai begitu declarer capai bid atau lawan capai 14 - bid', () => {
        for (const [bid, declarerWins] of [[8, true], [8, false], [10, false]] as const) {
            const mm = newMatch('seed-EARLY');
            mm.phase = 'TRICK';
            mm.currentBid = bid;
            mm.bidWinner = 0;
            mm.trickScores = declarerWins ? [bid - 1, 0] : [0, 14 - bid - 1];
            mm.players.forEach(p => (p.hand = hand(['2C', '3C', '4C'])));
            mm.resolving = { cards: [], starter: 0, winner: declarerWins ? 0 : 1, winningCard: { suit: 'C', rank: '2' } };
            mm.finishTrick();
            expect(mm.phase).toBe('FINISHED'); // tangan masih berisi kartu, tetapi ronde sudah diputuskan
            expect(mm.lastRound?.winnerTeam).toBe(declarerWins ? 0 : 1);
        }
    });
});

describe('Satu ronde penuh tanpa jaringan', () => {
    it('13 trick selesai, total 13, hasil identik untuk seed yang sama', () => {
        const run = () => {
            const m = newMatch('seed-FULL');
            while (m.phase === 'BIDDING') {
                const s = m.activePlayerIndex;
                if (!m.playerPass(s).success) m.playerBid(s, 8);
            }
            m.playerSelectTrump(m.bidWinner as number, 'H');
            while (m.phase === 'TRICK') {
                if (m.resolving) {
                    m.finishTrick();
                    continue;
                }
                const s = m.activePlayerIndex;
                m.playCard(s, m.legalMaskFor(s).indexOf(true));
            }
            return m;
        };
        const a = run();
        expect(a.phase).toBe('FINISHED');
        expect(a.trickScores[0] + a.trickScores[1]).toBe(13);
        expect(a.lastRound).not.toBeNull();
        expect(run().trickScores).toEqual(a.trickScores);
    });
});
