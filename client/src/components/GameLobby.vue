<script setup lang="ts">
import { ref } from "vue";
import { useGameStore } from "../stores/game"; // Pakai Store langsung biar konsisten

const game = useGameStore();
const playerName = ref("");
const roomIdInput = ref("");
const isSubmitting = ref(false);

const joinGame = () => {
  if (!playerName.value || !roomIdInput.value)
    return alert("Data tidak lengkap!");
  isSubmitting.value = true;
  game.connect(roomIdInput.value, playerName.value);

  // Reset loading via watcher di parent atau manual timeout
  setTimeout(() => (isSubmitting.value = false), 2000);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] relative">
    <!-- Decorative Glow -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none -z-10"
    >
      <div
        class="w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] opacity-50"
      ></div>
    </div>

    <div
      class="w-full max-w-md bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
    >
      <!-- Top highlight -->
      <div
        class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
      ></div>

      <div class="mb-10 text-center">
        <div
          class="inline-block p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 mb-4 shadow-lg"
        >
          <span class="text-4xl">🃏</span>
        </div>
        <h1
          class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2"
        >
          TRUPEST
        </h1>
        <p
          class="text-emerald-400/80 text-sm font-medium tracking-wide uppercase"
        >
          Strategic Card Game Engine
        </p>
      </div>

      <div class="space-y-6">
        <div>
          <label
            class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1"
            >Identity</label
          >
          <input
            v-model="playerName"
            type="text"
            placeholder="Enter Codename..."
            class="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder-slate-500 font-medium shadow-inner"
          />
        </div>

        <div>
          <label
            class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1"
            >Room Access</label
          >
          <div class="flex gap-3">
            <input
              v-model="roomIdInput"
              type="text"
              placeholder="Room ID"
              class="flex-1 bg-white/5 text-white border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder-slate-500 shadow-inner"
            />
            <button
              @click="joinGame"
              :disabled="isSubmitting"
              class="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 border border-white/10"
            >
              {{ isSubmitting ? "..." : "JOIN" }}
            </button>
          </div>
        </div>

        <div class="pt-4 border-t border-white/5 text-center">
          <p class="text-xs text-slate-500 font-mono">Server: Port 3000</p>
        </div>
      </div>
    </div>
  </div>
</template>
