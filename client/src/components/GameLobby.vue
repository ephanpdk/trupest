<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useGameStore } from '../stores/game';

const game = useGameStore();
const playerName = ref('');
const password = ref('');
const roomIdInput = ref('');
const isSubmitting = ref(false);
const authError = ref('');
const mode = ref<'login' | 'register' | 'guest'>('login');

onMounted(game.loadConfig);

// Akun aktif hanya jika server punya database DAN pemain sudah masuk.
const loggedIn = computed(() => game.accounts && !!game.accessToken && !!game.accountName);
const needsAuth = computed(() => game.accounts && !loggedIn.value && mode.value !== 'guest');

const submitAuth = async () => {
  authError.value = '';
  isSubmitting.value = true;
  const err = await game.authenticate(mode.value as 'login' | 'register', playerName.value.trim(), password.value);
  isSubmitting.value = false;
  authError.value = err ?? '';
  if (!err) password.value = '';
};

const joinGame = () => {
  const name = loggedIn.value ? game.accountName : playerName.value;
  if (!name || !roomIdInput.value) return alert('Data tidak lengkap!');
  isSubmitting.value = true;
  game.connect(roomIdInput.value, name);
  setTimeout(() => (isSubmitting.value = false), 2000);
};

const input = 'w-full bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-slate-600 font-medium';
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">

      <h1 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2 text-center">TRUPEST</h1>
      <p class="text-slate-400 text-sm mb-8 font-medium text-center">Strategic Card Game Engine</p>

      <!-- MASUK / DAFTAR -->
      <form v-if="needsAuth" @submit.prevent="submitAuth" class="space-y-4">
        <div class="flex rounded-xl overflow-hidden border border-slate-600 text-sm font-bold">
          <button type="button" @click="mode = 'login'" class="flex-1 py-2" :class="mode === 'login' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'">Masuk</button>
          <button type="button" @click="mode = 'register'" class="flex-1 py-2" :class="mode === 'register' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'">Daftar</button>
        </div>
        <input v-model="playerName" type="text" autocomplete="username" maxlength="20" placeholder="Nickname" :class="input" />
        <input v-model="password" type="password" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" maxlength="72" placeholder="Password (minimal 8 karakter)" :class="input" />
        <p v-if="authError" class="text-sm text-rose-400 font-bold">{{ authError }}</p>
        <button type="submit" :disabled="isSubmitting" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
          {{ isSubmitting ? '...' : mode === 'login' ? 'MASUK' : 'DAFTAR' }}
        </button>
        <button v-if="!game.requireLogin" type="button" @click="mode = 'guest'" class="w-full text-xs text-slate-500 hover:text-slate-300 underline">Main sebagai tamu (tanpa akun)</button>
      </form>

      <!-- ROOM -->
      <div v-else class="space-y-5">
        <div v-if="loggedIn" class="flex items-center justify-between bg-slate-900 border border-slate-600 rounded-xl px-4 py-3">
          <div class="text-sm"><span class="text-slate-500">Masuk sebagai</span> <b class="text-emerald-300">{{ game.accountName }}</b></div>
          <button @click="game.logout()" class="text-xs text-slate-400 hover:text-white underline">Keluar</button>
        </div>
        <div v-else>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Identity</label>
          <input v-model="playerName" type="text" maxlength="20" placeholder="Enter Codename..." :class="input" />
          <button v-if="game.accounts" @click="mode = 'login'" class="mt-2 text-xs text-slate-500 hover:text-slate-300 underline">Punya akun? Masuk</button>
        </div>

        <div class="flex gap-3">
          <input v-model="roomIdInput" type="text" placeholder="Room ID (e.g. MATCH-001)" class="flex-1 bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600" />
          <button @click="joinGame" :disabled="isSubmitting" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">
            {{ isSubmitting ? '...' : 'JOIN' }}
          </button>
        </div>

        <p class="text-xs text-slate-600 text-center mt-4">
          Room baru dibuat otomatis. Bagikan Room ID ke teman (maks 4 pemain), sisanya diisi bot.
        </p>
      </div>
    </div>
  </div>
</template>
