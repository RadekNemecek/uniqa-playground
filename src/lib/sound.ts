/**
 * Zvuková odezva generovaná Web Audio. Žádné soubory: hra funguje offline
 * a nic se nedonačítá. Vše jde vypnout v nastavení.
 */

let ctx: AudioContext | null = null
let enabled = true

function audio(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

/** Prohlížeč pustí zvuk až po interakci uživatele. */
export function primeAudio(): void {
  audio()
}

interface ToneOptions {
  freq: number
  to?: number
  duration: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

function tone({ freq, to, duration, type = 'sine', gain = 0.14, delay = 0 }: ToneOptions): void {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const amp = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration)

  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  osc.connect(amp).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

export const sfx = {
  /** Otevření políčka. */
  open: () => tone({ freq: 320, to: 720, duration: 0.26, type: 'triangle', gain: 0.1 }),
  /** Odhalení správné odpovědi. */
  reveal: () => {
    tone({ freq: 520, duration: 0.18, type: 'sine', gain: 0.09 })
    tone({ freq: 780, duration: 0.3, type: 'sine', gain: 0.07, delay: 0.09 })
  },
  /** Body připsány. */
  correct: () => {
    tone({ freq: 660, duration: 0.14, type: 'triangle', gain: 0.11 })
    tone({ freq: 880, duration: 0.16, type: 'triangle', gain: 0.11, delay: 0.11 })
    tone({ freq: 1320, duration: 0.34, type: 'sine', gain: 0.09, delay: 0.22 })
  },
  /** Nikdo neuhodl. */
  wrong: () => {
    tone({ freq: 200, to: 90, duration: 0.42, type: 'sawtooth', gain: 0.07 })
  },
  /** Tik časomíry v poslední pětině. */
  tick: () => tone({ freq: 1100, duration: 0.045, type: 'square', gain: 0.035 }),
  /** Vypršel čas. */
  timeout: () => {
    tone({ freq: 300, to: 140, duration: 0.5, type: 'square', gain: 0.07 })
  },
  /** Konec hry. */
  fanfare: () => {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => tone({ freq: f, duration: 0.34, type: 'triangle', gain: 0.1, delay: i * 0.13 }))
  },
}
