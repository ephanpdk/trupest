import { createApp } from 'vue'
import { createPinia } from 'pinia' // <--- WAJIB IMPORT INI
import './style.css'
import App from './App.vue'

// Import service socket
import { socketService } from './services/socket'

const app = createApp(App)

// 1. Pasang Pinia DULUAN sebelum mount
const pinia = createPinia()
app.use(pinia)

// 2. Baru connect socket (biar socket bisa akses store kalau perlu)
socketService.connect();

// 3. Mount app
app.mount('#app')