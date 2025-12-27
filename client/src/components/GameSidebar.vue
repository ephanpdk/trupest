<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../stores/game";

const game = useGameStore();
const bidAmount = ref(8);

// Helpers
const mySeatId = computed(() => {
  const me = game.gameState?.players.find((p: any) => p.id === game.myPlayerId);
  return me ? me.seatId : -1;
});

const isMyTurn = computed(
  () => game.gameState?.activePlayer === mySeatId.value
);
const amIBidWinner = computed(
  () => game.gameState?.bidWinner === mySeatId.value
);

// --- ACTIONS LOGIC (Dipindah dari App.vue) ---
const sendAction = (action: string, data: any = {}) => {
  game.send("PLAYER_ACTION", {
    matchId: game.gameState?.roomId,
    action,
    data: { playerId: game.myPlayerId, ...data },
  });
};
</script>

<template>
  <div class="space-y-6">
    <!-- Status Panel -->
    <div
      class="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl"
    >
      <h3
        class="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-5 border-b border-white/10 pb-2 flex items-center gap-2"
      >
        <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
        Status
      </h3>
      <div class="space-y-4">
        <div class="flex justify-between items-center group">
          <span
            class="text-slate-400 text-sm group-hover:text-slate-300 transition-colors"
            >Round</span
          >
          <span
            class="font-mono text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 px-3 py-0.5 rounded-lg text-sm shadow-[0_0_10px_rgba(234,179,8,0.1)]"
            >#{{ game.gameState?.roundNumber || 1 }}</span
          >
        </div>
        <div class="flex justify-between items-center group">
          <span
            class="text-slate-400 text-sm group-hover:text-slate-300 transition-colors"
            >Phase</span
          >
          <span
            class="font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-lg text-xs font-bold tracking-tight"
            >{{ game.phase }}</span
          >
        </div>
        <div class="flex justify-between items-center group">
          <span
            class="text-slate-400 text-sm group-hover:text-slate-300 transition-colors"
            >Active Turn</span
          >
          <div class="flex items-center gap-2">
            <span v-if="isMyTurn" class="relative flex h-3 w-3">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"
              ></span>
            </span>
            <span
              class="font-bold text-white text-sm"
              :class="isMyTurn ? 'text-emerald-400' : ''"
              >Seat {{ game.gameState?.activePlayer }}</span
            >
          </div>
        </div>
        <div
          class="flex justify-between items-center pt-2 border-t border-white/5"
        >
          <span class="text-slate-400 text-sm">Highest Bid</span>
          <span class="font-bold text-white font-mono text-lg">{{
            game.gameState?.currentBid
          }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400 text-sm">Bid Winner</span>
          <span class="font-bold text-yellow-400 drop-shadow-sm"
            >Seat {{ game.gameState?.bidWinner ?? "-" }}</span
          >
        </div>
      </div>
    </div>

    <!-- Actions Panel -->
    <div
      class="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl relative overflow-hidden min-h-[220px]"
    >
      <div
        class="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"
      ></div>

      <h3
        class="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-5 border-b border-white/10 pb-2 flex items-center gap-2 relative z-10"
      >
        <div class="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
        Actions
      </h3>

      <div
        v-if="
          !isMyTurn &&
          game.phase !== 'TRUMP_SELECTION' &&
          game.phase !== 'TRICK' &&
          game.phase !== 'SCORING'
        "
        class="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20"
      >
        <div
          class="text-slate-400 flex flex-col items-center p-4 bg-black/80 rounded-xl border border-white/10"
        >
          <div class="animate-spin text-2xl mb-2 text-emerald-500">⏳</div>
          <span class="text-xs font-medium"
            >Waiting for Seat {{ game.gameState?.activePlayer }}</span
          >
        </div>
      </div>

      <div v-if="game.phase === 'BIDDING'" class="space-y-3 relative z-10">
        <div class="flex gap-2">
          <input
            v-model="bidAmount"
            type="number"
            class="w-20 bg-white/5 border border-white/20 rounded-lg text-center text-white font-bold py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            @click="sendAction('BID', { amount: bidAmount })"
            class="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 rounded-lg transition shadow-lg shadow-emerald-900/20"
          >
            BID
          </button>
        </div>
        <button
          @click="sendAction('PASS')"
          class="w-full border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white font-bold py-2 rounded-lg transition bg-red-500/5 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
        >
          PASS
        </button>
      </div>

      <div
        v-else-if="game.phase === 'TRUMP_SELECTION'"
        class="text-center relative z-10"
      >
        <div v-if="amIBidWinner" class="grid grid-cols-2 gap-3">
          <button
            v-for="s in ['S', 'H', 'C', 'D']"
            :key="s"
            @click="sendAction('SELECT_TRUMP', { suit: s, hidden: false })"
            class="aspect-square bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-3xl shadow-lg transition transform hover:scale-110 flex items-center justify-center"
            :class="['H', 'D'].includes(s) ? 'text-red-500' : 'text-slate-200'"
          >
            {{ { S: "♠", H: "♥", C: "♣", D: "♦" }[s] }}
          </button>
        </div>
        <div
          v-else
          class="text-slate-500 italic py-4 bg-white/5 rounded-lg border border-dashed border-white/10"
        >
          Menunggu pemilihan truf...
        </div>
      </div>

      <div
        v-else-if="game.phase === 'TRICK'"
        class="text-center py-6 relative z-10 bg-white/5 rounded-xl border border-white/5"
      >
        <p class="text-emerald-400 font-bold text-sm mb-2 animate-pulse">
          ⚡ Fase Main Kartu
        </p>
        <p class="text-slate-500 text-xs">Perhatikan meja di kanan 👉</p>
      </div>

      <div
        v-else-if="game.phase === 'SCORING' || game.phase === 'FINISHED'"
        class="text-center py-4 space-y-4 relative z-10"
      >
        <div class="text-4xl animate-bounce">🏁</div>
        <div class="text-white font-bold tracking-widest text-sm">
          RONDE SELESAI
        </div>
        <div
          class="grid grid-cols-2 gap-2 text-xs bg-black/40 p-3 rounded-lg border border-white/10"
        >
          <div class="flex flex-col">
            <span class="text-slate-500 uppercase text-[10px]">Team 1</span>
            <span class="text-cyan-400 font-bold text-lg">{{
              (game.gameState?.players?.[0]?.score || 0) +
              (game.gameState?.players?.[2]?.score || 0)
            }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-slate-500 uppercase text-[10px]">Team 2</span>
            <span class="text-cyan-400 font-bold text-lg">{{
              (game.gameState?.players?.[1]?.score || 0) +
              (game.gameState?.players?.[3]?.score || 0)
            }}</span>
          </div>
        </div>
        <button
          v-if="game.phase === 'FINISHED'"
          @click="sendAction('NEW_ROUND')"
          class="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 border border-white/20"
        >
          Main Lagi
        </button>
      </div>
    </div>
  </div>
</template>
