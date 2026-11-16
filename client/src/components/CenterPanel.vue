<script setup lang="ts">
// Panel tengah meja: isinya berganti mengikuti fase dari server. Client hanya merender dan mengirim aksi.
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import CardFace from './CardFace.vue';

const game = useGameStore();
const gs = computed(() => game.gameState!);
const me = computed(() => game.mySeat);
const myTeam = computed(() => me.value % 2);

const SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUITS = ['S', 'H', 'D', 'C'];
const bids = computed(() => Array.from({ length: gs.value.maxBid - 7 }, (_, i) => i + 8)); // 8..maxBid dari server

const nameOf = (seat: number | null) => {
  const p = gs.value.players.find(x => x.seatId === seat);
  return p?.name ?? '-';
};
const teamLabel = (t: number) => `Tim ${t === 0 ? 'A' : 'B'}`;

const act = (action: string, data: object = {}) =>
  game.send('PLAYER_ACTION', { matchId: gs.value.roomId, action, data });

const myTurn = computed(() => gs.value.activePlayer === me.value);
const resolve = computed(() => gs.value.trickResolve);

// Kartu ke-i di meja dimainkan oleh kursi (starter + i). Posisi relatif terhadap kursi kita.
const trickCards = computed(() =>
  gs.value.currentTrick.map((card, i) => {
    const seat = (gs.value.trickStarterIndex + i) % 4;
    return { card, i, seat, rel: (seat - me.value + 4) % 4 };
  })
);
const SLOT = [
  'bottom-0 left-1/2 -translate-x-1/2',
  'left-0 top-1/2 -translate-y-1/2',
  'top-0 left-1/2 -translate-x-1/2',
  'right-0 top-1/2 -translate-y-1/2',
];

const topBid = computed(() => (gs.value.currentBid >= 8 ? `${gs.value.currentBid}` : null));
const lastBidder = computed(() => {
  const b = gs.value.bids;
  let best = -1;
  b.forEach((v, i) => { if (typeof v === 'number' && (best === -1 || v > (b[best] as number))) best = i; });
  return best === -1 ? null : best;
});

const round = computed(() => gs.value.lastRound);
const myWins = computed(() => gs.value.teamScores[myTeam.value]);
const theirWins = computed(() => gs.value.teamScores[1 - myTeam.value]);
</script>

<template>
  <div class="w-full flex items-center justify-center">
    <!-- BIDDING -->
    <div v-if="gs.phase === 'BIDDING'" class="w-full max-w-sm bg-black/35 backdrop-blur rounded-2xl border border-white/10 p-3 sm:p-4 text-center">
      <div class="text-[11px] uppercase tracking-widest text-emerald-200/80">Bidding</div>
      <div class="text-sm text-white/90 mt-1 min-h-5">
        <template v-if="topBid">Bid tertinggi <b class="text-yellow-300">{{ topBid }}</b> · {{ nameOf(lastBidder) }}</template>
        <template v-else>Belum ada bid</template>
      </div>

      <template v-if="myTurn">
        <div class="mt-3 text-sm font-bold text-emerald-300 animate-pulse">Giliran {{ nameOf(me) }}</div>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <button v-for="n in bids" :key="n" :disabled="n <= gs.currentBid" @click="act('BID', { amount: n })"
            class="min-h-11 rounded-lg font-black text-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition">
            {{ n }}
          </button>
        </div>
        <button :disabled="!gs.canPass" @click="act('PASS')"
          class="mt-2 w-full min-h-11 rounded-lg font-bold bg-slate-600 hover:bg-slate-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition">
          PASS
        </button>
        <div v-if="!gs.canPass" class="mt-1 text-[11px] text-amber-300">Tangan kuat: wajib bid minimal 8</div>
      </template>
      <div v-else class="mt-3 text-sm text-white/70">Menunggu {{ nameOf(gs.activePlayer) }}…</div>
    </div>

    <!-- PILIH TRUMP -->
    <div v-else-if="gs.phase === 'TRUMP_SELECTION'" class="w-full max-w-sm bg-black/35 backdrop-blur rounded-2xl border border-white/10 p-3 sm:p-4 text-center">
      <div class="text-[11px] uppercase tracking-widest text-emerald-200/80">Pilih trump</div>
      <div class="text-sm text-white/90 mt-1">
        Kontrak <b class="text-yellow-300">{{ gs.currentBid }}</b> · {{ nameOf(gs.bidWinner) }}
      </div>
      <template v-if="gs.bidWinner === me">
        <div class="mt-2 grid grid-cols-4 gap-2">
          <button v-for="s in SUITS" :key="s" @click="act('SELECT_TRUMP', { suit: s })"
            class="min-h-12 rounded-lg bg-white text-3xl active:scale-95 hover:bg-slate-100 transition"
            :class="s === 'H' || s === 'D' ? 'text-red-600' : 'text-slate-900'">{{ SYMBOL[s] }}</button>
        </div>
        <div class="mt-2 text-[11px] text-white/60">Kartu trump selalu dimainkan tertutup sampai kartu ke-4</div>
      </template>
      <div v-else class="mt-3 text-sm text-white/70">{{ nameOf(gs.bidWinner) }} sedang memilih trump…</div>
    </div>

    <!-- MAIN KARTU -->
    <div v-else-if="gs.phase === 'TRICK'" class="flex flex-col items-center gap-2">
      <div class="relative w-44 h-36 sm:w-64 sm:h-48">
        <div v-for="t in trickCards" :key="t.i" class="absolute card-drop w-12 h-[4.4rem] sm:w-[4.4rem] sm:h-[6.3rem] text-[0.7rem] sm:text-[0.95rem]"
          :class="[SLOT[t.rel], resolve && resolve.winner === t.seat ? 'ring-4 ring-yellow-300 rounded-lg z-20' : '']"
          :style="{ zIndex: resolve && resolve.winner === t.seat ? 20 : t.i + 1 }">
          <CardFace :suit="t.card.suit" :rank="t.card.rank" :down="!!t.card.isHidden" />
        </div>
        <div v-if="!trickCards.length" class="absolute inset-0 flex items-center justify-center text-center text-sm text-white/60">
          {{ nameOf(gs.activePlayer) }} membuka trick
        </div>
      </div>
      <div class="min-h-7 text-sm text-center">
        <span v-if="resolve" class="inline-block bg-yellow-300 text-black font-bold px-3 py-1 rounded-full shadow">🏆 {{ nameOf(resolve.winner) }} menang trick</span>
        <span v-else-if="gs.tableFrozen" class="text-white/70">Kartu trump dibuka…</span>
        <span v-else-if="myTurn" class="text-emerald-300 font-bold animate-pulse">Giliran {{ nameOf(me) }}: pilih kartu</span>
        <span v-else class="text-white/60">Giliran {{ nameOf(gs.activePlayer) }}</span>
      </div>
    </div>

    <!-- RONDE / MATCH SELESAI -->
    <div v-else-if="gs.phase === 'FINISHED'" class="w-full max-w-sm bg-black/45 backdrop-blur rounded-2xl border border-white/10 p-3 sm:p-4 text-center">
      <div class="text-[11px] uppercase tracking-widest text-emerald-200/80">{{ gs.matchOver ? 'Match selesai' : `Ronde ${gs.roundNumber} selesai` }}</div>
      <div v-if="round" class="mt-2 text-sm text-white/90">
        Bid {{ round.bid }}: {{ teamLabel(round.declarerTeam) }} dapat <b>{{ round.declarerTricks }}</b> trick (target {{ round.declarerTarget }})
        <div class="mt-1 font-bold" :class="round.winnerTeam === myTeam ? 'text-emerald-300' : 'text-rose-300'">
          {{ teamLabel(round.winnerTeam) }} menang ronde
        </div>
      </div>
      <div class="mt-2 text-xs text-white/70">Ronde dimenangkan: {{ teamLabel(myTeam) }} {{ myWins }} – {{ teamLabel(1 - myTeam) }} {{ theirWins }}</div>

      <template v-if="gs.matchOver">
        <div class="mt-2 text-lg font-black text-yellow-300">🏆 {{ teamLabel(gs.matchWinner ?? 0) }} memenangkan match</div>
        <button @click="act('PLAY_AGAIN')" class="mt-3 w-full min-h-11 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition">Match baru</button>
        <div v-if="gs.serverSeed" class="mt-2 text-[10px] text-white/50 break-all">Seed server: {{ gs.serverSeed }}</div>
      </template>
      <template v-else>
        <button @click="act('NEXT_ROUND')" class="mt-3 w-full min-h-11 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition">Lanjut ronde</button>
        <div class="mt-1 text-[11px] text-white/50">Lanjut otomatis dalam 30 detik</div>
      </template>
    </div>
  </div>
</template>
