import { GameEvent } from './events';
import { MatchState } from './state';
import { GameConfig, PlayerInit, Result } from './types';

function apply(m: MatchState, e: GameEvent): Result {
    switch (e.t) {
        case 'BID': return m.playerBid(e.seat, e.amount);
        case 'PASS': return m.playerPass(e.seat);
        case 'TRUMP': return m.playerSelectTrump(e.seat, e.suit);
        case 'PLAY': return m.playCard(e.seat, e.index);
        case 'REVEAL': return m.revealTrick();
        case 'TRICK_END': return m.finishTrick();
        case 'NEXT_ROUND': return m.startNextRound();
    }
}

/** Mainkan ulang match dari log. Tidak menghitung apa pun sendiri: semua lewat engine yang sama (SRS 4.9.4). */
export function replay(config: GameConfig, players: PlayerInit[], events: GameEvent[]): MatchState {
    const m = new MatchState(config, players);
    m.startRound();
    events.forEach((e, i) => {
        if (e.seq !== i) throw new Error(`replay: urutan seq rusak di indeks ${i} (seq ${e.seq})`);
        const r = apply(m, e);
        if (!r.success) throw new Error(`replay: seq ${e.seq} (${e.t}) ditolak engine: ${r.msg}`);
    });
    return m;
}
