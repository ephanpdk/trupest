// Penyimpanan Postgres (opsional: tanpa DATABASE_URL server jalan seperti sebelumnya, hanya mode tamu, state di memori).
import { Pool } from 'pg';
import { GameEvent } from './game/engine/events';
import { PlayerInit } from './game/engine/types';
import { MatchRecord } from './game/matchLog';

export type Db = Pool;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    total_matches int NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_lower ON users (lower(nickname));

-- SRS 4.8.3 / 21.2: satu baris per match selesai; events = log masukan untuk replay.
CREATE TABLE IF NOT EXISTS match_log (
    id bigserial PRIMARY KEY,
    match_id text NOT NULL,
    seed text NOT NULL,
    players jsonb NOT NULL,
    result jsonb NOT NULL,
    events jsonb NOT NULL,
    ended_at timestamptz NOT NULL DEFAULT now()
);

-- Match yang sedang berjalan, disimpan tiap trick selesai; dipulihkan lewat replay saat server restart.
CREATE TABLE IF NOT EXISTS active_match (
    match_id text PRIMARY KEY,
    seed text NOT NULL,
    players jsonb NOT NULL,
    user_ids jsonb NOT NULL,
    events jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);`;

export function openDb(url = process.env.DATABASE_URL): Db | null {
    if (!url) return null;
    const db = new Pool({ connectionString: url, max: 5 });
    // Koneksi idle yang diputus server (Neon tidur) jangan mematikan proses.
    db.on('error', e => console.error('[DB] koneksi idle error:', e.message));
    return db;
}

export const migrate = (db: Db) => db.query(SCHEMA);

// Tulis per match berurutan: checkpoint terlambat tidak boleh menimpa hapus/simpan akhir.
const tails = new Map<string, Promise<unknown>>();
export function serial<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const run = (tails.get(key) ?? Promise.resolve()).then(fn, fn);
    const tail = run.catch(() => undefined);
    tails.set(key, tail);
    tail.then(() => tails.get(key) === tail && tails.delete(key));
    return run;
}

export function saveCheckpoint(db: Db, r: MatchRecord, userIds: Array<string | null>) {
    return serial(r.matchId, () =>
        db.query(
            `INSERT INTO active_match (match_id, seed, players, user_ids, events) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (match_id) DO UPDATE SET seed=$2, players=$3, user_ids=$4, events=$5, updated_at=now()`,
            [r.matchId, r.seed, JSON.stringify(r.players), JSON.stringify(userIds), JSON.stringify(r.events)]
        )
    );
}

export const deleteCheckpoint = (db: Db, matchId: string) =>
    serial(matchId, () => db.query('DELETE FROM active_match WHERE match_id=$1', [matchId]));

/** Match selesai: simpan log, tambah total_matches tiap akun, hapus checkpoint. Satu transaksi. */
export function saveMatch(db: Db, r: MatchRecord, userIds: Array<string | null>) {
    return serial(r.matchId, async () => {
        const c = await db.connect();
        try {
            await c.query('BEGIN');
            await c.query(
                'INSERT INTO match_log (match_id, seed, players, result, events) VALUES ($1,$2,$3,$4,$5)',
                [r.matchId, r.seed, JSON.stringify(r.players), JSON.stringify(r.result), JSON.stringify(r.events)]
            );
            const accounts = [...new Set(userIds.filter((x): x is string => !!x))];
            if (accounts.length) await c.query('UPDATE users SET total_matches = total_matches + 1 WHERE id = ANY($1::uuid[])', [accounts]);
            await c.query('DELETE FROM active_match WHERE match_id=$1', [r.matchId]);
            await c.query('COMMIT');
        } catch (e) {
            await c.query('ROLLBACK').catch(() => undefined);
            throw e;
        } finally {
            c.release();
        }
    });
}

export interface ActiveRow {
    matchId: string;
    seed: string;
    players: PlayerInit[];
    userIds: Array<string | null>;
    events: GameEvent[];
}

export async function loadCheckpoints(db: Db): Promise<ActiveRow[]> {
    const { rows } = await db.query('SELECT match_id, seed, players, user_ids, events FROM active_match');
    return rows.map(r => ({ matchId: r.match_id, seed: r.seed, players: r.players, userIds: r.user_ids, events: r.events }));
}
