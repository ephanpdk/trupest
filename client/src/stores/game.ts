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

  function connect(matchId: string, playerName: string) {
    myPlayerId.value = playerName;
    
    if (!socketService.socket?.readyState) {
        socketService.connect();
        // Delay sedikit memastikan koneksi terbuka
        setTimeout(() => sendJoin(matchId, playerName), 500);
    } else {
        sendJoin(matchId, playerName);
    }
  }

  function sendJoin(matchId: string, playerName: string) {
      // TypeScript sekarang senang karena JOIN_GAME sudah ada di shared/types
      socketService.send('JOIN_GAME', { matchId, playerId: playerName });
  }

  function send(type: string, payload: any) {
      if (type === 'PLAYER_ACTION') {
          // TypeScript sekarang senang karena PLAYER_ACTION sudah ada di shared/types
          socketService.send('PLAYER_ACTION', payload);
      }
  }

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

  return { gameState, myPlayerId, isConnected, lastError, phase, connect, send, handleServerEvent };
});