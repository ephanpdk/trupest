<template>
  <div
    class="relative p-8 border border-white/10 rounded-3xl bg-black/60 backdrop-blur-2xl shadow-2xl text-center overflow-hidden"
  >
    <!-- Decorative Glow -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[400px] pointer-events-none -z-10"
    >
      <div
        class="absolute top-10 left-10 w-32 h-32 bg-emerald-500/30 rounded-full blur-[60px] animate-pulse"
      ></div>
      <div
        class="absolute bottom-10 right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-[60px] animate-pulse"
        style="animation-delay: 1s"
      ></div>
    </div>

    <div class="mb-8 relative z-10">
      <div class="text-7xl mb-4 animate-bounce drop-shadow-lg">🏆</div>
      <h2
        class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-cyan-300 mb-2 drop-shadow-sm"
      >
        Ronde Selesai!
      </h2>
      <p class="text-slate-400 font-medium">
        Ronde {{ gameState.roundNumber }} telah berakhir
      </p>
    </div>

    <div
      class="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10 shadow-inner backdrop-blur-sm"
    >
      <h3
        class="text-sm uppercase tracking-widest font-bold text-slate-300 mb-6 flex items-center justify-center gap-2"
      >
        <span class="w-8 h-[1px] bg-white/20"></span> Skor Akhir
        <span class="w-8 h-[1px] bg-white/20"></span>
      </h3>

      <div class="grid grid-cols-2 gap-6">
        <div
          class="bg-blue-900/20 rounded-xl p-5 border border-blue-500/30 shadow-lg relative overflow-hidden group"
        >
          <div
            class="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition"
          ></div>
          <div class="relative z-10">
            <div
              class="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider"
            >
              Tim 1
            </div>
            <div class="text-sm text-slate-300 mb-3 font-medium truncate">
              {{ getPlayerName(0) }} & {{ getPlayerName(2) }}
            </div>
            <div class="text-4xl font-black text-white drop-shadow-md">
              {{ getTeamScore(0) }}
            </div>
          </div>
        </div>

        <div
          class="bg-purple-900/20 rounded-xl p-5 border border-purple-500/30 shadow-lg relative overflow-hidden group"
        >
          <div
            class="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition"
          ></div>
          <div class="relative z-10">
            <div
              class="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wider"
            >
              Tim 2
            </div>
            <div class="text-sm text-slate-300 mb-3 font-medium truncate">
              {{ getPlayerName(1) }} & {{ getPlayerName(3) }}
            </div>
            <div class="text-4xl font-black text-white drop-shadow-md">
              {{ getTeamScore(1) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
      <button
        @click="nextRound"
        class="px-8 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-105 active:scale-95 border border-emerald-400/20"
      >
        Lanjut Ronde Berikutnya
      </button>

      <button
        @click="playAgain"
        class="px-8 py-4 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-200 hover:scale-105 active:scale-95 border border-amber-400/20"
      >
        Main Lagi (Reset Skor)
      </button>
    </div>

    <p class="text-[10px] text-slate-500 mt-6 max-w-xs mx-auto">
      "Lanjut Ronde" menyimpan skor. "Main Lagi" mereset skor ke 0.
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
  const teamPlayers = props.gameState.players.filter(
    (p: any) => p.seatId % 2 === teamId
  );
  return teamPlayers.length > 0 ? teamPlayers[0].score : 0;
};

const nextRound = () => {
  if (!props.socket) return;
  const payload = {
    type: "PLAYER_ACTION",
    payload: {
      matchId: props.matchId,
      action: "NEXT_ROUND",
      data: { playerId: props.playerId },
    },
  };
  props.socket.send(JSON.stringify(payload));
};

const playAgain = () => {
  if (!props.socket) return;
  const payload = {
    type: "PLAYER_ACTION",
    payload: {
      matchId: props.matchId,
      action: "PLAY_AGAIN",
      data: { playerId: props.playerId },
    },
  };
  props.socket.send(JSON.stringify(payload));
};
</script>
