<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from './stores/game';
import GameLobby from './components/GameLobby.vue';
import SimpleBoard from './components/SimpleBoard.vue';
import WaitingRoom from './components/WaitingRoom.vue';

const game = useGameStore();
const inGame = computed(() => !!game.gameState && game.phase !== 'WAITING');
// ?debug=1 menampilkan state mentah dari server di bawah meja.
const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
</script>

<template>
  <div class="h-[100dvh] flex flex-col bg-slate-900 text-slate-200 font-sans">
    <nav class="bg-slate-800 border-b border-slate-700 px-3 sm:px-6 py-2 flex justify-between items-center shadow-lg shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-900">T</div>
        <h1 class="text-lg font-bold tracking-tight text-white">TRUPEST</h1>
      </div>
      <div class="flex items-center gap-3 text-xs">
        <span v-if="game.gameState" class="text-slate-400 hidden sm:inline">Room <span class="font-mono text-white">{{ game.gameState.roomId }}</span> · Ronde {{ game.gameState.roundNumber }}</span>
        <span v-if="game.gameState" class="font-bold text-white">{{ game.myPlayerId }}</span>
        <div class="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 rounded-full border border-slate-700">
          <div :class="`w-2 h-2 rounded-full ${game.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`"></div>
          <span class="font-mono">{{ game.isConnected ? 'ONLINE' : 'OFFLINE' }}</span>
        </div>
      </div>
    </nav>

    <div v-if="game.lastError" class="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl font-bold text-sm text-center">
      ⚠️ {{ game.lastError }}
    </div>

    <main class="flex-1 min-h-0 overflow-auto">
      <div v-if="!game.gameState" class="p-4 sm:p-6"><GameLobby /></div>
      <div v-else-if="!inGame" class="p-4 sm:p-6"><WaitingRoom /></div>
      <div v-else class="h-full p-1.5 sm:p-3 max-w-[1200px] mx-auto flex flex-col gap-2">
        <div class="flex-1 min-h-0"><SimpleBoard /></div>
        <pre v-if="debug" class="bg-black text-green-500 text-[10px] p-2 rounded max-h-40 overflow-auto">{{ game.gameState }}</pre>
      </div>
    </main>
  </div>
</template>
