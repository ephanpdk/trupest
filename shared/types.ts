// shared/types.ts
// Kontrak server <-> client. Server adalah satu-satunya sumber kebenaran:
// client hanya merender field di bawah ini (SRS 4.5.1, 4.5.2, 9.2).

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
}

// Kartu seperti yang dilihat client. Hidden trump: suit terlihat, rank '?' (SRS 4.6).
export interface PublicCard {
    suit: Suit;
    rank: Rank | '?';
    isHidden?: boolean;
}

export type GamePhase = 'WAITING' | 'DEALING' | 'BIDDING' | 'TRUMP_SELECTION' | 'TRICK' | 'SCORING' | 'FINISHED';

export interface PlayerPublic {
    id: string;
    name: string;
    seatId: number;
    isBot: boolean;
    // Tim A = kursi 0 & 2, Tim B = kursi 1 & 3 (berhadapan). Di waiting room: pilihan pemain, null = acak.
    team: 'A' | 'B' | null;
    cardCount: number;
    // Skor tim = jumlah ronde yang dimenangkan (Best-of-3, SRS 4.8).
    score: number;
}

// SRS 8.4 (trick_resolve): dikirim setelah kartu ke-4 diterima. Client freeze sampai ini tiba.
export interface TrickResolve {
    cards: Card[];        // urut dari pemain pembuka trick, semua rank terbuka
    starter: number;      // seat pemain pertama di trick ini
    winner: number;       // seat pemenang
    winningCard: Card;
}

// SRS 4.7: target declarer = bid, target lawan = 14 - bid.
export interface RoundResult {
    declarerTeam: number;
    bid: number;
    declarerTricks: number;
    opponentTricks: number;
    declarerTarget: number;
    opponentTarget: number;
    isSuccess: boolean;
    winnerTeam: number;
}

export interface GameStateSnapshot {
    roomId: string;
    phase: GamePhase;
    players: PlayerPublic[];

    roundNumber: number;
    dealerIndex: number;
    activePlayer: number;

    trumpSuit: Suit | null;
    isTrumpHidden: boolean;     // selalu true di TRUPEST: kartu trump tertutup sampai kartu ke-4
    currentBid: number;
    maxBid: number;             // bid tertinggi yang boleh (sekarang 10)
    bidWinner: number | null;
    // Bid terakhir tiap kursi selama bidding: angka 8-13, 'PASS', atau null (belum jalan).
    bids: Array<number | 'PASS' | null>;
    // Server yang memutuskan: true jika pemain yang sedang giliran boleh PASS (anti-pass SRS 4.3.2).
    canPass: boolean;
    // Sisa waktu giliran manusia (ms) saat snapshot dikirim; null jika giliran bot / tidak ada timer.
    turnMsLeft: number | null;
    turnMsTotal: number | null;

    currentTrick: PublicCard[];
    leadSuit: Suit | null;
    trickStarterIndex: number;
    trickScores: number[];
    trickResolve: TrickResolve | null;
    // true sejak kartu ke-4 jatuh sampai trick berikutnya mulai: input terkunci. trickResolve baru terisi
    // setelah kartu trump dibuka, jadi client memakai flag ini untuk membedakan "menunggu buka" dan "bermain".
    tableFrozen: boolean;

    // SRS 8.3: hanya dikirim ke pemain yang sedang giliran main (fase TRICK), selain itu null.
    legalMask: boolean[] | null;
    myHand: Card[];

    teamScores: number[];          // ronde dimenangkan [tim0, tim1]
    lastRound: RoundResult | null;
    matchOver: boolean;
    matchWinner: number | null;

    // SRS 4.1: hash seed dikirim sejak awal, seed asli baru di-reveal saat match selesai.
    seedHash: string;
    serverSeed: string | null;

    // Hanya relevan di fase WAITING.
    hostId: string | null;
    canStart: boolean;
}

// --- Protokol WebSocket: { type, payload } ---

export interface ClientEvents {
    JOIN_GAME: { matchId: string; playerId: string; token?: string };
    START_GAME: { matchId: string };
    PLAYER_ACTION: {
        matchId: string;
        action: 'BID' | 'PASS' | 'SELECT_TRUMP' | 'PLAY_CARD' | 'NEXT_ROUND' | 'PLAY_AGAIN' | 'CHOOSE_TEAM';
        data?: { amount?: number; suit?: Suit; cardIndex?: number; team?: 'A' | 'B' | 'RANDOM' };
    };
}

export interface ServerEvents {
    JOINED: { roomId: string; playerId: string; token: string };
    GAME_UPDATE: GameStateSnapshot;
    TRICK_RESOLVE: TrickResolve;
    ACTION_ERROR: { msg: string };
}
