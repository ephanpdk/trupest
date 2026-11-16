// src/game/engine/state.ts
// Engine murni & sinkron: tidak ada timer, bot, atau I/O di sini. Room yang mengatur waktu.
import { Card, Suit, GamePhase, GameStateSnapshot, PublicCard, RoundResult, TrickResolve } from '../../../../shared/types';
import { Player, PlayerInit, GameConfig, Result } from './types';
import { dealerFromRoundSeed, roundSeedOf, seedHash, shuffleDeck } from './deck';
import { isEligibleBid8 } from './bidding';
import { getLegalMask, resolveTrick } from './trick';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const ROUNDS_TO_WIN = 2; // SRS 4.8.1: Best-of-3
export const MAX_BID = 10; // batas bid sementara (SRS asli 13)
const ok = (): Result => ({ success: true });
const fail = (msg: string): Result => ({ success: false, msg });

export class MatchState {
    public config: GameConfig;
    public players: Player[];
    public phase: GamePhase = 'WAITING';
    public roundNumber = 1;
    public dealerIndex = 0;

    public activePlayerIndex = 0;
    public trumpSuit: Suit | null = null;
    public isTrumpHidden = false;
    public currentTrick: Card[] = [];
    public trickStarterIndex = 0;
    public trickScores: number[] = [0, 0];
    // Terisi sejak kartu ke-4 masuk sampai finishTrick() (SRS 4.5.2 freeze).
    public resolving: TrickResolve | null = null;
    // false sampai kartu trump di meja dibuka bersamaan (setelah kartu ke-4 + jeda). Tanpa trump di meja langsung true.
    public trickRevealed = false;

    public currentBid = 0;
    public bidWinner: number | null = null;
    public passCount = 0;
    public biddingTurnCount = 0;
    public bids: Array<number | 'PASS' | null> = [null, null, null, null];

    public roundWins: number[] = [0, 0];
    public lastRound: RoundResult | null = null;
    public matchWinner: number | null = null;

    constructor(config: GameConfig, players: Array<string | PlayerInit>) {
        if (players.length !== 4) throw new Error('Match membutuhkan tepat 4 pemain');
        this.config = config;

        this.players = players.map((p, i) => {
            const init: PlayerInit = typeof p === 'string' ? { id: p } : p;
            const newAccount = !!init.newAccount && !init.isBot;
            return {
                id: init.id,
                name: init.name ?? `Player ${i + 1}`,
                seatId: i,
                hand: [],
                isBot: !!init.isBot,
                newAccount,
                passOverridesLeft: newAccount ? 1 : 0, // kuota per match (SRS 4.3.2)
                score: 0,
            };
        });
    }

    get seedHash(): string {
        return seedHash(this.config.seed);
    }

    get matchOver(): boolean {
        return this.matchWinner !== null;
    }

    // ---------- ROUND SETUP ----------

    public startRound(): void {
        this.phase = 'DEALING';

        const roundSeed = roundSeedOf(this.config.seed, this.config.matchId, this.roundNumber);
        // Ronde 1: dealer dari seed. Ronde berikutnya: rotasi di startNextRound().
        if (this.roundNumber === 1) this.dealerIndex = dealerFromRoundSeed(roundSeed);

        this.activePlayerIndex = (this.dealerIndex + 1) % 4;
        this.trickStarterIndex = this.activePlayerIndex;
        this.trumpSuit = null;
        this.isTrumpHidden = false;
        this.currentTrick = [];
        this.resolving = null;
        this.trickRevealed = false;
        this.trickScores = [0, 0];
        this.currentBid = 0;
        this.bidWinner = null;
        this.passCount = 0;
        this.biddingTurnCount = 0;
        this.bids = [null, null, null, null];
        this.lastRound = null;

        // SRS 4.2: searah jarum jam, kartu pertama ke kiri dealer.
        this.players.forEach(p => (p.hand = []));
        shuffleDeck(roundSeed).forEach((card, i) => {
            this.players[(this.dealerIndex + 1 + i) % 4].hand.push(card);
        });

        this.phase = 'BIDDING';
    }

    public startNextRound(): Result {
        if (this.phase !== 'FINISHED') return fail('Ronde belum selesai');
        if (this.matchOver) return fail('Match sudah selesai, mulai match baru');
        this.roundNumber++;
        this.dealerIndex = (this.dealerIndex + 1) % 4;
        this.startRound();
        return ok();
    }

    // ---------- BIDDING (SRS 4.3) ----------

    public playerBid(seatId: number, amount: number): Result {
        if (this.phase !== 'BIDDING') return fail('Bukan fase bidding');
        if (this.activePlayerIndex !== seatId) return fail('Bukan giliran Anda');
        if (!Number.isInteger(amount) || amount < 8 || amount > MAX_BID) return fail(`Bid harus 8-${MAX_BID}`);
        if (amount <= this.currentBid) return fail('Bid harus lebih tinggi dari bid saat ini');

        this.currentBid = amount;
        this.bids[seatId] = amount;
        this.bidWinner = seatId;
        this.passCount = 0;
        this.biddingTurnCount++;
        this.advanceBidding();
        return ok();
    }

    public playerPass(seatId: number): Result {
        if (this.phase !== 'BIDDING') return fail('Bukan fase bidding');
        if (this.activePlayerIndex !== seatId) return fail('Bukan giliran Anda');

        const player = this.players[seatId];
        // SRS 4.3.2: tangan layak Bid 8 -> PASS ditolak, kecuali kuota override masih ada.
        if (this.currentBid < 8 && isEligibleBid8(player.hand)) {
            if (player.passOverridesLeft <= 0) return fail('BID_FORCED_MIN_8: tangan terlalu kuat untuk PASS');
            player.passOverridesLeft--;
        }

        this.bids[seatId] = 'PASS';
        this.passCount++;
        this.biddingTurnCount++;
        this.advanceBidding();
        return ok();
    }

    /** Dipakai client untuk tombol PASS; aturannya tetap hanya hidup di server. */
    public canPassNow(seatId: number): boolean {
        if (this.phase !== 'BIDDING' || this.activePlayerIndex !== seatId) return false;
        const p = this.players[seatId];
        return !(this.currentBid < 8 && isEligibleBid8(p.hand) && p.passOverridesLeft <= 0);
    }

    private advanceBidding(): void {
        if (this.biddingTurnCount < 4) {
            this.activePlayerIndex = (this.activePlayerIndex + 1) % 4;
            return;
        }
        // SRS 4.3.5: semua PASS -> kontrak 7/7, declarer = pemain pertama yang PASS.
        if (this.currentBid === 0) {
            this.currentBid = 7;
            this.bidWinner = (this.dealerIndex + 1) % 4;
        }
        this.phase = 'TRUMP_SELECTION';
        this.activePlayerIndex = this.bidWinner as number;
    }

    // ---------- TRUMP (SRS 4.4) ----------

    public playerSelectTrump(seatId: number, suit: Suit): Result {
        if (this.phase !== 'TRUMP_SELECTION') return fail('Bukan fase pemilihan trump');
        if (this.bidWinner !== seatId) return fail('Hanya pemenang bid yang boleh memilih trump');
        if (!SUITS.includes(suit)) return fail('Suit tidak valid');

        this.trumpSuit = suit;
        this.isTrumpHidden = true; // ciri khas TRUPEST: trump selalu dimainkan tertutup (SRS 4.6)
        this.phase = 'TRICK';
        this.activePlayerIndex = seatId;
        this.trickStarterIndex = seatId;
        return ok();
    }

    // ---------- TRICK (SRS 4.5) ----------

    public get leadSuit(): Suit | null {
        return this.currentTrick.length > 0 ? this.currentTrick[0].suit : null;
    }

    public legalMaskFor(seatId: number): boolean[] {
        return getLegalMask(this.players[seatId].hand, this.leadSuit);
    }

    public playCard(seatId: number, cardIndex: number): Result {
        if (this.phase !== 'TRICK') return fail('Bukan fase main kartu');
        if (this.resolving) return fail('Trick sedang di-resolve, tunggu sebentar');
        if (this.activePlayerIndex !== seatId) return fail('Bukan giliran Anda');

        const player = this.players[seatId];
        if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= player.hand.length) {
            return fail('Kartu tidak valid');
        }
        if (!this.legalMaskFor(seatId)[cardIndex]) return fail('ERROR_ILLEGAL_PLAY: wajib mengikuti suit');

        this.currentTrick.push(player.hand.splice(cardIndex, 1)[0]);

        if (this.currentTrick.length < 4) {
            this.activePlayerIndex = (this.activePlayerIndex + 1) % 4;
        } else {
            // Kartu ke-4: bekukan meja. Pemenang diumumkan lewat trick_resolve, lalu finishTrick().
            const offset = resolveTrick(this.currentTrick, this.trumpSuit);
            this.resolving = {
                cards: [...this.currentTrick],
                starter: this.trickStarterIndex,
                winner: (this.trickStarterIndex + offset) % 4,
                winningCard: this.currentTrick[offset],
            };
            // Ada trump tertutup di meja: tahan dulu (termasuk kartu ke-4), buka lewat revealTrick().
            this.trickRevealed = !(this.isTrumpHidden && this.currentTrick.some(c => c.suit === this.trumpSuit));
        }
        return ok();
    }

    /** Buka semua kartu trump di meja bersamaan; pemenang baru diumumkan setelah ini. */
    public revealTrick(): Result {
        if (!this.resolving) return fail('Tidak ada trick yang menunggu dibuka');
        this.trickRevealed = true;
        return ok();
    }

    public finishTrick(): Result {
        const r = this.resolving;
        if (!r) return fail('Tidak ada trick yang menunggu resolve');

        this.trickScores[r.winner % 2]++;
        this.currentTrick = [];
        this.resolving = null;
        this.trickRevealed = false;
        this.activePlayerIndex = r.winner;
        this.trickStarterIndex = r.winner;

        // Ronde berakhir begitu salah satu tim mencapai targetnya: declarer = bid, lawan = 14 - bid.
        const declarerTeam = (this.bidWinner as number) % 2;
        const decided =
            this.trickScores[declarerTeam] >= this.currentBid ||
            this.trickScores[1 - declarerTeam] >= 14 - this.currentBid;
        if (decided || this.players.every(p => p.hand.length === 0)) this.endRound();
        return ok();
    }

    // ---------- SCORING (SRS 4.7 & 4.8) ----------

    public calculateScore(): RoundResult {
        if (this.bidWinner === null) throw new Error('Tidak ada bid winner');

        const declarerTeam = this.bidWinner % 2;
        const bid = this.currentBid;
        const declarerTricks = this.trickScores[declarerTeam];
        const isSuccess = declarerTricks >= bid;

        return {
            declarerTeam,
            bid,
            declarerTricks,
            opponentTricks: this.trickScores[1 - declarerTeam],
            declarerTarget: bid,
            opponentTarget: 14 - bid, // 7->7, 8->6, ... 13->1
            isSuccess,
            winnerTeam: isSuccess ? declarerTeam : 1 - declarerTeam,
        };
    }

    private endRound(): void {
        const result = this.calculateScore();
        this.lastRound = result;
        this.roundWins[result.winnerTeam]++;
        this.players.forEach(p => (p.score = this.roundWins[p.seatId % 2]));
        if (this.roundWins[result.winnerTeam] >= ROUNDS_TO_WIN) this.matchWinner = result.winnerTeam;
        this.phase = 'FINISHED';
    }

    // ---------- SNAPSHOT UNTUK CLIENT ----------

    public getPublicState(observerSeat: number): GameStateSnapshot {
        const me = this.players[observerSeat];

        // SRS 4.6: hidden trump tampil tanpa rank sampai semua kartu dibuka bersamaan (trickRevealed).
        const hide = this.isTrumpHidden && !this.trickRevealed;
        const table: PublicCard[] = this.currentTrick.map(c =>
            hide && c.suit === this.trumpSuit ? { suit: c.suit, rank: '?', isHidden: true } : c
        );

        const myTurnToPlay = this.phase === 'TRICK' && !this.resolving && this.activePlayerIndex === observerSeat;

        return {
            roomId: this.config.matchId,
            phase: this.phase,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                seatId: p.seatId,
                isBot: p.isBot,
                team: p.seatId % 2 === 0 ? 'A' : 'B',
                cardCount: p.hand.length,
                score: p.score,
            })),
            roundNumber: this.roundNumber,
            dealerIndex: this.dealerIndex,
            activePlayer: this.activePlayerIndex,
            trumpSuit: this.trumpSuit,
            isTrumpHidden: this.isTrumpHidden,
            currentBid: this.currentBid,
            maxBid: MAX_BID,
            bidWinner: this.bidWinner,
            bids: [...this.bids],
            canPass: !!me && this.canPassNow(observerSeat),
            turnMsLeft: null,
            turnMsTotal: null,
            currentTrick: table,
            leadSuit: this.leadSuit,
            trickStarterIndex: this.trickStarterIndex,
            trickScores: [...this.trickScores],
            trickResolve: this.trickRevealed ? this.resolving : null,
            tableFrozen: !!this.resolving,
            legalMask: me && myTurnToPlay ? this.legalMaskFor(observerSeat) : null,
            myHand: me ? me.hand : [],
            teamScores: [...this.roundWins],
            lastRound: this.lastRound,
            matchOver: this.matchOver,
            matchWinner: this.matchWinner,
            seedHash: this.seedHash,
            serverSeed: this.matchOver ? this.config.seed : null, // SRS 4.1: reveal di akhir match
            hostId: null,
            canStart: false,
        };
    }
}

/** Snapshot kosong untuk waiting room (belum ada match). Satu-satunya tempat default semua field. */
export const emptySnapshot = (roomId: string): GameStateSnapshot => ({
    roomId, phase: 'WAITING', players: [],
    roundNumber: 0, dealerIndex: 0, activePlayer: 0,
    trumpSuit: null, isTrumpHidden: false, currentBid: 0, maxBid: MAX_BID, bidWinner: null,
    bids: [null, null, null, null], canPass: false, turnMsLeft: null, turnMsTotal: null,
    currentTrick: [], leadSuit: null, trickStarterIndex: 0, trickScores: [0, 0], trickResolve: null, tableFrozen: false,
    legalMask: null, myHand: [], teamScores: [0, 0], lastRound: null, matchOver: false, matchWinner: null,
    seedHash: '', serverSeed: null, hostId: null, canStart: false,
});
