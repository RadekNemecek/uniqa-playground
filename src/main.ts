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
import { toast } from '@/stores/ui'

applySettings()
restoreGame()

/**
 * Jak dlouho se čeká na Firestore, než se hra pustí bez něj.
 *
 * Odmítnuté spojení spadne samo a rychle. Firemní síť ho ale umí místo
 * odmítnutí tiše podržet, a bez stropu by se aplikace nepřipojila nikdy:
 * uživatelka by koukala na prázdnou stránku. Tři vteřiny jsou nad rámec
 * i pomalé konferenční wifi a pod hranicí, kdy začne být bílá plocha
 * podezřelá.
 */
const BOOT_TIMEOUT = 3000

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error('Firestore se neozval včas.')), ms)
  })
}

async function boot(): Promise<void> {
  let offline = false

  // Firebase se načítá až tehdy, když je nakonfigurovaný. Bez něj jede
  // aplikace lokálně a nestahuje o 200 kB navíc.
  if (isFirebaseConfigured()) {
    try {
      const { createFirestoreDb } = await import('@/lib/firebase')
      setDb(await Promise.race([createFirestoreDb(), timeout(BOOT_TIMEOUT)]))
    } catch (e) {
      // Radši lokální režim než rozbitá hra deset minut před školením.
      offline = true
      console.error('Firestore není dostupný, pokračuji v lokálním režimu.', e)
    }
  }

  createApp(App).use(router).mount('#app')

  // Až po připojení, jinak by oznámení odešlo dřív, než je co ho zobrazí.
  // Mlčky přepnout do lokálního režimu nejde: uživatelce by beze slova
  // zmizely balíčky kolegů a nevěděla by proč.
  if (offline) {
    toast('Sdílená databáze není dostupná. Hrát jde dál, otázky se ale berou jen z tohoto počítače.', 'bad', 8000)
  }
}

void boot()
