<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';

const game = useGameStore();
const players = computed(() => game.gameState?.players ?? []);
const botSlots = computed(() => 4 - players.value.length);
const mine = computed(() => players.value.find(p => p.id === game.myPlayerId));
const inTeam = (t: 'A' | 'B') => players.value.filter(p => p.team === t);
const unassigned = computed(() => players.value.filter(p => !p.team));

const choose = (team: 'A' | 'B' | 'RANDOM') =>
  game.send('PLAYER_ACTION', { matchId: game.gameState!.roomId, action: 'CHOOSE_TEAM', data: { team } });
// Tim penuh = sudah 2 pemain lain (server tetap yang memutuskan).
const full = (t: 'A' | 'B') => inTeam(t).filter(p => p.id !== game.myPlayerId).length >= 2;
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[50vh]">
    <div class="w-full max-w-md bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl">
      <h2 class="text-2xl font-black text-emerald-400 mb-1 text-center">Waiting Room</h2>
      <p class="text-slate-400 text-sm mb-5 text-center">Room: <span class="font-mono text-white">{{ game.gameState?.roomId }}</span></p>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div v-for="t in (['A', 'B'] as const)" :key="t" class="rounded-xl border p-2 min-h-[6.5rem]"
          :class="t === 'A' ? 'border-sky-500/50 bg-sky-500/10' : 'border-rose-500/50 bg-rose-500/10'">
          <div class="text-xs font-black mb-1" :class="t === 'A' ? 'text-sky-300' : 'text-rose-300'">TIM {{ t }}</div>
          <div v-for="p in inTeam(t)" :key="p.id" class="text-sm font-bold text-white truncate rounded px-1"
            :class="p.id === game.myPlayerId ? 'bg-white/15' : ''">
            👤 {{ p.name }}<span v-if="p.id === game.gameState?.hostId" class="ml-1 text-[9px] bg-yellow-500 text-black px-1 rounded-full">HOST</span>
          </div>
          <button @click="choose(t)" :disabled="mine?.team === t || full(t)"
            class="mt-2 w-full text-xs font-bold rounded-lg py-1.5 min-h-9 transition disabled:opacity-40 disabled:cursor-not-allowed"
            :class="t === 'A' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-rose-600 hover:bg-rose-500'">
            {{ mine?.team === t ? 'Tim kamu' : full(t) ? 'Penuh' : `Gabung Tim ${t}` }}
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-slate-700 bg-slate-900 p-2 mb-4">
        <div class="text-xs font-black text-slate-400 mb-1">ACAK (kursi dibagi server)</div>
        <div v-for="p in unassigned" :key="p.id" class="text-sm font-bold text-white truncate rounded px-1"
          :class="p.id === game.myPlayerId ? 'bg-white/15' : ''">
          👤 {{ p.name }}<span v-if="p.id === game.gameState?.hostId" class="ml-1 text-[9px] bg-yellow-500 text-black px-1 rounded-full">HOST</span>
        </div>
        <div v-if="botSlots > 0" class="text-xs text-slate-500 mt-1">+ {{ botSlots }} bot mengisi kursi kosong</div>
        <button @click="choose('RANDOM')" :disabled="!mine?.team"
          class="mt-2 w-full text-xs font-bold rounded-lg py-1.5 min-h-9 bg-slate-600 hover:bg-slate-500 transition disabled:opacity-40 disabled:cursor-not-allowed">
          {{ mine?.team ? 'Pilih acak' : 'Acak (dipilih)' }}
        </button>
      </div>

      <p class="text-[11px] text-slate-500 text-center mb-4">Tim A dan Tim B duduk selang-seling, jadi rekan satu tim selalu berhadapan.</p>

      <button v-if="game.gameState?.canStart" @click="game.startGame()"
        class="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
        Mulai Game{{ botSlots > 0 ? ` (${botSlots} bot)` : '' }}
      </button>
      <p v-else class="text-center text-slate-500 text-sm italic">Menunggu host memulai game...</p>

    </div>
  </div>
</template>
