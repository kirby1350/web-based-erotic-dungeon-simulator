import { AppSettings } from '@/lib/types'

const SETTINGS_KEY = 'dungeon_settings'
const CHARACTER_KEY = 'dungeon_character'

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return getDefaultSettings()
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return getDefaultSettings()
    return { ...getDefaultSettings(), ...JSON.parse(raw) }
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
