import { AppSettings, DEFAULT_SETTINGS, IMAGE_STYLES, IMAGE_MODELS, TENSORART_MODELS } from '@/lib/types'

const SETTINGS_KEY = 'app_settings'

const VALID_IMAGE_STYLES = Object.keys(IMAGE_STYLES)
const VALID_IMAGE_MODELS = Object.keys(IMAGE_MODELS)
const VALID_TENSORART_MODELS = Object.keys(TENSORART_MODELS)

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    const merged = { ...DEFAULT_SETTINGS, ...parsed }
    if (!VALID_IMAGE_STYLES.includes(merged.imageStyle)) merged.imageStyle = 'none'
    if (!VALID_IMAGE_MODELS.includes(merged.imageModel)) merged.imageModel = 'haruka_v2'
    if (!VALID_TENSORART_MODELS.includes(merged.tensorartModel)) merged.tensorartModel = 'wai_nsfw_v16'
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
