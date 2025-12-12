import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { socketService } from './services/socket'

// Jalankan koneksi
socketService.connect();

createApp(App).mount('#app')