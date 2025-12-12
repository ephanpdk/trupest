<script setup lang="ts">
import { ref } from 'vue';
import { socketService, socketState } from '../services/socket';

const playerName = ref('');
const roomIdInput = ref('');
const isSubmitting = ref(false);

const createRoom = () => {
  if (!playerName.value) return alert('Nama harus diisi!');
  isSubmitting.value = true;
  socketService.send('C_CREATE_ROOM', { playerName: playerName.value });
  setTimeout(() => isSubmitting.value = false, 1000);
};

const joinRoom = () => {
  if (!playerName.value || !roomIdInput.value) return alert('Lengkapi data!');
  isSubmitting.value = true;
  socketService.send('C_JOIN_ROOM', { playerName: playerName.value, roomId: roomIdInput.value });
  setTimeout(() => isSubmitting.value = false, 1000);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
    <h1 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">TRUPEST</h1>
    <p class="text-slate-400 text-sm mb-8 font-medium">Strategic Card Game Engine</p>

    <div class="mb-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-inner">
      <div class="w-2 h-2 rounded-full animate-pulse" :class="socketState.isConnected ? 'bg-emerald-500' : 'bg-red-500'"></div>
      <span class="text-xs font-mono font-bold text-slate-300">{{ socketState.isConnected ? 'SERVER ONLINE' : 'DISCONNECTED' }}</span>
    </div>

    <div class="w-full space-y-5">
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Identity</label>
        <input v-model="playerName" type="text" placeholder="Enter Codename..." class="w-full bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-slate-600 font-medium" />
      </div>

      <button @click="createRoom" :disabled="!socketState.isConnected || isSubmitting" class="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all transform hover:-translate-y-0.5 shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed">
        Create New Match
      </button>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-700"></div></div>
        <div class="relative flex justify-center"><span class="bg-slate-800 px-3 text-xs text-slate-500 font-bold">OR JOIN</span></div>
      </div>

      <div class="flex gap-3">
        <input v-model="roomIdInput" type="text" placeholder="Room ID" class="flex-1 bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600" />
        <button @click="joinRoom" :disabled="!socketState.isConnected || isSubmitting" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">
          Join
        </button>
      </div>
    </div>
  </div>
</template>