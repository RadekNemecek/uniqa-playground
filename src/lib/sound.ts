/**
 * Zvuková odezva generovaná Web Audio. Žádné soubory: hra funguje offline
 * a nic se nedonačítá. Vše jde vypnout v nastavení.
 *
 * Řeč zvuků je „drnknuto v místnosti", ne „zapípáno".
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

export const sfx = {
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
}
