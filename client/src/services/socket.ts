// client/src/services/socket.ts

import { reactive } from 'vue';

// State global untuk status koneksi
export const socketState = reactive({
  isConnected: false
});

class SocketService {
  public socket: WebSocket | null = null;
  // Callback function yang akan diisi oleh Store
  public onMessage: ((event: any) => void) | null = null; 

  connect() {
    // Ganti URL sesuai environment (Localhost)
    const wsUrl = `ws://${window.location.hostname}:3000/game`;
    console.log(`🔌 Connecting to ${wsUrl}...`);

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('✅ WebSocket Connected');
      socketState.isConnected = true;
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        // Jika ada yang mendengar (Store), kirim datanya
        if (this.onMessage) {
            this.onMessage(parsed);
        }
      } catch (e) {
        console.error('Socket Parse Error:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('❌ WebSocket Disconnected');
      socketState.isConnected = false;
      this.socket = null;
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('⚠️ Cannot send message, socket not open');
    }
  }
}

export const socketService = new SocketService();