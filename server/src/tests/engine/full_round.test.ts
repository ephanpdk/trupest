import { describe, it, expect } from 'vitest';
import { MatchState } from '../../game/engine/state';
import { getLegalMask } from '../../game/engine/trick';

describe('Day 6: Full Round Simulation', () => {
    
    it('Should play a complete round (13 tricks) without crashing', () => {
        // 1. Setup
        const match = new MatchState(
            { matchId: 'FULL-SIM', seed: 'SIMULASI_DAY6', isRanked: true },
            ['P1', 'P2', 'P3', 'P4']
        );
        match.startRound();

        console.log(`[INFO] First bidder is P${match.activePlayerIndex}`);
        expect(match.phase).toBe('BIDDING');

        // --- SMART BIDDING LOGIC ---
        // Strategi: Semua Pass sampai giliran P0, P0 Bid 8, terus semua Pass lagi sampai beres.
        
        // Step A: Skip pemain lain sampai giliran P0
        let safetyCounter = 0;
        while (match.activePlayerIndex !== 0 && safetyCounter < 4) {
            console.log(`[BID] P${match.activePlayerIndex} PASS (Skipping to P0)`);
            const res = match.playerPass(match.activePlayerIndex);
            if (!res.success) throw new Error(`Skip Pass Failed: ${res.msg}`);
            safetyCounter++;
        }

        // Step B: P0 melakukan Bid
        if (match.activePlayerIndex !== 0) {
            throw new Error("Failed to rotate to P0 for bidding.");
        }
        console.log('[BID] P0 BIDS 8');
        const bidRes = match.playerBid(0, 8);
        if (!bidRes.success) throw new Error(`P0 Bid Failed: ${bidRes.msg}`);

        // Step C: Sisanya Pass sampai fase berubah jadi TRUMP_SELECTION
        safetyCounter = 0;
        while (match.phase === 'BIDDING' && safetyCounter < 10) {
            const active = match.activePlayerIndex;
            
            // Kalau balik ke P0 lagi dan P0 udah menang bid, break manual
            if (active === 0 && match.bidWinner === 0) break;

            console.log(`[BID] P${active} PASS (Finalizing)`);
            const res = match.playerPass(active);
            if (!res.success) throw new Error(`Finalize Pass Failed: ${res.msg}`);
            safetyCounter++;
        }
        // ---------------------------

        // 3. Trump Selection
        expect(match.phase).toBe('TRUMP_SELECTION');
        expect(match.bidWinner).toBe(0);
        
        // P0 pilih Spades (Open)
        const selectRes = match.playerSelectTrump(0, 'S', false);
        expect(selectRes.success).toBe(true);
        expect(match.phase).toBe('TRICK');

        // 4. TRICK LOOP (13 Tricks)
        console.log('\n--- STARTING 13 TRICKS LOOP ---');
        
        for (let trickNum = 1; trickNum <= 13; trickNum++) {
            // Loop 4 pemain per trick
            for (let turn = 0; turn < 4; turn++) {
                const activeSeat = match.activePlayerIndex;
                const player = match.players[activeSeat];
                
                // Cari kartu legal
                const leadSuit = match.currentTrick.length > 0 ? match.currentTrick[0].suit : null;
                const mask = getLegalMask(player.hand, leadSuit);
                const cardIndex = mask.indexOf(true);
                
                if (cardIndex === -1) {
                    throw new Error(`P${activeSeat} has no legal moves! Hand: ${JSON.stringify(player.hand)}`);
                }

                // Mainkan kartu
                const res = match.playCard(activeSeat, cardIndex);
                if (!res.success) {
                    throw new Error(`Play Failed: ${res.msg || 'Unknown error'}`);
                }
            }
        }

        // 5. Verifikasi Akhir
        console.log('--- ROUND FINISHED ---');
        expect(match.phase).toBe('SCORING');
        expect(match.players[0].hand.length).toBe(0); 
        
        const totalScore = match.trickScores[0] + match.trickScores[1];
        expect(totalScore).toBe(13); 
        
        console.log(`Final Trick Score: Team A ${match.trickScores[0]} - Team B ${match.trickScores[1]}`);
    });
});