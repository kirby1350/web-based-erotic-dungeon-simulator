export type Race = 'human' | 'elf' | 'tauren'

export interface CharacterStats {
  strength: number
  agility: number
  intelligence: number
}

export interface CharacterMeasurements {
  bust: string    // 胸围 cm
  waist: string   // 腰围 cm
  hip: string     // 臀围 cm
}

export interface Character {
  name: string
  race: Race
  stats: CharacterStats
  measurements: CharacterMeasurements
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
  // Max 系列 - 旗舰 ($0.0004/1K tokens)
  { value: 'nalang-max-0826-10k', label: 'Nalang Max 10K', group: 'Max 旗舰系列' },
  { value: 'nalang-max-0826-16k', label: 'Nalang Max 16K（推荐）', group: 'Max 旗舰系列' },
  { value: 'nalang-max-0826', label: 'Nalang Max 32K', group: 'Max 旗舰系列' },
  // XL 系列 ($0.0003/1K tokens)
  { value: 'nalang-xl-0826-10k', label: 'Nalang XL 10K', group: 'XL 大模型系列' },
  { value: 'nalang-xl-0826-16k', label: 'Nalang XL 16K（推荐）', group: 'XL 大模型系列' },
  { value: 'nalang-xl-0826', label: 'Nalang XL 32K', group: 'XL 大模型系列' },
  // Medium 系列 ($0.0002/1K tokens)
  { value: 'nalang-medium-0826', label: 'Nalang Medium 32K', group: 'Medium 性价比系列' },
  // Turbo 系列 ($0.0001/1K tokens)
  { value: 'nalang-turbo-0826', label: 'Nalang Turbo 32K（推荐）', group: 'Turbo 快速系列' },
  // 额外
  { value: 'Apex-Neo-0213-16k', label: 'Apex-Neo-0213-16k', group: '其他' },
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
