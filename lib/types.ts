export type Race = 'human' | 'elf' | 'tauren'

export interface CharacterMeasurements {
  bust: string
  waist: string
  hip: string
}

export type BodyPart = 'breast' | 'clitoris' | 'urethra' | 'vagina' | 'anus'

export interface BodyDevelopment {
  breast: number
  clitoris: number
  urethra: number
  vagina: number
  anus: number
  descriptions?: Partial<Record<BodyPart, string>>
}

export interface StatusEffect {
  id: string
  title: string
  description: string
}

export interface Character {
  name: string
  race: Race
  measurements: CharacterMeasurements
  backstory: string
  costumeDescription: string
  otherDescription: string
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

export type ImageStyle = 'none' | 'dk.senie' | 'hakai_shin' | 'shiokonbu' | 'piromizu' | 'nohito' | 'masami_chie'
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

export const RACE_INFO: Record<Race, { label: string; description: string }> = {
  human: {
    label: '人族',
    description: '全能均衡，适应力极强，擅长各种技能',
  },
  elf: {
    label: '精灵族',
    description: '灵敏轻盈，魔法天赋极高，与自然亲密',
  },
  tauren: {
    label: '牛人族',
    description: '体魄强健，力量惊人，拥有古老的萨满智慧',
  },
}

export interface CharacterPreset {
  name: string
  race: Race
  measurements: CharacterMeasurements
  backstory: string
  costumeDescription: string
  otherDescription: string
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    name: '娜露梅亚',
    race: 'elf',
    measurements: { bust: '90', waist: '58', hip: '88' },
    backstory: '碧蓝幻想世界中的黑暗精灵，曾是星晶兽的使者，因命运的捉弄踏入地下城。性格冷艳高傲，内心深处渴望被理解与接纳。拥有操控黑暗魔法的天赋，战斗时散发出神秘的紫色光芒。',
    costumeDescription: '身着黑色紧身皮制战衣，胸口有金色符文浮雕。腰间系有暗紫色腰带，佩戴精灵族特有的月牙形耳环。长长的银白色头发用黑色缎带半扎，战靴延伸至大腿。',
    otherDescription: '说话简短直接，不喜欢废话。对弱者有隐藏的保护欲。对星晶兽有特殊感应能力。身上有一块神秘的黑色印记，来历不明。',
  },
  {
    name: '一之濑志希',
    race: 'human',
    measurements: { bust: '85', waist: '57', hip: '84' },
    backstory: '来自现代日本的偶像兼演员，某天在拍摄途中意外被传送至地下城异世界。表面上总是挂着慵懒而神秘的微笑，实际上对一切充满好奇。喜欢用"有趣"来评价所有事物，将地下城冒险视为人生中最刺激的角色扮演。',
    costumeDescription: '穿着改良版偶像演出服——白色短款夹克内搭黑色细肩带，配超短格纹迷你裙。腿上是黑色过膝袜，脚穿厚底乐福鞋。头发是淡紫色渐变短发，左耳多个耳洞。',
    otherDescription: '口头禅是"有意思呢～"。对危险局面保持出奇的冷静，甚至感到兴奋。擅长观察他人心理，常常一针见血地说中要害。对"普通"极度排斥，总在寻找新鲜感。',
  },
  {
    name: '桑山千雪',
    race: 'human',
    measurements: { bust: '93', waist: '61', hip: '90' },
    backstory: '从事音乐制作的温柔女性，因为一首古老的召唤曲谱被地下城的魔法卷入异世界。温柔体贴，总是把他人放在第一位，有时显得过于顺从。内心深处有着坚定的信念，关键时刻会展现出令人意外的勇气。',
    costumeDescription: '身穿奶油色蓬松毛衣搭配米白色长裙，给人温暖柔软的感觉。腰间系着浅棕色宽腰带，脚穿米色踝靴。金棕色长卷发自然垂落，刘海微微遮住额头。颈间戴着一枚音符造型吊坠。',
    otherDescription: '说话轻柔，总是用敬语。擅长倾听，让人不自觉地倾诉心事。对音乐有超凡感知，能听出空间中隐藏的旋律。害怕黑暗，但绝不会因此放弃同伴。',
  },
]
