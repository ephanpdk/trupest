import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// WAJIB: Pasang Pinia DULU
app.use(pinia)

// BARU mount aplikasi
app.mount('#app')