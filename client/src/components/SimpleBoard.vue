<template>
  <div class="p-4 border rounded-lg bg-green-50 shadow-md">
    <h2 class="text-xl font-bold mb-4">🃏 Simple Testing Board</h2>

    <div class="mb-4 text-sm">
      <p><strong>Phase:</strong> {{ gameState.phase }}</p>
      <p><strong>Trump:</strong> {{ gameState.trumpSuit || '-' }}</p>
      <p><strong>Active Turn:</strong> Seat {{ gameState.activePlayer }}</p>
      <div v-if="isMyTurn" class="bg-yellow-200 text-yellow-800 p-2 rounded mt-2 font-bold animate-pulse">
        🔔 GILIRAN ANDA! SILAKAN PILIH KARTU
      </div>
    </div>

    <hr class="my-4 border-gray-300"/>

    <div class="mb-6">
      <h3 class="font-bold text-gray-700 mb-2">Meja (Current Trick):</h3>
      <div class="flex gap-2 min-h-[60px] bg-green-200 p-4 rounded items-center justify-center">
        <div v-if="gameState.currentTrick.length === 0" class="text-gray-500 italic">
          Meja Kosong
        </div>
        <div 
          v-for="(card, i) in gameState.currentTrick" 
          :key="i"
          class="bg-white border-2 border-gray-400 w-16 h-24 flex items-center justify-center rounded shadow-sm text-xl font-bold"
          :class="getSuitColor(card.suit)"
        >
          {{ card.rank }}{{ getSuitSymbol(card.suit) }}
        </div>
      </div>
    </div>

    <div>
      <h3 class="font-bold text-gray-700 mb-2">Kartu Tangan Anda (Klik untuk Main):</h3>
      <div class="flex flex-wrap gap-2">
        <button 
          v-for="(card, index) in gameState.myHand" 
          :key="index"
          @click="playCard(index)"
          :disabled="!isMyTurn"
          class="w-14 h-20 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:-translate-y-2 transition-all shadow text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          :class="getSuitColor(card.suit)"
        >
          {{ card.rank }}<br/>{{ getSuitSymbol(card.suit) }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Definisi Props yang diterima dari Parent (App.vue)
const props = defineProps<{
  gameState: any; // State JSON dari server
  playerId: string;
  matchId: string;
  socket: any;    // Instance WebSocket
}>();

// Helper: Cek apakah giliran kita
const isMyTurn = computed(() => {
  // Cari seatId kita sendiri dari list players
  const myPlayer = props.gameState.players.find((p: any) => p.id === props.playerId);
  if (!myPlayer) return false;
  return props.gameState.activePlayer === myPlayer.seatId;
});

// Helper: Warna & Simbol
const getSuitColor = (suit: string) => {
  return (suit === 'H' || suit === 'D') ? 'text-red-600' : 'text-black';
};

const getSuitSymbol = (suit: string) => {
  const map: Record<string, string> = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
  return map[suit] || suit;
};

// --- ACTION UTAMA: KIRIM PLAY_CARD ---
const playCard = (index: number) => {
  if (!props.socket) return;

  const payload = {
    type: 'PLAYER_ACTION',
    payload: {
      matchId: props.matchId,
      action: 'PLAY_CARD',
      data: {
        playerId: props.playerId,
        cardIndex: index // Kirim Index Array (0, 1, 2...)
      }
    }
  };

  console.log('📤 Sending Move:', payload);
  props.socket.send(JSON.stringify(payload));
};
</script>