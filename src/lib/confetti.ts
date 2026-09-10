import { prefersReducedMotion } from '@/lib/motion'

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  w: number
  h: number
  color: string
}

interface BurstOptions {
  count?: number
  life?: number
  /** Šířka pásu u spodní hrany (0–1 šířky obrazovky). */
  spread?: number
  /** Vodorovný střed výstřelu (0–1). */
  originX?: number
  /** Kam plátno vložit. Bez něj jde na document.body. */
  root?: HTMLElement
}

function spawnBurst(colors: string[], options: BurstOptions = {}): void {
  const count = options.count ?? 140
  const LIFE = options.life ?? 4500
  const spread = options.spread ?? 1
  const originX = options.originX ?? 0.5
  const root = options.root

  const canvas = document.createElement('canvas')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr

  if (root) {
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '0',
    } as Partial<CSSStyleDeclaration>)
    root.appendChild(canvas)
  } else {
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      /* Nad --z-results (120), pod --z-toast. */
      zIndex: '150',
    } as Partial<CSSStyleDeclaration>)
    document.body.appendChild(canvas)
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  ctx.scale(dpr, dpr)

  /* Start těsně pod spodní hranou, výstřel nahoru. */
  const pieces: Piece[] = Array.from({ length: count }, () => ({
    x: w * originX + (Math.random() - 0.5) * w * spread,
    y: h + 8 + Math.random() * 24,
    vx: (Math.random() - 0.5) * 11,
    vy: -(14 + Math.random() * 16),
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.45,
    w: 7 + Math.random() * 8,
    h: 10 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)] ?? '#7CC0F0',
  }))

  const started = performance.now()

  const frame = (now: number) => {
    const age = now - started
    ctx.clearRect(0, 0, w, h)
    const fade = age > LIFE - 900 ? Math.max(0, (LIFE - age) / 900) : 1

    for (const p of pieces) {
      p.vy += 0.32
      p.vx *= 0.995
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr

      ctx.save()
      ctx.globalAlpha = fade
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }

    if (age < LIFE) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)

  window.setTimeout(() => canvas.remove(), LIFE + 1500)
}

/**
 * Konfety vystřelují ze spodní hrany obrazovky nahoru.
 * Předáš `root`, ať plátno leží pod tabulkou.
 */
export function confetti(colors: string[], root?: HTMLElement): void {
  if (prefersReducedMotion()) return
  if (colors.length === 0) colors = ['#7CC0F0', '#55D6CE', '#ABDD6B', '#B7A6F2', '#F79DC6', '#EFC08D']

  const palette = colors.length >= 2 ? colors : [...colors, '#7CC0F0', '#ABDD6B', '#F79DC6']
  const opts = { root }

  spawnBurst(palette, { count: 160, life: 4800, originX: 0.5, spread: 1, ...opts })
  window.setTimeout(() => {
    spawnBurst(palette, { count: 110, life: 4200, originX: 0.18, spread: 0.45, ...opts })
  }, 650)
  window.setTimeout(() => {
    spawnBurst(palette, { count: 110, life: 4200, originX: 0.82, spread: 0.45, ...opts })
  }, 1100)
  window.setTimeout(() => {
    spawnBurst(palette, { count: 130, life: 5000, originX: 0.5, spread: 0.85, ...opts })
  }, 2200)
}
