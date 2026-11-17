// Akun nickname + password. Password di-hash scrypt (bawaan Node); sesi = JWT HS256 buatan sendiri yang kecil
// (header dikunci, jadi tidak ada serangan alg=none). Kunci diturunkan dari SESSION_SECRET.
import crypto from 'crypto';
import { promisify } from 'util';
import { SESSION_SECRET } from './config';
import { Db } from './db';

export const NICK_RE = /^[\p{L}\p{N} _.-]{1,20}$/u;
export const NEW_ACC = { MAX_DAYS: 3, MAX_MATCHES: 20 }; // SRS 21.1

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt, 32)).toString('base64')}`;
}

export async function checkPassword(pw: string, stored: string): Promise<boolean> {
    const [alg, salt, hash] = stored.split('$');
    if (alg !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    return crypto.timingSafeEqual(await scrypt(pw, Buffer.from(salt, 'base64'), expected.length), expected);
}

// ---------- JWT HS256 ----------
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const key = () => crypto.createHmac('sha256', SESSION_SECRET).update('trupest-jwt-v1').digest();
const mac = (data: string) => crypto.createHmac('sha256', key()).update(data).digest('base64url');

export function signJwt(sub: string, ttlSec = 7 * 24 * 3600): string {
    const body = Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString('base64url');
    return `${HEADER}.${body}.${mac(`${HEADER}.${body}`)}`;
}

export function verifyJwt(token: string): { sub: string } | null {
    const [h, b, s] = String(token).split('.');
    if (h !== HEADER || !b || !s) return null;
    const good = Buffer.from(mac(`${h}.${b}`));
    const got = Buffer.from(s);
    if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
    try {
        const p = JSON.parse(Buffer.from(b, 'base64url').toString());
        return typeof p.sub === 'string' && typeof p.exp === 'number' && p.exp > Date.now() / 1000 ? { sub: p.sub } : null;
    } catch {
        return null;
    }
}

// ---------- akun ----------
export interface User {
    id: string;
    nickname: string;
    createdAt: Date;
    totalMatches: number;
}

const toUser = (r: any): User => ({ id: r.id, nickname: r.nickname, createdAt: r.created_at, totalMatches: r.total_matches });

export async function register(db: Db, nickname: string, password: string): Promise<User | 'NAME_TAKEN'> {
    try {
        const { rows } = await db.query(
            'INSERT INTO users (nickname, password_hash) VALUES ($1,$2) RETURNING *',
            [nickname, await hashPassword(password)]
        );
        return toUser(rows[0]);
    } catch (e: any) {
        if (e.code === '23505') return 'NAME_TAKEN';
        throw e;
    }
}

let dummyHash: Promise<string> | null = null;

/** null = nickname/password salah (sengaja tidak dibedakan). */
export async function login(db: Db, nickname: string, password: string): Promise<User | null> {
    const { rows } = await db.query('SELECT * FROM users WHERE lower(nickname) = lower($1)', [nickname]);
    // Nickname tidak ada: tetap hitung scrypt agar waktu respons tidak membocorkan keberadaan akun.
    const ok = await checkPassword(password, rows[0]?.password_hash ?? (await (dummyHash ??= hashPassword('dummy'))));
    return rows[0] && ok ? toUser(rows[0]) : null;
}

export async function getUser(db: Db, id: string): Promise<User | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { rows } = await db.query('SELECT * FROM users WHERE id=$1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
}

export async function nicknameTaken(db: Db, name: string): Promise<boolean> {
    return (await db.query('SELECT 1 FROM users WHERE lower(nickname) = lower($1)', [name])).rowCount! > 0;
}

/** SRS 4.3.2: newAccount = akun umur < 3 hari ATAU total match < 20. */
export const isNewAccount = (u: User) =>
    Date.now() - u.createdAt.getTime() < NEW_ACC.MAX_DAYS * 86_400_000 || u.totalMatches < NEW_ACC.MAX_MATCHES;
