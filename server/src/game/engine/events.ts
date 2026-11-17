import { Suit } from '../../../../shared/types';

// Log kejadian = hanya MASUKAN yang mengubah state (SRS 4.9). Dengan serverSeed + daftar ini,
// seluruh match bisa dimainkan ulang persis sama. seq naik 1 per kejadian (sequenceId).
export type GameEvent =
    | { seq: number; t: 'BID'; seat: number; amount: number }
    | { seq: number; t: 'PASS'; seat: number }
    | { seq: number; t: 'TRUMP'; seat: number; suit: Suit }
    | { seq: number; t: 'PLAY'; seat: number; index: number }
    | { seq: number; t: 'REVEAL' }
    | { seq: number; t: 'TRICK_END' }
    | { seq: number; t: 'NEXT_ROUND' };

type Body<T> = T extends unknown ? Omit<T, 'seq'> : never;
export type GameEventBody = Body<GameEvent>;
