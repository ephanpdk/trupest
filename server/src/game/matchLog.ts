// Log match sebagai JSONL: baris 1 = header (seed, pemain, hasil), baris berikutnya = satu GameEvent per baris.
// Ditulis di server saat match selesai, jadi serverSeed di file ini tidak bocor ke pemain sebelum waktunya.
import fs from 'fs/promises';
import path from 'path';
import { GameEvent } from './engine/events';
import { replay } from './engine/replay';
import { MatchState } from './engine/state';
import { PlayerInit } from './engine/types';

export interface MatchRecord {
    matchId: string;
    seed: string;
    players: PlayerInit[]; // urut kursi 0..3
    result: { matchWinner: number | null; teamScores: number[] };
    events: GameEvent[];
}

export function matchRecord(m: MatchState): MatchRecord {
    return {
        matchId: m.config.matchId,
        seed: m.config.seed,
        players: m.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, newAccount: p.newAccount })),
        result: { matchWinner: m.matchWinner, teamScores: m.roundWins },
        events: m.events,
    };
}

export function serializeMatchLog(m: MatchState): string {
    const { events, ...header } = matchRecord(m);
    return [header, ...events].map(x => JSON.stringify(x)).join('\n') + '\n';
}

/** Mainkan ulang dan pastikan hasilnya sama dengan yang tercatat. Melempar error jika beda. */
export function verifyRecord(r: MatchRecord): MatchState {
    const m = replay({ matchId: r.matchId, seed: r.seed }, r.players, r.events);
    const same = m.matchWinner === r.result.matchWinner && JSON.stringify(m.roundWins) === JSON.stringify(r.result.teamScores);
    if (!same) throw new Error(`hasil replay beda: ${m.matchWinner}/${m.roundWins} vs ${r.result.matchWinner}/${r.result.teamScores}`);
    return m;
}

export function verifyMatchLog(text: string): MatchState {
    const [first, ...rest] = text.trim().split('\n');
    return verifyRecord({ ...JSON.parse(first), events: rest.map(l => JSON.parse(l)) });
}

export async function writeMatchLog(dir: string, m: MatchState): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${m.config.matchId}-${Date.now()}.jsonl`), serializeMatchLog(m));
}
