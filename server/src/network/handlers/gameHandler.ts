import { Server, Socket } from 'socket.io';
import { gameManager } from '../../game/manager';
import { MatchState } from '../../game/engine/state';

// Interface untuk Payload Action dari Client
interface GamePayload {
    matchId: string;
    action?: string;
    data?: any;
    playerId?: string;
}

export function registerGameHandlers(io: Server, socket: Socket) {

    // --- 1. HANDLE JOIN GAME ---
    socket.on('JOIN_GAME', (payload: GamePayload) => {
        try {
            const { matchId, playerId } = payload;
            
            // Simpan data di socket session
            socket.data.playerId = playerId;
            socket.data.matchId = matchId;
            socket.join(matchId); // Join Room Socket.IO

            console.log(`🔌 [SOCKET] Player ${playerId} joined room ${matchId}`);

            // Ambil atau Buat Match
            let match = gameManager.getMatch(matchId);
            if (!match) {
                // Testing only: Auto-create match with bots if not exists
                const playerIds = [playerId || 'Player1', 'Bot1', 'Bot2', 'Bot3'];
                match = gameManager.createMatch(matchId, playerIds);
                console.log(`✨ [MANAGER] Created new match: ${matchId}`);
                match.startRound(); // Auto start round for testing
            }

            // Kirim State Awal ke Pemain ini saja
            const seatId = match.players.findIndex(p => p.id === playerId);
            if (seatId !== -1) {
                socket.emit('GAME_STATE_UPDATE', match.getPublicState(seatId));
            }

        } catch (error) {
            console.error("Join Error:", error);
            socket.emit('ERROR', { msg: "Failed to join game" });
        }
    });

    // --- 2. HANDLE PLAYER ACTION ---
    socket.on('PLAYER_ACTION', (payload: GamePayload) => {
        const { matchId, action, data } = payload;
        const playerId = data.playerId || socket.data.playerId;

        const match = gameManager.getMatch(matchId);
        if (!match) {
            socket.emit('ERROR', { msg: "Match not found" });
            return;
        }

        const seatId = match.players.findIndex(p => p.id === playerId);
        if (seatId === -1) {
            socket.emit('ERROR', { msg: "Player not in match" });
            return;
        }

        console.log(`📨 [ACTION] ${action} received from ${playerId} (Seat ${seatId})`);

        let result: { success: boolean; msg?: string } = { success: false, msg: "Unknown Action" };

        // --- EKSEKUSI LOGIKA ---
        try {
            switch (action) {
                case 'BID':
                    result = match.playerBid(seatId, data.amount);
                    break;
                case 'PASS':
                    result = match.playerPass(seatId);
                    break;
                case 'SELECT_TRUMP':
                    result = match.playerSelectTrump(seatId, data.suit, data.hidden);
                    break;
                case 'PLAY_CARD':
                    // Client biasanya kirim Object Kartu, kita harus cari Index-nya di tangan
                    // Atau Client kirim index langsung. Kita asumsi kirim index untuk sekarang, 
                    // atau cari index manual jika data berisi object card.
                    let cardIndex = -1;
                    
                    if (typeof data.cardIndex === 'number') {
                        cardIndex = data.cardIndex;
                    } else if (data.card) {
                        // Cari index kartu di tangan berdasarkan Rank & Suit
                        cardIndex = match.players[seatId].hand.findIndex(c => 
                            c.rank === data.card.rank && c.suit === data.card.suit
                        );
                    }

                    if (cardIndex === -1) {
                        result = { success: false, msg: "Card not found in hand" };
                    } else {
                        result = match.playCard(seatId, cardIndex);
                    }
                    break;
            }

            // --- RESPON BALIK KE PENGIRIM ---
            if (!result.success) {
                socket.emit('ACTION_FAILED', { msg: result.msg });
                console.warn(`⚠️ [ACTION FAILED] ${result.msg}`);
                return; 
            }

            // --- CRITICAL: BROADCAST STATE SETELAH BOT SELESAI MAIN ---
            // Karena di state.ts kita sudah memanggil `triggerAutomation`,
            // maka saat kode sampai di baris ini, SEMUA BOT sudah selesai jalan.
            // Kita tinggal kirim hasilnya ke semua orang.
            
            broadcastGameState(io, match);

        } catch (error) {
            console.error(`🔥 [EXCEPTION] Error processing action ${action}:`, error);
        }
    });
}

// --- FUNGSI BROADCAST ---
// Mengirim state yang berbeda ke setiap pemain (karena kartu tangan berbeda)
function broadcastGameState(io: Server, match: MatchState) {
    const roomId = match.config.matchId;
    
    // Ambil semua socket yang ada di room ini
    const sockets = io.sockets.adapter.rooms.get(roomId);

    if (sockets) {
        for (const socketId of sockets) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.data.playerId) {
                // Cari Seat ID pemain ini
                const seatId = match.players.findIndex(p => p.id === socket.data.playerId);
                if (seatId !== -1) {
                    // Generate State khusus untuk perspektif pemain ini
                    const publicState = match.getPublicState(seatId);
                    // Kirim!
                    socket.emit('GAME_STATE_UPDATE', publicState);
                }
            }
        }
        console.log(`📡 [BROADCAST] Updated state sent to room ${roomId}`);
    }
}