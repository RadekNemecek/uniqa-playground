import { id } from '@/lib/id'
import type { VyslechForm, VyslechQuestion } from './types'

function q(partial: Partial<VyslechQuestion> & Pick<VyslechQuestion, 'kind' | 'prompt'>): VyslechQuestion {
  return { id: id('q'), required: true, options: [], low: '', high: '', ...partial }
}

/**
 * Výchozí sada „Po školení".
 *
 * Sedm otázek, do dvou minut. Pořadí je schválně: nejdřív celkový dojem,
 * dokud je čerstvý, pak konkrétní stránky, doporučení a nakonec dva
 * texty. První škála je celková známka a výsledky podle ní třídí volné
 * odpovědi, proto musí zůstat první.
 */
export function defaultForm(): VyslechForm {
  const now = Date.now()
  return {
    id: id('vf'),
    name: 'Po školení',
    createdAt: now,
    updatedAt: now,
    questions: [
      q({ kind: 'scale', prompt: 'Jak hodnotíš dnešní školení?', low: 'Ztráta času', high: 'Výborné' }),
      q({ kind: 'scale', prompt: 'To, co jsem se dnes dozvěděl/a, využiju v práci.', low: 'Vůbec', high: 'Určitě' }),
      q({ kind: 'single', prompt: 'Tempo bylo…', options: ['Pomalé', 'Akorát', 'Rychlé'] }),
      q({ kind: 'scale', prompt: 'Výklad byl srozumitelný.', low: 'Vůbec', high: 'Naprosto' }),
      q({ kind: 'nps', prompt: 'Doporučil/a bys toto školení kolegovi?' }),
      q({ kind: 'text', prompt: 'Co si odnášíš a hned použiješ?', required: false }),
      q({ kind: 'text', prompt: 'Co bychom příště měli udělat jinak?', required: false }),
    ],
  }
}
