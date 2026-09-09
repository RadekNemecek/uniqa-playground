import { reactive, watch } from 'vue'
import { setSoundEnabled } from '@/lib/sound'

const KEY = 'playground.settings.v1'

export interface Settings {
  /** Násobič velikosti písma pro projekci, 0.9 az 1.4. */
  scale: number
  sound: boolean
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        scale: typeof parsed.scale === 'number' ? parsed.scale : 1,
        sound: parsed.sound !== false,
      }
    }
  } catch {
    /* poškozené nastavení nesmí shodit aplikaci */
  }
  return { scale: 1, sound: true }
}

export const settings = reactive<Settings>(load())

export function applySettings(): void {
  document.documentElement.style.setProperty('--scale', String(settings.scale))
  setSoundEnabled(settings.sound)
}

watch(
  settings,
  () => {
    localStorage.setItem(KEY, JSON.stringify({ scale: settings.scale, sound: settings.sound }))
    applySettings()
  },
  { deep: true, immediate: true },
)

export const SCALE_STEPS = [0.9, 1, 1.15, 1.3, 1.45] as const

export function scaleLabel(v: number): string {
  if (v <= 0.9) return 'Menší'
  if (v <= 1) return 'Výchozí'
  if (v <= 1.15) return 'Větší'
  if (v <= 1.3) return 'Velké'
  return 'Projekce'
}
