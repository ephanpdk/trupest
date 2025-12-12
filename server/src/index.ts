// server/src/index.ts

import Fastify, { FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { WebSocket } from 'ws';
import dotenv from 'dotenv';
import { gameManager } from './game/manager';

dotenv.config();

const server = Fastify({ logger: true });

// Register CORS
server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST']
});

server.register(websocket);

// Map untuk menyimpan koneksi per Match ID
const matchConnections = new Map<string, Set<WebSocket>>();
// Map untuk melacak Player ID dari Socket (PENTING untuk Broadcast yang benar)
const socketToPlayer = new Map<WebSocket, { playerId: string; matchId: string }>();

server.register(async function (fastify) {
  
  fastify.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });

  // Route WebSocket
  fastify.get('/game', { websocket: true }, (connection: { socket: WebSocket }, req: FastifyRequest) => {
    console.log('🔌 New Client Connected');

    connection.socket.on('message', (msg) => {
      try {
        const messageString = msg.toString();
        // [DEBUG] Log pesan masuk biar terpantau
        // console.log('📨 [RAW]:', messageString); 

        const parsed = JSON.parse(messageString);
        const { type, payload } = parsed;

        // ----------------------------------------------------
        // HANDLE JOIN GAME
        // ----------------------------------------------------
        if (type === 'JOIN_GAME' || type === 'C_JOIN_ROOM') {
            const { matchId, playerId } = payload;
            
            // 1. Simpan Metadata Socket (PENTING)
            socketToPlayer.set(connection.socket, { playerId, matchId });

            // 2. Manage Connection Set
            if (!matchConnections.has(matchId)) {
                matchConnections.set(matchId, new Set());
            }
            matchConnections.get(matchId)?.add(connection.socket);

            // 3. Get or Create Match
            let match = gameManager.getMatch(matchId);
            if (!match) {
                console.log(`✨ Creating New Match: ${matchId}`);
                // Auto create match dengan bot
                match = gameManager.createMatch(matchId, [playerId, 'Bot1', 'Bot2', 'Bot3']);
                match.startRound();
            }

            const player = match.players.find(p => p.id === playerId);
            const seatId = player ? player.seatId : -1;

            console.log(`✅ Player ${playerId} joined Match ${matchId} at Seat ${seatId}`);

            // 4. Kirim Full State Awal
            connection.socket.send(JSON.stringify({
                type: 'GAME_UPDATE', // Gunakan tipe yang konsisten dengan Client
                payload: match.getPublicState(seatId !== -1 ? seatId : 0)
            }));
        }

        // ----------------------------------------------------
        // HANDLE PLAYER ACTION
        // ----------------------------------------------------
        if (type === 'PLAYER_ACTION') {
            const { matchId, action, data } = payload;
            
            console.log(`🔍 [ACTION]: ${action} from ${data.playerId}`);

            const match = gameManager.getMatch(matchId);
            if (match) {
                const player = match.players.find(p => p.id === data.playerId);
                
                if (player) {
                    let result: { success: boolean; msg?: string } = { success: false, msg: 'Unknown' };

                    // Eksekusi Logic
                    if (action === 'BID') {
                        result = match.playerBid(player.seatId, data.amount);
                    } 
                    else if (action === 'PASS') {
                        result = match.playerPass(player.seatId);
                    }
                    else if (action === 'SELECT_TRUMP') {
                        result = match.playerSelectTrump(player.seatId, data.suit, data.hidden);
                    }
                    else if (action === 'PLAY_CARD') {
                        // Handle jika client kirim object card, cari indexnya
                        let cardIndex = data.cardIndex;
                        if (data.card && typeof cardIndex !== 'number') {
                             cardIndex = player.hand.findIndex(c => c.rank === data.card.rank && c.suit === data.card.suit);
                        }
                        result = match.playCard(player.seatId, cardIndex);
                    }

                    // --- RESPON & BROADCAST ---
                    if (!result.success) {
                        // Kirim Error ke pengirim saja
                        connection.socket.send(JSON.stringify({ 
                            type: 'ACTION_ERROR', 
                            payload: { msg: result.msg || 'Unknown Error' } 
                        }));
                    } else {
                        // SUCCESS!
                        // Karena state.ts sudah memanggil 'triggerAutomation' (AI Orchestrator),
                        // maka saat kode sampai sini, SEMUA BOT SUDAH JALAN & State sudah final.
                        
                        // BROADCAST ke SEMUA client di room ini
                        const roomSockets = matchConnections.get(matchId);
                        if (roomSockets) {
                            roomSockets.forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    // Cari identitas client ini agar kita bisa kirim kartu tangan DIA sendiri
                                    const clientInfo = socketToPlayer.get(client);
                                    
                                    // Default ke seat 0 (observer) jika tidak ketemu
                                    let observerSeat = 0; 
                                    if (clientInfo) {
                                        const p = match.players.find(pl => pl.id === clientInfo.playerId);
                                        if (p) observerSeat = p.seatId;
                                    }

                                    // PENTING: Gunakan getPublicState agar 'currentTrick' terkirim!
                                    client.send(JSON.stringify({
                                        type: 'GAME_UPDATE', // Pastikan Client handle tipe ini
                                        payload: match.getPublicState(observerSeat)
                                    }));
                                }
                            });
                            console.log(`📡 [BROADCAST] Sent full state update to room ${matchId}`);
                        }
                    }
                }
            }
        }

      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    // Cleanup saat koneksi putus
    connection.socket.on('close', () => {
        const info = socketToPlayer.get(connection.socket);
        if (info) {
            console.log(`❌ Player ${info.playerId} Disconnected`);
            // Hapus dari set room
            if (matchConnections.has(info.matchId)) {
                matchConnections.get(info.matchId)?.delete(connection.socket);
            }
            // Hapus dari map player
            socketToPlayer.delete(connection.socket);
        }
    });
  });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port} (WS Route: /game)`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();