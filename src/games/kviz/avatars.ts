import { TEAM_COLORS } from '@/lib/teams'

/**
 * Zvířecí avataři hráčů.
 *
 * Kresby jsou v repozitáři, ne stažené: cizí sada by znamenala licenci,
 * kterou by někdo musel hlídat, a hlavně jiný výtvarný jazyk než zbytek
 * aplikace. Tohle je dvanáct siluet ve stejném klíči, každá v kruhu
 * z palety týmů, s tmavým inkoustem jako všude jinde.
 *
 * Barva avatara **nic nekóduje**. Rozlišuje ho tvar zvířete a jeho jméno,
 * odstín je jen plocha, na které stojí. Proto se avatar nikdy neukazuje
 * u běžící otázky vedle možností A až D, kde barva význam má.
 *
 * Kresba je konstantní řetězec z tohohle modulu, nikdy nic od uživatele.
 * Vykresluje ji `PlayerAvatar.vue`; třída `cut` je výřez v barvě kruhu,
 * `ink-line` čára inkoustem.
 */
export interface Avatar {
  id: string
  /** Jméno zvířete. Nese identitu stejně jako kresba, proto je vidět
   *  i psané, ne jen nakreslené. */
  label: string
  /** Proměnná s odstínem kruhu. */
  cssVar: string
  /** Obsah `<svg viewBox="0 0 64 64">`. */
  art: string
}

/** Odstín podle pořadí. Šest barev, dvanáct zvířat, takže se paleta
 *  jednou zopakuje a dvojice se liší tvarem. */
function tint(i: number): string {
  return TEAM_COLORS[i % TEAM_COLORS.length]!.cssVar
}

const ART: Array<[id: string, label: string, art: string]> = [
  [
    'liska',
    'Liška',
    '<path d="M13 30 15 8 29 20Z"/><path d="M51 30 49 8 35 20Z"/>' +
      '<path d="M32 58C17 50 11 38 13 25c7-6 31-6 38 0 2 13-4 25-19 33Z"/>' +
      '<path class="cut" d="M32 57c-6-5-9-9-9-12 0-3 4-4 9-4s9 1 9 4c0 3-3 7-9 12Z"/>' +
      '<circle class="cut" cx="23" cy="31" r="3.4"/><circle class="cut" cx="41" cy="31" r="3.4"/>' +
      '<ellipse cx="32" cy="44" rx="3.2" ry="2.4"/>',
  ],
  [
    'medved',
    'Medvěd',
    '<circle cx="16" cy="20" r="8"/><circle cx="48" cy="20" r="8"/>' +
      '<circle cx="32" cy="36" r="20"/>' +
      '<ellipse class="cut" cx="32" cy="43" rx="10" ry="7.5"/>' +
      '<circle class="cut" cx="24" cy="31" r="3"/><circle class="cut" cx="40" cy="31" r="3"/>' +
      '<ellipse cx="32" cy="40" rx="3.4" ry="2.6"/>',
  ],
  [
    'sova',
    'Sova',
    '<path d="M14 14 26 20 18 27Z"/><path d="M50 14 38 20 46 27Z"/>' +
      '<path d="M32 12c13 0 21 9 21 22s-9 22-21 22-21-9-21-22 8-22 21-22Z"/>' +
      '<circle class="cut" cx="23" cy="31" r="7.5"/><circle class="cut" cx="41" cy="31" r="7.5"/>' +
      '<circle cx="23" cy="31" r="3.2"/><circle cx="41" cy="31" r="3.2"/>' +
      '<path class="cut" d="M28 38h8l-4 8Z"/>',
  ],
  [
    'kocka',
    'Kočka',
    '<path d="M12 30 14 10 30 19Z"/><path d="M52 30 50 10 34 19Z"/>' +
      '<circle cx="32" cy="36" r="19"/>' +
      '<ellipse class="cut" cx="24" cy="33" rx="3" ry="4"/><ellipse class="cut" cx="40" cy="33" rx="3" ry="4"/>' +
      '<path class="cut" d="M29 41h6l-3 4Z"/>' +
      '<rect class="cut" x="14" y="43" width="11" height="2" rx="1"/>' +
      '<rect class="cut" x="39" y="43" width="11" height="2" rx="1"/>',
  ],
  [
    'zajic',
    'Zajíc',
    '<ellipse cx="24" cy="17" rx="5" ry="14" transform="rotate(-10 24 17)"/>' +
      '<ellipse cx="40" cy="17" rx="5" ry="14" transform="rotate(10 40 17)"/>' +
      '<circle cx="32" cy="40" r="16"/>' +
      '<circle class="cut" cx="26" cy="37" r="3"/><circle class="cut" cx="38" cy="37" r="3"/>' +
      '<path class="cut" d="M28 45h8l-4 4Z"/>',
  ],
  [
    'mys',
    'Myš',
    '<circle cx="15" cy="24" r="11"/><circle cx="49" cy="24" r="11"/>' +
      '<circle class="cut" cx="15" cy="24" r="5"/><circle class="cut" cx="49" cy="24" r="5"/>' +
      '<circle cx="32" cy="38" r="16"/>' +
      '<circle class="cut" cx="26" cy="35" r="2.8"/><circle class="cut" cx="38" cy="35" r="2.8"/>' +
      '<circle class="cut" cx="32" cy="46" r="3"/>',
  ],
  [
    'zaba',
    'Žába',
    '<circle cx="19" cy="20" r="9"/><circle cx="45" cy="20" r="9"/>' +
      '<circle class="cut" cx="19" cy="20" r="4"/><circle class="cut" cx="45" cy="20" r="4"/>' +
      '<ellipse cx="32" cy="38" rx="22" ry="16"/>' +
      '<path class="cut-line" d="M22 41c6 6 14 6 20 0"/>',
  ],
  [
    'tucnak',
    'Tučňák',
    '<ellipse cx="13" cy="36" rx="4.5" ry="12"/><ellipse cx="51" cy="36" rx="4.5" ry="12"/>' +
      '<ellipse cx="32" cy="34" rx="18" ry="22"/>' +
      '<ellipse class="cut" cx="32" cy="40" rx="11" ry="15"/>' +
      '<circle class="cut" cx="25" cy="24" r="3"/><circle class="cut" cx="39" cy="24" r="3"/>' +
      '<path d="M28 30h8l-4 7Z"/>',
  ],
  [
    'lev',
    'Lev',
    '<path d="M32 6 38 12 45 9 47 17 55 18 53 26 60 31 53 36 57 44 49 46 48 54 40 53 35 60 ' +
      '28 60 23 53 15 54 14 46 6 44 10 36 3 31 10 26 8 18 16 17 18 9 25 12Z"/>' +
      '<circle class="cut" cx="32" cy="33" r="14"/>' +
      '<circle cx="26" cy="30" r="2.8"/><circle cx="38" cy="30" r="2.8"/>' +
      '<path d="M28 38h8l-4 4Z"/>' +
      '<path class="ink-line" d="M32 42v3"/>',
  ],
  [
    'prase',
    'Prase',
    '<path d="M14 21 25 16 23 29Z"/><path d="M50 21 39 16 41 29Z"/>' +
      '<ellipse cx="32" cy="38" rx="20" ry="17"/>' +
      '<circle class="cut" cx="24" cy="32" r="2.8"/><circle class="cut" cx="40" cy="32" r="2.8"/>' +
      '<ellipse class="cut" cx="32" cy="44" rx="9" ry="6"/>' +
      '<circle cx="28.5" cy="44" r="1.8"/><circle cx="35.5" cy="44" r="1.8"/>',
  ],
  [
    'ryba',
    'Ryba',
    '<path d="M28 18c3-5 7-7 7-7s1 6-1 11Z"/>' +
      '<path d="M9 35c6-13 26-17 36-9 5 4 8 9 8 9s-3 5-8 9c-10 8-30 4-36-9Z"/>' +
      '<path d="M52 35 62 27l-2 17Z"/>' +
      '<circle class="cut" cx="21" cy="33" r="2.8"/>' +
      '<path class="cut-line" d="M11 40c4 3 8 4 12 4"/>',
  ],
  [
    'slon',
    'Slon',
    '<circle cx="15" cy="29" r="13"/><circle cx="49" cy="29" r="13"/>' +
      '<ellipse cx="32" cy="29" rx="15" ry="16"/>' +
      '<path class="ink-line thick" d="M32 41v10c0 4 3 7 7 7"/>' +
      '<circle class="cut" cx="25" cy="27" r="2.8"/><circle class="cut" cx="39" cy="27" r="2.8"/>',
  ],
]

export const AVATARS: Avatar[] = ART.map(([id, label, art], i) => ({
  id,
  label,
  cssVar: tint(i),
  art,
}))

const FALLBACK = AVATARS[0]!

/** Avatar podle identifikátoru. Neznámý nebo chybějící padne na první:
 *  hráč z doby před avatary nesmí nikde vyrobit prázdné kolečko. */
export function avatarFor(id: string | undefined): Avatar {
  return AVATARS.find((a) => a.id === id) ?? FALLBACK
}

/** Náhodný avatar pro nově příchozího. Hráč ho hned vidí a může ho
 *  vyměnit, ale nemusí: vybírat se nikomu nechce, když se čeká na start. */
export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]!.id
}
