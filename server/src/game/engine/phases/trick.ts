import { MatchState } from '../state';
import { getLegalMask, resolveTrick } from '../trick'; 

export function handlePlayCard(state: MatchState, seatId: number, cardIndex: number): { success: boolean, msg?: string } {
    if (state.phase !== 'TRICK') return { success: false, msg: "Not trick phase" };
    if (state.activePlayerIndex !== seatId) return { success: false, msg: `Not your turn (Active: ${state.activePlayerIndex}, You: ${seatId})` };

    const player = state.players[seatId];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { success: false, msg: "Invalid card index" };

    const cardToPlay = player.hand[cardIndex];
    const leadSuit = state.currentTrick.length > 0 ? state.currentTrick[0].suit : null;
    const mask = getLegalMask(player.hand, leadSuit);
    
    if (!mask[cardIndex]) {
        // AI Random Picker mungkin kadang salah kalau mask logic bug, kita prevent crash
        return { success: false, msg: "Illegal Move: Must follow suit!" }; 
    }

    // Eksekusi Move
    player.hand.splice(cardIndex, 1);
    
    // --- DEBUG LOGGING ---
    console.log(`[GAME] P${seatId} plays ${cardToPlay.rank}${cardToPlay.suit}`);
    
    // Push ke array state utama
    state.currentTrick.push(cardToPlay);
    
    // Validasi Push
    console.log(`[DEBUG TRICK] Table now has ${state.currentTrick.length} cards.`);

    if (state.currentTrick.length === 4) {
        resolveCurrentTrick(state);
    } else {
        state.activePlayerIndex = (state.activePlayerIndex + 1) % 4;
        console.log(`[DEBUG TRICK] Next Turn: P${state.activePlayerIndex}`);
    }

    return { success: true };
}

function resolveCurrentTrick(state: MatchState) {
    const winnerOffset = resolveTrick(state.currentTrick, state.trumpSuit);
    const winnerSeat = (state.trickStarterIndex + winnerOffset) % 4;

    console.log(`[TRICK RESOLVED] Winner: Player ${winnerSeat} (Card: ${state.currentTrick[winnerOffset].rank}${state.currentTrick[winnerOffset].suit})`);

    const winningTeam = winnerSeat % 2; 
    state.trickScores[winningTeam]++;

    state.currentTrick = []; // Reset Trick
    state.activePlayerIndex = winnerSeat;
    state.trickStarterIndex = winnerSeat;

    if (state.players[0].hand.length === 0) {
        state.phase = 'SCORING'; 
        console.log("[STATE] Round Finished.");
    }
}