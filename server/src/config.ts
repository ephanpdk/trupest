import crypto from 'crypto';

const num = (name: string, fallback: number) => {
    const v = Number(process.env[name]);
    return process.env[name] !== undefined && Number.isFinite(v) ? v : fallback;
};

// Satu tempat untuk semua konstanta waktu (SRS 21.1). Bisa di-override lewat env / opsi Room.
export const TIME = {
    botDelayMs: num('BOT_DELAY_MS', 700),         // jeda bot supaya manusia bisa mengikuti
    revealDelayMs: num('REVEAL_DELAY_MS', 1200),   // kartu ke-4 trump masih tertutup, lalu semua dibuka bersamaan
    trickResolveMs: num('TRICK_RESOLVE_MS', 2600), // jeda melihat semua kartu setelah dibuka, sebelum trick berikut (SRS 4.5.2)
    turnLimitMs: num('TURN_LIMIT_MS', 25_000),     // SRS 4.10.2
    nextRoundMs: num('NEXT_ROUND_MS', 30_000),     // SRS 4.8.2: ready prompt 30 dtk, lalu lanjut otomatis
    maxTimeouts: 3,                                // 3x timeout -> AI takeover
    heartbeatMs: 5_000,                            // SRS 6.4.2
    heartbeatMissedLimit: 5,                       // 5x tanpa pong = disconnect
    roomIdleMs: 10 * 60_000,
};

export const MAX_ROOMS = 500;
// Folder log match (JSONL, untuk replay & audit). Kosong = tidak menulis log.
export const MATCH_LOG_DIR = process.env.MATCH_LOG_DIR || '';
// Batas penyalahgunaan: tanpa ini satu skrip bisa membuka 500 room kosong. Di belakang proxy, set Fastify trustProxy agar req.ip benar.
export const LIMITS = { connPerIp: 20, msgsPerSec: 30 }; // objek biasa supaya tes bisa menaikkannya

// Menandatangani token sesi pemain; kosong = acak setiap server start.
export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
