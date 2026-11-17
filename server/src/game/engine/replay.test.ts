import { describe, it, expect } from 'vitest';
import { MatchState } from './state';
import { replay } from './replay';
import { PlayerInit } from './types';
import { applyBotMove, botMove } from '../ai/bot';
import { serializeMatchLog, verifyMatchLog } from '../matchLog';

const PLAYERS: PlayerInit[] = [0, 1, 2, 3].map(i => ({ id: `bot:${i}`, name: `Bot ${i}`, isBot: true }));

/** Main satu match penuh dengan bot acak (Math.random), persis seperti Room: reveal -> finish -> next round. */
function playOut(seed: string): MatchState {
    const m = new MatchState({ matchId: 'RP', seed }, PLAYERS);
    m.startRound();
    for (let guard = 0; !m.matchOver && guard < 2000; guard++) {
        if (m.phase === 'FINISHED') m.startNextRound();
        else if (m.resolving) (m.trickRevealed ? m.finishTrick() : m.revealTrick());
        else applyBotMove(m, m.activePlayerIndex, botMove(m, m.activePlayerIndex, 'smart')!);
    }
    expect(m.matchOver).toBe(true);
    return m;
}

const views = (m: MatchState) => JSON.stringify([0, 1, 2, 3].map(s => m.getPublicState(s)));

describe('Replay deterministik (SRS 4.9)', () => {
    it.each(['s1', 's2', 's3', 's4', 's5'])('log dimainkan ulang menghasilkan state identik (seed %s)', seed => {
        const live = playOut(seed);
        const again = replay({ matchId: 'RP', seed }, PLAYERS, live.events);
        expect(views(again)).toBe(views(live));
        expect(again.roundWins).toEqual(live.roundWins);
        expect(again.matchWinner).toBe(live.matchWinner);
    });

    it('sequenceId berurutan dari 0 dan setiap trick punya 4 PLAY', () => {
        const m = playOut('seq');
        m.events.forEach((e, i) => expect(e.seq).toBe(i));
        expect(m.events.filter(e => e.t === 'PLAY').length % 4).toBe(0);
    });

    it('JSONL: tulis lalu verifikasi lolos; log rusak ditolak', () => {
        const m = playOut('file');
        const text = serializeMatchLog(m);
        expect(() => verifyMatchLog(text)).not.toThrow();

        const lines = text.trim().split('\n');
        lines.splice(5, 1); // buang satu kejadian -> seq bolong
        expect(() => verifyMatchLog(lines.join('\n'))).toThrow(/seq/);

        const header = JSON.parse(lines[0]);
        header.result.matchWinner = 1 - (header.result.matchWinner as number);
        const wrongResult = [JSON.stringify(header), ...text.trim().split('\n').slice(1)].join('\n');
        expect(() => verifyMatchLog(wrongResult)).toThrow(/beda/);
    });
});
