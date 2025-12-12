import { MatchState } from '../state';
import { getLegalMask, resolveTrick } from '../trick'; 

export function handlePlayCard(state: MatchState, seatId: number, cardIndex: number): { success: boolean, msg?: string } {
    if (state.phase !== 'TRICK') return { success: false, msg: "Not trick phase" };
    if (state.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };

    const player = state.players[seatId];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { success: false, msg: "Invalid card index" };

    const cardToPlay = player.hand[cardIndex];
    const leadSuit = state.currentTrick.length > 0 ? state.currentTrick[0].suit : null;
    const mask = getLegalMask(player.hand, leadSuit);
    
    if (!mask[cardIndex]) {
        return { success: false, msg: "Illegal Move: Must follow suit!" }; 
    }

    player.hand.splice(cardIndex, 1);
    state.currentTrick.push(cardToPlay);
    console.log(`[GAME] P${seatId} plays ${cardToPlay.rank}${cardToPlay.suit}`);

    if (state.currentTrick.length === 4) {
        resolveCurrentTrick(state);
    } else {
        state.activePlayerIndex = (state.activePlayerIndex + 1) % 4;
    }

    return { success: true };
}

function resolveCurrentTrick(state: MatchState) {
    const winnerOffset = resolveTrick(state.currentTrick, state.trumpSuit);
    const winnerSeat = (state.trickStarterIndex + winnerOffset) % 4;

    console.log(`[TRICK] Winner: Player ${winnerSeat} (Card: ${state.currentTrick[winnerOffset].rank}${state.currentTrick[winnerOffset].suit})`);

    const winningTeam = winnerSeat % 2; 
    state.trickScores[winningTeam]++;

    state.currentTrick = [];
    state.activePlayerIndex = winnerSeat;
    state.trickStarterIndex = winnerSeat;

    if (state.players[0].hand.length === 0) {
        state.phase = 'SCORING'; 
        console.log("[STATE] Round Finished.");
    }
}