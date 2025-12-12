<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '../stores/game';

const game = useGameStore();
const bidAmount = ref(8);

// Helpers
const mySeatId = computed(() => {
  const me = game.gameState?.players.find((p: any) => p.id === game.myPlayerId);
  return me ? me.seatId : -1;
});

const isMyTurn = computed(() => game.gameState?.activePlayer === mySeatId.value);
const amIBidWinner = computed(() => game.gameState?.bidWinner === mySeatId.value);

// --- ACTIONS LOGIC (Dipindah dari App.vue) ---
const sendAction = (action: string, data: any = {}) => {
  game.send('PLAYER_ACTION', { 
    matchId: game.gameState?.roomId, 
    action, 
    data: { playerId: game.myPlayerId, ...data } 
  });
};
</script>

<template>
  <div class="space-y-6">
    
    <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg">
      <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Status</h3>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-slate-400">Phase</span>
          <span class="font-mono text-emerald-400 bg-emerald-900/20 px-2 rounded">{{ game.phase }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Active Turn</span>
          <div class="flex items-center gap-2">
            <span v-if="isMyTurn" class="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>
            <span class="font-bold text-white">Seat {{ game.gameState?.activePlayer }}</span>
          </div>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Highest Bid</span>
          <span class="font-bold text-white">{{ game.gameState?.currentBid }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Bid Winner</span>
          <span class="font-bold text-yellow-500">Seat {{ game.gameState?.bidWinner ?? '-' }}</span>
        </div>
      </div>
    </div>

    <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg relative overflow-hidden min-h-[200px]">
      <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Actions</h3>

      <div v-if="!isMyTurn && game.phase !== 'TRUMP_SELECTION' && game.phase !== 'TRICK' && game.phase !== 'SCORING'" 
           class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div class="text-slate-400 flex flex-col items-center">
          <div class="animate-spin text-2xl mb-2">⏳</div>
          <span class="text-xs">Waiting for Seat {{ game.gameState?.activePlayer }}</span>
        </div>
      </div>

      <div v-if="game.phase === 'BIDDING'" class="space-y-3">
        <div class="flex gap-2">
          <input v-model="bidAmount" type="number" class="w-16 bg-slate-900 border border-slate-600 rounded text-center text-white font-bold" />
          <button @click="sendAction('BID', { amount: bidAmount })" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded transition">BID</button>
        </div>
        <button @click="sendAction('PASS')" class="w-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-2 rounded transition">PASS</button>
      </div>

      <div v-else-if="game.phase === 'TRUMP_SELECTION'" class="text-center">
        <div v-if="amIBidWinner" class="grid grid-cols-4 gap-2">
          <button v-for="s in ['S','H','C','D']" :key="s" @click="sendAction('SELECT_TRUMP', { suit: s, hidden: false })"
            class="aspect-square bg-slate-700 hover:bg-slate-600 rounded text-2xl shadow transition transform hover:scale-105">
            {{ {'S':'♠','H':'♥','C':'♣','D':'♦'}[s] }}
          </button>
        </div>
        <div v-else class="text-slate-500 italic py-4">Menunggu pemilihan truf...</div>
      </div>

      <div v-else-if="game.phase === 'TRICK'" class="text-center py-4">
        <p class="text-emerald-400 font-bold text-sm">Fase Main Kartu</p>
        <p class="text-slate-500 text-xs mt-1">Perhatikan meja di kanan 👉</p>
      </div>

      <div v-else-if="game.phase === 'SCORING'" class="text-center py-4 space-y-3">
        <div class="text-4xl">🏁</div>
        <div class="text-white font-bold">RONDE SELESAI</div>
        <div class="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-2 rounded">
          <div>TEAM 1: <span class="text-cyan-400 font-bold">{{ (game.gameState?.players?.[0]?.score || 0) + (game.gameState?.players?.[2]?.score || 0) }}</span></div>
          <div>TEAM 2: <span class="text-cyan-400 font-bold">{{ (game.gameState?.players?.[1]?.score || 0) + (game.gameState?.players?.[3]?.score || 0) }}</span></div>
        </div>
      </div>
    </div>

  </div>
</template>