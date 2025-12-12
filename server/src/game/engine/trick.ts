// src/game/engine/trick.ts
import { Card, Suit, Rank } from '../../../../shared/types';

// Rank Value mapping buat perbandingan (A paling tinggi)
const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

/**
 * SRS 4.5.1: Follow-Suit Logic
 * Menghasilkan array boolean (mask) untuk setiap kartu di tangan.
 * true = boleh dimainkan, false = dilarang (greyed out di client).
 */
export function getLegalMask(hand: Card[], leadSuit: Suit | null): boolean[] {
  // Jika belum ada lead (pemain pertama), semua kartu legal
  if (!leadSuit) return hand.map(() => true);

  // Cek apakah punya kartu dengan suit yang sama dengan lead?
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);

  return hand.map(c => {
    if (hasLeadSuit) {
      // Wajib Follow Suit: Hanya boleh mainkan kartu yang suit-nya sama
      return c.suit === leadSuit;
    } else {
      // Tidak punya suit lead: Bebas mainkan apa saja (Break)
      return true;
    }
  });
}

/**
 * SRS 4.5.3: Trick Resolution Logic
 * Menentukan indeks pemenang (0-3 relative to trick start) dari 4 kartu.
 */
export function resolveTrick(cards: Card[], trumpSuit: Suit | null): number {
  if (cards.length === 0) throw new Error("Empty trick");
  
  const leadSuit = cards[0].suit;
  let winnerIdx = 0;
  let winnerCard = cards[0];

  for (let i = 1; i < cards.length; i++) {
    const challenger = cards[i];

    // Logika 1: Trump vs Non-Trump
    if (trumpSuit) {
      if (winnerCard.suit === trumpSuit && challenger.suit !== trumpSuit) continue; // Winner bertahan
      if (winnerCard.suit !== trumpSuit && challenger.suit === trumpSuit) {
        // Challenger menang karena Trump
        winnerIdx = i;
        winnerCard = challenger;
        continue;
      }
    }

    // Logika 2: Sesama Suit (Trump vs Trump ATAU Lead vs Lead)
    if (challenger.suit === winnerCard.suit) {
      if (RANK_VALUE[challenger.rank] > RANK_VALUE[winnerCard.rank]) {
        winnerIdx = i;
        winnerCard = challenger;
      }
    }
    
    // Logika 3: Off-suit (Sampah) -> Tidak mungkin menang lawan Lead/Trump
    // (Otomatis skip)
  }

  return winnerIdx;
}