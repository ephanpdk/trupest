// src/game/ai/bot.ts
// Bot Tier Basic (SRS 5.2): selalu legal, hemat CPU. Dipakai juga untuk AI takeover & auto-play timeout.
import { Card, Suit } from '../../../../shared/types';
import { MatchState } from '../engine/state';
import { Result } from '../engine/types';
import { evaluateMainSuit, isEligibleBid8 } from '../engine/bidding';

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankOf = (c: Card) => RANK_ORDER.indexOf(c.rank);

export type BotMove =
    | { kind: 'BID'; amount: number }
    | { kind: 'PASS' }
    | { kind: 'TRUMP'; suit: Suit }
    | { kind: 'PLAY'; index: number };

export function decideBid(hand: Card[], currentBid: number): BotMove {
    // Tangan layak Bid 8 wajib bid (anti-pass); selain itu pass.
    if (currentBid === 0 && isEligibleBid8(hand)) return { kind: 'BID', amount: 8 };
    return { kind: 'PASS' };
}

export function decideTrump(hand: Card[]): Suit {
    const main = evaluateMainSuit(hand);
    if (main.length > 0) return main[0].suit;

    // Declarer dari PASS ALL bisa tanpa suit >= 4 kartu: ambil suit terpanjang, lalu terkuat.
    const count: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
    const sum: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
    hand.forEach(c => {
        count[c.suit]++;
        sum[c.suit] += rankOf(c);
    });
    return (['S', 'H', 'D', 'C'] as Suit[]).sort((a, b) => count[b] - count[a] || sum[b] - sum[a])[0];
}

/** 'lowest' = SRS 4.10.2 (timeout: kartu legal terendah); 'smart' = acak di antara kartu legal. */
export function decideCard(hand: Card[], mask: boolean[], mode: 'lowest' | 'smart'): number {
    const legal = hand.map((_, i) => i).filter(i => mask[i]);
    if (legal.length === 0) return -1;
    if (mode === 'smart') return legal[Math.floor(Math.random() * legal.length)];
    return legal.reduce((best, i) => (rankOf(hand[i]) < rankOf(hand[best]) ? i : best));
}

export function botMove(m: MatchState, seat: number, mode: 'lowest' | 'smart' = 'smart'): BotMove | null {
    const hand = m.players[seat].hand;
    switch (m.phase) {
        case 'BIDDING':
            return decideBid(hand, m.currentBid);
        case 'TRUMP_SELECTION':
            return m.bidWinner === seat ? { kind: 'TRUMP', suit: decideTrump(hand) } : null;
        case 'TRICK': {
            const index = decideCard(hand, m.legalMaskFor(seat), mode);
            return index === -1 ? null : { kind: 'PLAY', index };
        }
        default:
            return null;
    }
}

export function applyBotMove(m: MatchState, seat: number, move: BotMove): Result {
    switch (move.kind) {
        case 'BID':
            return m.playerBid(seat, move.amount);
        case 'PASS':
            return m.playerPass(seat);
        case 'TRUMP':
            return m.playerSelectTrump(seat, move.suit, false);
        case 'PLAY':
            return m.playCard(seat, move.index);
    }
}
