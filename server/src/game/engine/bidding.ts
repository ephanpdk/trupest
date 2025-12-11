// src/game/engine/bidding.ts
import { Card, Suit, Rank } from '../../types/card';

// SRS 21.3 Constants
const RANK_VALUE: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

const HIGH_CARDS = new Set<Rank>(['A', 'K', 'Q', 'J', '10']);
const SUIT_PRIORITY: Record<Suit, number> = { 'S': 4, 'H': 3, 'D': 2, 'C': 1 };

interface SuitEval {
  suit: Suit;
  cardCount: number;
  highCardCount: number;
  rankTotal: number;
}

/**
 * SRS 21.3: evaluate_main_suit
 * Menghitung kekuatan setiap suit di tangan untuk menentukan kelayakan bid.
 */
export function evaluateMainSuit(hand: Card[]): SuitEval[] {
  const suits: Record<Suit, Card[]> = { 'S': [], 'H': [], 'D': [], 'C': [] };
  
  // Group by suit
  hand.forEach(c => suits[c.suit].push(c));
  
  const evals: SuitEval[] = [];

  for (const s of (Object.keys(suits) as Suit[])) {
    const cards = suits[s];
    // SRS 4.3.3: Eligibility >= 4 kartu
    if (cards.length < 4) continue;

    let rankTotal = 0;
    let highCardCount = 0;

    cards.forEach(c => {
      rankTotal += RANK_VALUE[c.rank];
      if (HIGH_CARDS.has(c.rank)) highCardCount++;
    });

    evals.push({ suit: s, cardCount: cards.length, highCardCount, rankTotal });
  }

  // SRS 4.3.3: Deterministic Sort (Tie-Breaker)
  return evals.sort((a, b) => {
    if (b.rankTotal !== a.rankTotal) return b.rankTotal - a.rankTotal;
    if (b.cardCount !== a.cardCount) return b.cardCount - a.cardCount;
    if (b.highCardCount !== a.highCardCount) return b.highCardCount - a.highCardCount;
    return SUIT_PRIORITY[b.suit] - SUIT_PRIORITY[a.suit];
  });
}

/**
 * SRS 4.3.4 & 21.4: isEligibleBid8
 * Logika Anti-Pass: Mengembalikan TRUE jika pemain WAJIB BID (Dilarang Pass).
 */
export function isEligibleBid8(hand: Card[]): boolean {
  const evals = evaluateMainSuit(hand);
  
  // Jika tidak punya suit >= 4 kartu, bebas pass
  if (evals.length === 0) return false;

  const main = evals[0]; // Suit terkuat
  
  // Hitung total High Cards di SELURUH tangan (bukan cuma di main suit)
  const totalHandHighCardCount = hand.reduce((acc, c) => acc + (HIGH_CARDS.has(c.rank) ? 1 : 0), 0);

  // SRS 4.3.4 Conditions:
  // 1. MainSuit.rankTotal >= 40
  // 2. totalHandHighCardCount >= 5
  if (main.rankTotal >= 40 && totalHandHighCardCount >= 5) {
    return true; // Layak Bid 8 -> DILARANG PASS
  }

  return false;
}