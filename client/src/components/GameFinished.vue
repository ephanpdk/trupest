<template>
  <div class="p-8 border border-gray-700 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl text-center">
    
    <div class="mb-6">
      <div class="text-6xl mb-4">🏆</div>
      <h2 class="text-3xl font-bold text-emerald-400 mb-2">Ronde Selesai!</h2>
      <p class="text-gray-400">Ronde {{ gameState.roundNumber }} telah berakhir</p>
    </div>

    <div class="bg-gray-900/50 rounded-xl p-6 mb-6 border border-gray-700">
      <h3 class="text-lg font-bold text-white mb-4">Skor Akhir</h3>
      
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
        @click="nextRound"
        class="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-emerald-500/25"
      >
        Lanjut Ronde Berikutnya
      </button>
      
      <button 
        @click="playAgain"
        class="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-amber-500/25"
      >
        Main Lagi (Reset Skor)
      </button>
    </div>

    <p class="text-xs text-gray-500 mt-4">
      "Lanjut Ronde" melanjutkan permainan dengan skor saat ini. "Main Lagi" mereset semua skor ke 0.
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
  const teamPlayers = props.gameState.players.filter((p: any) => p.seatId % 2 === teamId);
  return teamPlayers.length > 0 ? teamPlayers[0].score : 0;
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
