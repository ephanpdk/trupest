import { describe, it, expect, beforeEach } from 'vitest';
import { MatchState } from '../../game/engine/state';

describe('Engine: Scoring Mathematics', () => {
    let match: MatchState;

    beforeEach(() => {
        // Init state kosong
        match = new MatchState(
            { matchId: 'SCORE-TEST', seed: 'TEST', isRanked: true },
            ['P1', 'P2', 'P3', 'P4']
        );
        // Kita gak startRound(), kita manipulasi variabelnya langsung
    });

    it('SCENARIO 1: Contract MADE (Standard)', () => {
        // SETUP: Team A (0) Bid 8 dan dapet 8 Trick
        match.bidWinner = 0;    // P0 adalah declarer
        match.currentBid = 8;   // Target 8
        match.trickScores = [8, 5]; // Team 0 dapet 8, Team 1 dapet 5 (Total 13)

        // ACTION
        const result = match.calculateScore();

        // ASSERTION
        console.log('[TEST] Scenario 1 Result:', result);
        expect(result.isSuccess).toBe(true);
        expect(result.tricksWon).toBe(8);
        expect(result.score).toBe(80); // 8 * 10
    });

    it('SCENARIO 2: Contract SET (Under)', () => {
        // SETUP: Team A (0) Bid 9 tapi cuma dapet 8 Trick
        match.bidWinner = 0;
        match.currentBid = 9;   // Target 9
        match.trickScores = [8, 5]; // Kurang 1 trick

        // ACTION
        const result = match.calculateScore();

        // ASSERTION
        console.log('[TEST] Scenario 2 Result:', result);
        expect(result.isSuccess).toBe(false);
        expect(result.tricksWon).toBe(8);
        expect(result.score).toBe(-90); // Hukuman: -(9 * 10)
    });

    it('SCENARIO 3: Overtricks (Bonus)', () => {
        // SETUP: Team B (1) Bid 8 tapi dapet 10 Trick
        match.bidWinner = 1;    // P1 adalah declarer (Team 1)
        match.currentBid = 8;
        match.trickScores = [3, 10]; // Team 0 dapet 3, Team 1 dapet 10

        // ACTION
        const result = match.calculateScore();

        // ASSERTION
        console.log('[TEST] Scenario 3 Result:', result);
        expect(result.team).toBe(1); // Pemenang harus Team 1
        expect(result.isSuccess).toBe(true);
        expect(result.tricksWon).toBe(10);
        
        // Tergantung rule lu:
        // Kalau rule 'Flat': Tetap 80
        // Kalau rule 'Bonus': Mungkin jadi 100?
        // Untuk sekarang kita test standard rule dulu
        expect(result.score).toBe(80); 
    });

    it('SCENARIO 4: Massive Fail (Grand Slam Fail)', () => {
        // SETUP: Team A Bid 13 (Minta semua), cuma dapet 0
        match.bidWinner = 0;
        match.currentBid = 13;
        match.trickScores = [0, 13];

        // ACTION
        const result = match.calculateScore();

        // ASSERTION
        expect(result.isSuccess).toBe(false);
        expect(result.score).toBe(-130);
    });
});