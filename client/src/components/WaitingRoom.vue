<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';

const game = useGameStore();
const players = computed(() => game.gameState?.players ?? []);
const botSlots = computed(() => 4 - players.value.length);
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[50vh]">
    <div class="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
      <h2 class="text-2xl font-black text-emerald-400 mb-1 text-center">Waiting Room</h2>
      <p class="text-slate-400 text-sm mb-6 text-center">Room: <span class="font-mono text-white">{{ game.gameState?.roomId }}</span></p>

      <div class="space-y-2 mb-6">
        <div v-for="p in players" :key="p.id" class="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
          <span class="font-bold text-white">👤 {{ p.id === game.myPlayerId ? 'ANDA' : p.name }}</span>
          <span v-if="p.id === game.gameState?.hostId" class="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-full">HOST</span>
        </div>
        <div v-for="n in botSlots" :key="'bot' + n" class="flex items-center justify-between bg-slate-900/40 border border-dashed border-slate-700 rounded-lg px-4 py-3 text-slate-500">
          <span>🤖 Slot kosong</span>
          <span class="text-xs">diisi bot</span>
        </div>
      </div>

      <button v-if="game.gameState?.canStart" @click="game.startGame()"
        class="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
        Mulai Game{{ botSlots > 0 ? ` (${botSlots} bot)` : '' }}
      </button>
      <p v-else class="text-center text-slate-500 text-sm italic">Menunggu host memulai game...</p>

      <p class="text-xs text-slate-600 text-center mt-4">Game mulai otomatis saat 4 pemain sudah masuk.</p>
    </div>
  </div>
</template>
