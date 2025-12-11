import Fastify, { FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import dotenv from 'dotenv';
import { gameManager } from './game/manager';

dotenv.config();

const server = Fastify({ logger: true });

server.register(websocket);

const matchConnections = new Map<string, Set<WebSocket>>();

server.register(async function (fastify) {
  
  fastify.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });

  fastify.get('/ws', { websocket: true }, (connection: { socket: WebSocket }, req: FastifyRequest) => {
    let currentMatchId: string | null = null;

    connection.socket.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        const { type, payload } = parsed;

        if (type === 'JOIN_GAME') {
            const { matchId, playerId } = payload;
            currentMatchId = matchId;

            if (!matchConnections.has(matchId)) {
                matchConnections.set(matchId, new Set());
            }
            matchConnections.get(matchId)?.add(connection.socket);

            let match = gameManager.getMatch(matchId);
            if (!match) {
                match = gameManager.createMatch(matchId, [playerId, 'Bot1', 'Bot2', 'Bot3']);
                match.startRound();
            }

            const player = match.players.find(p => p.id === playerId);
            const seatId = player ? player.seatId : -1;

            connection.socket.send(JSON.stringify({
                type: 'GAME_UPDATE',
                payload: match.getPublicState(seatId !== -1 ? seatId : 0)
            }));
        }

        if (type === 'PLAYER_ACTION') {
            const { matchId, action, data } = payload;
            const match = gameManager.getMatch(matchId);

            if (match) {
                const player = match.players.find(p => p.id === data.playerId);
                
                if (player) {
                    // FIX: Explicitly type msg as optional string
                    let result: { success: boolean; msg?: string } = { success: false, msg: 'Unknown' };

                    if (action === 'BID') result = match.playerBid(player.seatId, data.amount);
                    else if (action === 'PASS') result = match.playerPass(player.seatId);
                    else if (action === 'SELECT_TRUMP') result = match.playerSelectTrump(player.seatId, data.suit, data.hidden);
                    else if (action === 'PLAY_CARD') result = match.playCard(player.seatId, data.cardIndex);

                    if (!result.success) {
                        connection.socket.send(JSON.stringify({ 
                            type: 'ACTION_ERROR', 
                            payload: { msg: result.msg || 'Unknown Error' } 
                        }));
                    } else {
                        const roomSockets = matchConnections.get(matchId);
                        if (roomSockets) {
                            const broadcastMsg = JSON.stringify({
                                type: 'STATE_CHANGED',
                                payload: {
                                    phase: match.phase,
                                    activePlayer: match.activePlayerIndex,
                                    lastAction: action
                                }
                            });
                            
                            roomSockets.forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(broadcastMsg);
                                }
                            });
                        }
                    }
                }
            }
        }

      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    connection.socket.on('close', () => {
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
    console.log(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();