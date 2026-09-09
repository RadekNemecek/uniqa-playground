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

export function toast(text: string, tone: Toast['tone'] = 'info', ms = 3200): void {
  const t: Toast = { id: id('t'), text, tone }
  ui.toasts.push(t)
  window.setTimeout(() => {
    const at = ui.toasts.findIndex((x) => x.id === t.id)
    if (at >= 0) ui.toasts.splice(at, 1)
  }, ms)
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
