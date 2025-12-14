<template>
  <div class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-4 shadow-lg">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pemain</h3>
      <div class="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">
        Ronde {{ roundNumber }}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div 
        v-for="player in players" 
        :key="player.seatId"
        class="relative rounded-lg p-3 transition-all duration-300"
        :class="[
          player.seatId === activePlayer ? 'bg-emerald-600/20 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-800/50 border border-gray-700',
          player.seatId === mySeatId ? 'ring-2 ring-blue-500/50' : ''
        ]"
      >
        <div v-if="player.seatId === activePlayer" 
             class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
        <div v-if="player.seatId === activePlayer" 
             class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full"></div>

        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
               :class="player.isBot ? 'bg-purple-600' : 'bg-blue-600'">
            {{ player.isBot ? '🤖' : '👤' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-white text-sm truncate">
              {{ player.id === myPlayerId ? 'ANDA' : player.name }}
            </div>
            <div class="text-xs text-gray-400">
              Seat {{ player.seatId }} | Team {{ (player.seatId % 2) + 1 }}
            </div>
          </div>
        </div>

        <div class="mt-2 flex justify-between items-center text-xs">
          <span class="text-gray-500">
            <span class="text-white font-bold">{{ player.cardCount }}</span> kartu
          </span>
          <span class="font-bold" :class="player.score >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ player.score >= 0 ? '+' : '' }}{{ player.score }}
          </span>
        </div>

        <div v-if="player.seatId === bidWinner" 
             class="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 rounded-full">
          BIDDER
        </div>
      </div>
    </div>

    <div v-if="activePlayer !== null" class="mt-3 text-center">
      <div class="inline-flex items-center gap-2 bg-gray-900 rounded-full px-4 py-2">
        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span class="text-sm">
          Giliran: 
          <strong class="text-emerald-400">
            {{ activePlayer === mySeatId ? 'ANDA!' : `Player ${activePlayer + 1}` }}
          </strong>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  players: any[];
  activePlayer: number;
  mySeatId: number;
  myPlayerId: string;
  bidWinner: number | null;
  roundNumber: number;
}>();
</script>
