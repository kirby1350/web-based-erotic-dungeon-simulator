export type ImageStyle =
  | 'none'
  | 'dk.senie'
  | 'hakai_shin'
  | 'shiokonbu'
  | 'piromizu'
  | 'nohito'
  | 'masami_chie'

export type ImageModel = 'haruka_v2' | 'jankuv5' | 'wai_nsfw'

export type ImageProvider = 'pixai' | 'tensorart'

export type TensorArtModel = 'wai_nsfw_v16' | 'jankuv6'

export interface AppSettings {
  chatModel: string
  imageModel: ImageModel
  imageStyle: ImageStyle
  imageStyleCustom: string
  imageProvider: ImageProvider
  tensorartModel: TensorArtModel
  chatApiKey: string
  grokApiKey: string
  pixaiApiKey: string
  tensorartApiKey: string
}

export const IMAGE_MODELS: Record<ImageModel, { label: string; modelId: string }> = {
  haruka_v2: {
    label: 'Haruka v2',
    modelId: '1861558740588989558',
  },
  jankuv5: {
    label: 'JANKUV5',
    modelId: '1935381284613355700',
  },
  wai_nsfw: {
    label: 'WAI-NSFW-illustrious-SDXL',
    modelId: '1799568502408553127',
  },
}

export const IMAGE_STYLES: Record<ImageStyle, { label: string; tags: string }> = {
  none: { label: '无', tags: '' },
  'dk.senie': {
    label: 'dk.senie',
    tags: 'dk.senie, watercolor, soft lineart, pastel colors, dreamy lighting',
  },
  hakai_shin: {
    label: 'Hakai Shin',
    tags: 'hakai_shin, detailed shading, dynamic pose, vibrant colors, anime illustration',
  },
  shiokonbu: {
    label: 'shiokonbu',
    tags: 'shiokonbu, detailed lineart, soft shading, moe style, clean illustration',
  },
  piromizu: {
    label: 'piromizu',
    tags: 'piromizu, glossy skin, detailed body, soft gradient, erotic illustration',
  },
  nohito: {
    label: 'nohito',
    tags: 'nohito, expressive face, fine details, dramatic lighting, anime art style',
  },
  masami_chie: {
    label: 'masami chie',
    tags: 'masami chie, soft lineart, delicate shading, warm palette, detailed illustration',
  },
}

export const TENSORART_MODELS: Record<TensorArtModel, { label: string; modelId: string }> = {
  wai_nsfw_v16: {
    label: 'WAI-NSFW-V16',
    modelId: '943946051788787917',
  },
  jankuv6: {
    label: 'JANKUV6',
    modelId: '934122074308367585',
  },
}

export const CHAT_MODELS: {
  value: string
  label: string
  group: string
  provider: 'default' | 'grok'
}[] = [
  // Max 系列 - 旗舰 ($0.0004/1K tokens)
  { value: 'nalang-max-0826-10k', label: 'Nalang Max 10K', group: 'Max 旗舰系列', provider: 'default' },
  { value: 'nalang-max-0826-16k', label: 'Nalang Max 16K（推荐）', group: 'Max 旗舰系列', provider: 'default' },
  { value: 'nalang-max-0826', label: 'Nalang Max 32K', group: 'Max 旗舰系列', provider: 'default' },
  // XL 系列 ($0.0003/1K tokens)
  { value: 'nalang-xl-0826-10k', label: 'Nalang XL 10K', group: 'XL 大模型系列', provider: 'default' },
  { value: 'nalang-xl-0826-16k', label: 'Nalang XL 16K（推荐）', group: 'XL 大模型系列', provider: 'default' },
  { value: 'nalang-xl-0826', label: 'Nalang XL 32K', group: 'XL 大模型系列', provider: 'default' },
  // Medium 系列 ($0.0002/1K tokens)
  { value: 'nalang-medium-0826', label: 'Nalang Medium 32K', group: 'Medium 性价比系列', provider: 'default' },
  // Turbo 系列 ($0.0001/1K tokens)
  { value: 'nalang-turbo-0826', label: 'Nalang Turbo 32K（推荐）', group: 'Turbo 快速系列', provider: 'default' },
  // 额外
  { value: 'Apex-Neo-0213-16k', label: 'Apex-Neo-0213-16k', group: '其他', provider: 'default' },
  // Grok 系列
  { value: 'grok-4-latest', label: 'Grok 4 Latest', group: 'Grok (xAI)', provider: 'grok' },
  { value: 'grok-3', label: 'Grok 3', group: 'Grok (xAI)', provider: 'grok' },
  { value: 'grok-3-mini', label: 'Grok 3 Mini', group: 'Grok (xAI)', provider: 'grok' },
]

export const DEFAULT_SETTINGS: AppSettings = {
  chatModel: 'nalang-max-0826-16k',
  imageModel: 'haruka_v2',
  imageStyle: 'none',
  imageStyleCustom: '',
  imageProvider: 'pixai',
  tensorartModel: 'wai_nsfw_v16',
  chatApiKey: '',
  grokApiKey: '',
  pixaiApiKey: '',
  tensorartApiKey: '',
}

// ─── 游戏类型 ─────────────────────────────────────────────────────────────────

export interface Player {
  name: string
  traits: string[]
  fetishes: string[]
  gold: number
  day: number
  guestPreference: string
  marketPreference: string
}

export interface MonstGirl {
  id: string
  name: string
  race: string
  age: string
  bodyDesc: string
  bodyTags: string
  personality: string
  personalityTags: string
  outfit: string
  outfitTags: string
  otherDesc: string
  otherTags: string
  // 数值
  affection: number
  obedience: number
  lewdness: number
  skills: string[]
  // 图片缓存
  imageTags: string
  imageUrl?: string
  // 市场
  price?: number
}

export interface Guest {
  id: string
  name: string
  race: string
  personality: string
  traits: string[]
  desires: string
  imageTags: string
  imageUrl?: string
  satisfaction: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ParticipantStats {
  pleasure: number
  stamina: number
  isExhausted: boolean
}

export interface ServiceSession {
  type: 'service' | 'training'
  guest?: Guest
  trainer?: MonstGirl
  girls: MonstGirl[]
  messages: ChatMessage[]
  girlsStats: Record<string, ParticipantStats>
  guestStats?: ParticipantStats
  trainerStats?: ParticipantStats
}

export type GamePhase =
  | 'morning'
  | 'service'
  | 'training'
  | 'market'
  | 'interaction'

export interface GameSave {
  player: Player
  girls: MonstGirl[]
  currentDay: number
  phase: GamePhase
  activeSession?: ServiceSession
}
