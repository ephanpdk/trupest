// Pemain otomatis untuk tes: hanya membaca snapshot server (seperti client sungguhan),
// tidak punya logika aturan sendiri selain "kirim PASS dulu, kalau ditolak BID 8".
import { GameStateSnapshot } from '../../../shared/types';

type Send = (type: string, payload: unknown) => void;

export class AutoPlayer {
    token = '';
    snapshots: GameStateSnapshot[] = [];
    errors: string[] = [];
    final: GameStateSnapshot | null = null;
    private lastKey = '';
    private resolve!: (s: GameStateSnapshot) => void;
    readonly done = new Promise<GameStateSnapshot>(r => (this.resolve = r));

    constructor(readonly id: string, readonly roomId: string, private send: Send) {}

    private act(action: string, data: object = {}) {
        this.send('PLAYER_ACTION', { matchId: this.roomId, action, data });
    }

    handle(msg: { type: string; payload: any }) {
        if (msg.type === 'JOINED') this.token = msg.payload.token;
        if (msg.type === 'ACTION_ERROR') {
            this.errors.push(msg.payload.msg);
            if (msg.payload.msg.includes('BID_FORCED_MIN_8')) this.act('BID', { amount: 8 });
        }
        if (msg.type !== 'GAME_UPDATE') return;

        const s: GameStateSnapshot = msg.payload;
        this.snapshots.push(s);
        if (s.matchOver && s.phase === 'FINISHED') {
            this.final = s;
            return this.resolve(s);
        }

        const me = s.players.find(p => p.id === this.id);
        if (!me || s.trickResolve) return;

        const key = JSON.stringify([s.phase, s.roundNumber, s.activePlayer, s.myHand.length, s.currentTrick.length, s.currentBid]);
        if (key === this.lastKey) return;

        const mine = s.activePlayer === me.seatId;
        if (s.phase === 'BIDDING' && mine) this.act('PASS');
        else if (s.phase === 'TRUMP_SELECTION' && s.bidWinner === me.seatId) this.act('SELECT_TRUMP', { suit: 'H' });
        else if (s.phase === 'TRICK' && mine && s.legalMask) this.act('PLAY_CARD', { cardIndex: s.legalMask.indexOf(true) });
        else if (s.phase === 'FINISHED' && s.hostId === this.id) this.act('NEXT_ROUND');
        else return;
        this.lastKey = key;
    }
}

export const withTimeout = <T>(p: Promise<T>, ms: number, label: string) =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms))]);
