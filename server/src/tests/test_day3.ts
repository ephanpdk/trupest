// src/tests/test_day3.ts
import { MatchState } from '../game/engine/state';
import { Card } from '../types/card';

console.log("=== PENGUJIAN DAY 3: GAME STATE & DEALING ===\n");

// 1. Setup Mock Data
const config = { matchId: "MATCH-TEST-001", seed: "RAHASIA_NEGARA", isRanked: true };
const playerIds = ["UserA", "UserB", "UserC", "UserD"];

// 2. Init State
const match = new MatchState(config, playerIds);
console.log(`Phase Awal: ${match.phase} (Expect: WAITING)`);

// 3. Start Round (Dealing)
console.log("... Memulai Ronde (Dealing) ...");
match.startRound();

console.log(`Phase Sekarang: ${match.phase} (Expect: BIDDING)`);

// 4. Verifikasi Integritas Data (SRS 4.2)
let totalDistributed = 0;
const allCards: Set<string> = new Set();
let errorFlag = false;

match.players.forEach(p => {
    const count = p.hand.length;
    totalDistributed += count;
    console.log(`- ${p.name} (Seat ${p.seatId}) punya: ${count} kartu.`);

    // Rule: Harus 13 kartu
    if (count !== 13) {
        console.error(`❌ ERROR: Pemain ini harusnya punya 13 kartu!`);
        errorFlag = true;
    }

    // Rule: Tidak boleh ada kartu kembar di seluruh meja
    p.hand.forEach(c => {
        const cardCode = `${c.rank}${c.suit}`;
        if (allCards.has(cardCode)) {
            console.error(`❌ ERROR: Kartu duplikat ditemukan: ${cardCode}`);
            errorFlag = true;
        }
        allCards.add(cardCode);
    });
});

console.log(`\nTotal Kartu Dibagikan: ${totalDistributed} (Expect: 52)`);

if (!errorFlag && totalDistributed === 52) {
    console.log("✅ SUKSES: Dealing Rules Valid (SRS 4.2)");
} else {
    console.log("❌ GAGAL: Ada kesalahan logika dealing.");
}

console.log("\n=== CONTOH TANGAN PLAYER 1 (Seat 0) ===");
console.log(match.players[0].hand.map(c => `${c.rank}${c.suit}`).join(", "));