// src/tests/test_day2.ts
import { Deck } from '../game/engine/deck';

console.log("=== PENGUJIAN DAY 2: DECK & SHUFFLE ===\n");

const SEED_A = "rahasia123";
const SEED_B = "rahasia123"; // Seed sama
const SEED_C = "beda_dong";  // Seed beda

console.log(`1. Membuat Deck A dengan seed: '${SEED_A}'`);
const deckA = new Deck(SEED_A);
const resultA = deckA.debugDump();
console.log("   5 Kartu Teratas:", resultA.slice(0, 5));

console.log(`\n2. Membuat Deck B dengan seed: '${SEED_B}' (HARUS SAMA DENGAN A)`);
const deckB = new Deck(SEED_B);
const resultB = deckB.debugDump();
console.log("   5 Kartu Teratas:", resultB.slice(0, 5));

const isIdentical = JSON.stringify(resultA) === JSON.stringify(resultB);
console.log(`   STATUS: ${isIdentical ? "✅ SUKSES (Deterministik)" : "❌ GAGAL (Acak)"}`);

console.log(`\n3. Membuat Deck C dengan seed: '${SEED_C}' (HARUS BEDA)`);
const deckC = new Deck(SEED_C);
const resultC = deckC.debugDump();
console.log("   5 Kartu Teratas:", resultC.slice(0, 5));

const isDifferent = JSON.stringify(resultA) !== JSON.stringify(resultC);
console.log(`   STATUS: ${isDifferent ? "✅ SUKSES (Bervariasi)" : "❌ GAGAL (Sama persis)"}`);

console.log("\n=== SELESAI ===");