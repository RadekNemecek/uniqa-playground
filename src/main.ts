import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'

import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/router'
import { applySettings } from '@/stores/settings'
import { restoreGame } from '@/stores/game'
import { setDb } from '@/lib/db'
import { isFirebaseConfigured } from '@/lib/firebase.config'

applySettings()
restoreGame()

async function boot(): Promise<void> {
  // Firebase se načítá až tehdy, když je nakonfigurovaný. Bez něj jede
  // aplikace lokálně a nestahuje o 200 kB navíc.
  if (isFirebaseConfigured()) {
    try {
      const { createFirestoreDb } = await import('@/lib/firebase')
      setDb(await createFirestoreDb())
    } catch (e) {
      // Radši lokální režim než rozbitá hra deset minut před školením.
      console.error('Firestore není dostupný, pokračuji v lokálním režimu.', e)
    }
  }
  createApp(App).use(router).mount('#app')
}

void boot()
