// server/src/game/ai/orchestrator.ts

import { MatchState } from '../engine/state';
import * as AILogic from './logic';

export function processBotTurns(state: MatchState) {
    let activePlayer = state.players[state.activePlayerIndex];
    let safetyCounter = 0;

    while (activePlayer.isBot && state.phase !== 'WAITING' && state.phase !== 'SCORING' && safetyCounter < 100) {
        console.log(`[AI] Processing turn for ${activePlayer.name} (Seat ${activePlayer.seatId}) in phase ${state.phase}...`);
        
        if (state.phase === 'BIDDING') {
            const decision = AILogic.decideBid(activePlayer.hand, state.currentBid, activePlayer.seatId);
            if (decision.action === 'BID' && decision.amount) {
                const bidAmount = Math.max(decision.amount, state.currentBid + 1);
                state.playerBid(activePlayer.seatId, bidAmount);
            } else {
                state.playerPass(activePlayer.seatId);
            }
        } 
        else if (state.phase === 'TRUMP_SELECTION') {
            if (state.bidWinner === activePlayer.seatId) {
                const bestSuit = AILogic.decideTrump(activePlayer.hand);
                state.playerSelectTrump(activePlayer.seatId, bestSuit, false); 
            } else {
                console.warn(`[AI WARNING] Bot Seat ${activePlayer.seatId} is active but NOT BidWinner.`);
                break; 
            }
        } 
        else if (state.phase === 'TRICK') {
            // --- DEBUG APA YANG DILIHAT BOT ---
            console.log(`[AI VIEW] Seat ${activePlayer.seatId} sees Table Cards: ${state.currentTrick.length}`);
            if (state.currentTrick.length > 0) {
                 console.log(`[AI VIEW] Lead Suit: ${state.currentTrick[0].suit}`);
            }
            // ---------------------------------

            const leadSuit = state.currentTrick.length > 0 ? state.currentTrick[0].suit : null;
            const cardIndex = AILogic.decideCardToPlay(activePlayer.hand, state.currentTrick, leadSuit, activePlayer.seatId);
            
            if (cardIndex !== -1) {
                state.playCard(activePlayer.seatId, cardIndex);
            } else {
                console.error(`[AI CRITICAL] Bot ${activePlayer.name} has no legal moves!`);
                break; 
            }
        }

        activePlayer = state.players[state.activePlayerIndex];
        safetyCounter++;
    }

    if (!activePlayer.isBot) {
        console.log(`[AI] Loop stopped. Waiting for Human Input (Seat ${activePlayer.seatId}).`);
    }
}