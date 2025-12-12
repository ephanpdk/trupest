<script setup lang="ts">
import { useGameStore } from './stores/game';
import GameLobby from './components/GameLobby.vue';
import GameSidebar from './components/GameSidebar.vue';
import SimpleBoard from './components/SimpleBoard.vue';
import { computed } from 'vue';

const game = useGameStore();

const mySeatId = computed(() => {
  if (!game.gameState || !game.gameState.players) return -1;
  const me = game.gameState.players.find((p: any) => p.id === game.myPlayerId);
  return me ? me.seatId : -1;
});
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-emerald-500 selection:text-white pb-20">
    
    <nav class="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-900">T</div>
        <h1 class="text-xl font-bold tracking-tight text-white">TRUPEST <span class="text-slate-500 text-xs font-normal ml-1">Beta</span></h1>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-700">
          <div :class="`w-2 h-2 rounded-full ${game.isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`"></div>
          <span class="text-xs font-mono">{{ game.isConnected ? 'ONLINE' : 'OFFLINE' }}</span>
        </div>
        <div v-if="game.isConnected && game.gameState" class="text-xs text-right">
          <div class="font-bold text-white">{{ game.myPlayerId }}</div>
          <div class="text-slate-500">Seat {{ mySeatId }}</div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto p-6">
      
      <div v-if="game.lastError" class="fixed top-24 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce font-bold">
        ⚠️ {{ game.lastError }}
      </div>

      <div v-if="!game.gameState" class="animate-fade-in">
        <GameLobby />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        
        <div class="lg:col-span-3">
          <GameSidebar />
        </div>

        <div class="lg:col-span-9 flex flex-col gap-6">
          
          <SimpleBoard 
            v-if="game.phase === 'TRICK'" 
            :gameState="game.gameState" 
            :playerId="game.myPlayerId" 
            :matchId="game.gameState.roomId" 
            :socket="game.socket" 
          />

          <div class="bg-black rounded-xl border border-slate-800 p-4 font-mono text-xs h-64 overflow-auto shadow-inner opacity-70 hover:opacity-100 transition">
            <div class="text-slate-500 mb-2 border-b border-slate-800 pb-1 sticky top-0 bg-black flex justify-between">
              <span>SERVER_STATE_LOG</span>
              <span class="text-emerald-600">ID: {{ game.gameState.roomId }}</span>
            </div>
            <pre class="text-green-500">{{ game.gameState }}</pre>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
</style>