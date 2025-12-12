import { MatchState } from '../state';
import { Suit } from '../../../../../shared/types';

export function handleSelectTrump(state: MatchState, seatId: number, suit: Suit, hidden: boolean): { success: boolean, msg?: string } {
    if (state.phase !== 'TRUMP_SELECTION') return { success: false, msg: "Not trump selection phase" };
    if (state.bidWinner !== seatId) return { success: false, msg: "Only declarer can select trump" }; 

    state.trumpSuit = suit;
    state.isTrumpHidden = hidden;

    console.log(`[TRUMP] P${seatId} selects ${suit} ${hidden ? '(HIDDEN)' : '(OPEN)'}`);
    startTrickPhase(state);

    return { success: true };
}

function startTrickPhase(state: MatchState) {
    state.phase = 'TRICK';
    if (state.bidWinner !== null) {
        state.activePlayerIndex = state.bidWinner;
        state.trickStarterIndex = state.bidWinner;
    }
    console.log(`[STATE] Phase TRICK started. Lead: P${state.activePlayerIndex}`);
}