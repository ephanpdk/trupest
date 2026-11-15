// src/game/room.ts
// Room = 1 match + 1-4 pemain manusia (sisanya bot). Satu timer per room (tanpa tick global):
// bot jalan setelah jeda pendek, manusia dibatasi turn timer 25 dtk, trick di-freeze sebelum diselesaikan.
import crypto from 'crypto';
import { GameStateSnapshot, Suit } from '../../../shared/types';
import { SESSION_SECRET, TIME } from '../config';
import { MatchState } from './engine/state';
import { PlayerInit, Result } from './engine/types';
import { applyBotMove, botMove } from './ai/bot';

export interface Conn {
    send(msg: { type: string; payload: unknown }): void;
    close(reason: string): void;
}

export interface RoomOptions {
    botDelayMs: number;
    trickResolveMs: number;
    turnLimitMs: number;
    nextRoundMs: number;
    maxTimeouts: number;
    roomIdleMs: number;
    onEmpty?: () => void;
}

export const defaultRoomOptions = (): RoomOptions => ({
    botDelayMs: TIME.botDelayMs,
    trickResolveMs: TIME.trickResolveMs,
    turnLimitMs: TIME.turnLimitMs,
    nextRoundMs: TIME.nextRoundMs,
    maxTimeouts: TIME.maxTimeouts,
    roomIdleMs: TIME.roomIdleMs,
});

export interface ActionData {
    amount?: number;
    suit?: Suit;
    hidden?: boolean;
    cardIndex?: number;
    card?: { suit: Suit; rank: string };
}

interface Member {
    id: string;
    token: string;
    conn: Conn | null;
    timeouts: number;       // SRS 4.10.2: 3x timeout dalam 1 match -> AI takeover
    aiControlled: boolean;
}

// Token sesi: tanpa ini orang lain tidak bisa memakai nama pemain yang sudah ada di room.
const sign = (roomId: string, playerId: string) =>
    crypto.createHmac('sha256', SESSION_SECRET).update(`${roomId}:${playerId}`).digest('hex');

function validToken(roomId: string, playerId: string, token?: string): boolean {
    if (!token) return false;
    const a = Buffer.from(sign(roomId, playerId));
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const NAME_RE = /^[\p{L}\p{N} _.-]{1,20}$/u;

export class Room {
    private members = new Map<string, Member>(); // urutan insert = urutan join, anggota pertama = host
    private match: MatchState | null = null;
    private timer: NodeJS.Timeout | null = null;
    private idleTimer: NodeJS.Timeout | null = null;
    private announced: object | null = null;     // trick_resolve yang sudah dikirim

    constructor(public readonly id: string, private opts: RoomOptions = defaultRoomOptions()) {
        this.armIdle();
    }

    get currentMatch(): MatchState | null {
        return this.match;
    }

    private get hostId(): string | null {
        return this.members.keys().next().value ?? null;
    }

    // ---------- MEMBERSHIP ----------

    join(rawName: string, token: string | undefined, conn: Conn): Result & { playerId?: string; token?: string } {
        const name = String(rawName ?? '').trim();
        if (!NAME_RE.test(name)) return { success: false, msg: 'Nama harus 1-20 karakter (huruf/angka/spasi)' };

        const existing = this.members.get(name);
        if (existing) {
            if (!validToken(this.id, name, token)) return { success: false, msg: 'NAME_TAKEN: nama sudah dipakai di room ini' };
            // SRS 3.1: login ganda -> sesi lama ditendang. Reconnect = kendali kembali ke pemain.
            if (existing.conn && existing.conn !== conn) existing.conn.close('replaced');
            existing.conn = conn;
            existing.aiControlled = false;
            existing.timeouts = 0;
        } else {
            if (this.match) return { success: false, msg: 'GAME_STARTED: room sudah berjalan' };
            if (this.members.size >= 4) return { success: false, msg: 'ROOM_FULL: room sudah 4 pemain' };
            this.members.set(name, { id: name, token: sign(this.id, name), conn, timeouts: 0, aiControlled: false });
        }

        this.cancelIdle();
        return { success: true, playerId: name, token: sign(this.id, name) };
    }

    /** Dipanggil network setelah JOINED terkirim: auto-start jika 4 pemain (SRS 12), lalu sinkron state. */
    afterJoin(): void {
        if (!this.match && this.members.size === 4) this.begin();
        else this.afterChange();
    }

    leave(playerId: string, conn: Conn): void {
        const m = this.members.get(playerId);
        if (!m || m.conn !== conn) return; // sesi ini sudah digantikan
        m.conn = null;
        if (!this.match) this.members.delete(playerId); // di waiting room, keluar = lepas kursi
        if (![...this.members.values()].some(x => x.conn)) this.armIdle();
        this.afterChange();
    }

    destroy(): void {
        this.clearTimer();
        this.cancelIdle();
        this.members.forEach(m => m.conn?.close('room closed'));
        this.members.clear();
    }

    // ---------- MATCH ----------

    start(byPlayerId: string): Result {
        if (this.match) return { success: false, msg: 'Match sudah berjalan' };
        if (byPlayerId !== this.hostId) return { success: false, msg: 'Hanya host yang boleh memulai' };
        this.begin();
        return { success: true };
    }

    private begin(prev?: PlayerInit[]): void {
        // SRS 3.2: kursi diacak server saat game start. Kursi kosong diisi bot.
        let participants: PlayerInit[] = prev ?? [...this.members.values()].map(m => ({ id: m.id, name: m.id, newAccount: true }));
        if (!prev) {
            for (let i = 1; participants.length < 4; i++) {
                participants.push({ id: `bot:${i}`, name: `Bot ${i}`, isBot: true });
            }
            for (let i = participants.length - 1; i > 0; i--) {
                const j = crypto.randomInt(i + 1);
                [participants[i], participants[j]] = [participants[j], participants[i]];
            }
        }

        this.members.forEach(m => {
            m.timeouts = 0;
            m.aiControlled = false;
        });
        this.announced = null;
        this.match = new MatchState({ matchId: this.id, seed: crypto.randomBytes(32).toString('hex'), isRanked: false }, participants);
        this.match.startRound();
        this.afterChange();
    }

    action(playerId: string, action: string, data: ActionData = {}): Result {
        const m = this.match;
        if (!m) return { success: false, msg: 'Match belum dimulai' };
        const seat = m.players.findIndex(p => p.id === playerId);
        if (seat === -1) return { success: false, msg: 'Anda bukan pemain di match ini' };

        let r: Result;
        switch (action) {
            case 'BID':
                r = m.playerBid(seat, data.amount as number);
                break;
            case 'PASS':
                r = m.playerPass(seat);
                break;
            case 'SELECT_TRUMP':
                r = m.playerSelectTrump(seat, data.suit as Suit, !!data.hidden);
                break;
            case 'PLAY_CARD': {
                const idx = typeof data.cardIndex === 'number'
                    ? data.cardIndex
                    : m.players[seat].hand.findIndex(c => c.suit === data.card?.suit && c.rank === data.card?.rank);
                r = idx === -1 ? { success: false, msg: 'Kartu tidak ada di tangan' } : m.playCard(seat, idx);
                break;
            }
            case 'NEXT_ROUND':
                r = m.startNextRound();
                break;
            case 'PLAY_AGAIN':
                r = this.playAgain();
                return r; // begin() sudah broadcast
            default:
                r = { success: false, msg: 'Aksi tidak dikenal' };
        }

        if (r.success) {
            const member = this.members.get(playerId);
            if (member) member.aiControlled = false; // pemain aktif kembali memegang kendali
            this.afterChange();
        }
        return r;
    }

    private playAgain(): Result {
        const m = this.match;
        if (!m || m.phase !== 'FINISHED') return { success: false, msg: 'Match belum selesai' };
        // Match baru = seed baru, kursi tetap.
        this.begin(m.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, newAccount: p.newAccount })));
        return { success: true };
    }

    // ---------- SYNC & TIMING ----------

    private afterChange(): void {
        this.broadcast();
        const r = this.match?.resolving ?? null;
        if (r && r !== this.announced) {
            this.announced = r;
            this.members.forEach(mem => mem.conn?.send({ type: 'TRICK_RESOLVE', payload: r }));
        }
        this.schedule();
    }

    private broadcast(): void {
        this.members.forEach(mem => mem.conn?.send({ type: 'GAME_UPDATE', payload: this.snapshotFor(mem.id) }));
    }

    private snapshotFor(playerId: string): GameStateSnapshot {
        const m = this.match;
        if (m) {
            const snap = m.getPublicState(m.players.findIndex(p => p.id === playerId));
            snap.hostId = this.hostId;
            return snap;
        }
        return {
            roomId: this.id, phase: 'WAITING',
            players: [...this.members.values()].map((mem, i) => ({ id: mem.id, name: mem.id, seatId: i, isBot: false, cardCount: 0, score: 0 })),
            roundNumber: 0, dealerIndex: 0, activePlayer: 0,
            trumpSuit: null, isTrumpHidden: false, currentBid: 0, bidWinner: null,
            currentTrick: [], leadSuit: null, trickStarterIndex: 0, trickScores: [0, 0], trickResolve: null,
            legalMask: null, myHand: [], teamScores: [0, 0], lastRound: null, matchOver: false, matchWinner: null,
            seedHash: '', serverSeed: null,
            hostId: this.hostId, canStart: playerId === this.hostId,
        };
    }

    private schedule(): void {
        this.clearTimer();
        const m = this.match;
        if (!m) return;

        if (m.resolving) {
            this.timer = setTimeout(() => {
                m.finishTrick();
                this.afterChange();
            }, this.opts.trickResolveMs);
            return;
        }
        if (m.phase === 'FINISHED') {
            // Ronde selesai tapi match belum: lanjut sendiri jika tidak ada yang menekan tombol.
            if (!m.matchOver) {
                this.timer = setTimeout(() => {
                    if (this.match !== m || m.phase !== 'FINISHED' || m.matchOver) return;
                    m.startNextRound();
                    this.afterChange();
                }, this.opts.nextRoundMs);
            }
            return;
        }
        if (m.phase !== 'BIDDING' && m.phase !== 'TRUMP_SELECTION' && m.phase !== 'TRICK') return;

        const seat = m.activePlayerIndex;
        const player = m.players[seat];
        const member = this.members.get(player.id);
        const aiPlays = player.isBot || !member || member.aiControlled;

        this.timer = setTimeout(
            () => this.autoPlay(m, seat, aiPlays ? 'smart' : 'lowest', !aiPlays),
            aiPlays ? this.opts.botDelayMs : this.opts.turnLimitMs
        );
    }

    private autoPlay(m: MatchState, seat: number, mode: 'lowest' | 'smart', isTimeout: boolean): void {
        if (this.match !== m || m.resolving || m.activePlayerIndex !== seat) return; // state sudah berubah

        let move = botMove(m, seat, mode);
        let r = move ? applyBotMove(m, seat, move) : { success: false, msg: 'tidak ada langkah' };
        if (!r.success) {
            move = botMove(m, seat, 'lowest');
            r = move ? applyBotMove(m, seat, move) : r;
        }
        if (!r.success) {
            console.error(`[ROOM ${this.id}] autoplay gagal di seat ${seat}: ${r.msg}`);
            return;
        }

        if (isTimeout) {
            const member = this.members.get(m.players[seat].id);
            if (member && ++member.timeouts >= this.opts.maxTimeouts) member.aiControlled = true;
        }
        this.afterChange();
    }

    private clearTimer(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }

    private armIdle(): void {
        this.cancelIdle();
        this.idleTimer = setTimeout(() => {
            this.destroy();
            this.opts.onEmpty?.();
        }, this.opts.roomIdleMs);
        this.idleTimer.unref();
    }

    private cancelIdle(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = null;
    }
}
