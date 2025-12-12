<script setup lang="ts">
import { useGameStore } from './stores/game';
import { ref, computed } from 'vue';

const game = useGameStore();
const inputName = ref('Player1');
const inputMatch = ref('TEST-MATCH-001');

const bidAmount = ref(8);

const mySeatId = computed(() => {
  if (!game.gameState || !game.gameState.players) return -1;
  
  const me = game.gameState.players.find((p: any) => p.id === game.myPlayerId);
  return me ? me.seatId : -1;
});

const isMyTurn = computed(() => {
  return game.gameState?.activePlayer === mySeatId.value;
});

const amIBidWinner = computed(() => {
  return game.gameState?.bidWinner === mySeatId.value;
});

const joinGame = () => {
  game.connect(inputMatch.value, inputName.value);
};

const doBid = () => {
  game.send('PLAYER_ACTION', { 
      matchId: inputMatch.value, 
      action: 'BID', 
      data: { playerId: game.myPlayerId, amount: bidAmount.value } 
  });
};

const doPass = () => {
  game.send('PLAYER_ACTION', { 
      matchId: inputMatch.value, 
      action: 'PASS', 
      data: { playerId: game.myPlayerId } 
  });
};

const selectTrump = (suit: string) => {
  game.send('PLAYER_ACTION', { 
      matchId: inputMatch.value, 
      action: 'SELECT_TRUMP', 
      data: { 
        playerId: game.myPlayerId, 
        suit: suit, 
        hidden: false 
      } 
  });
};
</script>

<template>
  <div class="min-h-screen p-8 bg-gray-900 text-gray-100 font-mono">
    
    <div class="mb-8 border-b border-gray-700 pb-4 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold text-emerald-400">TRUPEST CLIENT (Day 8)</h1>
        <div class="mt-2 flex items-center gap-2">
          <div :class="`w-3 h-3 rounded-full ${game.isConnected ? 'bg-green-500' : 'bg-red-500'}`"></div>
          <span class="text-sm">Status: {{ game.isConnected ? 'CONNECTED' : 'DISCONNECTED' }}</span>
        </div>
      </div>
      
      <div v-if="game.isConnected" class="text-right">
        <p class="text-xs text-gray-400">Logged in as:</p>
        <div class="flex items-center justify-end gap-2">
           <span class="text-xl font-bold text-white">{{ game.myPlayerId }}</span>
           <span class="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">Seat {{ mySeatId }}</span>
        </div>
      </div>
    </div>

    <div v-if="game.lastError" class="mb-6 p-3 bg-red-900/50 text-red-200 border border-red-500 rounded flex items-center gap-2 animate-bounce">
      <span>⚠️</span>
      <span class="font-bold">{{ game.lastError }}</span>
    </div>

    <div v-if="!game.gameState" class="flex gap-4 p-6 bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
      <input v-model="inputName" placeholder="Username (Player1 / Bot1...)" class="bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-emerald-500 outline-none" />
      <input v-model="inputMatch" placeholder="Match ID" class="bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-emerald-500 outline-none" />
      <button @click="joinGame" class="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded font-bold transition shadow-lg shadow-emerald-900/20">
        JOIN GAME
      </button>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div class="space-y-6">
        <div class="p-5 bg-gray-800 rounded-lg border border-gray-700">
          <h2 class="text-xl text-blue-400 mb-4 border-b border-gray-700 pb-2">Game Info</h2>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-gray-400 text-sm">Current Phase</p>
              <p class="font-bold text-yellow-400 text-lg">{{ game.phase }}</p>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Active Turn</p>
              <p class="font-bold text-white text-lg">Seat {{ game.gameState.activePlayer }}</p>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Highest Bid</p>
              <p class="font-bold text-green-400 text-lg">{{ game.gameState.currentBid || 0 }}</p>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Bid Winner</p>
              <p class="font-bold text-white text-lg">{{ game.gameState.bidWinner !== undefined ? 'Seat ' + game.gameState.bidWinner : '-' }}</p>
            </div>
            <div v-if="game.gameState.trumpSuit">
              <p class="text-gray-400 text-sm">Trump Suit</p>
              <p class="font-bold text-red-400 text-2xl">{{ game.gameState.trumpSuit }}</p>
            </div>
          </div>
        </div>

        <div class="p-5 bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden">
          <h2 class="text-xl text-purple-400 mb-4 border-b border-gray-700 pb-2">Player Actions</h2>
          
          <div v-if="!isMyTurn && game.phase !== 'TRUMP_SELECTION'" class="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
             <div class="bg-yellow-900/80 border border-yellow-600 text-yellow-200 px-6 py-3 rounded-full font-bold animate-pulse">
               ⏳ Menunggu giliran Seat {{ game.gameState.activePlayer }}...
             </div>
          </div>

          <div v-if="game.phase === 'BIDDING'" class="flex flex-col gap-4">
            <div class="flex gap-2">
              <input 
                v-model="bidAmount" 
                type="number" 
                min="0" 
                class="bg-gray-700 w-20 p-2 rounded text-center text-white font-bold border border-gray-600"
              />
              <button @click="doBid" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded transition">
                BID {{ bidAmount }}
              </button>
            </div>
            <button @click="doPass" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded transition border border-red-700">
              PASS / LEWAT
            </button>
          </div>

          <div v-else-if="game.phase === 'TRUMP_SELECTION'" class="text-center space-y-4">
             <div v-if="amIBidWinner" class="bg-green-900/30 p-4 rounded border border-green-700">
                 <p class="text-green-400 font-bold mb-4 text-lg">KAMU MENANG BID! PILIH TRUF:</p>
                 <div class="grid grid-cols-4 gap-3">
                    <button @click="selectTrump('S')" class="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-3xl transition border border-gray-500 shadow-lg hover:scale-110">♠️</button>
                    <button @click="selectTrump('H')" class="bg-red-900 hover:bg-red-800 p-4 rounded-lg text-3xl transition border border-red-700 shadow-lg hover:scale-110">♥️</button>
                    <button @click="selectTrump('C')" class="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-3xl transition border border-gray-500 shadow-lg hover:scale-110">♣️</button>
                    <button @click="selectTrump('D')" class="bg-red-900 hover:bg-red-800 p-4 rounded-lg text-3xl transition border border-red-700 shadow-lg hover:scale-110">♦️</button>
                 </div>
             </div>
             
             <div v-else class="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded border border-gray-700 border-dashed">
                <div class="animate-spin text-4xl mb-4">🔮</div>
                <p class="text-gray-400 italic">Menunggu Seat {{ game.gameState.bidWinner }} memilih Truf...</p>
             </div>
          </div>

          <div v-else-if="game.phase === 'TRICK'" class="text-center space-y-4">
             <div class="p-4 bg-green-900/20 border border-green-800 rounded">
                <p class="text-green-400 font-bold">FASE MAIN KARTU DIMULAI!</p>
                <p class="text-sm text-gray-400 mt-1">Lead: Seat {{ game.gameState.activePlayer }}</p>
             </div>
             
             <div v-if="!isMyTurn" class="bg-yellow-900/30 border border-yellow-600 text-yellow-200 px-4 py-2 rounded text-sm">
                Menunggu lawan jalan...
             </div>
          </div>

          <div v-else class="text-gray-500 italic text-center">
            Menunggu update server...
          </div>
        </div>
      </div>

      <div class="p-4 bg-black rounded-lg border border-gray-800 h-[500px] overflow-auto text-xs font-mono">
        <div class="text-gray-500 mb-2 sticky top-0 bg-black pb-2 border-b border-gray-800">Server State (JSON)</div>
        <pre class="text-green-400">{{ game.gameState }}</pre>
      </div>

    </div>
  </div>
</template>