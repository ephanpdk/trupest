// client/src/stores/game.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socketService, socketState } from '../services/socket';
import type { GameStateSnapshot } from '@shared/types';

const tokenKey = (matchId: string, name: string) => `trupest:${matchId}:${name}`;
const ACCESS_KEY = 'trupest:access';

// localStorage bisa diblokir (mode privat): semua akses dibungkus, game tetap jalan sebagai tamu.
const readAccess = () => { try { return localStorage.getItem(ACCESS_KEY) ?? ''; } catch { return ''; } };
const readNick = () => { try { return localStorage.getItem('trupest:nick') ?? ''; } catch { return ''; } };
const writeAccess = (v: string) => { try { v ? localStorage.setItem(ACCESS_KEY, v) : localStorage.removeItem(ACCESS_KEY); } catch { /* abaikan */ } };

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameStateSnapshot | null>(null);
  const myPlayerId = ref<string>('');
  const lastError = ref<string | null>(null);
  let joinedRoom = '';
  const accessToken = ref(readAccess());     // JWT akun; kosong = tamu
  const accountName = ref(readNick());
  const accounts = ref(false);               // server punya database & login
  const requireLogin = ref(false);

  const isConnected = computed(() => socketState.isConnected);
  const phase = computed(() => gameState.value?.phase || 'LOBBY');
  const socket = computed(() => socketService.socket);
  const mySeat = computed(() => gameState.value?.players.find(p => p.id === myPlayerId.value)?.seatId ?? 0);

  function sendJoin() {
    if (!joinedRoom || !myPlayerId.value) return;
    let token: string | undefined;
    try { token = sessionStorage.getItem(tokenKey(joinedRoom, myPlayerId.value)) ?? undefined; } catch { /* storage diblokir */ }
    socketService.send('JOIN_GAME', { matchId: joinedRoom, playerId: myPlayerId.value, token, accessToken: accessToken.value || undefined });
  }

  function connect(matchId: string, playerName: string) {
    joinedRoom = matchId;
    myPlayerId.value = playerName.trim();
    socketService.onMessage = handleServerEvent;
    // Setelah putus & tersambung lagi, masuk ulang otomatis memakai token sesi.
    socketService.onOpen = () => { if (gameState.value) sendJoin(); };
    sendJoin();
  }

  async function loadConfig() {
    try {
      const h = await (await fetch('/health')).json();
      accounts.value = !!h.accounts;
      requireLogin.value = !!h.requireLogin;
    } catch { /* server belum siap: tetap mode tamu */ }
  }

  /** Daftar atau masuk. Mengembalikan pesan error, atau null jika berhasil. */
  async function authenticate(mode: 'register' | 'login', nickname: string, password: string): Promise<string | null> {
    try {
      const res = await fetch(`/auth/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname, password }) });
      const body = await res.json();
      if (!res.ok) return body.error ?? 'Gagal';
      accessToken.value = body.accessToken;
      accountName.value = body.nickname;
      writeAccess(body.accessToken);
      try { localStorage.setItem('trupest:nick', body.nickname); } catch { /* abaikan */ }
      return null;
    } catch {
      return 'Server tidak terjangkau';
    }
  }

  function logout() {
    accessToken.value = '';
    accountName.value = '';
    writeAccess('');
    try { localStorage.removeItem('trupest:nick'); } catch { /* abaikan */ }
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
      // Sesi login kedaluwarsa: bersihkan supaya pemain bisa masuk lagi.
      if (String(event.payload.msg).startsWith('Sesi login')) logout();
      lastError.value = event.payload.msg;
      setTimeout(() => (lastError.value = null), 3000);
    }
  }

  return { accessToken, accountName, accounts, requireLogin, loadConfig, authenticate, logout, gameState, myPlayerId, mySeat, isConnected, lastError, phase, socket, connect, send, startGame, handleServerEvent };
});
