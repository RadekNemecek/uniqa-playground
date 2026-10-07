import { TEAM_COLORS } from '@/lib/teams'
import liskaUrl from '@/assets/avatars/liska.svg'
import medvedUrl from '@/assets/avatars/medved.svg'
import sovaUrl from '@/assets/avatars/sova.svg'
import kockaUrl from '@/assets/avatars/kocka.svg'
import zajicUrl from '@/assets/avatars/zajic.svg'
import mysUrl from '@/assets/avatars/mys.svg'
import zabaUrl from '@/assets/avatars/zaba.svg'
import tucnakUrl from '@/assets/avatars/tucnak.svg'
import levUrl from '@/assets/avatars/lev.svg'
import praseUrl from '@/assets/avatars/prase.svg'
import rybaUrl from '@/assets/avatars/ryba.svg'
import slonUrl from '@/assets/avatars/slon.svg'

/**
 * Zvířecí avataři hráčů.
 *
 * Kresby jsou vlastní SVG v `src/assets/avatars/`, ve stejném jazyce jako
 * zbytek aplikace: jen hlava zvířete, tlustý inkoustový obrys, ploché
 * barvy z palety, bez stínování. Žlutá ani jiskra v nich nejsou, liška
 * a lev jsou v písku. Hlava se čte i ve 30 px, celá postavička by se tam
 * slila do skvrny. Identifikátor, kresba i napsané jméno společně
 * rozlišují hráče; odstín dlaždice je jen podklad a nic nekóduje. Proto se avatar nikdy neukazuje u běžící otázky
 * vedle možností A až D, kde barva význam má.
 */
export interface Avatar {
  id: string
  /** Jméno zvířete se zobrazuje i textově a čte ho čtečka obrazovky. */
  label: string
  /** Proměnná s odstínem dlaždice pod kresbou. */
  cssVar: string
  /** Verzovaná adresa kresby s průhledným pozadím. */
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
