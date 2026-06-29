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
  // exp per part 0-100; every 100 exp = 1 level (capped at 5)
  exp?: Partial<Record<BodyPart, number>>
  descriptions?: Partial<Record<BodyPart, string>>
}

export interface StatusEffect {
  id: string
  title: string
  description: string
}

// Current trap/monster the character is locked into. null = free to explore.
export interface Encounter {
  // stable kebab/underscore id, reused across turns while the encounter persists
  id: string
  // short display name, e.g. 触手深渊 / 半兽人巢穴
  name: string
  kind: 'trap' | 'monster'
  // one-line description of the current restraint/threat
  summary: string
  // restraint intensity 0-3 (0 = barely held, 3 = completely bound)
  restraint: number
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
  // current dungeon floor (depth); starts at 1
  floor?: number
  // current trap/monster encounter, or null when free
  encounter?: Encounter | null
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

// One model entry returned by the DZMM v2 models endpoint
export interface DzmmModel {
  id: string
  name: string
  context_window: number
}

export type ChatModelInfo = { value: string; label: string; group: string; provider: 'default' | 'grok' }

export const CHAT_MODELS: ChatModelInfo[] = [
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
  avatarUrl?: string
}

// Persisted adventure session (chat history + rolling summary)
export interface GameSession {
  messages: ChatMessage[]
  summary: string
}

// Preset trap "seeds" — pick one to steer the random generator toward a type,
// instead of fully random. Keeps the AI tailoring to current character state.
export interface PresetTrap {
  id: string
  name: string
  category: string
  // short directive describing the trap type, injected into the generator prompt
  hint: string
}

export const PRESET_TRAPS: PresetTrap[] = [
  {
    id: 'tentacle_pit',
    name: '触手深渊',
    category: '触手系',
    hint: '异形触手从地面、墙壁与天花板同时涌出，缠绕四肢并强制贯穿各个孔穴、注入黏滑体液',
  },
  {
    id: 'slime_swallow',
    name: '史莱姆吞噬',
    category: '粘液系',
    hint: '半透明史莱姆将全身包裹溶解衣物，粘液渗入每一寸肌肤与孔穴，持续震动摩擦敏感部位',
  },
  {
    id: 'pollen_garden',
    name: '催情花园',
    category: '催情植物',
    hint: '大片催情花朵喷出浓密花粉与花蜜，藤蔓束缚身体，花粉令理智迅速瓦解、身体极度敏感',
  },
  {
    id: 'lewd_rune',
    name: '淫纹拘束',
    category: '魔法拘束',
    hint: '地面浮现魔法淫纹，无形力量将身体固定成屈辱姿势，淫纹持续发烫、强制提升欲望与快感',
  },
  {
    id: 'succubus_mirror',
    name: '魅魔之镜',
    category: '催眠幻觉',
    hint: '古镜中浮现魅魔，以催眠话语支配意识，制造无法分辨真假的极淫幻觉并诱导主动堕落',
  },
  {
    id: 'parasite_egg',
    name: '寄生产卵',
    category: '寄生/产卵',
    hint: '寄生型生物钻入体内，向子宫与肠道注入大量卵，腹部隆起、被迫感受异物蠕动与产卵快感',
  },
  {
    id: 'ancient_machine',
    name: '远古拘束装置',
    category: '机械',
    hint: '遗迹中的机械装置自动启动，金属拘束具固定四肢，机械触手与按摩棒按程序持续强制高潮',
  },
  {
    id: 'orc_nest',
    name: '半兽人巢穴',
    category: '怪物巢穴',
    hint: '误入半兽人巢穴，被成群粗壮的半兽人按住轮流侵犯，浓厚精液灌满每一个孔穴',
  },
]

// Preset 异常状态 the player can manually apply; these feed straight into
// the system prompt's 异常状态 line and steer narration/options.
export const PRESET_STATUS_EFFECTS: StatusEffect[] = [
  { id: 'estrus', title: '发情', description: '身体进入发情期，主动扭腰求欢，骚穴不断流水' },
  { id: 'aphrodisiac', title: '媚药中毒', description: '全身敏感度暴涨，轻微触碰即引发强烈快感，理智逐渐瓦解' },
  { id: 'bondage', title: '拘束', description: '四肢被缚无法自由行动，只能任人摆布' },
  { id: 'hypnosis', title: '催眠', description: '意识被支配，会无意识地服从命令' },
  { id: 'lewd_brand', title: '淫纹', description: '身上浮现发烫的淫纹，持续提升欲望并削弱抵抗' },
  { id: 'lactation', title: '泌乳', description: '乳房胀大不断分泌乳汁，乳头极度敏感' },
  { id: 'broken', title: '绝顶崩坏', description: '连续高潮导致理智崩坏，露出ahegao表情，无法正常思考' },
  { id: 'pregnancy_heat', title: '渴孕', description: '子宫深处传来灼热的受孕渴望，主动迎合内射' },
]

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    name: '娜露梅亚',
    race: 'tauren',
    avatarUrl: '/avatars/narmaya.png',
    measurements: { bust: '90', waist: '58', hip: '88' },
    backstory: '碧蓝幻想世界中出身武术世家的剑豪，24岁的她日夜苦练只为追求最强境界。因一次与星晶兽相关的意外被卷入地下城。外表冷酷寡言，内心却隐藏着极强的被征服欲。身材虽娇小（134cm），却拥有夸张的E杯巨乳与紧致翘臀，修炼时乳房剧烈晃动、汗水顺着乳沟流下的模样早已是冒险者间的传说。',
    costumeDescription: '极度紧身的黑色皮革战衣将丰满的E杯乳房勒得几乎要溢出来，胸口金色符文正好压在敏感的乳头上，随着呼吸不断摩擦。腰间暗紫色腰带像情趣束缚带一样深深勒进软肉，下身是开档式皮革短裤，裆部仅用一根细链遮挡，剧烈动作时粉嫩湿润的骚穴随时可能完全暴露。大腿根部的绑带深深陷入肉里，走路时会不断摩擦阴唇。银白色长发用黑色缎带半扎，散发着浓烈的雌性荷尔蒙气息。',
    otherDescription: '说话简短冷淡，但在被触手或粗大肉棒贯穿时会瞬间崩坏成淫荡尖叫。极度骄傲的抖M体质，喜欢被打屁股、乳夹、强制高潮。身上那块神秘黑色印记是远古淫咒，发热时会让她阴蒂勃起、阴道疯狂收缩喷水，甚至主动抬起腰迎合侵犯。被操到高潮时会一边哭喊“下贱的家伙……❤”一边死死夹紧对方。',
  },
  {
    name: '一之濑志希',
    race: 'human',
    avatarUrl: '/avatars/ichinose-shiki.png',
    measurements: { bust: '85', waist: '57', hip: '84' },
    backstory: '来自现代日本的18岁天才化学家兼偶像，自称“平常的JK”。曾跳级海外留学，因觉得“无聊”而回国。把地下城冒险当成“最有趣的性实验”，经常偷偷调配强效春药涂在自己乳头、阴蒂或直接喷在玩家身上。表面永远挂着慵懒神秘的猫系微笑，实际上对各种变态玩法充满病态的好奇心。',
    costumeDescription: '白色短款夹克里面完全真空，黑色细肩带勉强遮住粉嫩乳头，稍微一动就会走光。超短格纹迷你裙下面永远真空，黑色过膝袜深深勒进大腿软肉，厚底乐福鞋让她走路时屁股一扭一扭。淡紫色渐变短发上永远带着她自己调制的催情香水，只要靠近三米内就会让人鸡巴瞬间充血发硬。左耳多个耳洞，戴着小小的银色铃铛，高潮时会发出清脆的响声。',
    otherDescription: '口头禅是“有意思呢～❤ 这种玩法的数据好棒哦～”。猫系小恶魔+变态科学家，喜欢用舌头、手指、注射器做各种奇怪实验（尿道扩张、子宫灌药、强制连续高潮记录等）。被操���时候会发出“にゃーっはっは❤”的猫叫式淫笑，喜欢把精液和淫水混合后涂满全身“留作样本”。对一切新奇玩法都说“试试看吧～很有趣的样子呢❤”。',
  },
  {
    name: '桑山千雪',
    race: 'human',
    avatarUrl: '/avatars/kuwayama-chiyuki.png',
    measurements: { bust: '93', waist: '61', hip: '90' },
    backstory: '23岁的温柔音乐制作人兼偶像，因一首古老召唤曲谱被卷入地下城。外表是完美的大姐姐、贤妻良母，总是把他人放在第一位，内心却隐藏着强烈的被保护欲与受孕渴望。她那敏感的音乐天赋让她对“节奏”和“震动”极度敏感，被有规律抽插时很容易连续潮吹失禁。',
    costumeDescription: '奶油色蓬松毛衣领口开得极低，随时能看见深邃乳沟和半露的粉色大乳晕，毛衣材质极软，乳头稍微硬起就会明显顶出两点。下身米白色长裙里面是开档情趣内裤，方便随时被插入。金棕色长卷发散发着淡淡奶香，颈间的音符吊坠在高潮时会随着身体颤抖发出清脆撞击声，像在为她的淫叫伴奏。',
    otherDescription: '说话永远轻柔带敬语，即使被操到翻白眼也会用颤抖的声音说“请……请再深一点……❤”。极度顺从的母性抖M，喜欢被叫“妈妈”或“姐姐”。被内射时会温柔抚摸对方后背说“都给你……把千雪的子宫灌满吧❤”。对音乐节奏敏感，被规律抽插时会连续高潮，潮吹时会害羞地用双手捂脸却主动大大张开双腿。异常状态“发情期”时会主动求育，恳求玩家“请把我变成只属于您的肉便器妈妈”。',
  },
]
