import { describe, it, expect, beforeEach } from 'vitest';
import { MatchState } from '../../game/engine/state';
import { isEligibleBid8 } from '../../game/engine/bidding';
import { Card } from '../../../../shared/types';

// Helper buat bikin tangan cepat
const createHand = (codes: string[]): Card[] => {
    return codes.map(c => {
        const rank = c.slice(0, -1) as any;
        const suit = c.slice(-1) as any;
        return { rank, suit };
    });
};

describe('Day 5: Bidding & Anti-Pass Logic', () => {
    let match: MatchState;

    beforeEach(() => {
        match = new MatchState(
            { matchId: 'BID-TEST', seed: 'TEST', isRanked: true },
            ['P1', 'P2', 'P3', 'P4']
        );
        match.startRound();
    });

    it('SRS 21.4: should detect strong hand (Eligible Bid 8)', () => {
        const strongHand = createHand(['AS', 'KS', 'QS', 'JS', '10S', 'AH', 'KH', '2D', '3D', '4C', '5C', '6C', '7C']);
        expect(isEligibleBid8(strongHand)).toBe(true); 
    });

    it('SRS 21.4: should detect weak hand', () => {
        const weakHand = createHand(['2S', '3S', '4S', '5S', '2H', '3H', '4H', '5H', '2D', '3D', '4D', '5D', '6C']);
        expect(isEligibleBid8(weakHand)).toBe(false);
    });

    it('SRS 4.3.2: Server should REJECT pass if hand is strong', () => {
        match.players[0].hand = createHand(['AS', 'KS', 'QS', 'JS', '10S', 'AH', 'KH', 'AD', 'KD', 'AC', '2C', '3C', '4C']);
        
        // FIX: Matikan token override biar logic Anti-Pass jalan
        match.players[0].passOverridesLeft = 0;

        match.activePlayerIndex = 0; 

        const result = match.playerPass(0);
        
        expect(result.success).toBe(false);
        expect(result.msg).toContain('BID_FORCED_MIN_8'); 
    });

    it('SRS 4.3: Should accept valid bid and advance turn', () => {
        match.activePlayerIndex = 0;
        const result = match.playerBid(0, 8);
        
        expect(result.success).toBe(true);
        expect(match.currentBid).toBe(8);
        expect(match.bidWinner).toBe(0);
        expect(match.activePlayerIndex).toBe(1); 
    });

    it('SRS 4.3.5: Pass All Scenario -> Default 7/7', () => {
        match.players.forEach(p => {
             p.hand = createHand(['2S', '3S', '4S', '5S', '2H', '3H', '4H', '5H', '2D', '3D', '4D', '5D', '6C']);
             p.passOverridesLeft = 0;
        });
        
        // FIX: Paksa giliran ke P0 dulu biar urutannya P0->P1->P2->P3
        match.activePlayerIndex = 0;

        // 4 Orang Pass
        expect(match.playerPass(0).success).toBe(true);
        expect(match.playerPass(1).success).toBe(true);
        expect(match.playerPass(2).success).toBe(true);
        match.playerPass(3);

        expect(match.phase).toBe('TRUMP_SELECTION');
        expect(match.currentBid).toBe(7); 
    });
});