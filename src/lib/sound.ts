/**
 * Zvuková odezva generovaná Web Audio. Žádné soubory: hra funguje offline
 * a nic se nedonačítá. Vše jde vypnout v nastavení.
 *
 * Sady jsou dvě. Výchozí „Stůl" (dole) patří k papírovému vzhledu:
 * suché údery, dřevo, marimba. „Hala" je původní řeč zvuků, popsaná
 * hned tady, a dá se zvolit v nastavení.
 *
 * Řeč haly je „drnknuto v místnosti", ne „zapípáno".
 *
 * Tři věci to drží pohromadě:
 *
 * 1. **Dozvuk.** Suchý sinusový tón zní jako pípák bez ohledu na to, jak
 *    měkkou má obálku. Krátká hala z generovaného šumu ho posadí do
 *    prostoru a je to největší rozdíl proti dřívějšku. Impulsní odezva se
 *    počítá v kódu, takže pořád nejsou potřeba žádné soubory.
 * 2. **Drnknutí místo tónu.** Nástup skoro okamžitý, doznění exponenciální.
 *    Nic nedrží, nic nezpívá. Melodické běhy jsou pryč: „správně" je jeden
 *    souzvuk, ne čtyřtónová fanfára.
 * 3. **Nižší poloha.** Dřív se svítilo kolem 1000 Hz, což na notebooku
 *    a v levném projektoru řeže. Kotva je teď komorní A na 220 Hz a
 *    všechno ostatní jsou její násobky, takže palety drží pohromadě.
 *
 * Na výstupu sedí limiter. Když se sejde konec časomíry s vyhodnocením,
 * dřív to zakřupalo.
 */

/** Kotva ladění: komorní A. Všechny hlasy jsou její násobky. */
const A3 = 220
const C4 = A3 * 1.2 // malá tercie, 264 Hz
const E4 = A3 * 1.5 // kvinta, 330 Hz
const A4 = A3 * 2
const E5 = E4 * 2
const A5 = A4 * 2

let ctx: AudioContext | null = null
let enabled = true
let master: GainNode | null = null
let send: GainNode | null = null

function audio(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    build(ctx)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/**
 * Sestaví sběrnici: suchá cesta i odbočka do haly končí v limiteru.
 *
 * Limiter tu není kvůli hlasitosti, ale kvůli souběhu. Časomíra umí
 * doznít přesně ve chvíli, kdy moderátorka vyhodnotí odpověď, a součet
 * dvou špiček přetekl.
 */
function build(ac: AudioContext): void {
  const limiter = ac.createDynamicsCompressor()
  limiter.threshold.value = -8
  limiter.knee.value = 6
  limiter.ratio.value = 12
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  limiter.connect(ac.destination)

  master = ac.createGain()
  master.gain.value = 0.9
  master.connect(limiter)

  const hall = ac.createConvolver()
  hall.buffer = impulse(ac)

  const wet = ac.createGain()
  wet.gain.value = 0.28

  send = ac.createGain()
  send.gain.value = 1
  send.connect(hall).connect(wet).connect(limiter)
}

/**
 * Impulsní odezva malé haly: šum, který doznívá a přitom tmavne.
 *
 * Jednopólová dolní propust uvnitř smyčky je levná náhrada za to, co
 * dělá skutečná místnost, tedy že výšky spolknou zdi dřív než basy.
 * Bez ní zní dozvuk jako syčení.
 */
function impulse(ac: AudioContext, seconds = 1.5, decay = 3.4): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = last * 0.72 + (Math.random() * 2 - 1) * 0.28
      data[i] = last * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

/** Prohlížeč pustí zvuk až po interakci uživatele. */
export function primeAudio(): void {
  audio()
}

/** Drobné rozladění na každý úder, ať dva stejné zvuky nejsou totožné. */
function drift(cents = 5): number {
  return (Math.random() * 2 - 1) * cents
}

interface Pluck {
  freq: number
  /** Cílová frekvence, když má tón sjet nebo vylétnout. */
  glide?: number
  /** Jak dlouho doznívá. */
  decay: number
  gain?: number
  type?: OscillatorType
  /** Dolní propust. Níž znamená tupěji a měkčeji. */
  cutoff?: number
  /** Kolik hlasu jde do haly, 0 az 1. */
  room?: number
  delay?: number
}

/**
 * Jeden drnknutý hlas: rychlý nástup, exponenciální doznění.
 *
 * Dvojice oscilátorů rozladěná o pár centů dělá tělo. Sama by to byla
 * sinusovka, a ta zní bez těla jako signalizace.
 */
function pluck({
  freq,
  glide,
  decay,
  gain = 0.1,
  type = 'triangle',
  cutoff = 2600,
  room = 0.35,
  delay = 0,
}: Pluck): void {
  const ac = audio()
  if (!ac || !master || !send) return

  const t0 = ac.currentTime + delay
  const end = t0 + decay

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.6
  filter.frequency.setValueAtTime(cutoff, t0)
  // Jak tón doznívá, ztrácí výšky. Přesně to dělá každý skutečný nástroj.
  filter.frequency.exponentialRampToValueAtTime(Math.max(160, cutoff * 0.25), end)

  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.006)
  amp.gain.exponentialRampToValueAtTime(0.0001, end)

  for (const [cents, level] of [
    [drift(), 1],
    [drift() + 7, 0.5],
  ] as const) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (glide !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), end)
    }
    osc.detune.setValueAtTime(cents, t0)
    g.gain.value = level
    osc.connect(g).connect(filter)
    osc.start(t0)
    osc.stop(end + 0.02)
  }

  filter.connect(amp)
  amp.connect(master)
  if (room > 0) {
    const tap = ac.createGain()
    tap.gain.value = room
    amp.connect(tap).connect(send)
  }
}

interface Air {
  duration: number
  /** Kudy projede pásmová propust. */
  from: number
  to: number
  gain?: number
  q?: number
  room?: number
  delay?: number
}

/** Vzduch: filtrovaný šum. Dělá nádech před tónem a náraz pod ním. */
function air({ duration, from, to, gain = 0.05, q = 0.7, room = 0.25, delay = 0 }: Air): void {
  const ac = audio()
  if (!ac || !master || !send) return

  const t0 = ac.currentTime + delay
  const len = Math.max(1, Math.floor(ac.sampleRate * duration))
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  }

  const src = ac.createBufferSource()
  src.buffer = buf

  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), t0 + duration)

  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.03, duration * 0.25))
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  src.connect(filter).connect(amp)
  amp.connect(master)
  if (room > 0) {
    const tap = ac.createGain()
    tap.gain.value = room
    amp.connect(tap).connect(send)
  }

  src.start(t0)
  src.stop(t0 + duration + 0.02)
}

/**
 * Sada „Hala": měkká drnknutí s dozvukem. Původní zvuky z doby tmavého
 * tématu, nechávají se jako druhá volba v nastavení.
 */
const HALA = {
  /**
   * Otevření políčka. Nádech a pod ním tupý náraz, jako když se otočí
   * těžká deska. Žádná melodie, tady teprve začíná napětí.
   */
  open: () => {
    air({ duration: 0.22, from: 260, to: 1500, gain: 0.05, room: 0.3 })
    pluck({ freq: A3 / 2, decay: 0.34, gain: 0.11, cutoff: 900, room: 0.3, delay: 0.01 })
  },

  /**
   * Odhalení odpovědi. Jeden hlas o kvintu výš a nad ním tichý přídech.
   * Dřív to byly dva tóny za sebou, což znělo jako začátek písničky.
   */
  reveal: () => {
    pluck({ freq: E4, decay: 0.5, gain: 0.085, cutoff: 2600, room: 0.5 })
    pluck({ freq: E5, decay: 0.32, gain: 0.03, type: 'sine', cutoff: 4200, room: 0.6, delay: 0.02 })
  },

  /**
   * Body připsány. Souzvuk, ne běh: kvinta a oktáva naráz, doznění dlouhé.
   * Čtyřtónové C dur znělo jako výherní automat.
   */
  correct: () => {
    pluck({ freq: A4, decay: 0.6, gain: 0.1, cutoff: 3000, room: 0.55 })
    pluck({ freq: E5, decay: 0.55, gain: 0.06, cutoff: 3400, room: 0.6, delay: 0.012 })
    pluck({ freq: A5, decay: 0.4, gain: 0.025, type: 'sine', cutoff: 5000, room: 0.7, delay: 0.03 })
  },

  /**
   * Špatně. Tupá rána, která sjede dolů. Smutná melodie by z omylu na
   * školení dělala větší událost, než jakou je.
   */
  wrong: () => {
    pluck({ freq: A3 / 2, glide: 78, decay: 0.42, gain: 0.12, cutoff: 420, room: 0.2 })
    air({ duration: 0.12, from: 300, to: 90, gain: 0.035, q: 0.9, room: 0.15 })
  },

  /**
   * Tik v poslední pětině času. Musí být slyšet a nesmí obtěžovat, proto
   * je krátký, tichý a nejde do haly: šedesát tiků by ji zaneslo.
   */
  tick: () => {
    pluck({ freq: E5 * 1.5, decay: 0.06, gain: 0.03, type: 'sine', cutoff: 4000, room: 0 })
    air({ duration: 0.03, from: 2400, to: 1200, gain: 0.02, q: 1.4, room: 0 })
  },

  /** Vypršel čas. Dvě tupé rány pod sebou, konec bez dramatu. */
  timeout: () => {
    pluck({ freq: A3 / 2, decay: 0.3, gain: 0.1, cutoff: 500, room: 0.25 })
    pluck({ freq: 82, decay: 0.6, gain: 0.09, cutoff: 380, room: 0.3, delay: 0.13 })
  },

  /**
   * Konec hry. Akord, který se rozsvěcí zdola nahoru a nechá se dozvučet.
   * Rozestupy jsou krátké, aby to byl jeden gesto, ne postupně hraná
   * stupnice.
   */
  fanfare: () => {
    const akord = [
      { freq: A3, gain: 0.085, delay: 0 },
      { freq: C4 * 1.25, gain: 0.075, delay: 0.055 },
      { freq: E4, gain: 0.07, delay: 0.11 },
      { freq: A4, gain: 0.08, delay: 0.17 },
      { freq: E5, gain: 0.045, delay: 0.24 },
    ]
    for (const { freq, gain, delay } of akord) {
      pluck({ freq, decay: 1.1, gain, cutoff: 3200, room: 0.75, delay })
    }
    air({ duration: 0.5, from: 600, to: 3000, gain: 0.028, q: 0.5, room: 0.8 })
  },

  /** Místo na stupních. V hale jen tupé drnknutí bez melodie. */
  land: () => {
    pluck({ freq: A3, decay: 0.4, gain: 0.09, cutoff: 1400, room: 0.5 })
  },

  /** Někdo odpověděl. V hale skoro neslyšné ťuknutí. */
  pop: () => {
    pluck({ freq: A5, decay: 0.08, gain: 0.02, type: 'sine', cutoff: 5000, room: 0.2 })
  },

  /** Odpočet před otázkou. Stejné jako tik časomíry, jen hlasitější. */
  count: () => {
    pluck({ freq: E5, decay: 0.12, gain: 0.05, type: 'sine', cutoff: 4000, room: 0.3 })
  },
}

/* ---------------------------------------------------------------------------
   Sada „Stůl"

   Vzhled je papír, inkoust a tvrdý stín: věci se plácají, cvakají
   a zamáčkávají. Zvuky k tomu patří ze stolu, ne z haly. Skoro žádný
   dozvuk, krátké údery, dřevo a marimba. Melodii nese nanejvýš pár
   úderů za sebou, nic nedrží.
--------------------------------------------------------------------------- */

/** Svrchní tón marimby leží zhruba na 3,9násobku základního. Právě on
 *  dělá z čisté sinusovky dřevěnou destičku. */
const MARIMBA_PARTIAL = 3.93

/**
 * Úder paličkou do dřeva: základní tón, krátký svrchní tón a cvaknutí
 * paličky. Dozvuk jen náznakem, aby to znělo z místnosti, ne z haly.
 */
function mallet({ freq, decay = 0.35, gain = 0.1, delay = 0 }: { freq: number; decay?: number; gain?: number; delay?: number }): void {
  pluck({ freq, decay, gain, type: 'sine', cutoff: 6000, room: 0.06, delay })
  pluck({ freq: freq * MARIMBA_PARTIAL, decay: decay * 0.22, gain: gain * 0.35, type: 'sine', cutoff: 8000, room: 0, delay })
  air({ duration: 0.012, from: 4200, to: 2600, gain: gain * 0.5, q: 1.2, room: 0, delay })
}

/** Klapnutí dřeva: velmi krátký nízký úder a cvaknutí. */
function knock({ freq = 180, gain = 0.12, delay = 0 }: { freq?: number; gain?: number; delay?: number } = {}): void {
  pluck({ freq, glide: freq * 0.7, decay: 0.09, gain, type: 'sine', cutoff: 1800, room: 0.04, delay })
  air({ duration: 0.02, from: 2400, to: 900, gain: gain * 0.6, q: 1.4, room: 0, delay })
}

/** Plop: tón, který rychle vyletí nahoru. Bublina, nálepka, plácnutí. */
function plop({ from = 320, to = 760, gain = 0.09, delay = 0 }: { from?: number; to?: number; gain?: number; delay?: number } = {}): void {
  pluck({ freq: from, glide: to, decay: 0.11, gain, type: 'sine', cutoff: 3000, room: 0.04, delay })
}

const STUL = {
  /** Otevření políčka: dlaždice se zvedne ze stolu. Klapnutí a plop. */
  open: () => {
    knock({ freq: 150, gain: 0.13 })
    plop({ from: 260, to: 520, gain: 0.05, delay: 0.05 })
  },

  /** Odhalení odpovědi: nálepka se plácne na papír. */
  reveal: () => {
    plop({ from: 300, to: 820, gain: 0.1 })
    mallet({ freq: E5, decay: 0.3, gain: 0.05, delay: 0.06 })
  },

  /** Body připsány: dva rychlé údery na marimbu, druhý výš. */
  correct: () => {
    mallet({ freq: A5, decay: 0.32, gain: 0.1 })
    mallet({ freq: E5 * 2, decay: 0.45, gain: 0.09, delay: 0.09 })
  },

  /** Špatně: tupé bonk, které sjede dolů. Bez smutné melodie. */
  wrong: () => {
    pluck({ freq: A3, glide: A3 / 2, decay: 0.22, gain: 0.13, type: 'sine', cutoff: 900, room: 0.04 })
    knock({ freq: 110, gain: 0.08 })
  },

  /** Tik v poslední pětině času: suché cvaknutí, nic, co by zvonilo. */
  tick: () => {
    knock({ freq: 1400, gain: 0.03 })
  },

  /** Konec času: krátký bzučák ze stolu. Dva rozladěné hlasy pod sebou. */
  timeout: () => {
    pluck({ freq: 110, decay: 0.38, gain: 0.07, type: 'square', cutoff: 900, room: 0.05 })
    pluck({ freq: 116, decay: 0.38, gain: 0.05, type: 'sawtooth', cutoff: 700, room: 0.05 })
  },

  /** Konec hry: rychlé arpeggio na marimbu a dva tlesky. */
  fanfare: () => {
    const notes = [A4, C4 * 2.5, E5, A5, E5 * 2]
    notes.forEach((freq, i) => mallet({ freq, decay: i === notes.length - 1 ? 0.8 : 0.3, gain: 0.08, delay: i * 0.07 }))
    for (const delay of [0.42, 0.56]) {
      air({ duration: 0.05, from: 1800, to: 1200, gain: 0.07, q: 0.9, room: 0.05, delay })
    }
  },

  /** Místo na stupních: hráč dosedne na bednu. Tupé klapnutí a plop. */
  land: () => {
    knock({ freq: 120, gain: 0.12 })
    plop({ from: 360, to: 700, gain: 0.05, delay: 0.04 })
  },

  /** Někdo odpověděl: tichý plop, ať místnost slyší, že se hlasuje. */
  pop: () => {
    plop({ from: 500, to: 900, gain: 0.035 })
  },

  /** Odpočet před otázkou: úder na marimbu na každou vteřinu. */
  count: () => {
    mallet({ freq: A4, decay: 0.25, gain: 0.08 })
  },
}

export type SoundSet = 'stul' | 'hala'
type Sfx = typeof STUL

const SETS: Record<SoundSet, Sfx> = { stul: STUL, hala: HALA }
let current: SoundSet = 'stul'

export function setSoundSet(next: SoundSet): void {
  current = next
}

/** Zvuky aktuální sady. Volá se `sfx.correct()` jako dřív, sada se
 *  přepíná v nastavení. */
export const sfx: Sfx = {
  open: () => SETS[current].open(),
  reveal: () => SETS[current].reveal(),
  correct: () => SETS[current].correct(),
  wrong: () => SETS[current].wrong(),
  tick: () => SETS[current].tick(),
  timeout: () => SETS[current].timeout(),
  fanfare: () => SETS[current].fanfare(),
  land: () => SETS[current].land(),
  pop: () => SETS[current].pop(),
  count: () => SETS[current].count(),
}

/** Ukázka celé sady za sebou, pro poslech v nastavení. */
export function playSample(): number[] {
  const steps: Array<[keyof Sfx, number]> = [
    ['open', 0], ['pop', 700], ['pop', 900], ['reveal', 1400], ['correct', 2200],
    ['wrong', 3200], ['tick', 4000], ['tick', 4300], ['timeout', 4700], ['land', 5600], ['fanfare', 6300],
  ]
  return steps.map(([key, at]) => window.setTimeout(() => sfx[key](), at))
}
