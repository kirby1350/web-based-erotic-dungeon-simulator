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

export type BodyPart = 'breast' | 'clitoris' | 'urethra' | 'vagina' | 'anus'

export interface BodyDevelopment {
  breast: number    // 胸部 0-5
  clitoris: number  // 阴蒂 0-5
  urethra: number   // 尿道 0-5
  vagina: number    // 阴道 0-5
  anus: number      // 肛门 0-5
}

export interface StatusEffect {
  id: string
  title: string
  description: string
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
  pleasure: number
  desire: number
  bodyDevelopment: BodyDevelopment
  statusEffects: StatusEffect[]
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

export type ImageStyle = 'none' | 'dk.senie' | 'hakai_shin' | 'shiokonbu' | 'piromizu' | 'nohito'
export type ImageModel = 'haruka_v2' | 'jankuv5' | 'wai_nsfw'

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
