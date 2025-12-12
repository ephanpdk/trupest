// server/src/index.ts

import Fastify, { FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors'; // Tambahkan ini agar aman
import { WebSocket } from 'ws';
import dotenv from 'dotenv';
import { gameManager } from './game/manager';

dotenv.config();

const server = Fastify({ logger: true });

// Register CORS (Penting untuk akses browser)
server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST']
});

server.register(websocket);

// Map untuk menyimpan koneksi per Match ID
const matchConnections = new Map<string, Set<WebSocket>>();

server.register(async function (fastify) {
  
  fastify.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });

  // UPDATE: Route diganti jadi '/game' agar sesuai dengan Client
  fastify.get('/game', { websocket: true }, (connection: { socket: WebSocket }, req: FastifyRequest) => {
    let currentMatchId: string | null = null;

    console.log('🔌 New Client Connected');

    connection.socket.on('message', (msg) => {
      try {
        // [DEBUG 1] Tangkap Raw Message sebelum diparse
        const messageString = msg.toString();
        console.log('📨 [RAW MESSAGE]:', messageString);

        const parsed = JSON.parse(messageString);
        const { type, payload } = parsed;

        // ----------------------------------------------------
        // HANDLE JOIN GAME (Logic dari Client: game.connect)
        // ----------------------------------------------------
        // Note: Client mengirim 'C_JOIN_ROOM' atau 'C_CREATE_ROOM' di step sebelumnya, 
        // tapi di store logic terakhir kamu kirim 'JOIN_GAME'. Kita handle 'JOIN_GAME' disini.
        if (type === 'JOIN_GAME' || type === 'C_JOIN_ROOM') {
            const { matchId, playerId } = payload;
            currentMatchId = matchId; // Simpan context koneksi ini ada di room mana

            // Manage Connection Set
            if (!matchConnections.has(matchId)) {
                matchConnections.set(matchId, new Set());
            }
            matchConnections.get(matchId)?.add(connection.socket);

            // Get or Create Match Logic
            let match = gameManager.getMatch(matchId);
            if (!match) {
                console.log(`✨ Creating New Match: ${matchId}`);
                // Auto create match dengan bot jika belum ada
                match = gameManager.createMatch(matchId, [playerId, 'Bot1', 'Bot2', 'Bot3']);
                match.startRound();
            }

            const player = match.players.find(p => p.id === playerId);
            const seatId = player ? player.seatId : -1;

            console.log(`✅ Player ${playerId} joined Match ${matchId} at Seat ${seatId}`);

            // Kirim Full State ke pemain yang baru join
            connection.socket.send(JSON.stringify({
                type: 'GAME_UPDATE',
                payload: match.getPublicState(seatId !== -1 ? seatId : 0)
            }));
        }

        // ----------------------------------------------------
        // HANDLE PLAYER ACTION (BID, PASS, PLAY, TRUMP)
        // ----------------------------------------------------
        if (type === 'PLAYER_ACTION') {
            const { matchId, action, data } = payload;
            
            // [DEBUG 2] Pastikan Server sadar ada Action masuk
            console.log(`🔍 [ACTION DETECTED]: ${action} from Player: ${data.playerId}`);

            const match = gameManager.getMatch(matchId);

            if (match) {
                const player = match.players.find(p => p.id === data.playerId);
                
                if (player) {
                    // [DEBUG 3] Pastikan Player ditemukan di kursi yang benar
                    console.log(`👤 [PLAYER FOUND]: Seat ${player.seatId} (Active Turn: ${match.activePlayerIndex})`);

                    let result: { success: boolean; msg?: string } = { success: false, msg: 'Unknown' };

                    // Eksekusi Logic Game
                    if (action === 'BID') {
                        result = match.playerBid(player.seatId, data.amount);
                    } 
                    else if (action === 'PASS') {
                        // [DEBUG 4] INI YANG KITA CARI: Apakah fungsi ini dipanggil?
                        console.log('🚀 [EXECUTING]: match.playerPass()...');
                        result = match.playerPass(player.seatId);
                    }
                    else if (action === 'SELECT_TRUMP') {
                        result = match.playerSelectTrump(player.seatId, data.suit, data.hidden);
                    }
                    else if (action === 'PLAY_CARD') {
                        result = match.playCard(player.seatId, data.cardIndex);
                    }

                    // Jika Logic Gagal (Invalid Move/Not Turn)
                    if (!result.success) {
                        console.log(`❌ [LOGIC ERROR]: ${result.msg}`);
                        connection.socket.send(JSON.stringify({ 
                            type: 'ACTION_ERROR', 
                            payload: { msg: result.msg || 'Unknown Error' } 
                        }));
                    } else {
                        console.log(`✅ [SUCCESS]: Action ${action} executed.`);
                        
                        // Jika Sukses -> BROADCAST ke semua orang di room
                        const roomSockets = matchConnections.get(matchId);
                        if (roomSockets) {
                            const broadcastMsg = JSON.stringify({
                                type: 'STATE_CHANGED',
                                payload: {
                                    phase: match.phase,
                                    activePlayer: match.activePlayerIndex,
                                    lastAction: action,
                                    // DATA PENTING AGAR UI UPDATE REALTIME:
                                    currentBid: match.currentBid, 
                                    bidWinner: match.bidWinner,   
                                    trumpSuit: match.trumpSuit,
                                    isTrumpHidden: match.isTrumpHidden
                                }
                            });
                            
                            roomSockets.forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(broadcastMsg);
                                }
                            });
                        }
                    }
                } else {
                    console.log('❌ [ERROR]: Player ID not found in match!');
                }
            } else {
                console.log('❌ [ERROR]: Match ID not found!');
            }
        }

      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    // Cleanup saat koneksi putus
    connection.socket.on('close', () => {
        console.log('❌ Client Disconnected');
        if (currentMatchId && matchConnections.has(currentMatchId)) {
            matchConnections.get(currentMatchId)?.delete(connection.socket);
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