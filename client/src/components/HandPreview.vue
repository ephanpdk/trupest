<template>
  <div class="space-y-6">
    <!-- Existing Summary Panel -->
    <div class="p-4 border border-white/10 rounded-xl bg-black/40 backdrop-blur-md shadow-lg">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>🃏</span> Kartu Tangan Anda
        </h3>
        <span class="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/10">{{ totalCards }} kartu</span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div v-for="suit in suits" :key="suit.code" 
             class="bg-white/5 rounded-lg p-3 border border-white/10 transition hover:bg-white/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl drop-shadow-sm" :class="suit.color">{{ suit.symbol }}</span>
            <span class="text-xs font-bold text-slate-300">{{ getCountBySuit(suit.code) }}</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span v-if="getCountBySuit(suit.code) === 0" class="text-slate-600 text-xs">-</span>
            <div v-else class="text-[10px] font-mono text-slate-400">
               {{ getCardsBySuit(suit.code).map(c => c.rank).join(', ') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Visual Hand Display -->
    <div class="relative min-h-[220px] flex items-center justify-center py-4 px-8 overflow-x-auto">
      <div class="flex items-center" style="padding-left: 3rem;"> <!-- padding for hover space -->
        <div 
          v-for="(card, index) in sortedHand" 
          :key="`${card.suit}-${card.rank}`"
          class="-ml-16 hover:ml-4 transition-all duration-300 hover:-translate-y-6 hover:z-20 relative first:ml-0"
          :style="{ zIndex: index }"
        >
          <PlayingCard :card="card" className="shadow-2xl hover:shadow-emerald-500/20" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PlayingCard from './game/PlayingCard.vue';
import type { Card } from '../../../../shared/types';

const props = defineProps<{
  hand: Card[];
}>();

const suits = [
  { code: 'S', symbol: '♠', name: 'Spade', color: 'text-slate-200' }, // Adjusted color for dark mode
  { code: 'H', symbol: '♥', name: 'Heart', color: 'text-red-500' },
  { code: 'C', symbol: '♣', name: 'Club', color: 'text-slate-200' },
  { code: 'D', symbol: '♦', name: 'Diamond', color: 'text-red-500' }
] as const;

const RANK_ORDER = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

const totalCards = computed(() => props.hand?.length || 0);

const getCardsBySuit = (suit: string) => {
  if (!props.hand) return [];
  return props.hand
    .filter(c => c.suit === suit)
    .sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
};

const getCountBySuit = (suit: string) => {
  return getCardsBySuit(suit).length;
};

// Flattened list for visual display
const sortedHand = computed(() => {
  if (!props.hand) return [];
  // Sort by Suit then Rank
  const suitOrder = ['S', 'H', 'C', 'D'];
  return [...props.hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    }
    return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
  });
});
</script>
