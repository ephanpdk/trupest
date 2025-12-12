<script setup lang="ts">
import { ref } from 'vue';
import { socketService, socketState } from '../services/socket';

// State Lokal untuk Form
const playerName = ref('');
const roomIdInput = ref('');
const isSubmitting = ref(false);

// Action: Create Room
const createRoom = () => {
  if (!playerName.value) return alert('Nama harus diisi!');
  
  isSubmitting.value = true;
  console.log('👆 User clicked Create Room');

  // Kirim Event ke Server (Sesuai Kontrak Shared Types)
  socketService.send('C_CREATE_ROOM', { 
    playerName: playerName.value 
  });

  // Reset loading setelah sebentar (sebagai feedback visual)
  setTimeout(() => isSubmitting.value = false, 1000);
};

// Action: Join Room
const joinRoom = () => {
  if (!playerName.value || !roomIdInput.value) return alert('Nama & Room ID harus diisi!');

  isSubmitting.value = true;
  console.log(`👆 User clicked Join Room: ${roomIdInput.value}`);

  socketService.send('C_JOIN_ROOM', {
    playerName: playerName.value,
    roomId: roomIdInput.value
  });

  setTimeout(() => isSubmitting.value = false, 1000);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
    
    <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
      TRUPEST
    </h1>
    <p class="text-gray-400 text-sm mb-6">Strategic Card Game</p>

    <div class="mb-6 flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-700">
      <div 
        class="w-3 h-3 rounded-full animate-pulse"
        :class="socketState.isConnected ? 'bg-green-500' : 'bg-red-500'"
      ></div>
      <span class="text-xs font-mono text-gray-300">
        {{ socketState.isConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED' }}
      </span>
    </div>

    <div class="w-full space-y-4">
      
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Codename</label>
        <input 
          v-model="playerName"
          type="text"
          placeholder="Enter your name..."
          class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500"
        />
      </div>

      <button 
        @click="createRoom"
        :disabled="!socketState.isConnected || isSubmitting"
        class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
      >
        Create New Match
      </button>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
        <div class="relative flex justify-center"><span class="bg-gray-800 px-2 text-xs text-gray-500">OR</span></div>
      </div>

      <div class="flex gap-2">
        <input 
          v-model="roomIdInput"
          type="text"
          placeholder="Room ID"
          class="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
        />
        <button 
          @click="joinRoom"
          :disabled="!socketState.isConnected || isSubmitting"
          class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-green-500/30"
        >
          Join
        </button>
      </div>

    </div>
  </div>
</template>