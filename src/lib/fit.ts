import { nextTick, type Ref } from 'vue'

/**
 * Obsah se musí vejít na jednu obrazovku, protože moderátorka na
 * projektoru nescrolluje. Odhad podle počtu znaků byl vždycky buď moc
 * opatrný, nebo o kus vedle, tak se to prostě změří: začneme na plné
 * velikosti a ubíráme, dokud se obsah nevejde. Vyjde tím největší písmo,
 * které se do dané obrazovky vejde, ať je textu jakkoli mnoho.
 *
 * Styly si výsledek berou přes `var(--fit)`, typicky jako násobek
 * velikosti písma a šířky řádku.
 */
export const FIT_MIN = 0.42
export const FIT_STEP = 0.04

export async function fitToScreen(el: Ref<HTMLElement | null>): Promise<void> {
  await nextTick()
  const node = el.value
  if (!node) return

  let fit = 1
  node.style.setProperty('--fit', String(fit))
  while (node.scrollHeight > node.clientHeight + 1 && fit > FIT_MIN) {
    fit = Math.round((fit - FIT_STEP) * 100) / 100
    node.style.setProperty('--fit', String(fit))
  }
}

/**
 * Přeměření po změně velikosti okna. Vrací funkci, která posluchač odebere,
 * aby se dala zavolat v `onBeforeUnmount`.
 */
export function refitOnResize(run: () => void, delay = 120): () => void {
  let timer = 0
  const onResize = (): void => {
    window.clearTimeout(timer)
    timer = window.setTimeout(run, delay)
  }
  window.addEventListener('resize', onResize)
  return () => {
    window.removeEventListener('resize', onResize)
    window.clearTimeout(timer)
  }
}
