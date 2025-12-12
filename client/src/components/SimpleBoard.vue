<template>
  <div class="p-6 border border-gray-700 rounded-xl bg-gray-800 shadow-2xl">
    
    <div class="flex justify-between items-start mb-6 border-b border-gray-700 pb-4">
      <div>
        <h2 class="text-xl font-bold text-emerald-400 flex items-center gap-2">
          <span>🃏</span> Meja Permainan
        </h2>
        <div class="text-sm text-gray-400 mt-1 space-x-4">
          <span>Trump: <strong class="text-xl ml-1" :class="getSuitColor(gameState.trumpSuit)">{{ getSuitSymbol(gameState.trumpSuit) }}</strong></span>
          <span v-if="leadSuit">Lead Suit: <strong class="text-xl ml-1 border px-2 rounded bg-white" :class="getSuitColor(leadSuit)">{{ getSuitSymbol(leadSuit) }}</strong></span>
        </div>
      </div>

      <div v-if="isMyTurn" class="animate-bounce bg-yellow-500 text-black font-bold px-4 py-2 rounded-full shadow-lg text-sm">
        🔔 GILIRAN ANDA!
      </div>
    </div>

    <div class="mb-8 relative">
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-full h-px bg-gray-700"></div>
      </div>
      
      <h3 class="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider relative z-10 bg-gray-800 w-fit pr-2">Kartu di Meja</h3>
      
      <div class="flex gap-4 min-h-[140px] items-center justify-center bg-gray-900/50 rounded-xl border border-gray-700 p-4 border-dashed relative">
        <div v-if="gameState.currentTrick.length === 0" class="text-gray-500 italic flex flex-col items-center">
          <span class="text-4xl opacity-20">🃏</span>
          <span class="mt-2">Menunggu kartu pertama...</span>
        </div>
        
        <div 
          v-for="(card, i) in gameState.currentTrick" 
          :key="i"
          class="relative w-20 h-32 bg-white rounded-lg shadow-xl flex flex-col items-center justify-between p-2 transform transition-all duration-300 hover:-translate-y-2 border-2 border-gray-300"
          :class="getSuitColor(card.suit)"
        >
          <div class="text-xl font-bold self-start">{{ card.rank }}</div>
          <div class="text-4xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
            {{ getSuitSymbol(card.suit) }}
          </div>
          <div class="text-2xl self-end">{{ getSuitSymbol(card.suit) }}</div>
          
          <div class="absolute -bottom-8 text-xs text-gray-400 font-mono bg-black/50 px-2 py-1 rounded">
            Card {{ i + 1 }}
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 class="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider flex justify-between">
        <span>Kartu Tangan Anda</span>
        <span class="text-emerald-500 text-[10px] normal-case bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">Sorted by Suit & Rank</span>
      </h3>
      
      <div class="flex flex-wrap gap-3 justify-center">
        <button 
          v-for="(item, index) in sortedHand" 
          :key="index"
          @click="playCard(item.originalIndex)"
          :disabled="!isMyTurn"
          class="relative w-20 h-32 bg-white rounded-lg shadow-md transition-all duration-200 flex flex-col items-center justify-between p-2 border-b-4 border-gray-300 group"
          :class="[
            getSuitColor(item.card.suit),
            isMyTurn ? 'hover:-translate-y-4 hover:shadow-xl hover:border-blue-400 cursor-pointer' : 'opacity-70 cursor-not-allowed grayscale-[0.5]',
            isValidMove(item.card) ? 'ring-2 ring-emerald-400' : (isMyTurn && leadSuit ? 'opacity-50' : '')
          ]"
        >
          <div class="text-xl font-bold self-start">{{ item.card.rank }}</div>
          <div class="text-4xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">{{ getSuitSymbol(item.card.suit) }}</div>
          <div class="text-2xl self-end">{{ getSuitSymbol(item.card.suit) }}</div>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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
  // 1. Safety Check: Pastikan data ada sebelum diproses
  if (!props.gameState || !props.gameState.myHand) return [];
  
  const mapped = props.gameState.myHand.map((card: any, index: number) => ({
    card,
    originalIndex: index
  }));

  // Sort: Group by Suit, then by Rank (High to Low)
  return mapped.sort((a: any, b: any) => {
    // Safety check dalam loop sort
    if (!a.card || !b.card) return 0;

    if (a.card.suit !== b.card.suit) {
      // FIX ERROR TS2532: Gunakan '?? 0' (Nullish Coalescing)
      // Ini memberitahu TS: "Kalau hasilnya undefined, pakailah angka 0"
      const valA = SUIT_ORDER[a.card.suit as keyof typeof SUIT_ORDER] ?? 0;
      const valB = SUIT_ORDER[b.card.suit as keyof typeof SUIT_ORDER] ?? 0;
      return valA - valB;
    }
    
    // Safety check untuk Rank juga
    const rankA = RANK_VALUE[a.card.rank] ?? 0;
    const rankB = RANK_VALUE[b.card.rank] ?? 0;
    
    return rankB - rankA;
  });
});

// --- LEAD SUIT LOGIC ---
const leadSuit = computed(() => {
  // Safety Chain (?.): Cek bertingkat agar tidak crash jika null
  if (props.gameState?.currentTrick?.length > 0) {
    return props.gameState.currentTrick[0]?.suit;
  }
  return null;
});

// --- HELPER VISUAL ---
const isMyTurn = computed(() => {
  if (!props.gameState || !props.gameState.players) return false;
  const myPlayer = props.gameState.players.find((p: any) => p.id === props.playerId);
  if (!myPlayer) return false;
  return props.gameState.activePlayer === myPlayer.seatId;
});

const getSuitColor = (suit: string | null) => {
  if (!suit) return 'text-gray-400';
  return (suit === 'H' || suit === 'D') ? 'text-red-600' : 'text-slate-900';
};

const getSuitSymbol = (suit: string | null) => {
  if (!suit) return '-';
  const map: Record<string, string> = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
  return map[suit] || suit;
};

// --- VALIDASI VISUAL (Highlight kartu legal) ---
const isValidMove = (card: any) => {
  if (!isMyTurn.value) return false;
  if (!leadSuit.value) return true; 
  if (!card) return false; // Safety
  
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