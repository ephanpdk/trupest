import { reactive } from 'vue';
import type { ClientEvents } from '@shared/types';
import { useGameStore } from '../stores/game';

const WS_URL = 'ws://localhost:3000/game';

export const socketState = reactive({
    isConnected: false,
    lastError: null as string | null,
    latency: 0
});

class SocketService {
    public socket: WebSocket | null = null;

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;

        console.log(`🔌 Connecting to ${WS_URL}...`);
        this.socket = new WebSocket(WS_URL);

        this.socket.onopen = () => {
            console.log('✅ WS Connected');
            socketState.isConnected = true;
            socketState.lastError = null;
        };

        this.socket.onclose = (event) => {
            console.log('❌ WS Disconnected', event.code);
            socketState.isConnected = false;
        };

        this.socket.onerror = (error) => {
            console.error('🔥 WS Error', error);
            socketState.lastError = "Connection Error";
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const gameStore = useGameStore(); 
                gameStore.handleServerEvent(data);
            } catch (err) {
                console.error('Invalid JSON', event.data);
            }
        };
    }

    send<K extends keyof ClientEvents & string>(type: K, payload: ClientEvents[K]) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        const message = JSON.stringify({ type, payload });
        this.socket.send(message);
        console.log(`📤 Sent [${type}]`, payload);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();