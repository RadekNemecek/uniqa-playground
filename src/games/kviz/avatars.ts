import { TEAM_COLORS } from '@/lib/teams'
import liskaUrl from '@/assets/avatars/liska.webp'
import medvedUrl from '@/assets/avatars/medved.webp'
import sovaUrl from '@/assets/avatars/sova.webp'
import kockaUrl from '@/assets/avatars/kocka.webp'
import zajicUrl from '@/assets/avatars/zajic.webp'
import mysUrl from '@/assets/avatars/mys.webp'
import zabaUrl from '@/assets/avatars/zaba.webp'
import tucnakUrl from '@/assets/avatars/tucnak.webp'
import levUrl from '@/assets/avatars/lev.webp'
import praseUrl from '@/assets/avatars/prase.webp'
import rybaUrl from '@/assets/avatars/ryba.webp'
import slonUrl from '@/assets/avatars/slon.webp'

/**
 * Zvířecí avataři hráčů.
 *
 * Obrázky jsou původní sada uložená přímo v repozitáři. Identifikátor,
 * kresba i napsané jméno společně rozlišují hráče; odstín kruhu je jen
 * podklad a nic nekóduje. Proto se avatar nikdy neukazuje u běžící otázky
 * vedle možností A až D, kde barva význam má.
 */
export interface Avatar {
  id: string
  /** Jméno zvířete se zobrazuje i textově a čte ho čtečka obrazovky. */
  label: string
  /** Proměnná s odstínem kruhu pod kresbou. */
  cssVar: string
  /** Verzovaná adresa obrázku s průhledným pozadím. */
  src: string
}

/** Odstín podle pořadí. Šest barev, dvanáct zvířat, takže se paleta
 * jednou zopakuje a dvojice se liší tvarem i jménem. */
function tint(i: number): string {
  return TEAM_COLORS[i % TEAM_COLORS.length]!.cssVar
}

const ANIMALS: Array<[id: string, label: string, src: string]> = [
  ['liska', 'Liška', liskaUrl],
  ['medved', 'Medvěd', medvedUrl],
  ['sova', 'Sova', sovaUrl],
  ['kocka', 'Kočka', kockaUrl],
  ['zajic', 'Zajíc', zajicUrl],
  ['mys', 'Myš', mysUrl],
  ['zaba', 'Žába', zabaUrl],
  ['tucnak', 'Tučňák', tucnakUrl],
  ['lev', 'Lev', levUrl],
  ['prase', 'Prase', praseUrl],
  ['ryba', 'Ryba', rybaUrl],
  ['slon', 'Slon', slonUrl],
]

export const AVATARS: Avatar[] = ANIMALS.map(([id, label, src], i) => ({
  id,
  label,
  cssVar: tint(i),
  src,
}))

const FALLBACK = AVATARS[0]!

/** Neznámý nebo chybějící identifikátor padne na první zvíře. */
export function avatarFor(id: string | undefined): Avatar {
  return AVATARS.find((avatar) => avatar.id === id) ?? FALLBACK
}

/** Nový hráč dostane zvíře hned a může ho před připojením vyměnit. */
export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]!.id
}
