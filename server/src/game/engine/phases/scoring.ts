import { MatchState } from '../state';

export function calculateScore(state: MatchState): { 
    team: number, 
    bid: number, 
    tricksWon: number, 
    isSuccess: boolean, 
    score: number 
} {
    if (state.bidWinner === null) {
        throw new Error("Cannot calculate score: No Bid Winner defined.");
    }

    // Tim 0: Player 1 & Player 3 (Seat 0 & 2)
    // Tim 1: Player 2 & Player 4 (Seat 1 & 3)
    const declaringTeam = state.bidWinner % 2; 
    const bidVal = state.currentBid;
    const tricksGot = state.trickScores[declaringTeam];
    
    // LOGIC SKOR:
    // Sukses: + (Bid x 10)
    // Gagal:  - (Bid x 10)
    
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

// FUNGSI BARU: Terapkan skor ke pemain
export function applyRoundScore(state: MatchState) {
    const result = calculateScore(state);
    
    console.log(`=========================================`);
    console.log(`[SCORING] Round Resolved!`);
    console.log(`[SCORING] Bidder Team: ${result.team} | Bid: ${result.bid} | Won: ${result.tricksWon}`);
    console.log(`[SCORING] Result: ${result.isSuccess ? 'SUCCESS' : 'FAILED'} | Score Change: ${result.score}`);
    console.log(`=========================================`);

    // Update Skor Player
    state.players.forEach(p => {
        // Jika pemain adalah anggota tim yang menang lelang/defense
        if (p.seatId % 2 === result.team) {
             // Jika tim bidder sukses, mereka dapet poin
             // Jika tim bidder gagal, mereka minus
             p.score += result.score;
        } else {
             // Tim lawan (Defense)
             // Jika Bidder gagal, Defense dapet poin (biasanya). 
             // Tapi untuk logic simple Trupest (mirip Bridge/Spade simple):
             // Kita kasih skor 0 dulu ke defense, atau sesuai aturan lo nanti.
             // Untuk sekarang: Hanya tim bidder yang skornya berubah.
        }
    });

    // TODO: Di sini nanti kita reset untuk Round 2
}