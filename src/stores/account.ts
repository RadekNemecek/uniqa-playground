import { reactive } from 'vue'

/**
 * Kdo je u počítače a kam smí.
 *
 * Otázky, sady i výsledky patří prostoru týmu a vidí je jen jeho člen.
 * Člen se přihlašuje e-mailem a heslem, hráč s telefonem se nepřihlašuje
 * vůbec. Stav plní `firebase.ts` při startu, obrazovky ho jen čtou.
 *
 * - `loading`: ještě se neví, start aplikace nebo ověřování v běhu,
 * - `local`: bez sdílené databáze. Data jsou jen z tohohle počítače,
 *   takže není co chránit a dovnitř smí každý. Platí pro `dev:local`
 *   i pro výpadek Firestore před školením,
 * - `signedOut`: nikdo není přihlášený e-mailem,
 * - `noAccess`: přihlášený e-mail, který v žádném prostoru není,
 * - `unknown`: přihlášený, ale členství se nepodařilo ověřit (bez sítě
 *   a bez dřívějšího záznamu na tomhle počítači),
 * - `member`: člen prostoru `spaceId`.
 */
export type AccountStatus =
  | 'loading'
  | 'local'
  | 'signedOut'
  | 'noAccess'
  | 'unknown'
  | 'member'
export type Role = 'admin' | 'editor'

interface AccountState {
  status: AccountStatus
  email: string
  spaceId: string
  spaceName: string
  role: Role | ''
}

const state = reactive<AccountState>({
  status: 'loading',
  email: '',
  spaceId: '',
  spaceName: '',
  role: '',
})

/** Čtený stav. Zapisuje se jen přes `setAccount`. */
export const account = state

export function setAccount(next: Partial<AccountState> & { status: AccountStatus }): void {
  state.status = next.status
  state.email = next.email ?? (next.status === 'local' ? '' : state.email)
  const inSpace = next.status === 'member'
  state.spaceId = inSpace ? (next.spaceId ?? state.spaceId) : ''
  state.spaceName = inSpace ? (next.spaceName ?? state.spaceName) : ''
  state.role = inSpace ? (next.role ?? state.role) : ''
}

/** Smí do přípravy, správy otázek, Výslechu a výsledků. */
export function canUseSpace(): boolean {
  return state.status === 'member' || state.status === 'local'
}

/** Smí spravovat členy. V lokálním režimu žádní členové nejsou. */
export function isSpaceAdmin(): boolean {
  return state.status === 'member' && state.role === 'admin'
}

/**
 * Prostor pro cesty do databáze. Volá se jen tam, kam se bez členství
 * nedá dostat, takže chybějící prostor je chyba v aplikaci, ne stav,
 * který by se měl tiše přejít.
 */
export function currentSpaceId(): string {
  if (!state.spaceId) throw new Error('Nejsi přihlášený do žádného týmu.')
  return state.spaceId
}

/* --- Paměť členství --------------------------------------------------------
 *
 * Na školení bez sítě se ověřit nedá, a hra se přesto musí spustit.
 * Poslední ověřené členství si proto počítač pamatuje a při startu se
 * použije hned; ověření ze serveru doběhne na pozadí. O skutečném
 * přístupu k datům stejně rozhodují pravidla na serveru.
 */

const KEY_MEMBERSHIP = 'mucirna.membership.v1'

export interface Membership {
  email: string
  spaceId: string
  spaceName: string
  role: Role
}

export function rememberMembership(m: Membership | null): void {
  try {
    if (m) localStorage.setItem(KEY_MEMBERSHIP, JSON.stringify(m))
    else localStorage.removeItem(KEY_MEMBERSHIP)
  } catch {
    // Bez úložiště se jen pokaždé ověřuje ze serveru.
  }
}

export function recallMembership(email: string): Membership | null {
  try {
    const raw = localStorage.getItem(KEY_MEMBERSHIP)
    if (!raw) return null
    const m = JSON.parse(raw) as Membership
    return m.email === email && m.spaceId && (m.role === 'admin' || m.role === 'editor') ? m : null
  } catch {
    return null
  }
}
