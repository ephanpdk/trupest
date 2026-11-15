<template>
  <div class="p-8 border border-gray-700 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl text-center">
    
    <div class="mb-6">
      <div class="text-6xl mb-4">🏆</div>
      <h2 class="text-3xl font-bold text-emerald-400 mb-2">{{ gameState.matchOver ? 'Match Selesai!' : 'Ronde Selesai!' }}</h2>
      <p class="text-gray-400">Ronde {{ gameState.roundNumber }} telah berakhir</p>
      <p v-if="gameState.lastRound" class="text-sm text-gray-300 mt-2">
        Bid {{ gameState.lastRound.bid }}: Tim {{ gameState.lastRound.declarerTeam + 1 }} dapat {{ gameState.lastRound.declarerTricks }} trick
        (target {{ gameState.lastRound.declarerTarget }}) &rarr; <strong class="text-emerald-400">Tim {{ gameState.lastRound.winnerTeam + 1 }} menang ronde</strong>
      </p>
      <p v-if="gameState.matchOver" class="text-lg font-bold text-yellow-400 mt-2">🏆 Tim {{ gameState.matchWinner + 1 }} memenangkan match</p>
    </div>

    <div class="bg-gray-900/50 rounded-xl p-6 mb-6 border border-gray-700">
      <h3 class="text-lg font-bold text-white mb-4">Ronde Dimenangkan (Best-of-3)</h3>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-blue-900/30 rounded-lg p-4 border border-blue-800">
          <div class="text-sm text-blue-400 mb-1">Tim 1</div>
          <div class="text-sm text-gray-400 mb-2">
            {{ getPlayerName(0) }} & {{ getPlayerName(2) }}
          </div>
          <div class="text-3xl font-bold text-white">{{ getTeamScore(0) }}</div>
        </div>
        
        <div class="bg-purple-900/30 rounded-lg p-4 border border-purple-800">
          <div class="text-sm text-purple-400 mb-1">Tim 2</div>
          <div class="text-sm text-gray-400 mb-2">
            {{ getPlayerName(1) }} & {{ getPlayerName(3) }}
          </div>
          <div class="text-3xl font-bold text-white">{{ getTeamScore(1) }}</div>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button 
        v-if="!gameState.matchOver"
        @click="nextRound"
        class="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-emerald-500/25"
      >
        Lanjut Ronde Berikutnya
      </button>
      
      <button 
        @click="playAgain"
        class="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-amber-500/25"
      >
        Match Baru
      </button>
    </div>

    <p class="text-xs text-gray-500 mt-4">
      Ronde berikutnya mulai otomatis dalam 30 detik. "Match Baru" mengocok ulang dengan seed baru.<span v-if="gameState.serverSeed"><br>Server seed (verifikasi): <code class="break-all">{{ gameState.serverSeed }}</code></span>
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  gameState: any;
  playerId: string;
  matchId: string;
  socket: any;
}>();

const getPlayerName = (seatId: number) => {
  if (!props.gameState?.players) return `Player ${seatId + 1}`;
  const player = props.gameState.players.find((p: any) => p.seatId === seatId);
  return player ? player.name : `Player ${seatId + 1}`;
};

const getTeamScore = (teamId: number) => {
  if (!props.gameState?.players) return 0;
  return props.gameState.teamScores?.[teamId] ?? 0;
};

const nextRound = () => {
  if (!props.socket) return;
  const payload = {
    type: 'PLAYER_ACTION',
    payload: {
      matchId: props.matchId,
      action: 'NEXT_ROUND',
      data: { playerId: props.playerId }
    }
  };
  props.socket.send(JSON.stringify(payload));
};

const playAgain = () => {
  if (!props.socket) return;
  const payload = {
    type: 'PLAYER_ACTION',
    payload: {
      matchId: props.matchId,
      action: 'PLAY_AGAIN',
      data: { playerId: props.playerId }
    }
  };
  props.socket.send(JSON.stringify(payload));
};
</script>
