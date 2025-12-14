# TRUPEST - Strategic Card Game Engine

## Overview

TRUPEST is a multiplayer strategic card game featuring a Vue 3 frontend and Fastify WebSocket backend. The game supports both human players and AI bots, implementing a trick-taking card game with bidding mechanics similar to Bridge or Spades.

The application follows a client-server architecture with real-time WebSocket communication. The game progresses through distinct phases: WAITING → DEALING → BIDDING → TRUMP_SELECTION → TRICK → SCORING → FINISHED.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Vue 3 with Composition API (`<script setup>`)
- **State Management**: Pinia for centralized game state
- **Build Tool**: Vite with rolldown bundler
- **Styling**: Tailwind CSS with PostCSS/Autoprefixer
- **WebSocket**: Native WebSocket API wrapped in a reactive service layer

The frontend connects to the backend via WebSocket through Vite's dev server proxy (`/game` route). The socket service (`client/src/services/socket.ts`) maintains connection state and delegates message handling to the Pinia store.

### Backend Architecture
- **Framework**: Fastify with WebSocket plugin (`@fastify/websocket`)
- **Language**: TypeScript with CommonJS modules
- **Game Engine**: Custom state machine with phase-based logic

The server implements a game manager pattern (`server/src/game/manager.ts`) that creates and manages match instances. Each match is a `MatchState` object containing all game logic.

**Game Engine Structure**:
- `engine/state.ts` - Core match state and phase transitions
- `engine/phases/` - Phase-specific handlers (bidding, trump, trick, scoring)
- `engine/deck.ts` - Deterministic card shuffling using seeded pseudo-random
- `engine/shuffle.ts` - Fisher-Yates shuffle with SHA-256 based PRNG
- `engine/trick.ts` - Card playing rules and trick resolution
- `engine/bidding.ts` - Bid eligibility and evaluation logic

**AI System**:
- `ai/logic.ts` - Decision-making algorithms for bots
- `ai/orchestrator.ts` - Processes bot turns automatically when active player is a bot

### Shared Code
The `shared/` directory contains TypeScript types used by both client and server:
- Card definitions (Suit, Rank, Card interface)
- Game phases enum
- Public state snapshot interface for client consumption
- Player public information structure

### Communication Protocol
WebSocket messages follow a `{ type, payload }` structure:
- **Client → Server**: `JOIN_GAME`, `PLAYER_ACTION`
- **Server → Client**: `GAME_UPDATE`, `STATE_CHANGED`, `ERROR`

### Data Flow
1. Client connects via WebSocket to `/game`
2. Client sends `JOIN_GAME` with matchId and playerId
3. Server creates/retrieves match, adds player, sends initial state
4. Player actions trigger state mutations and broadcast updates
5. AI orchestrator automatically processes bot turns

## External Dependencies

### Frontend
- **Vue 3** (`vue`) - UI framework
- **Pinia** (`pinia`) - State management
- **Vite/rolldown** - Build tooling (using `rolldown-vite` package override)
- **Tailwind CSS** - Utility-first styling

### Backend
- **Fastify** - HTTP/WebSocket server framework
- **@fastify/websocket** - WebSocket support for Fastify
- **@fastify/cors** - CORS handling
- **ioredis** - Redis client (dependency present but not actively used yet)
- **pg** - PostgreSQL client (dependency present but not actively used yet)
- **uuid** - Unique ID generation
- **zod** - Schema validation
- **dotenv** - Environment configuration

### Development
- **TypeScript** - Type safety across both packages
- **Vitest** - Testing framework for server
- **tsx** - TypeScript execution for development
- **nodemon** - Auto-restart during development

### Infrastructure Notes
- PostgreSQL and Redis dependencies are installed but database schemas/connections are not yet implemented
- Docker Compose configuration exists at `server/docker/docker-compose.yml`
- The application is designed to be extended with persistent storage

## Recent Changes (Dec 2025)

### Play Again Feature
- Added `resetGame()` method in `server/src/game/engine/state.ts` to fully reset game state
- Added `PLAY_AGAIN` and `NEXT_ROUND` action handlers in `server/src/index.ts`
- Created `GameFinished.vue` component showing end-of-round UI with two options:
  - "Lanjut Ronde Berikutnya" - continues with current scores
  - "Main Lagi (Reset Skor)" - resets all scores to 0

### UI Improvements
- Created `HandPreview.vue` - visualizes player's hand cards grouped by suit during BIDDING/TRUMP_SELECTION phases
- Created `PlayerTurnIndicator.vue` - shows all players with visual indicator for active turn, team info, and scores
- Updated `App.vue` to integrate new components