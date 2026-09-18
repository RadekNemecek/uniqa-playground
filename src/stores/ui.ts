import { reactive } from 'vue'
import { id } from '@/lib/id'

export interface Toast {
  id: string
  text: string
  tone: 'info' | 'ok' | 'bad'
}

export interface ConfirmRequest {
  title: string
  text: string
  confirmLabel: string
  danger: boolean
  resolve: (ok: boolean) => void
}

export const ui = reactive({
  toasts: [] as Toast[],
  confirm: null as ConfirmRequest | null,
})

/**
 * Oznámení.
 *
 * Chyba nemizí sama. Uživatelka ji má opravit, a hláška, která zmizí za
 * tři vteřiny, se nedá ani dočíst, ani opsat. Zavře se kliknutím.
 * (WCAG 2.2.1: časový limit, který nejde prodloužit, na chybu nepatří.)
 */
export function toast(text: string, tone: Toast['tone'] = 'info', ms?: number): void {
  const t: Toast = { id: id('t'), text, tone }
  ui.toasts.push(t)

  if (tone === 'bad' && ms === undefined) return

  window.setTimeout(() => {
    const at = ui.toasts.findIndex((x) => x.id === t.id)
    if (at >= 0) ui.toasts.splice(at, 1)
  }, ms ?? 3200)
}

export function dismissToast(toastId: string): void {
  const at = ui.toasts.findIndex((x) => x.id === toastId)
  if (at >= 0) ui.toasts.splice(at, 1)
}

/** Potvrzovací dialog. Vrací true, když uživatel potvrdí. */
export function confirmAction(options: {
  title: string
  text: string
  confirmLabel?: string
  danger?: boolean
}): Promise<boolean> {
  return new Promise((resolve) => {
    ui.confirm = {
      title: options.title,
      text: options.text,
      confirmLabel: options.confirmLabel ?? 'Potvrdit',
      danger: options.danger ?? false,
      resolve,
    }
  })
}

export function answerConfirm(ok: boolean): void {
  ui.confirm?.resolve(ok)
  ui.confirm = null
}

/* --- Degradovaný režim ---------------------------------------------------- */

/**
 * Sdílená databáze není dostupná a aplikace jede jen z tohohle počítače.
 *
 * Dřív to oznámil toast, který za osm vteřin zmizel. Potom už nikde
 * nebylo vidět, že balíčky kolegů chybí a že se telefony nemají kam
 * připojit, takže se na to přišlo až před plnou místností.
 */
export const degraded = reactive({ local: false })

export function markLocalOnly(): void {
  degraded.local = true
}
