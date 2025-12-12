// server/src/game/ai/logic.ts

import { Card, Suit } from '../../../../shared/types';
import { isEligibleBid8, evaluateMainSuit } from '../engine/bidding'; 
import { getLegalMask } from '../engine/trick';

/**
 * Logika Bidding Sederhana
 * - Jika eligible bid 8 (sesuai aturan lo), dia akan Bid.
 * - Jika current bid sudah tinggi, dia Pass.
 */
export function decideBid(hand: Card[], currentBid: number, seatId: number): { action: 'BID' | 'PASS', amount?: number } {
    // 1. Cek kelayakan dasar (Aturan wajib Bid 8)
    const canBid8 = isEligibleBid8(hand);

    console.log(`[AI-LOGIC] Seat ${seatId} thinking Bid... CurrentBid: ${currentBid}, CanBid8: ${canBid8}`);

    // 2. Jika belum ada yang bid dan tangan bagus -> Bid 8
    if (currentBid === 0 && canBid8) {
        return { action: 'BID', amount: 8 };
    }

    // 3. Jika sudah ada bid, bot "malas" dulu (Pass) untuk testing
    // Nanti lo bisa update logika ini untuk Counter-Bid (misal naik ke 9)
    return { action: 'PASS' };
}

/**
 * Logika Pilih Trump
 * - Pilih Suit dengan jumlah kartu terbanyak.
 */
export function decideTrump(hand: Card[]): Suit {
    const evals = evaluateMainSuit(hand);
    
    // evals sudah disortir dari yang terkuat di function evaluateMainSuit
    if (evals.length > 0) {
        const bestSuit = evals[0].suit;
        console.log(`[AI-LOGIC] Deciding Trump. Best Suit: ${bestSuit} (Total Rank: ${evals[0].rankTotal})`);
        return bestSuit;
    }

    // Fallback kalau tangan kosong (mustahil sih) -> Pilih Spade
    return 'S';
}

/**
 * Logika Main Kartu (Trick)
 * - Random valid move (biar game gak crash).
 */
export function decideCardToPlay(hand: Card[], currentTrick: Card[], leadSuit: Suit | null, seatId: number): number {
    const mask = getLegalMask(hand, leadSuit);
    
    // Cari semua index yang true (legal)
    const legalIndices: number[] = [];
    mask.forEach((isLegal, index) => {
        if (isLegal) legalIndices.push(index);
    });

    // SAFETY CHECK: Bot tidak boleh buntu
    if (legalIndices.length === 0) {
        console.error(`[AI CRITICAL ERROR] Seat ${seatId} has NO LEGAL MOVES!`);
        console.error(`Hand:`, hand);
        console.error(`Lead Suit: ${leadSuit}`);
        return -1; // Ini akan mentrigger error di Orchestrator
    }

    // Pilih random dari yang legal
    // Nanti ganti ini dengan strategi (misal: mainkan kartu tertinggi biar menang)
    const randomIndex = Math.floor(Math.random() * legalIndices.length);
    const chosenIndex = legalIndices[randomIndex];
    
    const card = hand[chosenIndex];
    console.log(`[AI-LOGIC] Seat ${seatId} plays ${card.rank}${card.suit} (Random Choice from ${legalIndices.length} options)`);

    return chosenIndex;
}