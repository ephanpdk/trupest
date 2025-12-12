import { MatchState } from '../state';

export function calculateScore(state: MatchState): { team: number, bid: number, tricksWon: number, isSuccess: boolean, score: number } {
    if (state.bidWinner === null) {
        throw new Error("Cannot calculate score: No Bid Winner defined.");
    }

    const declaringTeam = state.bidWinner % 2; 
    const bidVal = state.currentBid;
    const tricksGot = state.trickScores[declaringTeam];
    
    const isSuccess = tricksGot >= bidVal;
    const finalScore = isSuccess ? (bidVal * 10) : -(bidVal * 10);

    return {
        team: declaringTeam,
        bid: bidVal,
        tricksWon: tricksGot,
        isSuccess: isSuccess,
        score: finalScore
    };
}