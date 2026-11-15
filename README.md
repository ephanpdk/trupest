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
2. Host (pemain pertama) menekan **Mulai Game**; kursi kosong diisi bot. Game mulai otomatis jika 4 pemain masuk.
3. Match Best-of-3 (SRS 4.8). Ronde berikutnya otomatis lanjut setelah 30 detik jika tidak ada yang menekan tombol.

Tes: `cd server && npm test` (engine, Room 1-4 pemain, WebSocket e2e).

## Arsitektur server (ringan)
- `game/engine/*` engine murni & sinkron: tanpa timer, bot, atau I/O. Semua aturan SRS ada di sini.
- `game/room.ts` satu Room = satu match + 1-4 manusia + bot; satu timer per room (bot, turn limit 25 dtk, freeze trick).
- `network/protocol.ts` + `app.ts` validasi pesan (zod), identitas pemain terikat ke koneksi/token, heartbeat.
- `shared/types.ts` kontrak server <-> client.
