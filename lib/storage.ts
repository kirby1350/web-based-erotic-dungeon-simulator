import { AppSettings, GameSession, Character, IMAGE_STYLES, IMAGE_MODELS, IMAGE_TAG_PRESETS, PROSE_STYLE_LABELS, TENSORART_MODELS } from '@/lib/types'
import { readMemory } from '@/lib/adventure-memory'

const SETTINGS_KEY = 'dungeon_settings'
const CHARACTER_KEY = 'dungeon_character'
const SESSION_KEY = 'dungeon_session'
const GAME_KEY = 'dungeon_game_v2'

interface StoredGame { version: 2; character: unknown; session: GameSession | null }

function normalizeSession(value: unknown): GameSession | null {
  if (!value || typeof value !== 'object' || !('messages' in value) || !Array.isArray(value.messages)) return null
  const session = value as GameSession
  return { ...session, messages: session.messages.map((message, index) => ({ ...message, turnId: message.turnId ?? `legacy_${Math.floor(index / 2) + 1}` })),
    summary: typeof session.summary === 'string' ? session.summary : '', memory: readMemory(session.memory), turns: session.turns ?? [], pendingTurn: session.pendingTurn ?? null }
}

function readGame(): StoredGame {
  const raw = localStorage.getItem(GAME_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as StoredGame
    if (parsed.version !== 2) throw new Error('不支持的存档版本')
    return { ...parsed, session: normalizeSession(parsed.session) }
  }
  return { version: 2, character: JSON.parse(localStorage.getItem(CHARACTER_KEY) ?? 'null'),
    session: normalizeSession(JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')) }
}

/** One localStorage replacement is the commit point for both character and story. */
export function saveGame(character: unknown, session: GameSession | null): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GAME_KEY, JSON.stringify({ version: 2, character, session } satisfies StoredGame))
}

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
    if (!VALID_IMAGE_MODELS.includes(merged.imageModel)) merged.imageModel = 'tsubaki_v2'
    if (!VALID_IMAGE_TAG_PRESETS.includes(merged.imageTagPreset)) merged.imageTagPreset = 'none'
    if (!VALID_PROSE_STYLES.includes(merged.proseStyle)) merged.proseStyle = 'standard'
    if (!VALID_TENSORART_MODELS.includes(merged.tensorartModel)) merged.tensorartModel = 'wai_nsfw_v16'
    merged.chatApiKey = ''
    if (merged.chatModel === 'x-apex-neo-16k') merged.chatModel = 'x-apex-surge-0505-16k'
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)) } catch { /* storage may be full */ }
    return merged
  } catch {
    return getDefaultSettings()
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, chatApiKey: '' }))
}

export function getDefaultSettings(): AppSettings {
  return {
    chatModel: 'x-apex-surge-0505-16k',
    imageModel: 'tsubaki_v2',
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
    return readGame().character as Character | null
  } catch {
    return null
  }
}

export function saveCharacter(character: unknown): void {
  if (typeof window === 'undefined') return
  saveGame(character, readGame().session)
}

export function clearCharacter(): void {
  if (typeof window === 'undefined') return
  saveGame(null, null)
  localStorage.removeItem(CHARACTER_KEY)
}

export function getSession(): GameSession | null {
  if (typeof window === 'undefined') return null
  try {
    return readGame().session
  } catch {
    return null
  }
}

export function saveSession(session: GameSession): void {
  if (typeof window === 'undefined') return
  saveGame(readGame().character, session)
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  saveGame(readGame().character, null)
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('dungeon_conversation_id')
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
    version: 2,
    // Backups are shareable: never include locally stored credentials.
    settings: {
      ...getSettings(),
      chatApiKey: '',
      grokApiKey: '',
      pixaiApiKey: '',
      tensorartApiKey: '',
    },
    character: getCharacter(),
    session: getSession(),
  }
  return JSON.stringify(bundle, null, 2)
}

// Returns true on success. Throws on malformed JSON so callers can show why.
export function importAll(raw: string): boolean {
  const data = JSON.parse(raw) as Partial<SaveBundle>
  if (typeof data !== 'object' || data === null) throw new Error('文件格式无效')
  if (data.settings) {
    // Import preferences without replacing this device's credentials, including
    // when importing legacy backups that accidentally included API keys.
    const current = getSettings()
    saveSettings({
      ...current,
      ...data.settings,
      chatApiKey: current.chatApiKey,
      grokApiKey: current.grokApiKey,
      pixaiApiKey: current.pixaiApiKey,
      tensorartApiKey: current.tensorartApiKey,
    })
  }
  if (data.character) saveGame(data.character, normalizeSession(data.session))
  else if (data.session) saveSession(normalizeSession(data.session) ?? { messages: [], summary: '' })
  return true
}
