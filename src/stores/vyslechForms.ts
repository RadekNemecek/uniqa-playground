import { reactive } from 'vue'
import { vyslechDbWhenReady } from '@/lib/vyslechDb'
import { id } from '@/lib/id'
import { clone } from '@/lib/clone'
import { defaultForm } from '@/vyslech/defaultForm'
import { emptyQuestion, isQuestionReady } from '@/vyslech/questions'
import type { VyslechForm } from '@/vyslech/types'

interface FormsState {
  forms: VyslechForm[]
  loaded: boolean
  /** Čtení odmítla databáze: zamčená správa nebo stará pravidla. */
  denied: boolean
  /** Bez úložiště Výslech nejede vůbec. */
  unavailable: boolean
}

const state = reactive<FormsState>({ forms: [], loaded: false, denied: false, unavailable: false })

let stop: (() => void) | null = null

export async function initVyslechForms(): Promise<void> {
  if (stop) return
  const conn = await vyslechDbWhenReady()
  if (!conn) {
    state.unavailable = true
    state.loaded = true
    return
  }
  state.unavailable = false
  // Na první snímek se čeká, jinak by se příprava rozhodovala podle
  // prázdného seznamu a nabídla založit sadu, která už existuje.
  await new Promise<void>((resolve) => {
    let settled = false
    const done = (): void => {
      if (settled) return
      settled = true
      resolve()
    }
    stop = conn.watchForms(
      (list) => {
        state.forms = [...list].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
        state.loaded = true
        state.denied = false
        done()
      },
      () => {
        state.denied = true
        state.loaded = true
        done()
      },
    )
    window.setTimeout(done, 6000)
  })
}

/** Po odemčení se sledování nasadí znovu: zamítnutý listener je mrtvý. */
export async function reloadVyslechForms(): Promise<void> {
  stop?.()
  stop = null
  state.denied = false
  state.loaded = false
  await initVyslechForms()
}

/** Čtený stav. Zapisuje se jen přes funkce níže. */
export const vyslechForms = state

async function conn() {
  const c = await vyslechDbWhenReady()
  if (!c) throw new Error('Výslech teď nemá kam ukládat.')
  return c
}

export async function saveForm(form: VyslechForm): Promise<void> {
  await (await conn()).saveForm(form)
}

export async function createDefaultForm(): Promise<VyslechForm> {
  const form = defaultForm()
  await saveForm(form)
  return form
}

export async function createEmptyForm(): Promise<VyslechForm> {
  const now = Date.now()
  const form: VyslechForm = {
    id: id('vf'),
    name: 'Nová sada',
    questions: [emptyQuestion('scale')],
    createdAt: now,
    updatedAt: now,
  }
  await saveForm(form)
  return form
}

/**
 * Kopie dostane nová id otázek. Výsledky se srovnávají podle id otázky,
 * a kopie, která se pak přepíše na jiné téma, by se jinak tvářila jako
 * pokračování originálu.
 */
export async function duplicateForm(source: VyslechForm): Promise<VyslechForm> {
  const now = Date.now()
  const copy: VyslechForm = {
    ...clone(source),
    id: id('vf'),
    name: `${source.name} (kopie)`,
    createdAt: now,
    updatedAt: now,
  }
  copy.questions = copy.questions.map((q) => ({ ...q, id: id('q') }))
  await saveForm(copy)
  return copy
}

export async function deleteForm(formId: string): Promise<void> {
  await (await conn()).deleteForm(formId)
}

export function readyCount(form: VyslechForm): number {
  return form.questions.filter(isQuestionReady).length
}
