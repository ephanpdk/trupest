// client/src/services/socket.ts
import { reactive } from 'vue';

export const socketState = reactive({ isConnected: false });

class SocketService {
  public socket: WebSocket | null = null;
  public onMessage: ((event: any) => void) | null = null;
  // Dipanggil setiap koneksi (re)open, dipakai store untuk JOIN ulang.
  public onOpen: (() => void) | null = null;

  private queue: string[] = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/game`);
    this.socket = ws;

    ws.onopen = () => {
      socketState.isConnected = true;
      this.onOpen?.();
      this.queue.splice(0).forEach(m => ws.send(m));
    };

    ws.onmessage = (event) => {
      try {
        this.onMessage?.(JSON.parse(event.data));
      } catch (e) {
        console.error('Socket Parse Error:', e);
      }
    };

    ws.onclose = (event) => {
      socketState.isConnected = false;
      this.socket = null;
      // 4000 = sesi ini digantikan login lain: jangan rebutan koneksi.
      if (event.code === 4000) this.shouldReconnect = false;
      if (this.shouldReconnect && !this.retryTimer) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.connect();
        }, 1000);
      }
    };

    ws.onerror = (err) => console.error('WebSocket Error:', err);
  }

  send(type: string, payload: any) {
    const msg = JSON.stringify({ type, payload });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.send(msg);
    else {
      this.queue.push(msg); // terkirim begitu koneksi terbuka
      this.connect();
    }
  }
}

export const socketService = new SocketService();
