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

/**
 * Střídmé konfety na výsledkovou obrazovku. Kreslí se do dočasného plátna
 * přes celou stránku, po doběhnutí se samo uklidí.
 */
export function confetti(colors: string[], count = 90): void {
  if (prefersReducedMotion()) return

  const canvas = document.createElement('canvas')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '150',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  ctx.scale(dpr, dpr)

  const pieces: Piece[] = Array.from({ length: count }, () => ({
    x: w * 0.5 + (Math.random() - 0.5) * w * 0.6,
    y: h * 0.42 + (Math.random() - 0.5) * 80,
    vx: (Math.random() - 0.5) * 9,
    vy: -6 - Math.random() * 8,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6,
    h: 9 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)] ?? '#F5C451',
  }))

  const started = performance.now()
  const LIFE = 3200

  const frame = (now: number) => {
    const age = now - started
    ctx.clearRect(0, 0, w, h)
    const fade = age > LIFE - 700 ? Math.max(0, (LIFE - age) / 700) : 1

    for (const p of pieces) {
      p.vy += 0.28
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

  // Na skryté záložce se rAF zastaví a plátno by zůstalo viset.
  window.setTimeout(() => canvas.remove(), LIFE + 1500)
}
