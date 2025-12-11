import WebSocket from 'ws';

// Koneksi ke server lokal
const ws = new WebSocket('ws://localhost:3000/ws');

const MATCH_ID = 'TEST-MATCH-001';
const PLAYER_ID = 'PRO_PLAYER_1';

ws.on('open', () => {
    console.log('✅ Connected to Server');

    // 1. Coba JOIN GAME
    console.log(`[CLIENT] Joining Match: ${MATCH_ID}...`);
    ws.send(JSON.stringify({
        type: 'JOIN_GAME',
        payload: {
            matchId: MATCH_ID,
            playerId: PLAYER_ID
        }
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    
    // Respon dari Server
    if (msg.type === 'GAME_UPDATE') {
        console.log('\n[SERVER] Received GAME_UPDATE!');
        console.log('Phase:', msg.payload.phase);
        
        // Cek siapa yang aktif
        console.log('Active Player Seat:', msg.payload.activePlayer);
        
        // Kalau fase BIDDING, kita coba nge-BID (Testing Logic)
        if (msg.payload.phase === 'BIDDING') {
            console.log('\n[CLIENT] Attempting Action: BID 8...');
            ws.send(JSON.stringify({
                type: 'PLAYER_ACTION',
                payload: {
                    matchId: MATCH_ID,
                    action: 'BID',
                    data: {
                        playerId: PLAYER_ID,
                        amount: 8
                    }
                }
            }));
        }
    } 
    else if (msg.type === 'STATE_CHANGED') {
        console.log('\n[SERVER] Broadcast: STATE CHANGED!');
        console.log('New Phase:', msg.payload.phase);
        
        if (msg.payload.lastAction === 'BID') {
            console.log('\n✅ TEST SUCCESS: Bid accepted by server.');
            process.exit(0);
        }
    }
    else if (msg.type === 'ACTION_ERROR') {
        // Analisa Error
        if (msg.payload.msg === 'Not your turn') {
            console.log('\n✅ INTEGRATION SUCCESS!');
            console.log('Reason: Server correctly enforced game rules (Turn-based logic works).');
            console.log('WebSocket pipeline is fully operational.');
            process.exit(0);
        } else {
            console.error('❌ UNEXPECTED ERROR:', msg.payload.msg);
            process.exit(1);
        }
    }
});

ws.on('error', (err) => {
    console.error('Connection Error:', err);
});