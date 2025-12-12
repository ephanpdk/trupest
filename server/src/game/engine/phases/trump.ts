import { MatchState } from '../state';
import { Suit } from '../../../../../shared/types';

export function handleSelectTrump(state: MatchState, seatId: number, suit: Suit, hidden: boolean): { success: boolean, msg?: string } {
    if (state.phase !== 'TRUMP_SELECTION') return { success: false, msg: "Not trump selection phase" };
    
    // Validasi: Hanya Pemenang Bid yang boleh pilih Trump
    if (state.bidWinner !== seatId) {
        return { success: false, msg: `Only BidWinner (P${state.bidWinner}) can select trump` }; 
    }

    state.trumpSuit = suit;
    state.isTrumpHidden = hidden;

    console.log(`[TRUMP] P${seatId} selects ${suit} ${hidden ? '(HIDDEN)' : '(OPEN)'}`);
    
    // TRANSISI KE FASE MAIN KARTU
    startTrickPhase(state);

    return { success: true };
}

function startTrickPhase(state: MatchState) {
    state.phase = 'TRICK';
    
    // --- LOGIC PERBAIKAN: FORCE ACTIVE PLAYER ---
    if (state.bidWinner !== null) {
        state.activePlayerIndex = state.bidWinner; // <--- INI KUNCINYA
        state.trickStarterIndex = state.bidWinner;
        
        console.log(`=========================================`);
        console.log(`[STATE] TRICK PHASE STARTED`);
        console.log(`[INFO] BidWinner is P${state.bidWinner}`);
        console.log(`[INFO] Force-Setting ActivePlayer to P${state.activePlayerIndex}`);
        console.log(`=========================================`);
    } else {
        console.error("[CRITICAL] BidWinner is NULL during startTrickPhase!");
    }
}