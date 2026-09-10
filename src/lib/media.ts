import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Reaktivní media query. Používá se tam, kde nestačí CSS, protože se má
 * lišit samotná stavba rozhraní, ne jen jeho vzhled.
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  function update(): void {
    matches.value = mql?.matches ?? false
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    update()
    mql.addEventListener('change', update)
  })

  onBeforeUnmount(() => mql?.removeEventListener('change', update))

  return matches
}

/** Dotykové ovládání. Rozhoduje o velikosti ovládacích prvků. */
export const COARSE_POINTER = '(pointer: coarse)'
/** Hranice, pod kterou se matice otázek přepíná na seznam. */
export const NARROW = '(max-width: 720px)'
/** Desktopový editor: deska + panel otázky vedle sebe. */
export const WIDE = '(min-width: 900px)'
