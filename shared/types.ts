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
// Kita pisahkan data sensitif (kartu lawan) dari data publik
export interface PlayerPublic {
    id: string;
    name: string;
    seatId: number;
    isBot: boolean;
    cardCount: number; // Client cuma perlu tau jumlah kartu lawan, bukan isinya
    score: number;     // Utk tracking score sementara
    isReady?: boolean; // Utk lobby
}

export interface GameStateSnapshot {
    roomId: string;
    phase: GamePhase;
    players: PlayerPublic[];
    
    // Context Permainan
    roundNumber: number;
    dealerIndex: number;
    activePlayerIndex: number;
    
    // Trump & Bidding
    trumpSuit: Suit | null;
    isTrumpHidden: boolean;
    currentBid: number;
    bidWinner: number | null;
    
    // Trick saat ini (Kartu di meja)
    currentTrick: Card[];
    trickStarterIndex: number;
    trickScores: number[]; // [Team A, Team B]
    
    // Kartu saya (hanya diisi server saat kirim ke ownernya)
    myHand?: Card[]; 
}

// --- 3. SOCKET EVENTS (Protokol Komunikasi) ---

// Client -> Server (Action)
export interface ClientEvents {
    'C_CREATE_ROOM': { playerName: string };
    'C_JOIN_ROOM': { roomId: string; playerName: string };
    'C_BID': { amount: number }; // 0 = Pass
    'C_SELECT_TRUMP': { suit: Suit; hidden: boolean };
    'C_PLAY_CARD': { cardIndex: number };
}

// Server -> Client (Notification)
export interface ServerEvents {
    'S_ROOM_CREATED': { roomId: string; playerId: string };
    'S_GAME_STATE': GameStateSnapshot; // Update full state
    'S_ERROR': { message: string };
    'S_PLAYER_JOINED': { player: PlayerPublic };
}