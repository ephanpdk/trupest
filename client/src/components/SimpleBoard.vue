<script setup lang="ts">
// Meja empat kursi. Posisi relatif: kita di bawah, partner (seat + 2) di atas, lawan di kiri dan kanan.
// Semua aturan (kartu legal, pemenang, PASS) datang dari server; client hanya merender.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/game';
import CardFace from './CardFace.vue';
import CenterPanel from './CenterPanel.vue';

const game = useGameStore();
const gs = computed(() => game.gameState!);
const me = computed(() => game.mySeat);
const myTeam = computed(() => me.value % 2);

const SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_ORDER = ['S', 'H', 'C', 'D'];
const RANK_ORDER = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

// ---------- kursi ----------
const SLOT: Record<number, string> = {
  2: 'col-start-2 row-start-1 justify-self-center',
  1: 'col-start-1 row-start-2 self-center',
  3: 'col-start-3 row-start-2 self-center',
  0: 'col-span-3 row-start-3',
};
const seatOf = (rel: number) => (me.value + rel) % 4;
const playerOf = (rel: number) => gs.value.players.find(p => p.seatId === seatOf(rel));
const isMine = (rel: number) => rel === 0 || rel === 2; // partner = satu tim dengan kita
const nameOf = (rel: number) => {
  const p = playerOf(rel);
  return !p ? '-' : p.id === game.myPlayerId ? 'Anda' : p.name;
};
const bidLabel = (rel: number) => {
  if (gs.value.phase !== 'BIDDING' && gs.value.phase !== 'TRUMP_SELECTION') return '';
  const b = gs.value.bids[seatOf(rel)];
  return b === 'PASS' ? 'Pass' : typeof b === 'number' ? `Bid ${b}` : '';
};
const isActive = (rel: number) => gs.value.activePlayer === seatOf(rel) && ['BIDDING', 'TRUMP_SELECTION', 'TRICK'].includes(gs.value.phase) && !gs.value.trickResolve;

// ---------- timer giliran (sisa waktu dari server, dihitung turun di client) ----------
const now = ref(Date.now());
const turnEnd = ref<number | null>(null);
const turnTotal = ref(0);
let tick: ReturnType<typeof setInterval>;
watch(() => game.gameState, s => {
  now.value = Date.now();
  turnEnd.value = s && s.turnMsLeft != null ? now.value + s.turnMsLeft : null;
  turnTotal.value = s?.turnMsTotal ?? 0;
}, { immediate: true });
onMounted(() => (tick = setInterval(() => (now.value = Date.now()), 250)));
onBeforeUnmount(() => clearInterval(tick));
const turnPct = computed(() =>
  turnEnd.value !== null && turnTotal.value ? Math.max(0, Math.min(100, ((turnEnd.value - now.value) / turnTotal.value) * 100)) : null
);

// ---------- tangan kita ----------
const hand = computed(() =>
  gs.value.myHand
    .map((card, i) => ({ card, i }))
    .sort((a, b) =>
      SUIT_ORDER.indexOf(a.card.suit) - SUIT_ORDER.indexOf(b.card.suit) ||
      RANK_ORDER.indexOf(a.card.rank) - RANK_ORDER.indexOf(b.card.rank))
);
const myTurnToPlay = computed(() => gs.value.phase === 'TRICK' && !gs.value.trickResolve && gs.value.activePlayer === me.value);
const playable = (i: number) => myTurnToPlay.value && !!gs.value.legalMask?.[i];
const dimmed = (i: number) => myTurnToPlay.value && !gs.value.legalMask?.[i];

const fan = (k: number) => {
  const mid = (hand.value.length - 1) / 2;
  return { transform: `translateY(${(Math.abs(k - mid) ** 2 * 0.3).toFixed(1)}px) rotate(${((k - mid) * 2).toFixed(1)}deg)` };
};

// Layar sentuh: ketuk untuk memilih, ketuk lagi untuk memainkan (mencegah salah ketuk). Mouse: satu klik.
const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const selected = ref<number | null>(null);
watch(() => [gs.value.activePlayer, gs.value.myHand.length, gs.value.phase], () => (selected.value = null));

const playCard = (i: number) => {
  if (!playable(i)) return;
  if (coarse && selected.value !== i) { selected.value = i; return; }
  selected.value = null;
  game.send('PLAYER_ACTION', { matchId: gs.value.roomId, action: 'PLAY_CARD', data: { cardIndex: i } });
};

// ---------- skor & kontrak ----------
const myWins = computed(() => gs.value.teamScores[myTeam.value]);
const theirWins = computed(() => gs.value.teamScores[1 - myTeam.value]);
const showContract = computed(() => !!gs.value.trumpSuit && (gs.value.phase === 'TRICK' || gs.value.phase === 'FINISHED'));
</script>

<template>
  <div v-if="gs" class="relative h-full w-full felt rounded-2xl sm:rounded-3xl shadow-2xl border border-emerald-950/60 overflow-hidden">
    <!-- skor tim + kontrak -->
    <div class="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-30 flex flex-col items-end gap-1.5">
      <div class="rounded-lg overflow-hidden text-center text-[10px] sm:text-xs font-bold shadow-lg w-16 sm:w-20">
        <div class="bg-sky-300 text-sky-950 py-0.5">Anda <span class="text-base sm:text-lg leading-none block">{{ myWins }}</span></div>
        <div class="bg-rose-300 text-rose-950 py-0.5">Lawan <span class="text-base sm:text-lg leading-none block">{{ theirWins }}</span></div>
      </div>
      <div v-if="showContract" class="bg-black/50 rounded-lg px-2 py-1 text-xs sm:text-sm font-bold flex items-center gap-1 shadow">
        <span :class="gs.trumpSuit === 'H' || gs.trumpSuit === 'D' ? 'text-red-400' : 'text-white'" class="text-base sm:text-lg leading-none">{{ SYMBOL[gs.trumpSuit!] }}</span>
        <span>{{ gs.currentBid }}</span>
      </div>
    </div>

    <div class="h-full grid grid-cols-[4.8rem_1fr_4.8rem] sm:grid-cols-[9.5rem_1fr_9.5rem] grid-rows-[auto_1fr_auto] gap-x-1 p-1.5 pt-3 sm:p-3">
      <!-- kursi -->
      <div v-for="rel in [2, 1, 3, 0]" :key="rel" :class="SLOT[rel]" class="flex flex-col items-center min-w-0">
        <!-- punggung kartu lawan: dikipas di desktop, cukup lencana jumlah di HP -->
        <div v-if="rel !== 0" class="hidden sm:flex order-2 mt-1.5" :class="rel === 2 ? 'flex-row' : 'flex-col'">
          <div v-for="n in playerOf(rel)?.cardCount ?? 0" :key="n" class="card-back"
            :class="rel === 2 ? 'w-6 h-9 -ml-4 first:ml-0' : 'w-9 h-6 -mt-4 first:mt-0'"></div>
        </div>

        <!-- plakat nama -->
        <div class="relative w-full max-w-[9rem] rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-center shadow-lg"
          :class="[isMine(rel) ? 'bg-sky-200 text-sky-950' : 'bg-rose-200 text-rose-950', isActive(rel) ? 'ring-4 ring-yellow-300' : '']">
          <div v-if="gs.dealerIndex === seatOf(rel)" class="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white text-slate-800 text-[10px] font-black flex items-center justify-center shadow">D</div>
          <div class="flex items-center justify-center gap-1">
            <span class="text-sm sm:text-base">{{ playerOf(rel)?.isBot ? '🤖' : '👤' }}</span>
            <span class="font-bold text-[11px] sm:text-sm truncate">{{ nameOf(rel) }}</span>
          </div>
          <div class="text-[10px] sm:text-xs opacity-80">
            {{ gs.trickScores[seatOf(rel) % 2] }} trick
          </div>
          <div v-if="rel !== 0" class="sm:hidden text-[10px] opacity-70">{{ playerOf(rel)?.cardCount }} kartu</div>
          <div v-if="bidLabel(rel)" class="mt-0.5 text-[10px] sm:text-xs font-extrabold rounded-full px-1.5"
            :class="bidLabel(rel) === 'Pass' ? 'bg-slate-500/30' : 'bg-yellow-300 text-black'">{{ bidLabel(rel) }}</div>
          <div v-if="isActive(rel) && turnPct !== null" class="absolute left-1 right-1 bottom-0.5 h-1 rounded bg-black/15 overflow-hidden">
            <div class="h-full bg-emerald-600 transition-[width] duration-300 ease-linear" :style="{ width: turnPct + '%' }"></div>
          </div>
        </div>

        <!-- tangan kita -->
        <div v-if="rel === 0" class="order-first w-full flex justify-center items-end pt-2 pb-1 sm:pb-2 min-h-[5.2rem] sm:min-h-[8.5rem] lg:min-h-[9.5rem]">
          <div v-for="(item, k) in hand" :key="item.card.suit + item.card.rank" :style="fan(k)" class="origin-bottom" :class="k ? '-ml-[1.37rem] sm:-ml-[1.7rem] lg:-ml-[2.05rem]' : ''">
            <button type="button" :disabled="!playable(item.i)" @click="playCard(item.i)"
              :aria-label="`${item.card.rank} ${item.card.suit}`"
              class="block w-[2.9rem] h-[4.2rem] sm:w-[4.6rem] sm:h-[6.6rem] lg:w-[5.4rem] lg:h-[7.7rem] text-[0.72rem] sm:text-[1.05rem] lg:text-[1.2rem] transition-transform duration-150 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300"
              :class="[
                playable(item.i) ? 'cursor-pointer hover:-translate-y-3 ring-2 ring-emerald-300' : 'cursor-default',
                dimmed(item.i) ? 'opacity-45 brightness-75' : '',
                selected === item.i ? '-translate-y-5' : '',
              ]">
              <CardFace :suit="item.card.suit" :rank="item.card.rank" />
            </button>
          </div>
        </div>
      </div>

      <!-- tengah -->
      <div class="col-start-2 row-start-2 flex items-center justify-center min-w-0 min-h-0">
        <CenterPanel />
      </div>
    </div>

    <div v-if="coarse && selected !== null" class="absolute bottom-1 inset-x-0 text-center text-[11px] text-white/70 pointer-events-none">Ketuk kartu sekali lagi untuk memainkan</div>
  </div>
</template>
