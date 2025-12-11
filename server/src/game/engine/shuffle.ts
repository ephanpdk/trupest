// src/game/engine/shuffle.ts
import crypto from 'crypto';

/**
 * Menghasilkan angka random deterministik berdasarkan seed.
 * Kita pakai hashing SHA-256 biar tidak bisa ditebak tapi konsisten.
 */
function pseudoRandom(seed: string, offset: number): number {
  const input = `${seed}:${offset}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // Ambil 8 karakter pertama hex, ubah ke integer, lalu normalisasi 0-1
  const intVal = parseInt(hash.substring(0, 8), 16);
  return intVal / 0xffffffff;
}

/**
 * Fisher-Yates Shuffle Algorithm (Deterministic Version)
 * @param array Array kartu yang mau dikocok
 * @param seed Seed string (misal: MatchID atau ServerSecret)
 */
export function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array]; // Copy array biar gak merusak aslinya
  let m = shuffled.length;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    // Gunakan (length - m) sebagai offset biar setiap iterasi unik
    const r = Math.floor(pseudoRandom(seed, shuffled.length - m) * m--);

    // And swap it with the current element.
    const t = shuffled[m];
    shuffled[m] = shuffled[r];
    shuffled[r] = t;
  }

  return shuffled;
}