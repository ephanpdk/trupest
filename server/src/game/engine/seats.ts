import crypto from 'crypto';
import { PlayerInit } from './types';

export type Team = 'A' | 'B';

export function shuffled<T>(a: T[], randomInt: (n: number) => number = crypto.randomInt): T[] {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}

/**
 * Susunan 4 kursi (urut seat 0..3). Tim A = kursi 0 & 2, Tim B = kursi 1 & 3, jadi rekan berhadapan.
 * Manusia yang memilih tim duduk di tim itu; manusia tanpa pilihan dan bot mengisi kursi sisa secara acak.
 */
export function seatPlan(humans: Array<{ id: string; team: Team | null; newAccount?: boolean }>, randomInt?: (n: number) => number): PlayerInit[] {
    const seats: Array<PlayerInit | null> = [null, null, null, null];
    const free: Record<Team, number[]> = { A: shuffled([0, 2], randomInt), B: shuffled([1, 3], randomInt) };
    const init = (h: { id: string; newAccount?: boolean }): PlayerInit => ({ id: h.id, name: h.id, newAccount: h.newAccount ?? true });

    humans.filter(h => h.team).forEach(h => (seats[free[h.team as Team].pop() as number] = init(h)));

    const rest: PlayerInit[] = humans.filter(h => !h.team).map(init);
    for (let i = 1; rest.length + seats.filter(Boolean).length < 4; i++) rest.push({ id: `bot:${i}`, name: `Bot ${i}`, isBot: true });

    const open = shuffled([0, 1, 2, 3].filter(i => !seats[i]), randomInt);
    shuffled(rest, randomInt).forEach(p => (seats[open.pop() as number] = p));
    return seats as PlayerInit[];
}
