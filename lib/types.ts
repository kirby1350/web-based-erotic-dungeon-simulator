export type Race = 'human' | 'elf' | 'tauren'

export interface CharacterStats {
  strength: number
  agility: number
  intelligence: number
}

export interface Character {
  name: string
  race: Race
  stats: CharacterStats
  backstory: string
  avatarUrl: string | null
  level: number
  hp: number
  maxHp: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: number
}

export type ImageStyle = 'none' | 'dk.senie' | 'hakai_shin'
export type ImageModel = 'haruka_v2'

export interface AppSettings {
  chatModel: string
  imageModel: ImageModel
  imageStyle: ImageStyle
  chatApiKey: string
  pixaiApiKey: string
}

export const IMAGE_MODELS: Record<ImageModel, { label: string; modelId: string }> = {
  haruka_v2: {
    label: 'Haruka v2',
    modelId: '1861558740588989558',
  },
}

export const IMAGE_STYLES: Record<ImageStyle, { label: string; lora?: string }> = {
  none: { label: '无' },
  'dk.senie': { label: 'dk.senie 风格', lora: 'dk.senie' },
  hakai_shin: { label: 'Hakai Shin 风格', lora: 'hakai_shin' },
}

export const CHAT_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'Apex-Neo-0213-16k', label: 'Apex-Neo-0213-16k' },
]

export const RACE_INFO: Record<Race, { label: string; description: string; bonuses: Partial<CharacterStats> }> = {
  human: {
    label: '人族',
    description: '全能均衡，适应力极强，擅长各种技能',
    bonuses: { strength: 1, agility: 1, intelligence: 1 },
  },
  elf: {
    label: '精灵族',
    description: '灵敏轻盈，魔法天赋极高，与自然亲密',
    bonuses: { agility: 3, intelligence: 2 },
  },
  tauren: {
    label: '牛人族',
    description: '体魄强健，力量惊人，拥有古老的萨满智慧',
    bonuses: { strength: 4, intelligence: 1 },
  },
}
