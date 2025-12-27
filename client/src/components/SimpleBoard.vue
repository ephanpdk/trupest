<template>
  <div class="p-6 border border-white/10 rounded-xl bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
    
    <!-- Header: Game Info -->
    <div class="flex justify-between items-start mb-8 pb-4 border-b border-white/10 relative z-10">
      <div>
        <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2 drop-shadow-sm">
          <span>🃏</span> Meja Permainan
        </h2>
        <div class="mt-2 flex items-center gap-4">
          <div class="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
             <span class="text-slate-400 text-xs uppercase font-bold tracking-wider">Trump</span>
             <strong class="text-xl" :class="getSuitColor(gameState.trumpSuit)">{{ getSuitSymbol(gameState.trumpSuit) }}</strong>
          </div>
          <div v-if="leadSuit" class="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
             <span class="text-slate-400 text-xs uppercase font-bold tracking-wider">Lead</span>
             <strong class="text-xl" :class="getSuitColor(leadSuit)">{{ getSuitSymbol(leadSuit) }}</strong>
          </div>
        </div>
      </div>

      <div v-if="isMyTurn" class="animate-bounce bg-yellow-500 text-black font-bold px-6 py-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] text-sm border-2 border-yellow-300">
        🔔 GILIRAN ANDA!
      </div>
    </div>

    <!-- Table Area (Trick) -->
    <div class="mb-12 relative min-h-[200px] flex items-center justify-center">
      <!-- Decor: Table Center -->
      <div class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div class="w-64 h-64 border-2 border-white rounded-full"></div>
        <div class="absolute w-48 h-48 border border-white/50 rounded-full"></div>
      </div>
      
      <div class="relative z-10 flex gap-4 items-center justify-center">
        <div v-if="gameState.currentTrick.length === 0" class="flex flex-col items-center animate-pulse opacity-50">
          <CardSlot className="border-dashed">
            <span class="text-4xl opacity-50">🃏</span>
          </CardSlot>
          <span class="mt-3 text-sm font-mono text-slate-400">Menunggu kartu...</span>
        </div>
        
        <div 
          v-for="(card, i) in gameState.currentTrick" 
          :key="i"
          class="relative animate-fade-in-up"
          :style="{ animationDelay: `${i * 100}ms` }"
        >
          <PlayingCard :card="card" className="shadow-2xl" />
          <div class="absolute -bottom-8 left-0 right-0 text-center">
            <span class="text-[10px] uppercase font-bold text-slate-400 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">Card {{ i + 1 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Player Hand Area -->
    <div class="relative pt-4">
      <div class="flex justify-between items-center mb-4 px-4">
        <h3 class="font-bold text-slate-300 text-sm uppercase tracking-wider">Kartu Tangan Anda</h3>
        <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Sorted by Suit & Rank</span>
      </div>
      
      <div class="relative min-h-[240px] flex items-center justify-center py-4 overflow-x-visible pb-10">
        <div class="flex items-center" style="padding-left: 3rem;">
            <button 
              v-for="(item, index) in sortedHand" 
              :key="index"
              @click="playCard(item.originalIndex)"
              :disabled="!isMyTurn || !isValidMove(item.card)"
              class="relative -ml-16 first:ml-0 transition-all duration-300 group outline-none"
              :class="[
                 isMyTurn && isValidMove(item.card) ? 'hover:-translate-y-8 hover:z-30 cursor-pointer' : 'opacity-60 grayscale-[0.5] cursor-not-allowed hover:z-10',
                 isValidMove(item.card) && isMyTurn ? 'z-10' : 'z-0'
              ]"
              :style="{ zIndex: index }"
            >
              <PlayingCard 
                :card="item.card" 
                :className="[
                  'shadow-xl transition-shadow duration-300',
                  isValidMove(item.card) && isMyTurn ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''
                ].join(' ')" 
              />
              
              <!-- Hover Label for Valid Moves -->
              <div v-if="isMyTurn && isValidMove(item.card)" 
                   class="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50">
                PLAY THIS
              </div>
            </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PlayingCard from './game/PlayingCard.vue';
import CardSlot from './game/CardSlot.vue';
import { getSuitColor as getSuitColorHelper } from '../utils/cards';

const props = defineProps<{
  gameState: any;
  playerId: string;
  matchId: string;
  socket: any;
}>();

// --- LOGIC SORTING KARTU ---
const SUIT_ORDER = { 'S': 0, 'H': 1, 'C': 2, 'D': 3 };
const RANK_VALUE: Record<string, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, 
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

const sortedHand = computed(() => {
  if (!props.gameState || !props.gameState.myHand) return [];
  
  const mapped = props.gameState.myHand.map((card: any, index: number) => ({
    card,
    originalIndex: index
  }));

  return mapped.sort((a: any, b: any) => {
    if (!a.card || !b.card) return 0;

    if (a.card.suit !== b.card.suit) {
      const valA = SUIT_ORDER[a.card.suit as keyof typeof SUIT_ORDER] ?? 0;
      const valB = SUIT_ORDER[b.card.suit as keyof typeof SUIT_ORDER] ?? 0;
      return valA - valB;
    }
    
    const rankA = RANK_VALUE[a.card.rank] ?? 0;
    const rankB = RANK_VALUE[b.card.rank] ?? 0;
    
    return rankB - rankA;
  });
});

const leadSuit = computed(() => {
  if (props.gameState?.currentTrick?.length > 0) {
    return props.gameState.currentTrick[0]?.suit;
  }
  return null;
});

const isMyTurn = computed(() => {
  if (!props.gameState || !props.gameState.players) return false;
  const myPlayer = props.gameState.players.find((p: any) => p.id === props.playerId);
  if (!myPlayer) return false;
  return props.gameState.activePlayer === myPlayer.seatId;
});

// Re-use helper or component
const getSuitColor = (suit: string | null) => {
   if (!suit) return 'text-slate-400';
   // Use helper but return Tailwind class directly for text
   return (suit === 'H' || suit === 'D') ? 'text-red-500' : 'text-cyan-100'; 
};

const getSuitSymbol = (suit: string | null) => {
  if (!suit) return '-';
  const map: Record<string, string> = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
  return map[suit] || suit;
};

const isValidMove = (card: any) => {
  if (!isMyTurn.value) return false;
  if (!leadSuit.value) return true; 
  if (!card) return false; 
  
  const hasLeadSuit = props.gameState.myHand.some((c: any) => c.suit === leadSuit.value);
  
  if (hasLeadSuit) {
    return card.suit === leadSuit.value; 
  }
  return true; 
};

const playCard = (index: number) => {
  if (!props.socket) return;
  const payload = {
    type: 'PLAYER_ACTION',
    payload: {
      matchId: props.matchId,
      action: 'PLAY_CARD',
      data: { playerId: props.playerId, cardIndex: index }
    }
  };
  props.socket.send(JSON.stringify(payload));
};
</script>

<style>
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out backwards;
}
</style>
