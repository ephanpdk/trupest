<script setup lang="ts">
import { computed } from 'vue';

// Mengisi ukuran induknya. `down` = punggung kartu; berubah true -> false memicu flip (SRS 9.4: <= 600 ms).
const props = defineProps<{ suit?: string; rank?: string; down?: boolean }>();

const SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const sym = computed(() => SYMBOL[props.suit ?? ''] ?? '');
const red = computed(() => props.suit === 'H' || props.suit === 'D');
</script>

<template>
  <div class="card-perspective w-full h-full">
    <div class="card-flip" :class="{ 'is-down': down }">
      <div class="card-side bg-white border border-slate-300 shadow-md flex flex-col justify-between p-[6%] select-none"
           :class="red ? 'text-red-600' : 'text-slate-900'">
        <div class="leading-none font-extrabold text-[0.95em]">
          {{ rank }}<span class="block text-[0.9em]">{{ sym }}</span>
        </div>
        <div class="absolute inset-0 flex items-center justify-center text-[2.1em] opacity-90 pointer-events-none">{{ sym }}</div>
        <div class="leading-none font-extrabold text-[0.95em] self-end rotate-180">
          {{ rank }}<span class="block text-[0.9em]">{{ sym }}</span>
        </div>
      </div>
      <div class="card-side card-back card-back-face"></div>
    </div>
  </div>
</template>

<style scoped>
.card-perspective { perspective: 700px; }
.card-flip {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
}
.card-flip.is-down { transform: rotateY(180deg); }
.card-side {
  position: absolute; inset: 0; border-radius: 8%;
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
}
.card-back-face { transform: rotateY(180deg); }
@media (prefers-reduced-motion: reduce) { .card-flip { transition: none; } }
</style>
