/**
 * Telefon hráče jako ovladač, ne jako stránka.
 *
 * Dvě věci, které na běžném webu nedělají dobrotu, ale tady chybí:
 *
 * - **Displej nezhasne.** Mezi otázkami se na telefon nesahá a za půl
 *   minuty klidu ho systém ztlumí a zamkne. Hráč ho pak odemyká ve chvíli,
 *   kdy už běží odpočet, a uspaná karta mívá navíc mrtvé spojení.
 * - **Obrazovka se nezvětšuje.** Rychlé dvojí ťuknutí do dlaždice nebo
 *   dva prsty na displeji ji přiblížily a hráč pak hledal tlačítka mimo
 *   obraz. Text tu je velký sám od sebe, přiblížení k ničemu není.
 *
 * Obojí platí jen na obrazovce hráče kvízu. Správa a Výslech se dál chovají
 * jako běžná stránka: tam se píše a čte zblízka.
 */

let lock: WakeLockSentinel | null = null
let held = false
let viewportBefore: string | null = null

async function requestLock(): Promise<void> {
  if (!held || lock !== null || document.visibilityState !== 'visible') return
  if (!('wakeLock' in navigator)) return
  try {
    const next = await navigator.wakeLock.request('screen')
    // Mezitím se obrazovka mohla zavřít.
    if (!held) {
      void next.release()
      return
    }
    lock = next
    // Systém zámek pustí sám, když karta zajde na pozadí. Po návratu
    // ho vezme `visibilitychange` znovu.
    next.addEventListener('release', () => {
      if (lock === next) lock = null
    })
  } catch {
    /* Úsporný režim nebo prohlížeč bez podpory. Hraje se dál, jen displej
       zhasne jako obvykle. */
  }
}

function onVisible(): void {
  if (document.visibilityState === 'visible') void requestLock()
}

/** Safari na iPhonu ignoruje `user-scalable=no`, gesto dvou prstů se dá
 *  zastavit jen tady. */
function stopGesture(e: Event): void {
  e.preventDefault()
}

function viewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]')
}

export function holdPlayerScreen(): () => void {
  if (held) return releasePlayerScreen
  held = true

  const meta = viewportMeta()
  if (meta) {
    viewportBefore = meta.content
    meta.content = `${viewportBefore}, maximum-scale=1, user-scalable=no`
  }
  document.addEventListener('gesturestart', stopGesture)

  document.addEventListener('visibilitychange', onVisible)
  // Některé prohlížeče pustí zámek až po prvním dotyku. Ťuknutí přijde
  // nejpozději s přezdívkou nebo první odpovědí.
  document.addEventListener('pointerdown', onVisible)
  void requestLock()

  return releasePlayerScreen
}

export function releasePlayerScreen(): void {
  if (!held) return
  held = false

  const meta = viewportMeta()
  if (meta && viewportBefore !== null) meta.content = viewportBefore
  viewportBefore = null
  document.removeEventListener('gesturestart', stopGesture)

  document.removeEventListener('visibilitychange', onVisible)
  document.removeEventListener('pointerdown', onVisible)
  const current = lock
  lock = null
  if (current) void current.release()
}
