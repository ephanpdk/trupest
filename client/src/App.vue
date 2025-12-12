<script setup lang="ts">
import { useGameStore } from './stores/game';
import { ref, computed } from 'vue';
import SimpleBoard from './components/SimpleBoard.vue';

const game = useGameStore();
const inputName = ref('Player1');
const inputMatch = ref('TEST-MATCH-001');
const bidAmount = ref(8);

const mySeatId = computed(() => {
  if (!game.gameState || !game.gameState.players) return -1;
  const me = game.gameState.players.find((p: any) => p.id === game.myPlayerId);
  return me ? me.seatId : -1;
});

const isMyTurn = computed(() => game.gameState?.activePlayer === mySeatId.value);
const amIBidWinner = computed(() => game.gameState?.bidWinner === mySeatId.value);

const joinGame = () => game.connect(inputMatch.value, inputName.value);

const sendAction = (action: string, data: any) => {
  game.send('PLAYER_ACTION', { matchId: inputMatch.value, action, data: { playerId: game.myPlayerId, ...data } });
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-emerald-500 selection:text-white pb-20">
    
    <nav class="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-lg">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-900">T</div>
        <h1 class="text-xl font-bold tracking-tight text-white">TRUPEST <span class="text-slate-500 text-xs font-normal ml-1">Beta</span></h1>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-700">
          <div :class="`w-2 h-2 rounded-full ${game.isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`"></div>
          <span class="text-xs font-mono">{{ game.isConnected ? 'ONLINE' : 'OFFLINE' }}</span>
        </div>
        <div v-if="game.isConnected" class="text-xs text-right">
          <div class="font-bold text-white">{{ game.myPlayerId }}</div>
          <div class="text-slate-500">Seat {{ mySeatId }}</div>
        </div>
      </div>
    </nav>

    <div class="max-w-6xl mx-auto p-6">
      
      <div v-if="game.lastError" class="fixed top-20 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce font-bold">
        ⚠️ {{ game.lastError }}
      </div>

      <div v-if="!game.gameState" class="flex flex-col items-center justify-center min-h-[60vh]">
        <div class="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <h2 class="text-2xl font-bold text-white mb-6 text-center">Join Match</h2>
          <div class="space-y-4">
            <input v-model="inputName" placeholder="Codename" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition" />
            <input v-model="inputMatch" placeholder="Match ID" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition" />
            <button @click="joinGame" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-emerald-900/20">
              ENTER GAME
            </button>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div class="lg:col-span-4 space-y-6">
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
                  <span class="font-bold text-white">Seat {{ game.gameState.activePlayer }}</span>
                </div>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Highest Bid</span>
                <span class="font-bold text-white">{{ game.gameState.currentBid }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Bid Winner</span>
                <span class="font-bold text-yellow-500">Seat {{ game.gameState.bidWinner ?? '-' }}</span>
              </div>
            </div>
          </div>

          <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg relative overflow-hidden min-h-[200px]">
            <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Actions</h3>

            <div v-if="!isMyTurn && game.phase !== 'TRUMP_SELECTION' && game.phase !== 'TRICK' && game.phase !== 'SCORING'" 
                 class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div class="text-slate-400 flex flex-col items-center">
                <div class="animate-spin text-2xl mb-2">⏳</div>
                <span class="text-xs">Waiting for Seat {{ game.gameState.activePlayer }}</span>
              </div>
            </div>

            <div v-if="game.phase === 'BIDDING'" class="space-y-3">
              <div class="flex gap-2">
                <input v-model="bidAmount" type="number" class="w-16 bg-slate-900 border border-slate-600 rounded text-center text-white font-bold" />
                <button @click="sendAction('BID', { amount: bidAmount })" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded transition">BID</button>
              </div>
              <button @click="sendAction('PASS', {})" class="w-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-2 rounded transition">PASS</button>
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

        <div class="lg:col-span-8 flex flex-col gap-6">
          <div v-if="game.phase === 'TRICK'" class="animate-fade-in-up">
            <SimpleBoard 
              :gameState="game.gameState" 
              :playerId="game.myPlayerId" 
              :matchId="inputMatch" 
              :socket="game.socket" 
            />
          </div>

          <div class="bg-black rounded-xl border border-slate-800 p-4 font-mono text-xs h-64 overflow-auto shadow-inner opacity-70 hover:opacity-100 transition">
            <div class="text-slate-500 mb-2 border-b border-slate-800 pb-1 sticky top-0 bg-black">SERVER_STATE_LOG</div>
            <pre class="text-green-500">{{ game.gameState }}</pre>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style>
/* Animasi Sederhana */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}
</style>