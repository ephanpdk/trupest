// Import dasar dari Shared
import { Card, Suit, GamePhase } from '@shared/types'; // Menggunakan alias path

// Interface Player internal Server (lebih detail dari PlayerPublic)
export interface Player {
  id: string;          // UUID / SocketID
  name: string;
  seatId: number;      // 0-3
  hand: Card[];        // Kartu asli
  isBot: boolean;
  passOverridesLeft: number;
}

export interface GameConfig {
  matchId: string;
  seed: string;
  isRanked: boolean;
}