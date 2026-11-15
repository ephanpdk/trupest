// src/game/engine/deck.ts
// SRS 3.3 + 4.1: seed -> dealer + urutan kartu, semuanya deterministik dari serverSeed.
import crypto from 'crypto';
import { Card, Suit, Rank } from '../../../../shared/types';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const hmac = (key: string, msg: string) => crypto.createHmac('sha256', key).update(msg).digest();

/** roundSeed = HMAC_SHA256(serverSeed, matchId || ":" || roundNumber) */
export function roundSeedOf(serverSeed: string, matchId: string, roundNumber: number): Buffer {
    return hmac(serverSeed, `${matchId}:${roundNumber}`);
}

/** dealerIndex = roundSeed[0] % 4 */
export function dealerFromRoundSeed(roundSeed: Buffer): number {
    return roundSeed[0] % 4;
}

/** Hash yang dipublikasikan di awal match; serverSeed asli di-reveal di akhir. */
export function seedHash(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

export function createDeck(): Card[] {
    return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })));
}

/**
 * Fisher-Yates dengan angka acak dari HMAC(roundSeed, i). 48 bit per langkah,
 * jadi bias modulo untuk <= 52 elemen dapat diabaikan.
 */
export function shuffleDeck(roundSeed: Buffer): Card[] {
    const deck = createDeck();
    for (let i = deck.length - 1; i > 0; i--) {
        const r = hmac(roundSeed.toString('hex'), `shuffle:${i}`).readUIntBE(0, 6) % (i + 1);
        [deck[i], deck[r]] = [deck[r], deck[i]];
    }
    return deck;
}
