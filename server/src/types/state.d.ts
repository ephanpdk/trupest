// src/types/state.d.ts
import { Card } from './card';

// SRS 2.2 Phase & SRS 3.3 Match Lifecycle
export type MatchPhase = 'WAITING' | 'DEALING' | 'BIDDING' | 'TRUMP_SELECTION' | 'TRICK' | 'SCORING' | 'FINISHED';

// SRS 8.2 Player State Schema
export interface Player {
  id: string;          // UUID / SocketID
  name: string;
  seatId: number;      // 0-3 (Barat, Utara, Timur, Selatan)
  hand: Card[];        // Kartu di tangan
  isBot: boolean;
  passOverridesLeft: number; // SRS 4.3.2 Anti-Pass Override limit
}

export interface GameConfig {
  matchId: string;
  seed: string;        // SRS 4.1 Server Seed
  isRanked: boolean;
}