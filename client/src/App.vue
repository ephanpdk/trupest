<script setup lang="ts">
import { useGameStore } from './stores/game';
import { ref } from 'vue';

const game = useGameStore();
const inputName = ref('Player1');
const inputMatch = ref('TEST-MATCH-001');

const joinGame = () => {
  game.connect(inputMatch.value, inputName.value);
};

const doBid = () => {
  game.bid(8);
};
</script>

<template>
  <div class="min-h-screen p-8 bg-gray-900 text-gray-100 font-mono">
    
    <div class="mb-8 border-b border-gray-700 pb-4">
      <h1 class="text-3xl font-bold text-emerald-400">TRUPEST CLIENT (Day 8)</h1>
      <div class="mt-2 flex items-center gap-2">
        <div :class="`w-3 h-3 rounded-full ${game.isConnected ? 'bg-green-500' : 'bg-red-500'}`"></div>
        <span>Status: {{ game.isConnected ? 'CONNECTED' : 'DISCONNECTED' }}</span>
      </div>
      <div v-if="game.lastError" class="mt-2 p-2 bg-red-900/50 text-red-200 border border-red-500 rounded">
        ⚠️ ERROR: {{ game.lastError }}
      </div>
    </div>

    <div v-if="!game.gameState" class="flex gap-4 p-6 bg-gray-800 rounded-lg border border-gray-700">
      <input v-model="inputName" placeholder="Username" class="bg-gray-700 p-2 rounded text-white" />
      <input v-model="inputMatch" placeholder="Match ID" class="bg-gray-700 p-2 rounded text-white" />
      <button @click="joinGame" class="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded font-bold transition">
        JOIN GAME
      </button>
    </div>

    <div v-else class="grid grid-cols-2 gap-8">
      
      <div class="space-y-4">
        <div class="p-4 bg-gray-800 rounded-lg">
          <h2 class="text-xl text-blue-400 mb-2">Game Info</h2>
          <p>Phase: <span class="font-bold text-yellow-400">{{ game.phase }}</span></p>
          <p>Active Player Seat: {{ game.gameState.activePlayer }}</p>
        </div>

        <div class="p-4 bg-gray-800 rounded-lg">
          <h2 class="text-xl text-blue-400 mb-2">Test Actions</h2>
          <button @click="doBid" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded mr-2 text-white">
            BID 8 (Test)
          </button>
        </div>
      </div>

      <div class="p-4 bg-black rounded-lg border border-gray-700 h-96 overflow-auto text-xs font-mono text-green-400">
        <pre>{{ game.gameState }}</pre>
      </div>

    </div>
  </div>
</template>