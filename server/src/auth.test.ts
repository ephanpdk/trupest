import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { checkPassword, hashPassword, signJwt, verifyJwt } from './auth';

describe('password', () => {
    it('hash bisa diverifikasi, password salah ditolak, hash berbeda tiap kali', async () => {
        const h = await hashPassword('rahasia-123');
        expect(await checkPassword('rahasia-123', h)).toBe(true);
        expect(await checkPassword('rahasia-124', h)).toBe(false);
        expect(h).not.toBe(await hashPassword('rahasia-123'));
        expect(await checkPassword('x', 'bukan-hash')).toBe(false);
    });
});

describe('JWT', () => {
    it('token valid diterima', () => expect(verifyJwt(signJwt('user-1'))).toEqual({ sub: 'user-1' }));

    it('kedaluwarsa, diubah, tanpa tanda tangan, dan alg=none ditolak', () => {
        expect(verifyJwt(signJwt('u', -10))).toBeNull();

        const [h, b, s] = signJwt('u').split('.');
        const other = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9999999999 })).toString('base64url');
        expect(verifyJwt(`${h}.${other}.${s}`)).toBeNull();
        expect(verifyJwt(`${h}.${b}.`)).toBeNull();
        expect(verifyJwt('sampah')).toBeNull();

        const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        expect(verifyJwt(`${none}.${b}.`)).toBeNull();
        expect(verifyJwt(`${none}.${b}.${crypto.randomBytes(8).toString('base64url')}`)).toBeNull();
    });
});
