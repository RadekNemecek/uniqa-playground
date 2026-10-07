/* Datové typy Výslechu, zpětné vazby po školení. */

/**
 * Tvar otázky.
 *
 * - `scale` škála 1 až 5 s popisky na krajích,
 * - `nps` doporučení 0 až 10, číslo, které vedení zná,
 * - `single` jedna volba ze seznamu,
 * - `multi` víc voleb ze seznamu,
 * - `text` volná odpověď.
 *
 * Víc jich není schválně. Každý další tvar je další pole v editoru,
 * další widget na telefonu a další graf ve výsledcích.
 */
export type VyslechKind = 'scale' | 'nps' | 'single' | 'multi' | 'text'

export interface VyslechQuestion {
  id: string
  kind: VyslechKind
  prompt: string
  /** Povinnou otázku telefon nepustí dál bez odpovědi. Text je obvykle
   *  nepovinný: kdo nemá co říct, nemá psát vatu. */
  required: boolean
  /** Možnosti u `single` a `multi`. U ostatních tvarů prázdné. */
  options: string[]
  /** Popisky krajů škály a doporučení. Prázdné znamená výchozí. */
  low: string
  high: string
}

/** Sada otázek. Obvykle jedna, používaná pořád dokola. */
export interface VyslechForm {
  id: string
  name: string
  questions: VyslechQuestion[]
  createdAt: number
  updatedAt: number
}

/**
 * Odpověď na jednu otázku.
 *
 * Škála, doporučení a jedna volba nesou číslo (u volby index možnosti),
 * víc voleb pole indexů, text řetězec. Možnosti se ukládají jako index,
 * protože znění je zamražené v session i ve vyhodnocení.
 */
export type VyslechAnswer = number | number[] | string

export type VyslechAnswers = Record<string, VyslechAnswer>

/** Běžící sběr, jak ho vidí telefon. Nic, co by telefon nepotřeboval. */
export interface VyslechSession {
  schema: 1
  code: string
  hostUid: string
  /** Název školení. Telefon ho ukáže nahoře, aby bylo jasné, k čemu
   *  se odpovídá. */
  title: string
  /** Otázky zamražené při spuštění. Úprava sady pak běžící sběr nezmění. */
  questions: VyslechQuestion[]
  phase: 'open' | 'closed'
  createdAt: number
  expiresAt: number
}

/** Jeden odeslaný dotazník, jak dorazí moderátorce. */
export interface VyslechResponseRow {
  uid: string
  answers: VyslechAnswers
  at: number
}

/** Co se zadává při spuštění. */
export interface VyslechRunMeta {
  title: string
  group: string
  trainer: string
}

/**
 * Vyhodnocení jednoho sběru.
 *
 * Odpovědi jsou bez identity a v náhodném pořadí. Řádek ale drží
 * pohromadě odpovědi jednoho člověka, aby šlo číst „co napsali ti,
 * kdo dali jedničku nebo dvojku". Kdo to byl, z něj nevyčte nikdo.
 */
export interface VyslechReport {
  schema: 1
  id: string
  hostUid: string
  title: string
  group: string
  trainer: string
  formId: string
  formName: string
  questions: VyslechQuestion[]
  responses: VyslechAnswers[]
  startedAt: number
  finishedAt: number
}

/** Stav sběru na moderátorském počítači. Přežije obnovení stránky. */
export interface VyslechHostState {
  code: string
  meta: VyslechRunMeta
  formId: string
  formName: string
  questions: VyslechQuestion[]
  startedAt: number
  phase: 'open' | 'closed'
  /** Vyhodnocení po ukončení. Null, dokud se sběr neuzavřel, nebo když
   *  nikdo neodpověděl. */
  report: VyslechReport | null
  reportSaved: boolean
}
