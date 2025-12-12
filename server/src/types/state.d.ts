// Import dasar dari Shared
// Sesuaikan path ini jika folder shared ada di root project (../../shared/types)
import { Card, Suit, GamePhase } from '../../../shared/types'; 

// Interface Player internal Server (lebih detail dari PlayerPublic)
export interface Player {
  id: string;          // UUID / SocketID
  name: string;
  seatId: number;      // 0-3
  hand: Card[];        // Kartu asli
  isBot: boolean;
  passOverridesLeft: number;
  
  // INI YANG SEBELUMNYA HILANG:
  score: number;
}

export interface GameConfig {
  matchId: string;
  seed: string;
  isRanked: boolean;
}