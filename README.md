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
