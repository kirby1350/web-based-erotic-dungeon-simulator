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

// ─── 游戏存档 ──────────────────────────────────────────────────────────────────

import { GameSave } from '@/lib/types'

const GAME_KEY = 'game_save'

export function getGameSave(): GameSave | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(GAME_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameSave
  } catch {
    return null
  }
}

export function saveGameSave(save: GameSave): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GAME_KEY, JSON.stringify(save))
}

export function clearGameSave(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GAME_KEY)
}

// ─── 已保存的客人 ────────────────────────────────────────────────────────────────

import { Guest } from '@/lib/types'

const SAVED_GUESTS_KEY = 'saved_guests'

export function getSavedGuests(): Guest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SAVED_GUESTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Guest[]
  } catch {
    return []
  }
}

export function saveGuest(guest: Guest): void {
  if (typeof window === 'undefined') return
  const existing = getSavedGuests()
  const updated = [guest, ...existing.filter((g) => g.id !== guest.id)].slice(0, 20)
  localStorage.setItem(SAVED_GUESTS_KEY, JSON.stringify(updated))
}

export function deleteSavedGuest(id: string): void {
  if (typeof window === 'undefined') return
  const updated = getSavedGuests().filter((g) => g.id !== id)
  localStorage.setItem(SAVED_GUESTS_KEY, JSON.stringify(updated))
}

// ─── 主界面开场白缓存 ─────────────────────────────────────────────────────────

const OPENING_CACHE_KEY = 'hub_opening_cache'

interface OpeningCache {
  day: number
  text: string
}

export function getOpeningCache(): OpeningCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(OPENING_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OpeningCache
  } catch {
    return null
  }
}

export function saveOpeningCache(day: number, text: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(OPENING_CACHE_KEY, JSON.stringify({ day, text }))
}

export function clearOpeningCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(OPENING_CACHE_KEY)
}

const GUEST_PREF_KEY = 'guest_preference'

export function getGuestPreference(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(GUEST_PREF_KEY) ?? ''
}

export function saveGuestPreference(pref: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GUEST_PREF_KEY, pref)
}
