import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useGameStore = defineStore('game', () => {
    // STATE
    const socket = ref<WebSocket | null>(null);
    const isConnected = ref(false);
    const gameState = ref<any>(null);
    const myPlayerId = ref('');
    const lastError = ref('');

    // GETTERS
    const phase = computed(() => gameState.value?.phase || 'LOBBY');

    // ACTIONS
    function connect(matchId: string, playerId: string) {
        if (socket.value) socket.value.close();
        
        myPlayerId.value = playerId;
        
        // Pastikan port 3000 sesuai dengan server lu
        socket.value = new WebSocket('ws://localhost:3000/ws');

        socket.value.onopen = () => {
            console.log('✅ WS Connected');
            isConnected.value = true;
            lastError.value = '';
            // Auto Join
            send('JOIN_GAME', { matchId, playerId });
        };

        socket.value.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
        };

        socket.value.onclose = () => {
            console.log('❌ WS Disconnected');
            isConnected.value = false;
        };

        socket.value.onerror = (err) => {
            console.error('WS Error', err);
            lastError.value = 'Connection Error';
        };
    }

    function send(type: string, payload: any) {
        if (socket.value && socket.value.readyState === WebSocket.OPEN) {
            socket.value.send(JSON.stringify({ type, payload }));
        }
    }

    function handleMessage(msg: any) {
        switch (msg.type) {
            case 'GAME_UPDATE':
                // Kita gunakan Object.assign atau spread biar Vue 100% mendeteksi perubahan
                if (gameState.value) {
                    Object.assign(gameState.value, msg.payload);
                } else {
                    gameState.value = msg.payload;
                }
                break;
            case 'STATE_CHANGED':
                if (gameState.value) {
                    // 1. Update Phase & Giliran (Yang lama)
                    gameState.value.phase = msg.payload.phase;
                    gameState.value.activePlayer = msg.payload.activePlayer;
                    // 2. [BARU] Update Data Lelang (Bid)
                    // PENTING: Cek undefined biar gak nimpah data dgn kosong kalau server gak kirim
                    if (msg.payload.currentBid !== undefined) {
                        gameState.value.currentBid = msg.payload.currentBid;
                    }
                    if (msg.payload.bidWinner !== undefined) {
                        gameState.value.bidWinner = msg.payload.bidWinner;
                    }

                    // 3. [BARU] Update Data Truf & Kartu
                    if (msg.payload.trumpSuit !== undefined) {
                        gameState.value.trumpSuit = msg.payload.trumpSuit;
                    }
                    if (msg.payload.isTrumpHidden !== undefined) {
                        gameState.value.isTrumpHidden = msg.payload.isTrumpHidden;
                    }
                }
                break;
            case 'ACTION_ERROR':
                lastError.value = msg.payload.msg;
                setTimeout(() => lastError.value = '', 3000);
                break;
        }
    }

    function bid(amount: number) {
        // Kirim dummy data bid dulu buat test
        send('PLAYER_ACTION', {
            matchId: gameState.value?.matchId || 'TEST-MATCH-001', 
            action: 'BID',
            data: { playerId: myPlayerId.value, amount }
        });
    }

    return { 
        isConnected, 
        gameState, 
        lastError,
        phase, 
        myPlayerId,
        connect, 
        bid,
        send
    };
});