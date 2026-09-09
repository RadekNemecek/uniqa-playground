/** Respektuje uživatele, který si vypnul pohyb v systému. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Přečte trvání z tokenu, aby čísla nebyla rozsypaná v kódu. */
export function duration(token: string, fallback = 300): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  if (!raw) return fallback
  if (raw.endsWith('ms')) return parseFloat(raw)
  if (raw.endsWith('s')) return parseFloat(raw) * 1000
  return fallback
}

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Technika FLIP: cílový prvek se objeví ve své konečné poloze, ale animace
 * začne v místě a velikosti výchozího obdélníku. Působí to, jako by se
 * dlaždice roztáhla přes celou obrazovku.
 */
export function flipFrom(
  el: HTMLElement,
  from: DOMRect,
  options: { duration?: number; easing?: string; fade?: boolean } = {},
): Animation | null {
  if (prefersReducedMotion()) return null

  const to = el.getBoundingClientRect()
  if (to.width === 0 || to.height === 0) return null

  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  const sx = from.width / to.width
  const sy = from.height / to.height

  return el.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: options.fade === false ? 1 : 0.4,
        borderRadius: 'var(--r-tile)',
      },
      { transform: 'none', opacity: 1, borderRadius: '0px' },
    ],
    {
      duration: options.duration ?? duration('--dur-stage', 620),
      easing: options.easing ?? EASE_OUT,
      fill: 'both',
    },
  )
}

/**
 * Nechá hodnotu odletět z otázky do karty týmu. Vytvoří dočasný prvek,
 * takže nezasahuje do rozvržení.
 */
export function flyTo(
  from: DOMRect,
  to: DOMRect,
  text: string,
  color: string,
): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve()

  const ghost = document.createElement('div')
  ghost.textContent = text
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left + from.width / 2}px`,
    top: `${from.top + from.height / 2}px`,
    transform: 'translate(-50%, -50%)',
    font: `700 clamp(2rem, 5vw, 4rem)/1 var(--font-display), sans-serif`,
    color,
    pointerEvents: 'none',
    zIndex: '200',
    textShadow: '0 4px 24px rgba(0,0,0,.6)',
    willChange: 'transform, opacity',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(ghost)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)

  const anim = ghost.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 60}px)) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35)`, opacity: 0, offset: 1 },
    ],
    { duration: 780, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
  )

  return anim.finished.then(() => ghost.remove()).catch(() => ghost.remove())
}

/** Odpočítá číslo nahoru nebo dolů. Vrací funkci pro zrušení. */
export function countTo(
  from: number,
  to: number,
  ms: number,
  onFrame: (value: number) => void,
): () => void {
  if (from === to || prefersReducedMotion() || ms <= 0) {
    onFrame(to)
    return () => {}
  }
  const start = performance.now()
  let raf = 0
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms)
    const eased = 1 - Math.pow(1 - t, 3)
    onFrame(Math.round(from + (to - from) * eased))
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
