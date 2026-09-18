import type { Directive } from 'vue'
import { refitOnFonts } from '@/lib/fit'

/**
 * Zmenší text v jednom boxu, dokud se do něj nevejde.
 *
 * Slovo se nikdy nesmí zlomit uprostřed. „ODPOVĚDNOSTNÍ" rozdělené na
 * dva řádky se z posledního stolu přečte jako dvě slova a chvíli trvá,
 * než si to člověk srovná; na projektoru je to ztracená vteřina
 * u každé takové dlaždice. Když se slovo nevejde, není správná odpověď
 * rozseknout ho, ale ubrat na velikosti, stejně jako to dělá
 * `fitToScreen()` s celou obrazovkou.
 *
 * Styl si výsledek bere přes `var(--fit-text)` jako násobek velikosti
 * písma, aby velikost pořád vycházela z tokenu a ne ze syrové hodnoty.
 *
 * Používá se jako `v-fit-text`, registruje se v `main.ts`.
 */

/**
 * Meze zmenšování. Půlka je hranice, pod kterou už text v boxu nikdo
 * nepřečte; když se ani tak nevejde, je lepší nechat ho přetéct, protože
 * to je při přípravě hry vidět, kdežto nečitelný drobek ne.
 */
const MIN = 0.5
const STEP = 0.05

/**
 * Přeteklo dlouhé slovo do šířky?
 *
 * `scrollWidth` na to nestačí: text, který vyleze ven přes viditelné
 * přetečení, do něj prohlížeče nezapočítají. Měří se proto skutečný
 * rozsah textu, jehož obdélník sahá až na konec nejširšího řádku.
 */
function tooWide(el: HTMLElement): boolean {
  const range = document.createRange()
  range.selectNodeContents(el)
  const width = range.getBoundingClientRect().width
  return width > el.clientWidth + 1
}

/** Přeteklo to na výšku? Platí jen pro boxy, které výšku mají danou. */
function tooTall(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight + 1
}

function fit(el: HTMLElement): void {
  let value = 1
  el.style.setProperty('--fit-text', '1')
  while (value > MIN && (tooWide(el) || tooTall(el))) {
    value = Math.round((value - STEP) * 100) / 100
    el.style.setProperty('--fit-text', String(value))
  }
}

/**
 * Přeměřuje se jen při změně šířky boxu.
 *
 * Na každou změnu velikosti to nejde: měření samo mění výšku prvku,
 * observer by se spustil znovu a točil se dokola. Šířka je to jediné,
 * co měření neovlivňuje, takže je bezpečným spouštěčem.
 */
const lastWidth = new WeakMap<HTMLElement, number>()

const observer =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const width = el.clientWidth
          if (lastWidth.get(el) === width) continue
          lastWidth.set(el, width)
          fit(el)
        }
      })

function measure(el: HTMLElement): void {
  lastWidth.set(el, el.clientWidth)
  fit(el)
}

export const vFitText: Directive<HTMLElement> = {
  mounted(el) {
    measure(el)
    observer?.observe(el)
    // Písmo dorazí až po prvním vykreslení a láme se jinak než náhradní,
    // takže se po něm měří znovu. Stejný důvod jako u `refitOnFonts`.
    refitOnFonts(() => measure(el))
  },
  updated(el) {
    measure(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
    lastWidth.delete(el)
  },
}
