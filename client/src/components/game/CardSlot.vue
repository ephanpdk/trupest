<script setup lang="ts">
const props = defineProps<{
  className?: string;
}>();
</script>

<template>
  <div 
    class="w-32 h-48 rounded-2xl border-4 border-dashed border-white/20 bg-white/5 backdrop-blur-sm shadow-lg flex items-center justify-center animate-pulse"
    :class="className"
  >
    <slot></slot>
  </div>
</template>