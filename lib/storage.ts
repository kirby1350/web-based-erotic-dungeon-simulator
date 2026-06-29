import { AppSettings, GameSession, IMAGE_STYLES, IMAGE_MODELS, IMAGE_TAG_PRESETS, PROSE_STYLE_LABELS, TENSORART_MODELS } from '@/lib/types'

const SETTINGS_KEY = 'dungeon_settings'
const CHARACTER_KEY = 'dungeon_character'
const SESSION_KEY = 'dungeon_session'

const VALID_IMAGE_STYLES = Object.keys(IMAGE_STYLES)
const VALID_IMAGE_MODELS = Object.keys(IMAGE_MODELS)
const VALID_IMAGE_TAG_PRESETS = Object.keys(IMAGE_TAG_PRESETS)
const VALID_PROSE_STYLES = Object.keys(PROSE_STYLE_LABELS)
const VALID_TENSORART_MODELS = Object.keys(TENSORART_MODELS)

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
    if (!VALID_IMAGE_TAG_PRESETS.includes(merged.imageTagPreset)) merged.imageTagPreset = 'none'
    if (!VALID_PROSE_STYLES.includes(merged.proseStyle)) merged.proseStyle = 'standard'
    if (!VALID_TENSORART_MODELS.includes(merged.tensorartModel)) merged.tensorartModel = 'wai_nsfw_v16'
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
    chatModel: 'x-apex-neo-16k',
    imageModel: 'haruka_v2',
    imageStyle: 'none',
    imageStyleCustom: '',
    imageTagPreset: 'none',
    proseStyle: 'standard',
    imageProvider: 'pixai',
    tensorartModel: 'wai_nsfw_v16',
    chatApiKey: '',
    grokApiKey: '',
    pixaiApiKey: '',
    tensorartApiKey: '',
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

export function getSession(): GameSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.messages)) return null
    return { messages: parsed.messages, summary: typeof parsed.summary === 'string' ? parsed.summary : '' }
  } catch {
    return null
  }
}

export function saveSession(session: GameSession): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (e) {
    // localStorage quota exceeded or unavailable — keep playing, just don't persist
    console.error('saveSession failed:', e)
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}

// ---- Backup: export / import the whole save (settings + character + session) ----

export interface SaveBundle {
  version: number
  settings: AppSettings
  character: unknown
  session: GameSession | null
}

export function exportAll(): string {
  const bundle: SaveBundle = {
    version: 1,
    settings: getSettings(),
    character: getCharacter(),
    session: getSession(),
  }
  return JSON.stringify(bundle, null, 2)
}

// Returns true on success. Throws on malformed JSON so callers can show why.
export function importAll(raw: string): boolean {
  const data = JSON.parse(raw) as Partial<SaveBundle>
  if (typeof data !== 'object' || data === null) throw new Error('文件格式无效')
  if (data.settings) saveSettings(data.settings as AppSettings)
  if (data.character) saveCharacter(data.character)
  if (data.session) saveSession(data.session as GameSession)
  return true
}
