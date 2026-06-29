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
  // base danbooru appearance tags, injected into every image prompt for consistency
  danbooruTags?: string
  avatarUrl: string | null
  hp: number
  maxHp: number
  pleasure: number
  desire: number
  bodyDevelopment: BodyDevelopment
  statusEffects: StatusEffect[]
  // current dungeon floor (depth); starts at 1
  floor?: number
  // per-floor theme names rolled at creation (index 0 = floor 1 … TARGET_FLOOR-1 = floor 10)
  floorThemes?: string[]
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

export type ImageStyle = 'none' | 'dk.senie' | 'hakai_shin' | 'shiokonbu' | 'piromizu' | 'nohito' | 'masami_chie' | 'thirty_8ght'
export type ImageModel = 'tsubaki_v2'

export type ImageProvider = 'pixai' | 'tensorart'

export type TensorArtModel = 'wai_nsfw_v16' | 'jankuv6'

// Optional extra tag group appended to every image prompt
export type ImageTagPreset = 'none' | 'curvy'

// 叙事文风（与常驻的「去油」文风禁令叠加，可切换密度/风格）
export type ProseStyle = 'standard' | 'dense'

export const PROSE_STYLE_LABELS: Record<ProseStyle, { label: string; hint: string }> = {
  standard: { label: '标准', hint: '均衡叙事，仅常驻去油约束' },
  dense: { label: '重油堆叠', hint: '极致密集的感官堆叠流（仍遵守去油黑名单）' },
}

export interface AppSettings {
  chatModel: string
  imageModel: ImageModel
  imageStyle: ImageStyle
  imageStyleCustom: string
  imageTagPreset: ImageTagPreset
  proseStyle: ProseStyle
  imageProvider: ImageProvider
  tensorartModel: TensorArtModel
  chatApiKey: string
  grokApiKey: string
  pixaiApiKey: string
  tensorartApiKey: string
}

export const IMAGE_MODELS: Record<ImageModel, { label: string; modelId: string }> = {
  tsubaki_v2: {
    label: 'Tsubaki v2',
    modelId: '1983308862240288769',
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
  thirty_8ght: {
    label: 'thirty_8ght',
    tags: 'thirty_8ght, glossy skin, detailed shading, thick thighs, erotic illustration',
  },
}

// Extra danbooru tag groups the player can toggle on top of the scene prompt.
export const IMAGE_TAG_PRESETS: Record<ImageTagPreset, { label: string; tags: string }> = {
  none: { label: '无', tags: '' },
  curvy: {
    label: '丰乳肥臀',
    tags: 'curvy, huge breasts, huge nipples, huge areolae, large clitoris, clitoris, fat mons, lactation, female ejaculation',
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

// description: 面向玩家（创建界面展示）；trait: 面向 DM（注入提示，真正影响叙事/陷阱反应）
export const RACE_INFO: Record<Race, { label: string; description: string; trait: string }> = {
  human: {
    label: '人族',
    description: '均衡耐受、理智坚韧——堕落来得慢，可一旦崩坏便再难回头。',
    trait: '均衡耐受、理智较顽强：快感与欲望上涨速度正常，崩坏来得更晚却也更彻底。抵抗类描写应多一分内心挣扎与不甘；一旦防线被攻破，前后反差的堕落格外强烈。',
  },
  elf: {
    label: '精灵族',
    description: '魔法亲和、肌肤敏感——媚药与淫纹等魔法陷阱对她效果加倍，越高傲越易被玷染。',
    trait: '魔法亲和、肌肤极度敏感：媚药、花粉、淫纹、催眠、魅魔等「魔法/精神系」陷阱对她效果翻倍，身体开发更快、更易高潮失禁；但高傲长寿令她被玷污时的羞耻与屈辱感格外浓烈。',
  },
  tauren: {
    label: '牛人族',
    description: '体魄强健、血脉旺盛——寻常束缚难困，可一旦发情便如野兽般疯狂，天生易泌乳。',
    trait: '体魄强健、萨满血脉旺盛：HP 与物理耐受高，寻常束缚更难困住她；却因发情血脉而欲望一旦点燃便如野兽般疯狂。天生巨乳易泌乳，适合大量产乳、孕感、被强健怪物压制征服的描写。',
  },
}

// ---------------------------------------------------------------------------
// 地下城层数与每层风貌
// ---------------------------------------------------------------------------

export const TARGET_FLOOR = 10

export interface FloorTheme {
  name: string
  // 给 DM 的环境/危险氛围描述
  ambience: string
  // 该层基调的 danbooru 场景标签（供 DM 写 [SCENE] 时融入）
  scene: string
}

// 普通楼层（1~9 层）的生物群系池，开局随机洗牌抽取
export const FLOOR_THEMES: FloorTheme[] = [
  { name: '潮湿苔窟', ambience: '幽暗滴水的苔藓洞窟，地面湿滑、空气黏腻，墙缝里蠕动着不明触须', scene: 'cave, moss, wet, dripping water, dim lighting, underground' },
  { name: '触手深渊', ambience: '布满搏动触手的巢穴，无数触须从穹顶与裂缝垂落、伺机缠绕猎物', scene: 'tentacles, cave, slime, dark, pulsating, underground' },
  { name: '催情花园', ambience: '盛开着巨大食人花的地下花园，浓密花粉与花蜜令人理智迷醉', scene: 'plant, giant flower, pollen, vines, flower field, petals' },
  { name: '史莱姆沼泽', ambience: '半透明史莱姆铺满的沼泽，黏液没膝、不断渗入衣物与孔穴', scene: 'slime, swamp, transparent, goo, bubbles, underground' },
  { name: '魅魔回廊', ambience: '镶满古镜的回廊，镜中魅魔以幻象与催眠话语诱人堕落', scene: 'mirror, corridor, succubus, illusion, magic circle, candles' },
  { name: '寄生蚁道', ambience: '虫卵密布的寄生虫蚁道，蠕虫钻动、潮热腥膻', scene: 'insect, eggs, tunnel, parasite, organic, slimy' },
  { name: '古代刑具遗迹', ambience: '锈蚀机械与拘束装置的遗迹，金属刑具自动启动、强制固定猎物', scene: 'ancient ruins, machinery, restraints, metal, gears, stone' },
  { name: '血肉迷宫', ambience: '由活体血肉构成的迷宫，墙壁起伏蠕动、淌着黏液与体温', scene: 'flesh, organic walls, biolab, veins, pulsating, red' },
  { name: '淫纹祭坛', ambience: '刻满发烫淫纹的祭坛，魔力将身体强制摆成屈辱姿势', scene: 'altar, glowing runes, magic circle, ritual, purple glow' },
  { name: '媚药温泉', ambience: '雾气蒸腾的地底媚药温泉，温热泉水浸透全身、敏感度暴涨', scene: 'hot spring, steam, water, cave, aphrodisiac, wet' },
  { name: '蛛网囚牢', ambience: '巨蛛盘踞的丝网囚牢，黏丝层层捆缚、动弹不得', scene: 'spider web, bondage, silk, cocoon, dark, restrained' },
  { name: '梦魇卧房', ambience: '诡异奢靡的梦魇卧房，催眠香氛令人分不清现实与春梦', scene: 'bedroom, canopy bed, incense, hypnosis, luxurious, dim' },
]

// 第 10 层固定的最终层
export const BOSS_FLOOR_THEME: FloorTheme = {
  name: '魔王核心·淫狱王座',
  ambience: '地下城最深处的淫狱核心，魔王盘踞于血肉王座之上，这里是冒险的终点与最终对决',
  scene: 'demon, throne, dark fantasy, ominous, magic, boss, grand hall',
}

// 开局为 1~TARGET_FLOOR 层各抽一个风貌名；第 TARGET_FLOOR 层固定为魔王核心
export function rollFloorThemes(): string[] {
  const pool = [...FLOOR_THEMES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const names: string[] = []
  for (let f = 1; f <= TARGET_FLOOR; f++) {
    names.push(f >= TARGET_FLOOR ? BOSS_FLOOR_THEME.name : pool[(f - 1) % pool.length].name)
  }
  return names
}

// 取某层的风貌，兼容缺少 floorThemes 的旧存档（按层数确定性回退）
export function getFloorTheme(floorThemes: string[] | undefined, floor: number): FloorTheme {
  if (floor >= TARGET_FLOOR) return BOSS_FLOOR_THEME
  const name = floorThemes?.[floor - 1]
  const found = name ? FLOOR_THEMES.find((t) => t.name === name) : undefined
  return found ?? FLOOR_THEMES[(Math.max(1, floor) - 1) % FLOOR_THEMES.length]
}

export interface CharacterPreset {
  name: string
  race: Race
  measurements: CharacterMeasurements
  backstory: string
  costumeDescription: string
  otherDescription: string
  danbooruTags?: string
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
    danbooruTags: 'narmaya_(granblue_fantasy), 1girl, draph, long hair, white hair, purple eyes, pointy ears, large breasts, hair ribbon, black bodysuit',
    backstory: '出身武术世家的剑豪，二十四岁，为追求剑道极致而日夜苦修，却在一次与星晶兽相关的意外中坠入这座地下城。她寡言冷峻，举手投足都是凛然的杀气，唯独那具娇小身躯（134cm）上夸张饱满的 E 杯巨乳与紧实翘臀，与她的冷艳气质格格不入——修炼时乳浪翻涌、汗水顺着深邃乳沟滑落的画面，早已是冒险者口口相传的传说。而在那身铠甲之下，藏着她从不敢言说的、被彻底征服的渴望。',
    costumeDescription: '黑色皮革战衣紧绷在身上，将 E 杯乳房勒得几乎溢出，胸口的金色符文恰好压在敏感的乳尖上，每一次呼吸都摩擦出细小的战栗。暗紫腰带如情趣束具般深陷腰间软肉，开裆皮革短裤的裆部仅有一根细链遮掩，稍一动作便露出粉嫩湿润的私处。大腿根部的绑带嵌进肉里，行走间不断研磨着阴唇。银白长发以黑缎半束，发间逸散着浓烈的雌性气息。',
    otherDescription: '平日言辞简短而冷淡，可一旦被触手或粗硬之物贯穿，骄傲便瞬间崩坏成淫荡的尖叫。她是极度骄矜的抖 M，迷恋掌掴、乳夹与强制高潮带来的羞耻快感。左身那道神秘黑色印记是远古淫咒，发热时会令她阴蒂勃起、媚肉痉挛喷潮，甚至不受控地挺腰迎合侵犯。登顶之际，她总是一边哭骂着「下贱的家伙……❤」，一边将对方死死夹紧。',
  },
  {
    name: '一之濑志希',
    race: 'human',
    avatarUrl: '/avatars/ichinose-shiki.png',
    measurements: { bust: '85', waist: '57', hip: '84' },
    danbooruTags: 'ichinose_shiki, idolmaster_cinderella_girls, 1girl, short hair, purple hair, gradient hair, purple eyes, multiple ear piercings, mole under eye, medium breasts, white jacket, plaid skirt',
    backstory: '来自现代日本的十八岁天才化学家兼偶像，自称「再平常不过的 JK」。曾跳级海外留学，只因觉得「无聊」便又回了国。坠入地下城后，她干脆把这场冒险当成「最有趣的性爱实验」，时常偷偷调配烈性春药，抹在自己的乳尖、阴蒂上，或直接喷向玩家。慵懒神秘的猫系微笑之下，是对一切变态玩法近乎病态的好奇心。',
    costumeDescription: '白色短夹克内一丝不挂，仅靠两条黑色细肩带勉强遮住粉嫩乳尖，稍一扭动便春光乍泄。超短格纹迷你裙下同样真空，黑色过膝袜深深勒进大腿软肉，厚底乐福鞋让她走起路来臀肉一颠一颠。淡紫渐变短发上常年萦绕着自调的催情香，凑近三米便足以让人充血发硬。左耳数枚耳洞缀着小巧银铃，每当高潮便叮铃轻响。',
    otherDescription: '口头禅是「真有意思呢～❤ 这种玩法的数据好棒哦～」。她是猫系小恶魔与变态科学家的结合体，热衷用舌头、手指与注射器做各种离谱实验——尿道扩张、子宫灌药、强制连续高潮记录，无所不试。被操到失神时会发出「にゃーっはっは❤」般的猫叫淫笑，喜欢把精液与淫水混在一起涂满全身「留作样本」。面对任何新奇花样，她都只会笑着说一句「试试看吧～似乎很有趣呢❤」。',
  },
  {
    name: '桑山千雪',
    race: 'human',
    avatarUrl: '/avatars/kuwayama-chiyuki.png',
    measurements: { bust: '93', waist: '61', hip: '90' },
    danbooruTags: 'kuwayama_chiyuki, idolmaster_shiny_colors, 1girl, long hair, wavy hair, light brown hair, brown eyes, large breasts, cream sweater, music note',
    backstory: '二十三岁的温柔音乐制作人兼偶像，因弹奏一卷古老的召唤曲谱而被卷入地下城。她是众人眼中完美的大姐姐、贤妻良母，永远把他人放在第一位，内心深处却埋着强烈的被守护欲与受孕渴望。天生敏锐的乐感让她对「节奏」与「震动」格外敏感，一旦被规律地抽插，便极易接连潮吹失禁。',
    costumeDescription: '奶油色蓬松毛衣领口开得极低，深邃乳沟与半露的粉色大乳晕一览无遗；毛衣柔软贴身，乳尖稍稍挺起便清晰顶出两点。米白长裙下是开裆情趣内裤，随时方便被贯入。金棕色长卷发飘着淡淡奶香，颈间的音符吊坠在她颤抖高潮时叮当轻撞，仿佛在为她的淫叫伴奏。',
    otherDescription: '说话永远轻柔有礼，即便被操到翻白眼，也会用发颤的嗓音恳求「请……请再深一点……❤」。她是极度顺从的母性抖 M，喜欢被唤作「妈妈」或「姐姐」。被内射时会温柔抚着对方的背低语「都给你……把千雪的子宫灌满吧❤」。对节奏极度敏感的她，被规律抽插便会接连登顶，潮吹时害羞地以双手掩面，却又主动将双腿大大张开。一旦陷入「发情」状态，她便会主动求育，哀求玩家「请把我变成只属于您的肉便器妈妈」。',
  },
  {
    name: '鹭泽文香',
    race: 'human',
    avatarUrl: '/avatars/sagisawa-fumika.png',
    measurements: { bust: '86', waist: '57', hip: '85' },
    danbooruTags: 'sagisawa_fumika, idolmaster_cinderella_girls, 1girl, very long hair, black hair, blunt bangs, brown eyes, pale skin, large breasts, cardigan, holding book',
    backstory: '二十岁的沉静文学少女兼偶像，平日里寡言慵懒，最爱抱着一本厚重的旧书蜷在角落静静阅读。她因翻开一卷不该读的禁忌古籍而被吸入地下城。清冷疏离的外表下，藏着与那身书卷气极不相称的、被长久压抑的旺盛情欲——她那看似永远困倦半阖的双眸深处，是一具敏感到一碰就溃堤的身体，与一颗渴望被彻底玷污、被狠狠贯穿的重度抖 M 之心。',
    costumeDescription: '宽松的酒红色长开衫松垮地挂在肩头，内里一丝不挂，深色布料随动作滑落便露出大半饱满白皙的酥乳与淡粉乳尖。乌黑顺直的长发垂至腰际，齐刘海下是一张苍白清冷、慵懒欲睡的文静面庞。下身百褶长裙底下真空无物，雪白大腿间那道无毛嫩缝早已被自己悄悄玩弄得熟透湿润，腿根处还沾着未干的淫液。她常把一本旧书抱在胸前，书页间夹着的，却是被她体液浸软的纸张。',
    otherDescription: '说话简短、语调平淡而慵懒，常以「……是吗」「……随你」敷衍，可一旦被插入，那层清冷面具便瞬间崩坏成破碎的哭叫与求饶。极度反差的重度抖 M：越是平静的脸，被操坏时的失态越是淫靡。她痴迷于「一边被朗读书中段落、一边被狠操」的羞耻玩法，也渴望被言语侮辱、被强制高潮到说不出完整句子。被内射时会失神地呢喃「啊……故事的结局……变成这样了吗……❤」。那卷禁忌古籍是淫咒之源，发烫时会令她浑身燥热敏感、字里行间浮现的淫纹缠上她的肌肤，逼她主动张开双腿献身。',
  },
]
