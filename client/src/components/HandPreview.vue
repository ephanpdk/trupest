<template>
  <div class="p-4 border border-gray-700 rounded-xl bg-gray-800 shadow-lg">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-emerald-400 flex items-center gap-2">
        <span>🃏</span> Kartu Tangan Anda
      </h3>
      <span class="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">{{ totalCards }} kartu</span>
    </div>

    <div class="grid grid-cols-4 gap-2 mb-4">
      <div v-for="suit in suits" :key="suit.code" 
           class="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xl" :class="suit.color">{{ suit.symbol }}</span>
          <span class="text-xs font-bold text-gray-400">{{ getCountBySuit(suit.code) }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="card in getCardsBySuit(suit.code)" 
            :key="card.rank"
            class="text-xs font-bold px-1.5 py-0.5 rounded"
            :class="suit.code === 'H' || suit.code === 'D' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-800'"
          >
            {{ card.rank }}
          </span>
          <span v-if="getCountBySuit(suit.code) === 0" class="text-gray-600 text-xs">-</span>
        </div>
      </div>
    </div>

    <div class="bg-gray-900/30 rounded-lg p-3 border border-gray-700">
      <div class="text-xs text-gray-500 mb-2">Ringkasan Suit:</div>
      <div class="flex justify-around text-center">
        <div v-for="suit in suits" :key="suit.code" class="flex flex-col items-center">
          <span class="text-xl" :class="suit.color">{{ suit.symbol }}</span>
          <span class="text-sm font-bold text-white">{{ getCountBySuit(suit.code) }}</span>
          <div class="text-[10px] text-gray-500">
            {{ getHighCard(suit.code) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  hand: any[];
}>();

const suits = [
  { code: 'S', symbol: '♠', name: 'Spade', color: 'text-white' },
  { code: 'H', symbol: '♥', name: 'Heart', color: 'text-red-500' },
  { code: 'C', symbol: '♣', name: 'Club', color: 'text-white' },
  { code: 'D', symbol: '♦', name: 'Diamond', color: 'text-red-500' }
];

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

const getHighCard = (suit: string) => {
  const cards = getCardsBySuit(suit);
  if (cards.length === 0) return 'kosong';
  return `Hi: ${cards[0].rank}`;
};
</script>
