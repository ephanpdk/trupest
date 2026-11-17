# TRUPEST - Strategic Card Game Engine

## Overview
TRUPEST is a multiplayer strategic card game with a Vue 3 frontend and Fastify WebSocket backend.

## Project Structure
- `client/` - Vue 3 + Vite frontend with Tailwind CSS
- `server/` - Fastify + WebSocket backend with TypeScript
- `shared/` - Shared TypeScript types between client and server

## Running the Application
The application uses two workflows:
- **Frontend**: Vue/Vite dev server on port 5000 (proxies WebSocket to backend)
- **Backend**: Fastify WebSocket server on port 3001

## Development Setup
- Frontend: `cd client && npm run dev`
- Backend: `cd server && npx tsx src/index.ts`

## Architecture
- The frontend connects to the backend via WebSocket through Vite's proxy
- WebSocket route: `/game`
- Health check route: `/health`
- The game supports human players and AI bots
- Game phases: WAITING → DEALING → BIDDING → TRUMP_SELECTION → TRICK → SCORING → FINISHED

## Key Technologies
- Vue 3 with Pinia for state management
- Vite with rolldown for bundling
- Fastify with WebSocket support
- TypeScript throughout
- Tailwind CSS for styling


## Menjalankan demo (1-4 pemain)
```bash
cd server && npm install && npm run dev      # WebSocket di :3001 (salin .env.example jika perlu)
cd client && npm install && npm run dev      # UI di :5000, proxy /game ke :3001
```
1. Buka beberapa tab/browser, isi nama berbeda dan Room ID yang sama.
2. Tiap pemain boleh memilih Tim A/B atau acak (rekan satu tim duduk berhadapan). Host (pemain pertama) menekan **Mulai Game**; kursi kosong diisi bot.
3. Match Best-of-3 (SRS 4.8). Ronde berikutnya otomatis lanjut setelah 30 detik jika tidak ada yang menekan tombol.

Tes: `cd server && npm test` (engine, Room 1-4 pemain, WebSocket e2e).

## Arsitektur server (ringan)
- `game/engine/*` engine murni & sinkron: tanpa timer, bot, atau I/O. Semua aturan SRS ada di sini.
- `game/room.ts` satu Room = satu match + 1-4 manusia + bot; satu timer per room (bot, turn limit 25 dtk, freeze trick).
- `network/protocol.ts` + `app.ts` validasi pesan (zod), identitas pemain terikat ke koneksi/token, heartbeat.
- `shared/types.ts` kontrak server <-> client.

## Deploy (satu proses)
```bash
cd client && npm ci && npm run build        # hasil: client/dist
cd ../server && npm ci
TRUST_PROXY=1 PORT=8080 SESSION_SECRET=<acak-panjang> npx tsx src/index.ts
```
Server menyajikan `client/dist` sendiri (satu alamat untuk halaman dan WebSocket `/game`). Variabel penting:
`PORT`, `SESSION_SECRET` (tetap, agar reconnect bertahan setelah restart), `TRUST_PROXY=1` di belakang proxy,
`MATCH_LOG_DIR` (opsional, simpan log match). State game ada di memori: restart server menghapus semua room.

## Log match & replay
Dengan `MATCH_LOG_DIR` diisi, tiap match yang selesai ditulis sebagai JSONL (seed, pemain, semua masukan dengan `seq`).
Periksa bahwa log bisa dimainkan ulang persis sama: `cd server && npm run verify-log -- <file.jsonl>`.
Di akhir match client juga memeriksa `serverSeed` terhadap hash yang dikirim di awal (SRS 4.1).

## CI
`.github/workflows/ci.yml`: typecheck + tes server, build client, tiap push dan PR.

## Akun & database (Fase 3)

Tanpa `DATABASE_URL` server jalan dalam mode tamu (semua di memori). Dengan `DATABASE_URL`:
- `POST /auth/register` dan `/auth/login` (nickname + password, scrypt, JWT 7 hari).
- Match selesai disimpan ke `match_log`; match berjalan di-checkpoint tiap trick (`active_match`) dan dipulihkan lewat replay saat server restart.
- `REQUIRE_LOGIN=1` menutup mode tamu. Nama akun tidak bisa dipakai tamu.

Setup gratis: buat project di Neon atau Supabase, salin connection string ke `DATABASE_URL`, isi `SESSION_SECRET` baru. Tabel dibuat otomatis saat start.

Tes database (dilewati jika tidak diset): `DATABASE_URL_TEST=postgres://... npm test` di `server/`.
