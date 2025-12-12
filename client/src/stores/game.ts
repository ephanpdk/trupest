// client/src/stores/game.ts

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socketService, socketState } from '../services/socket';
import type { GameStateSnapshot } from '@shared/types';

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameStateSnapshot | null>(null);
  const myPlayerId = ref<string>('');
  const lastError = ref<string | null>(null);

  const isConnected = computed(() => socketState.isConnected);
  const phase = computed(() => gameState.value?.phase || 'LOBBY');
  
  // Ekspos socket raw agar bisa dipakai oleh SimpleBoard.vue
  const socket = computed(() => socketService.socket);

  function connect(matchId: string, playerName: string) {
    myPlayerId.value = playerName;
    
    // Hubungkan logic penerimaan pesan
    socketService.onMessage = handleServerEvent;

    if (!socketService.socket || socketService.socket.readyState !== WebSocket.OPEN) {
        socketService.connect();
        // Delay sedikit memastikan koneksi terbuka sebelum join
        setTimeout(() => sendJoin(matchId, playerName), 500);
    } else {
        sendJoin(matchId, playerName);
    }
  }

  function sendJoin(matchId: string, playerName: string) {
      socketService.send('JOIN_GAME', { matchId, playerId: playerName });
  }

  function send(type: string, payload: any) {
      if (type === 'PLAYER_ACTION') {
          socketService.send('PLAYER_ACTION', payload);
      }
  }

  // Fungsi ini dipanggil oleh socketService saat ada pesan masuk
  function handleServerEvent(event: any) {
      if (event.type === 'GAME_UPDATE') {
          gameState.value = event.payload;
      }
      if (event.type === 'STATE_CHANGED') {
          if (gameState.value) Object.assign(gameState.value, event.payload);
      }
      if (event.type === 'ACTION_ERROR') {
          lastError.value = event.payload.msg;
          setTimeout(() => lastError.value = null, 3000);
      }
  }

  return { 
      gameState, 
      myPlayerId, 
      isConnected, 
      lastError, 
      phase, 
      socket, 
      connect, 
      send, 
      handleServerEvent 
  };
});