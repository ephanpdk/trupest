import { reactive } from 'vue';
import type { ClientEvents } from '@shared/types'; // Hapus ServerEvents biar gak warning

// Pastikan Port 3000 sesuai dengan backend Fastify lu
const WS_URL = 'ws://localhost:3000/game'; 

export const socketState = reactive({
    isConnected: false,
    lastError: null as string | null,
    latency: 0
});

class SocketService {
    private socket: WebSocket | null = null;
    
    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.warn('⚠️ Socket already connecting/connected');
            return;
        }

        console.log(`🔌 Connecting to ${WS_URL}...`);
        this.socket = new WebSocket(WS_URL);

        this.socket.onopen = () => {
            console.log('✅ WS Connected');
            socketState.isConnected = true;
            socketState.lastError = null;
        };

        this.socket.onclose = (event) => {
            console.log('❌ WS Disconnected', event.code, event.reason);
            socketState.isConnected = false;
        };

        this.socket.onerror = (error) => {
            console.error('🔥 WS Error:', error);
            socketState.lastError = "Connection Error";
        };

        this.socket.onmessage = (event) => {
            try {
                // Parsing awal
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (err) {
                console.error('Invalid JSON received', event.data);
            }
        };
    }

    // UPDATE: Tambahkan '& string' agar TS tau key-nya pasti string, bukan Symbol
    send<K extends keyof ClientEvents & string>(type: K, payload: ClientEvents[K]) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send: Socket not connected');
            return;
        }
        
        // Sekarang aman karena 'type' dijamin string
        const message = JSON.stringify({ type, payload });
        this.socket.send(message);
        console.log(`📤 Sent [${type}]`, payload);
    }

    private handleMessage(data: any) {
        // Disini nanti kita akan update Pinia Store
        // Untuk sekarang kita log dulu
        console.log(`📩 Recv [${data.type || 'RAW'}]`, data);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();