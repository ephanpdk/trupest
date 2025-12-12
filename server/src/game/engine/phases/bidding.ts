import { MatchState } from '../state';
import { isEligibleBid8 } from '../bidding';

export function handlePlayerBid(state: MatchState, seatId: number, amount: number): { success: boolean, msg?: string } {
    if (state.phase !== 'BIDDING') return { success: false, msg: "Not bidding phase" };
    if (state.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };
    
    if (amount < 8 || amount > 13) return { success: false, msg: "Bid must be 8-13" };
    if (amount <= state.currentBid) return { success: false, msg: "Must bid higher than current" };

    state.currentBid = amount;
    state.bidWinner = seatId;
    state.passCount = 0; 

    console.log(`[BID] P${seatId} bids ${amount}`);
    
    state.biddingTurnCount++;
    checkNextBiddingTurn(state);
    return { success: true };
}

export function handlePlayerPass(state: MatchState, seatId: number): { success: boolean, msg?: string } {
    if (state.phase !== 'BIDDING') return { success: false, msg: "Not bidding phase" };
    if (state.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };
    
    const player = state.players[seatId];
    
    if (player.passOverridesLeft > 0) {
        console.log(`[BID] P${seatId} uses PASS OVERRIDE`);
    } else {
        if (state.currentBid === 0 && isEligibleBid8(player.hand)) {
            return { success: false, msg: "BID_FORCED_MIN_8: Hand too strong to pass!" };
        }
    }

    console.log(`[BID] P${seatId} PASS`);
    state.passCount++;
    state.biddingTurnCount++;
    checkNextBiddingTurn(state);
    return { success: true };
}

function checkNextBiddingTurn(state: MatchState) {
    if (state.biddingTurnCount >= 4) {
        if (state.currentBid === 0) {
            console.log("[BID] 4 Passes detected. Forcing Bid 7.");
            state.currentBid = 7; 
            state.bidWinner = (state.dealerIndex + 1) % 4;
        }
        finishBidding(state);
        return;
    }
    state.activePlayerIndex = (state.activePlayerIndex + 1) % 4;
}

function finishBidding(state: MatchState) {
    state.phase = 'TRUMP_SELECTION';
    if (state.bidWinner !== null) state.activePlayerIndex = state.bidWinner;
    console.log(`[STATE] Bidding Finished. Winner: P${state.bidWinner} with Bid ${state.currentBid}`);
}