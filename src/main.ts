import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'

import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/router'
import { applySettings } from '@/stores/settings'
import { restoreGame } from '@/stores/game'
import { restoreQuizHost } from '@/stores/quizHost'
import { restoreVyslechHost } from '@/stores/vyslechHost'
import { setDb } from '@/lib/db'
import { vFitText } from '@/lib/fitText'
import {
  markSessionDbConnecting,
  markSessionDbFailed,
  setSessionDbFactory,
} from '@/lib/sessionDb'
import {
  markVyslechDbConnecting,
  markVyslechDbFailed,
  setVyslechDbFactory,
} from '@/lib/vyslechDb'
import { isFirebaseConfigured } from '@/lib/firebase.config'
import { markLocalOnly, toast } from '@/stores/ui'
import { setAccount } from '@/stores/account'

applySettings()
restoreGame()
restoreQuizHost()
restoreVyslechHost()

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
    markVyslechDbConnecting()
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
        setVyslechDbFactory(async () => {
          const { createFirestoreVyslechDb } = await import('@/lib/firebaseVyslech')
          return createFirestoreVyslechDb()
        })
        // Přišlo až po stropu, tedy jsme mezitím ohlásili lokální režim.
        // Nechat to být by znamenalo, že moderátorka připraví kvíz bez
        // telefonů, přestože se mezitím připojily. Hru s telefony smí
        // založit jen ověřený člen týmu, a účet se v lokálním režimu
        // neověřoval, takže to spraví až obnovení stránky.
        if (offline) {
          toast('Spojení se nakonec navázalo. Načti stránku znovu, otázky týmu se načtou a půjdou zapnout telefony hráčů.', 'ok', 8000)
        }
      },
      () => {
        markSessionDbFailed()
        markVyslechDbFailed()
      },
    )

    try {
      setDb(await Promise.race([connection, timeout(BOOT_TIMEOUT)]))
    } catch (e) {
      // Radši lokální režim než rozbitá hra deset minut před školením.
      // Data jsou pak jen z tohohle počítače, takže není co chránit
      // přihlášením. Příznak jde napřed, aby pozdě dorazivší spojení
      // nepřepsalo účet a nevyhodilo moderátorku na přihlášení.
      offline = true
      markLocalOnly()
      setAccount({ status: 'local' })
      console.error('Firestore není dostupný, pokračuji v lokálním režimu.', e)
    }
  } else {
    setAccount({ status: 'local' })
    // Bez sdílené databáze jede Výslech v prohlížeči, aby šel vyzkoušet.
    // Příprava řekne, že se telefony v sále nepřipojí.
    setVyslechDbFactory(async () => {
      const { createLocalVyslechDb } = await import('@/lib/localVyslech')
      return createLocalVyslechDb()
    })
  }

  createApp(App).use(router).directive('fit-text', vFitText).mount('#app')

  // Až po připojení, jinak by oznámení odešlo dřív, než je co ho zobrazí.
  // Mlčky přepnout do lokálního režimu nejde: uživatelce by beze slova
  // zmizely balíčky kolegů a nevěděla by proč.
  if (offline) {
    toast('Sdílená databáze není dostupná. Hrát jde dál, otázky se ale berou jen z tohoto počítače.', 'bad', 8000)
  }
}

void boot()
