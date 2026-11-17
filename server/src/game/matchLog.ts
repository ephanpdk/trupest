// Log match sebagai JSONL: baris 1 = header (seed, pemain, hasil), baris berikutnya = satu GameEvent per baris.
// Ditulis di server saat match selesai, jadi serverSeed di file ini tidak bocor ke pemain sebelum waktunya.
import fs from 'fs/promises';
import path from 'path';
import { GameEvent } from './engine/events';
import { replay } from './engine/replay';
import { MatchState } from './engine/state';
import { PlayerInit } from './engine/types';

interface Header {
    matchId: string;
    seed: string;
    players: PlayerInit[]; // urut kursi 0..3
    result: { matchWinner: number | null; teamScores: number[] };
}

export function serializeMatchLog(m: MatchState): string {
    const header: Header = {
        matchId: m.config.matchId,
        seed: m.config.seed,
        players: m.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, newAccount: p.newAccount })),
        result: { matchWinner: m.matchWinner, teamScores: m.roundWins },
    };
    return [header, ...m.events].map(x => JSON.stringify(x)).join('\n') + '\n';
}

/** Mainkan ulang dari teks log dan pastikan hasilnya sama dengan yang tercatat. Melempar error jika beda. */
export function verifyMatchLog(text: string): MatchState {
    const [first, ...rest] = text.trim().split('\n');
    const header: Header = JSON.parse(first);
    const events: GameEvent[] = rest.map(l => JSON.parse(l));
    const m = replay({ matchId: header.matchId, seed: header.seed }, header.players, events);
    const same = m.matchWinner === header.result.matchWinner && JSON.stringify(m.roundWins) === JSON.stringify(header.result.teamScores);
    if (!same) throw new Error(`hasil replay beda: ${m.matchWinner}/${m.roundWins} vs ${header.result.matchWinner}/${header.result.teamScores}`);
    return m;
}

export async function writeMatchLog(dir: string, m: MatchState): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${m.config.matchId}-${Date.now()}.jsonl`), serializeMatchLog(m));
}
