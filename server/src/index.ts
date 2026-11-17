import dotenv from 'dotenv';
dotenv.config();

import { buildServer } from './app';
import { migrate, openDb } from './db';

async function main() {
    const db = openDb();
    if (db) await migrate(db); // buat tabel bila belum ada (aman diulang)
    else console.warn('DATABASE_URL kosong: mode tamu saja, state hanya di memori.');

    const app = buildServer({}, db);
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
