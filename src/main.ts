import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import '@/assets/styles/main.css'
import '@/assets/styles/transitions.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

import { useAuthStore } from '@/stores/auth'
import { useSavingsStore } from '@/stores/savings'
import { useFamilyStore } from '@/stores/family'
import { useProfileStore } from '@/stores/profile'
import { supabase } from '@/lib/supabase'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'

if (typeof window !== 'undefined') {
  (window as any).__pinia = pinia;
  (window as any).__router = router;
  (window as any).__useAuthStore = useAuthStore;
  (window as any).__useSavingsStore = useSavingsStore;
  (window as any).__useFamilyStore = useFamilyStore;
  (window as any).__useProfileStore = useProfileStore;
  (window as any).__supabase = supabase;
  (window as any).__recurringTransactionsService = recurringTransactionsService;
}

app.mount('#app')
