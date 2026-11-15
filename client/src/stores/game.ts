// client/src/stores/game.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socketService, socketState } from '../services/socket';
import type { GameStateSnapshot } from '@shared/types';

const tokenKey = (matchId: string, name: string) => `trupest:${matchId}:${name}`;

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameStateSnapshot | null>(null);
  const myPlayerId = ref<string>('');
  const lastError = ref<string | null>(null);
  let joinedRoom = '';

  const isConnected = computed(() => socketState.isConnected);
  const phase = computed(() => gameState.value?.phase || 'LOBBY');
  const socket = computed(() => socketService.socket);
  const mySeat = computed(() => gameState.value?.players.find(p => p.id === myPlayerId.value)?.seatId ?? 0);

  function sendJoin() {
    if (!joinedRoom || !myPlayerId.value) return;
    let token: string | undefined;
    try { token = sessionStorage.getItem(tokenKey(joinedRoom, myPlayerId.value)) ?? undefined; } catch { /* storage diblokir */ }
    socketService.send('JOIN_GAME', { matchId: joinedRoom, playerId: myPlayerId.value, token });
  }

  function connect(matchId: string, playerName: string) {
    joinedRoom = matchId;
    myPlayerId.value = playerName.trim();
    socketService.onMessage = handleServerEvent;
    // Setelah putus & tersambung lagi, masuk ulang otomatis memakai token sesi.
    socketService.onOpen = () => { if (gameState.value) sendJoin(); };
    sendJoin();
  }

  function send(type: string, payload: any) {
    if (type === 'PLAYER_ACTION') socketService.send('PLAYER_ACTION', payload);
  }

  function startGame() {
    socketService.send('START_GAME', { matchId: joinedRoom });
  }

  function handleServerEvent(event: any) {
    if (event.type === 'JOINED') {
      try { sessionStorage.setItem(tokenKey(event.payload.roomId, event.payload.playerId), event.payload.token); } catch { /* abaikan */ }
    }
    if (event.type === 'GAME_UPDATE') {
      gameState.value = event.payload;
    }
    if (event.type === 'ACTION_ERROR') {
      lastError.value = event.payload.msg;
      setTimeout(() => (lastError.value = null), 3000);
    }
  }

  return { gameState, myPlayerId, mySeat, isConnected, lastError, phase, socket, connect, send, startGame, handleServerEvent };
});
