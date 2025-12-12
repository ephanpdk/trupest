// shared/types.ts

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
}

export type GamePhase = 'WAITING' | 'DEALING' | 'BIDDING' | 'TRUMP_SELECTION' | 'TRICK' | 'SCORING' | 'FINISHED';

export interface PlayerPublic {
    id: string;
    name: string;
    seatId: number;
    isBot: boolean;
    cardCount: number; 
    score: number;     
    isReady?: boolean; 
}

export interface GameStateSnapshot {
    roomId: string;
    phase: GamePhase;
    players: PlayerPublic[];
    roundNumber: number;
    dealerIndex: number;
    activePlayerIndex: number;
    trumpSuit: Suit | null;
    isTrumpHidden: boolean;
    currentBid: number;
    bidWinner: number | null;
    currentTrick: Card[];
    trickStarterIndex: number;
    trickScores: number[]; 
    myHand?: Card[]; 
}

// --- SOCKET EVENTS ---

export interface ClientEvents {
    // Legacy / UI Events
    'C_CREATE_ROOM': { playerName: string };
    'C_JOIN_ROOM': { roomId: string; playerName: string };
    
    // UPDATE: Event Utama yang didengar Server (sesuai index.ts)
    'JOIN_GAME': { matchId: string; playerId: string };
    
    'PLAYER_ACTION': {
        matchId: string;
        action: 'BID' | 'PASS' | 'SELECT_TRUMP' | 'PLAY_CARD';
        data: any; // Kita buat any dulu untuk data yang dinamis, atau bisa diperdetail
    };
}

export interface ServerEvents {
    'S_ROOM_CREATED': { roomId: string; playerId: string };
    'GAME_UPDATE': GameStateSnapshot; // Server mengirim ini
    'STATE_CHANGED': Partial<GameStateSnapshot>; // Server mengirim ini
    'ACTION_ERROR': { msg: string };
    'S_PLAYER_JOINED': { player: PlayerPublic };
}