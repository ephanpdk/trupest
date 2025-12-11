// src/tests/test_day4.ts
import { MatchState } from '../game/engine/state';
import { Suit } from '../types/card';

console.log("=== PENGUJIAN DAY 4: TRICK ENGINE & RULES ===\n");

const match = new MatchState(
    { matchId: "TEST-TRICK", seed: "TRICK_SEED", isRanked: false },
    ["P1", "P2", "P3", "P4"]
);

// 1. Setup Manual Tangan Pemain (Biar skenario terkontrol)
match.startRound();
match.debugSetTrump('S'); // Trump = SPADES

// Override kartu biar kita bisa test rule
match.players[0].hand = [{ rank: '10', suit: 'H' }]; // Lead Heart
match.players[1].hand = [{ rank: 'A', suit: 'H' }, { rank: '2', suit: 'D' }]; // Punya Heart & Diamond
match.players[2].hand = [{ rank: '2', suit: 'S' }]; // Gak punya Heart, ada Trump Kecil
match.players[3].hand = [{ rank: 'K', suit: 'H' }]; // Punya Heart Tinggi

match.activePlayerIndex = 0; // P1 Jalan duluan
match.trickStarterIndex = 0;

// === TEST 1: P1 Lead ===
console.log("1. P1 Lead 10H");
match.playCard(0, 0); // Sukses

// === TEST 2: P2 Curang (Illegal Move) ===
console.log("\n2. P2 coba buang 2D (Padahal punya Heart)");
const resultCurang = match.playCard(1, 1); // Index 1 = 2D
if (!resultCurang.success) {
    console.log("   ✅ Server Reject: " + resultCurang.msg);
} else {
    console.error("   ❌ ERROR: Server membiarkan kecurangan!");
}

// === TEST 3: P2 Tobat (Legal Move) ===
console.log("\n3. P2 main AH (Follow Suit)");
match.playCard(1, 0); // Mainkan AH

// === TEST 4: P3 Trump Cut ===
console.log("\n4. P3 Trump Cut pake 2S (Gak punya Heart)");
match.playCard(2, 0);

// === TEST 5: P4 Follow Suit ===
console.log("\n5. P4 main KH");
match.playCard(3, 0); 
// Disini harusnya otomatis resolveTrick

// === VERIFIKASI PEMENANG ===
// Trick: 10H, AH, 2S, KH
// Trump: S
// Winner harusnya P3 (Seat 2) karena 2S adalah Trump
console.log(`\nActive Player Sekarang: Player ${match.activePlayerIndex} (Winner)`);

if (match.activePlayerIndex === 2) {
    console.log("✅ SUKSES: Logic Trump Cut benar (2S mengalahkan AH).");
} else {
    console.log(`❌ GAGAL: Pemenang salah. Harusnya P3.`);
}