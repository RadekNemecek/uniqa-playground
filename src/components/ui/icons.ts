/**
 * Ikony aplikace.
 *
 * Jeden rejstřík místo osmatřiceti inline SVG rozesetých po patnácti
 * souborech. Dřív měly ikony osm velikostí (11 az 24 px) a pět tlouštěk
 * tahu (2 az 3,5). Dvě ikony vedle sebe v jedné hlavičce tak byly každá
 * jinak nakreslená, a přesně tohle oko čte jako nedodělanou práci.
 *
 * Kreslí se na mřížce 24x24. Tahové ikony dědí tloušťku z `--icon-stroke`,
 * plné se kreslí výplní: kříž, fajfka nebo šipka musí vypadat stejně
 * v hlavičce i na dlaždici.
 */

interface IconDef {
  /** Obsah <svg>, souřadnice na mřížce 24x24. */
  body: string
  /** Plná ikona se kreslí výplní, ne tahem. */
  filled?: boolean
}

const RAW = {
  /* --- Navigace ---------------------------------------------------------- */
  'chevron-left': { body: '<path d="m15 5-7 7 7 7"/>' },
  'chevron-right': { body: '<path d="m9 5 7 7-7 7"/>' },
  'chevron-up': { body: '<path d="m5 15 7-7 7 7"/>' },
  'chevron-down': { body: '<path d="m5 9 7 7 7-7"/>' },
  'arrow-right': { body: '<path d="M5 12h13M12 5l7 7-7 7"/>' },
  'arrow-left': { body: '<path d="M19 12H6M12 19l-7-7 7-7"/>' },

  /* --- Akce -------------------------------------------------------------- */
  close: { body: '<path d="M6 6l12 12M18 6L6 18"/>' },
  check: { body: '<path d="M20 6 9 17l-5-5"/>' },
  plus: { body: '<path d="M12 5v14M5 12h14"/>' },
  minus: { body: '<path d="M5 12h14"/>' },
  trash: {
    body: '<path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  },
  copy: {
    body: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
  },
  download: { body: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>' },
  upload: { body: '<path d="M12 20V9M7 13l5-5 5 5M4 4h16"/>' },
  edit: { body: '<path d="M5 19h14M7 15l9-9 3 3-9 9H7v-3z"/>' },
  undo: { body: '<path d="M9 8H5V4M5.5 8.5a7 7 0 1 1-1 5"/>' },

  /* --- Stav a ovládání --------------------------------------------------- */
  play: { body: '<path d="M8 5v14l11-7z"/>', filled: true },
  pause: {
    body: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    filled: true,
  },
  dots: {
    body: '<circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>',
    filled: true,
  },
  triangle: { body: '<path d="M12 3 22 20H2z"/>', filled: true },
  lock: {
    body: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  },
  settings: {
    body:
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  },
  fullscreen: {
    body: '<path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/>',
  },
  'fullscreen-exit': {
    body: '<path d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4"/>',
  },

  /* --- Obsah ------------------------------------------------------------- */
  /** Plátno a stojan. Říká „tohle se promítá". */
  projector: { body: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>' },
  image: {
    body: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 4.5-4.5 3.5 3.5 3-2.5L20 17"/>',
  },
  phone: { body: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>' },
  clock: { body: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  warning: { body: '<path d="M12 3 22 20H2zM12 10v4M12 17.5v.5"/>' },
  info: { body: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>' },
} satisfies Record<string, IconDef>

export type IconName = keyof typeof RAW

/* `satisfies` výše hlídá tvar každé položky, tenhle typ pak zaručí, že se
   `filled` dá přečíst i u ikon, které ho nemají. */
export const ICONS: Record<IconName, IconDef> = RAW
