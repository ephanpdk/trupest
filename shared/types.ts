// shared/types.ts

// --- 1. CORE ENTITIES (Kartu & Dasar) ---
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
}

export type GamePhase = 'WAITING' | 'DEALING' | 'BIDDING' | 'TRUMP_SELECTION' | 'TRICK' | 'SCORING' | 'FINISHED';

// --- 2. PUBLIC STATE (Apa yang dilihat Client) ---

// DEFINISI INI HILANG SEBELUMNYA, MAKANYA ERROR
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
    players: PlayerPublic[]; // Menggunakan interface di atas
    
    roundNumber: number;
    dealerIndex: number;
    
    // PERBAIKAN NAMA PROPERTI (Client butuh 'activePlayer', bukan 'Index')
    activePlayer: number; 
    
    trumpSuit: Suit | null;
    isTrumpHidden: boolean;
    currentBid: number;
    bidWinner: number | null;
    
    currentTrick: Card[];
    trickStarterIndex: number;
    trickScores: number[]; 
    
    myHand?: Card[]; 
}

// --- 3. SOCKET EVENTS (Protokol Komunikasi) ---

export interface ClientEvents {
    // Legacy Events (untuk UI awal)
    'C_CREATE_ROOM': { playerName: string };
    'C_JOIN_ROOM': { roomId: string; playerName: string };
    
    // Core Game Events
    'JOIN_GAME': { matchId: string; playerId: string };
    
    'PLAYER_ACTION': {
        matchId: string;
        action: 'BID' | 'PASS' | 'SELECT_TRUMP' | 'PLAY_CARD';
        data: any; 
    };
}

export interface ServerEvents {
    'S_ROOM_CREATED': { roomId: string; playerId: string };
    'GAME_UPDATE': GameStateSnapshot; 
    'STATE_CHANGED': Partial<GameStateSnapshot>; 
    'ACTION_ERROR': { msg: string };
    'S_PLAYER_JOINED': { player: PlayerPublic };
}