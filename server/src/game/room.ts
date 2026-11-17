// src/game/room.ts
// Room = 1 match + 1-4 pemain manusia (sisanya bot). Satu timer per room (tanpa tick global):
// bot jalan setelah jeda pendek, manusia dibatasi turn timer 25 dtk, trick di-freeze sebelum diselesaikan.
import crypto from 'crypto';
import { GameStateSnapshot, Suit } from '../../../shared/types';
import { ActionData } from '../network/protocol';
import { MATCH_LOG_DIR, SESSION_SECRET, TIME } from '../config';
import { matchRecord, MatchRecord, writeMatchLog } from './matchLog';
import { replay } from './engine/replay';
import { ActiveRow } from '../db';
import { MatchState, emptySnapshot } from './engine/state';
import { PlayerInit, Result } from './engine/types';
import { seatPlan, Team } from './engine/seats';
import { applyBotMove, botMove } from './ai/bot';

export interface Conn {
    send(msg: { type: string; payload: unknown }): void;
    close(reason: string): void;
}

export interface RoomOptions {
    botDelayMs: number;
    revealDelayMs: number;
    trickResolveMs: number;
    turnLimitMs: number;
    nextRoundMs: number;
    maxTimeouts: number;
    roomIdleMs: number;
    onEmpty?: () => void;
    // Hook penyimpanan (opsional, dipasang app.ts bila ada database). Room sendiri tidak tahu soal DB.
    onCheckpoint?: (r: MatchRecord, userIds: Array<string | null>) => void; // tiap trick selesai
    onMatchEnd?: (r: MatchRecord, userIds: Array<string | null>) => void;
    onDiscard?: (roomId: string) => void; // room dibuang saat match belum selesai
}

export const defaultRoomOptions = (): RoomOptions => ({
    botDelayMs: TIME.botDelayMs,
    revealDelayMs: TIME.revealDelayMs,
    trickResolveMs: TIME.trickResolveMs,
    turnLimitMs: TIME.turnLimitMs,
    nextRoundMs: TIME.nextRoundMs,
    maxTimeouts: TIME.maxTimeouts,
    roomIdleMs: TIME.roomIdleMs,
});

interface Member {
    id: string;
    token: string;
    conn: Conn | null;
    timeouts: number;       // SRS 4.10.2: 3x timeout dalam 1 match -> AI takeover
    aiControlled: boolean;
    team: Team | null;      // pilihan tim di waiting room; null = acak
    userId: string | null;  // akun (null = tamu)
    newAccount: boolean;    // SRS 4.3.2; tamu selalu true
}

export interface Account {
    userId: string;
    newAccount: boolean;
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
    private finished: MatchState | null = null;     // match yang akhirnya sudah dicatat
    private checkpointed = 0;                       // jumlah events saat checkpoint terakhir
    private announced: object | null = null;     // trick_resolve yang sudah dikirim
    private turnEndsAt: number | null = null;   // batas waktu giliran manusia (epoch ms)

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

    join(rawName: string, token: string | undefined, conn: Conn, account?: Account): Result & { playerId?: string; token?: string } {
        const name = String(rawName ?? '').trim();
        if (!NAME_RE.test(name)) return { success: false, msg: 'Nama harus 1-20 karakter (huruf/angka/spasi)' };

        const existing = this.members.get(name);
        if (existing) {
            const owner = !!account && existing.userId === account.userId; // pemilik akun tidak perlu token sesi room
            if (!owner && !validToken(this.id, name, token)) return { success: false, msg: 'NAME_TAKEN: nama sudah dipakai di room ini' };
            // SRS 3.1: login ganda -> sesi lama ditendang. Reconnect = kendali kembali ke pemain.
            if (existing.conn && existing.conn !== conn) existing.conn.close('replaced');
            existing.conn = conn;
            existing.aiControlled = false;
            existing.timeouts = 0;
        } else {
            if (this.match) return { success: false, msg: 'GAME_STARTED: room sudah berjalan' };
            if (this.members.size >= 4) return { success: false, msg: 'ROOM_FULL: room sudah 4 pemain' };
            this.members.set(name, { id: name, token: sign(this.id, name), conn, timeouts: 0, aiControlled: false, team: null, userId: account?.userId ?? null, newAccount: account?.newAccount ?? true });
        }

        this.cancelIdle();
        return { success: true, playerId: name, token: sign(this.id, name) };
    }

    /** Dipanggil network setelah JOINED terkirim. Tidak ada auto-start: host menekan Mulai setelah semua memilih tim. */
    afterJoin(): void {
        this.broadcast(); // jangan schedule() ulang: itu mengulang timer giliran pemain lain
    }

    leave(playerId: string, conn: Conn): void {
        const m = this.members.get(playerId);
        if (!m || m.conn !== conn) return; // sesi ini sudah digantikan
        m.conn = null;
        if (!this.match) this.members.delete(playerId); // di waiting room, keluar = lepas kursi
        if (![...this.members.values()].some(x => x.conn)) this.armIdle();
        this.broadcast();
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

    private userIds(m: MatchState): Array<string | null> {
        return m.players.map(p => this.members.get(p.id)?.userId ?? null);
    }

    /** Pulihkan match dari checkpoint DB (replay deterministik). Pemain manusia masuk lagi lewat login. false = tidak bisa dipulihkan. */
    restore(r: ActiveRow): boolean {
        if (this.match) return false;
        const m = replay({ matchId: this.id, seed: r.seed }, r.players, r.events);
        if (m.matchOver) return false;
        r.players.forEach((p, i) => {
            if (p.isBot) return;
            this.members.set(p.id, {
                id: p.id, token: sign(this.id, p.id), conn: null, timeouts: 0, aiControlled: false,
                team: null, userId: r.userIds[i] ?? null, newAccount: p.newAccount ?? true,
            });
        });
        this.match = m;
        this.checkpointed = m.events.length;
        this.afterChange();
        return true;
    }

    private begin(prev?: PlayerInit[]): void {
        // SRS 3.2: kursi diacak server saat game start, pilihan tim dihormati (lihat engine/seats.ts).
        const participants = prev ?? seatPlan([...this.members.values()]);

        this.members.forEach(m => {
            m.timeouts = 0;
            m.aiControlled = false;
        });
        this.announced = null;
        this.match = new MatchState({ matchId: this.id, seed: crypto.randomBytes(32).toString('hex') }, participants);
        this.match.startRound();
        this.afterChange();
    }

    private chooseTeam(playerId: string, team?: Team | 'RANDOM'): Result {
        if (this.match) return { success: false, msg: 'Tim hanya bisa dipilih sebelum match mulai' };
        const me = this.members.get(playerId);
        if (!me) return { success: false, msg: 'Anda belum join' };
        if (team !== 'A' && team !== 'B' && team !== 'RANDOM') return { success: false, msg: 'Pilihan tim tidak valid' };
        if (team !== 'RANDOM') {
            const taken = [...this.members.values()].filter(x => x !== me && x.team === team).length;
            if (taken >= 2) return { success: false, msg: `Tim ${team} sudah penuh (2 pemain)` };
        }
        me.team = team === 'RANDOM' ? null : team;
        this.afterChange();
        return { success: true };
    }

    action(playerId: string, action: string, data: ActionData = {}): Result {
        if (action === 'CHOOSE_TEAM') return this.chooseTeam(playerId, data.team);
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
                r = m.playerSelectTrump(seat, data.suit as Suit);
                break;
            case 'PLAY_CARD': {
                r = typeof data.cardIndex === 'number' ? m.playCard(seat, data.cardIndex) : { success: false, msg: 'Kartu tidak valid' };
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
        this.schedule(); // dulu: supaya batas waktu giliran ikut terkirim di snapshot
        this.broadcast();
        const m = this.match;
        if (m?.matchOver) {
            if (this.finished !== m) {
                this.finished = m;
                this.opts.onMatchEnd?.(matchRecord(m), this.userIds(m));
                if (MATCH_LOG_DIR) writeMatchLog(MATCH_LOG_DIR, m).catch(e => console.error(`[ROOM ${this.id}] gagal tulis log match:`, e));
            }
        } else if (m && m.events.at(-1)?.t === 'TRICK_END' && this.checkpointed !== m.events.length) {
            this.checkpointed = m.events.length;
            this.opts.onCheckpoint?.(matchRecord(m), this.userIds(m));
        }
        const r = m && m.trickRevealed ? m.resolving : null;
        if (r && r !== this.announced) {
            this.announced = r;
            this.members.forEach(mem => mem.conn?.send({ type: 'TRICK_RESOLVE', payload: r }));
        }
    }

    private broadcast(): void {
        this.members.forEach(mem => mem.conn?.send({ type: 'GAME_UPDATE', payload: this.snapshotFor(mem.id) }));
    }

    private snapshotFor(playerId: string): GameStateSnapshot {
        const m = this.match;
        if (m) {
            const snap = m.getPublicState(m.players.findIndex(p => p.id === playerId));
            snap.hostId = this.hostId;
            if (this.turnEndsAt !== null) {
                snap.turnMsLeft = Math.max(0, this.turnEndsAt - Date.now());
                snap.turnMsTotal = this.opts.turnLimitMs;
            }
            return snap;
        }
        return {
            ...emptySnapshot(this.id),
            players: [...this.members.values()].map((mem, i) => ({ id: mem.id, name: mem.id, seatId: i, isBot: false, team: mem.team, cardCount: 0, score: 0 })),
            hostId: this.hostId,
            canStart: playerId === this.hostId,
        };
    }

    private schedule(): void {
        this.clearTimer();
        this.turnEndsAt = null;
        const m = this.match;
        if (!m) return;

        if (m.resolving) {
            // Tahap 1: semua kartu di meja (trump masih tertutup) -> tahap 2: dibuka bersamaan, beri waktu melihat.
            const revealing = !m.trickRevealed;
            this.timer = setTimeout(() => {
                if (this.match !== m || !m.resolving) return;
                if (revealing) m.revealTrick();
                else m.finishTrick();
                this.afterChange();
            }, revealing ? this.opts.revealDelayMs : this.opts.trickResolveMs);
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

        if (!aiPlays) this.turnEndsAt = Date.now() + this.opts.turnLimitMs;
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
