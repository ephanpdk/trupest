// src/game/engine/deck.ts
import { Card, Suit, Rank } from '../../types/card';
import { deterministicShuffle } from './shuffle';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Deck {
  private cards: Card[];
  private seed: string;

  constructor(seed: string) {
    this.seed = seed;
    this.cards = this.generateDeck();
    this.shuffle();
  }

  // Bikin 52 kartu urut
  private generateDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  }

  // Kocok pakai algoritma deterministik kita
  private shuffle(): void {
    this.cards = deterministicShuffle(this.cards, this.seed);
  }

  // Fungsi buat ngambil kartu (dealing)
  public deal(count: number): Card[] {
    if (count > this.cards.length) {
      throw new Error('Not enough cards in deck');
    }
    return this.cards.splice(0, count);
  }

  public getRemainingCount(): number {
    return this.cards.length;
  }

  // Debugging only: Liat isi deck sekarang
  public debugDump(): string[] {
    return this.cards.map(c => `${c.rank}${c.suit}`);
  }
}