<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '../stores/game'; // Pakai Store langsung biar konsisten

const game = useGameStore();
const playerName = ref('');
const roomIdInput = ref('');
const isSubmitting = ref(false);

const joinGame = () => {
  if (!playerName.value || !roomIdInput.value) return alert('Data tidak lengkap!');
  isSubmitting.value = true;
  game.connect(roomIdInput.value, playerName.value);
  
  // Reset loading via watcher di parent atau manual timeout
  setTimeout(() => isSubmitting.value = false, 2000);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
      
      <h1 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2 text-center">TRUPEST</h1>
      <p class="text-slate-400 text-sm mb-8 font-medium text-center">Strategic Card Game Engine</p>

      <div class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Identity</label>
          <input v-model="playerName" type="text" placeholder="Enter Codename..." class="w-full bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-slate-600 font-medium" />
        </div>

        <div class="flex gap-3">
          <input v-model="roomIdInput" type="text" placeholder="Room ID (e.g. MATCH-001)" class="flex-1 bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600" />
          <button @click="joinGame" :disabled="isSubmitting" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">
            {{ isSubmitting ? '...' : 'JOIN' }}
          </button>
        </div>
        
        <p class="text-xs text-slate-600 text-center mt-4">
           Pastikan Server Online (Port 3000)
        </p>
      </div>
    </div>
  </div>
</template>