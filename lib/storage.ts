import { AppSettings, IMAGE_STYLES, IMAGE_MODELS } from '@/lib/types'

const SETTINGS_KEY = 'dungeon_settings'
const CHARACTER_KEY = 'dungeon_character'

const VALID_IMAGE_STYLES = Object.keys(IMAGE_STYLES)
const VALID_IMAGE_MODELS = Object.keys(IMAGE_MODELS)

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return getDefaultSettings()
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return getDefaultSettings()
    const parsed = JSON.parse(raw)
    const merged = { ...getDefaultSettings(), ...parsed }
    // Sanitise enum values that may be stale from a previous build
    if (!VALID_IMAGE_STYLES.includes(merged.imageStyle)) merged.imageStyle = 'none'
    if (!VALID_IMAGE_MODELS.includes(merged.imageModel)) merged.imageModel = 'haruka_v2'
    return merged
  } catch {
    return getDefaultSettings()
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function getDefaultSettings(): AppSettings {
  return {
    chatModel: 'nalang-max-0826-16k',
    imageModel: 'haruka_v2',
    imageStyle: 'none',
    imageStyleCustom: '',
    chatApiKey: '',
    pixaiApiKey: '',
  }
}

export function getCharacter() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CHARACTER_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveCharacter(character: unknown): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHARACTER_KEY, JSON.stringify(character))
}

export function clearCharacter(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CHARACTER_KEY)
}
