// Pakai: npm run verify-log -- logs/ROOM-123.jsonl  (keluar kode 1 jika replay tidak identik)
import fs from 'fs';
import { verifyMatchLog } from '../game/matchLog';

const file = process.argv[2];
if (!file) {
    console.error('Pakai: npm run verify-log -- <file.jsonl>');
    process.exit(2);
}
try {
    const m = verifyMatchLog(fs.readFileSync(file, 'utf8'));
    console.log(`OK: ${m.events.length} kejadian, pemenang tim ${m.matchWinner}, ronde ${m.roundWins.join('-')}`);
} catch (e) {
    console.error('GAGAL:', (e as Error).message);
    process.exit(1);
}
