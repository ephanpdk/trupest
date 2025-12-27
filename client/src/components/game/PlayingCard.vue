<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../../../../shared/types'; // Adjust path as needed
import { getSuitColor, getSuitPath } from '../../utils/cards';

const props = defineProps<{
  card?: Card;
  hidden?: boolean;
  className?: string;
  isHovered?: boolean;
}>();

const colorClass = computed(() => props.card ? getSuitColor(props.card.suit) : '');
const suitPath = computed(() => props.card ? getSuitPath(props.card.suit) : '');

// Helper for large suit display
const isFaceCard = computed(() => props.card && ['J', 'Q', 'K', 'A'].includes(props.card.rank));
const rankValue = computed(() => {
    if (!props.card) return 0;
    if (['J', 'Q', 'K'].includes(props.card.rank)) return 10;
    if (props.card.rank === 'A') return 1;
    return parseInt(props.card.rank);
});
</script>

<template>
  <div 
    class="relative w-32 h-48 rounded-2xl transition-all duration-300 cursor-pointer perspective group"
    :class="[
      isHovered || 'hover:scale-105 hover:-translate-y-2 hover:drop-shadow-2xl hover:z-10', 
      className
    ]"
  >
    <!-- Inner container for 3D flip -->
    <div 
      class="w-full h-full relative transition-all duration-500 preserve-3d"
      :style="{ transform: hidden ? 'rotateY(180deg)' : 'rotateY(0deg)' }"
    >
      
      <!-- Front Face -->
      <div 
        class="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl backface-hidden flex flex-col justify-between p-3 select-none border-2 border-slate-300 shadow-xl"
        v-if="card"
      >
        <!-- Top Corner -->
        <div class="flex flex-col items-center w-8" :class="colorClass">
          <span class="text-2xl font-bold font-serif leading-none drop-shadow-sm">{{ card.rank }}</span>
          <svg class="w-4 h-4 mt-1 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
             <path :d="suitPath" />
          </svg>
        </div>

        <!-- Center -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none" :class="colorClass">
          <div v-if="isFaceCard" class="border-4 border-current rounded-lg p-4 opacity-70 shadow-lg transform group-hover:scale-110 transition-transform">
             <span class="text-5xl font-serif font-bold drop-shadow-md">{{ card.rank }}</span>
          </div>
          <div v-else class="grid grid-cols-2 gap-2 opacity-25 transform scale-150">
             <!-- Simple repetition based on rank is tricky without layout logic, simplified to just a few icons or one big one -->
             <svg class="w-12 h-12 fill-current drop-shadow-sm" viewBox="0 0 24 24">
                <path :d="suitPath" />
             </svg>
          </div>
        </div>

        <!-- Bottom Corner (Rotated) -->
        <div class="flex flex-col items-center w-8 self-end transform rotate-180" :class="colorClass">
          <span class="text-2xl font-bold font-serif leading-none drop-shadow-sm">{{ card.rank }}</span>
          <svg class="w-4 h-4 mt-1 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
             <path :d="suitPath" />
          </svg>
        </div>
      </div>

      <!-- Back Face -->
      <div 
        class="absolute inset-0 rounded-2xl backface-hidden border-2 border-slate-200 shadow-xl overflow-hidden"
        style="transform: rotateY(180deg); background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e3a8a 100%);"
      >
        <!-- Decorative pattern -->
        <div class="absolute inset-0 opacity-20">
          <div class="absolute inset-2 border-2 border-white rounded-lg"></div>
          <div class="absolute inset-4 border border-white/30 rounded-lg"></div>
        </div>
        <div class="absolute inset-0 opacity-30 bg-repeat" 
             style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px);">
        </div>
        <!-- Center ornament -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-20 h-20 border-4 border-white rounded-lg opacity-30 rotate-45"></div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.perspective {
  perspective: 1000px;
}
.preserve-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
}
</style>