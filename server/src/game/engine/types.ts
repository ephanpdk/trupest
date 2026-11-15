import { Card } from '../../../../shared/types';

export interface Result {
    success: boolean;
    msg?: string;
}

export interface Player {
    id: string;
    name: string;
    seatId: number;      // 0-3, tim = seatId % 2
    hand: Card[];        // kartu asli, tidak pernah dikirim ke pemain lain
    isBot: boolean;
    newAccount: boolean; // SRS 4.3.2: akun < 3 hari ATAU totalMatch < 20
    passOverridesLeft: number;
    score: number;       // ronde dimenangkan tim pemain ini
}

export interface PlayerInit {
    id: string;
    name?: string;
    isBot?: boolean;
    newAccount?: boolean;
}

export interface GameConfig {
    matchId: string;
    seed: string;              // serverSeed (rahasia sampai match selesai)
    isRanked: boolean;
    isCustomRoom?: boolean;    // SRS 4.3.2: override PASS default OFF di custom room
    overrideEnabled?: boolean; // dipilih creator custom room
}
