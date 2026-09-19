import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'

import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/router'
import { applySettings } from '@/stores/settings'
import { restoreGame } from '@/stores/game'
import { restoreQuizHost } from '@/stores/quizHost'
import { setDb } from '@/lib/db'
import { vFitText } from '@/lib/fitText'
import {
  markSessionDbConnecting,
  markSessionDbFailed,
  setSessionDbFactory,
} from '@/lib/sessionDb'
import { isFirebaseConfigured } from '@/lib/firebase.config'
import { markLocalOnly, toast } from '@/stores/ui'

applySettings()
restoreGame()
restoreQuizHost()

/**
 * Jak dlouho se čeká na Firestore, než se hra pustí bez něj.
 *
 * Odmítnuté spojení spadne samo a rychle. Firemní síť ho ale umí místo
 * odmítnutí tiše podržet, a bez stropu by se aplikace nepřipojila nikdy:
 * uživatelka by koukala na prázdnou stránku.
 *
 * Tři vteřiny to původně byly a bylo to málo. Než se spojení navázalo,
 * musela projít anonymní přihlášení, tedy celé kolečko na Google, a to
 * na konferenční wifi, kde se zrovna připojuje dvacet telefonů, tři
 * vteřiny běžně přesáhne. Kdo se do nich nevešel, spadl do lokálního
 * režimu na celou návštěvu stránky. Osm vteřin je nad rozptylem pomalé
 * sítě a pořád pod hranicí, kdy člověk usoudí, že se to rozbilo.
 */
const BOOT_TIMEOUT = 8000

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
    markSessionDbConnecting()
    const { createFirestoreDb } = await import('@/lib/firebase')
    const connection = createFirestoreDb()

    // Živá session kvízu jede po stejném spojení, ale nečeká na tentýž
    // strop. Spojení, které dorazí až po vypršení, se tím ještě chytne:
    // balíčky sice zůstanou lokální, telefony ale naskočí. Dřív se
    // tovární funkce po vypršení nezaregistrovala už nikdy a hráči
    // zbylo tlačítko „Zkusit znovu", které nemohlo uspět.
    connection.then(
      () => {
        setSessionDbFactory(async () => {
          const { createQuizSessionDb } = await import('@/lib/firebaseSession')
          return createQuizSessionDb()
        })
        // Přišlo až po stropu, tedy jsme mezitím ohlásili lokální režim.
        // Nechat to být by znamenalo, že moderátorka připraví kvíz bez
        // telefonů, přestože se mezitím připojily.
        if (offline) {
          toast('Spojení se nakonec navázalo. Telefony hráčů jdou zapnout, otázky se načtou po obnovení stránky.', 'ok', 8000)
        }
      },
      () => markSessionDbFailed(),
    )

    try {
      setDb(await Promise.race([connection, timeout(BOOT_TIMEOUT)]))
    } catch (e) {
      // Radši lokální režim než rozbitá hra deset minut před školením.
      offline = true
      console.error('Firestore není dostupný, pokračuji v lokálním režimu.', e)
    }
  }

  createApp(App).use(router).directive('fit-text', vFitText).mount('#app')

  // Až po připojení, jinak by oznámení odešlo dřív, než je co ho zobrazí.
  // Mlčky přepnout do lokálního režimu nejde: uživatelce by beze slova
  // zmizely balíčky kolegů a nevěděla by proč.
  if (offline) {
    markLocalOnly()
    toast('Sdílená databáze není dostupná. Hrát jde dál, otázky se ale berou jen z tohoto počítače.', 'bad', 8000)
  }
}

void boot()
