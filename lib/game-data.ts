import { MonstGirl } from '@/lib/types'

// ─── 种族列表 ──────────────────────────────────────────────────────────────────

export interface RaceData {
  name: string
  tags: string
  description: string
}

export const RACES: RaceData[] = [
  { name: '猫娘', tags: 'cat ears, cat tail, nekomata, feline features', description: '拥有猫耳和猫尾的灵动少女' },
  { name: '犬娘', tags: 'dog ears, dog tail, canine girl, fluffy ears', description: '忠诚可爱的犬耳少女' },
  { name: '狐娘', tags: 'fox ears, fox tail, kitsune, multiple tails', description: '神秘妖艳的狐妖少女' },
  { name: '兔娘', tags: 'bunny ears, bunny tail, rabbit girl, long ears', description: '活泼可爱的兔耳少女' },
  { name: '史莱姆', tags: 'slime girl, translucent body, gel body, blue slime', description: '半透明凝胶身体的神秘存在' },
  { name: '拉米亚', tags: 'lamia, snake lower body, scales, snake tail, naga', description: '上身人形下身蛇尾的妖艳女性' },
  { name: '哈比', tags: 'harpy, bird wings, feathers, talons, avian girl', description: '拥有鸟翼的自由少女' },
  { name: '蜘蛛娘', tags: 'arachne, spider lower body, spider girl, eight legs', description: '上身人形下身蜘蛛的神秘织者' },
  { name: '龙娘', tags: 'dragon girl, dragon wings, dragon horns, scales, draconic', description: '骄傲强大的龙族少女' },
  { name: '精灵', tags: 'elf, pointed ears, forest elf, elegant, lithe', description: '长耳优雅的森林守护者' },
  { name: '黑暗精灵', tags: 'dark elf, dark skin, white hair, pointed ears, drow', description: '暗肤白发的地下精灵' },
  { name: '吸血鬼', tags: 'vampire, fangs, pale skin, bat wings, gothic', description: '苍白迷人的永生存在' },
  { name: '魔女', tags: 'witch, witch hat, magical girl, spell casting, occult', description: '精通魔法的神秘女巫' },
  { name: '鬼娘', tags: 'oni girl, horns, club, japanese demon, red skin', description: '拥有鬼角的力量型少女' },
  { name: '牛娘', tags: 'holstaur, cow ears, cow horns, cow tail, large breasts', description: '丰满温柔的牧场少女' },
  { name: '狼娘', tags: 'wolf girl, wolf ears, wolf tail, feral, fierce', description: '野性凶猛的狼族少女' },
  { name: '美杜莎', tags: 'medusa, snake hair, snake lower body, petrification, mythological', description: '神话中危险而美丽的存在' },
]

// ─── 玩家特性 ──────────────────────────────────────────────────────────────────

export const PLAYER_TRAITS = [
  '支配狂', '服从者', '调教师', '温柔派',
  '严厉型', '变态绅士', '守护者', '冒险家',
  '商人', '学者',
]

// ─── 玩家癖好 ──────────────────────────────────────────────────────────────────

export const PLAYER_FETISHES = [
  '巨乳', '贫乳', '兽耳', '尾巴',
  '触手', '拘束', '支配', '服从',
  '制服', '和服', '黑丝', '白丝',
  '妹系', '姐系', '傲娇', '天然呆',
]

// ─── 侍奉技能 ──────────────────────────────────────────────────────────────────

export const SERVING_SKILLS = [
  '口技', '手技', '体位变换', '魅惑舞蹈',
  '按摩', '低语诱惑', '多重服侍', '特殊技巧',
]

// ─── 初始魔物娘模板 ────────────────────────────────────────────────────────────

export const GIRL_TEMPLATES: Omit<MonstGirl, 'id' | 'imageUrl'>[] = [
  {
    name: '千雪',
    race: '猫娘',
    age: '18',
    bodyDesc: '娇小玲珑，银白发色，猫耳上有黑色斑纹，细长猫尾',
    bodyTags: 'short stature, silver hair, black cat ears, striped cat tail, petite',
    personality: '傲娇外冷内热，表面高冷实则黏人，偶尔撒娇',
    personalityTags: 'tsundere, cold exterior, secretly affectionate',
    outfit: '旗袍开叉款，黑色底色红色暗纹，配白色过膝袜',
    outfitTags: 'qipao, black cheongsam, red pattern, white thigh-high socks',
    otherDesc: '前主人是一位老学者，被解放后来到馆内',
    otherTags: 'freed slave, scholar background',
    affection: 30,
    obedience: 40,
    lewdness: 25,
    skills: ['手技'],
    imageTags: '1girl, cat ears, silver hair, black cat tail, qipao, white thigh-high socks, tsundere, petite, anime, masterpiece, best quality',
    price: 0,
  },
  {
    name: '绯月',
    race: '狐娘',
    age: '20',
    bodyDesc: '高挑妖娆，深红发色，九条狐尾，金色狐耳',
    bodyTags: 'tall, dark red hair, nine fox tails, gold fox ears, voluptuous',
    personality: '温顺体贴，善解人意，天生媚惑气质，但内心渴望真情',
    personalityTags: 'gentle, understanding, alluring, secretly yearning for love',
    outfit: '白色和服，金色腰带，红色内衬若隐若现',
    outfitTags: 'white kimono, golden obi belt, red inner layer, traditional japanese',
    otherDesc: '来自远方神社，因祭祀中断而流落至此',
    otherTags: 'shrine maiden background, wandering spirit',
    affection: 50,
    obedience: 55,
    lewdness: 40,
    skills: ['低语诱惑', '魅惑舞蹈'],
    imageTags: '1girl, fox ears, dark red hair, nine tails, white kimono, golden belt, tall, elegant, seductive, anime, masterpiece, best quality',
    price: 0,
  },
  {
    name: '蓝儿',
    race: '史莱姆',
    age: '??',
    bodyDesc: '半透明蓝色凝胶体，可变形，无固定体型，通常呈现娇小少女形态',
    bodyTags: 'slime girl, blue translucent body, shapeshifter, small, cute',
    personality: '天真烂漫，对一切充满好奇，不懂世事但学习能力极强',
    personalityTags: 'innocent, curious, childlike, fast learner',
    outfit: '无服装（凝胶身体形成类似短裙的形状）',
    outfitTags: 'no clothes, body is clothing, gel dress shape, barely covered',
    otherDesc: '从地下洞穴中迷路来到地面，主动找上门来',
    otherTags: 'dungeon creature, lost in surface world, self-taught',
    affection: 70,
    obedience: 60,
    lewdness: 20,
    skills: ['特殊技巧'],
    imageTags: '1girl, slime girl, blue translucent body, cute, innocent, small, no clothes, gel body, anime, masterpiece, best quality',
    price: 0,
  },
  {
    name: '艾希',
    race: '拉米亚',
    age: '24',
    bodyDesc: '上身丰满迷人，翠绿长发，蛇身覆盖翠绿鳞片，蛇尾修长',
    bodyTags: 'lamia, green hair, snake lower body, green scales, large breasts, long snake tail',
    personality: '成熟妩媚，擅长诱惑，对喜欢的人会紧紧缠绕，占有欲强',
    personalityTags: 'mature, seductive, possessive, clingy when attached',
    outfit: '肚皮舞风格，金色腰链，薄纱上衣，大量黄金装饰',
    outfitTags: 'belly dancer outfit, gold chain belt, sheer top, gold jewelry, dancer',
    otherDesc: '前任冒险家的同伴，对方阵亡后独自生活',
    otherTags: 'former adventurer companion, lone survivor',
    affection: 45,
    obedience: 35,
    lewdness: 60,
    skills: ['口技', '体位变换'],
    imageTags: '1girl, lamia, green hair, snake lower body, green scales, belly dancer, gold jewelry, large breasts, seductive, anime, masterpiece, best quality',
    price: 0,
  },
  {
    name: '维拉',
    race: '龙娘',
    age: '22',
    bodyDesc: '高挑健美，黑发，背后有黑色龙翼，额头有小龙角，部分鳞片',
    bodyTags: 'dragon girl, black hair, black dragon wings, small horns, partial scales, athletic',
    personality: '骄傲高冷，视弱者为无物，但被真正的强者折服后会极度忠诚',
    personalityTags: 'proud, arrogant, cold, deeply loyal once submitted',
    outfit: '黑色骑士铠甲半脱，露出内里的黑色皮革内衣',
    outfitTags: 'black knight armor, partially removed, black leather lingerie, knight',
    otherDesc: '前任龙族骑士团成员，因违抗命令被驱逐',
    otherTags: 'former dragon knight, exiled, dishonored',
    affection: 20,
    obedience: 15,
    lewdness: 30,
    skills: [],
    imageTags: '1girl, dragon girl, black hair, black wings, horns, black armor, black leather outfit, proud, athletic, anime, masterpiece, best quality',
    price: 0,
  },
  {
    name: '艾拉',
    race: '精灵',
    age: '21',
    bodyDesc: '纤细清秀，金发及腰，长而尖的精灵耳，眼睛是翠绿色',
    bodyTags: 'elf, blonde long hair, pointed ears, green eyes, slender, graceful',
    personality: '清纯腼腆，说话轻声细语，内心其实对未知充满渴望',
    personalityTags: 'pure, shy, soft spoken, secretly curious and adventurous',
    outfit: '白色森林风长裙，绿色腰带，花朵发饰',
    outfitTags: 'white forest dress, green belt, flower hair ornament, elven style',
    otherDesc: '自愿离开精灵森林探索人类世界的年轻精灵',
    otherTags: 'young elf, exploring human world, curious traveler',
    affection: 60,
    obedience: 50,
    lewdness: 15,
    skills: ['按摩'],
    imageTags: '1girl, elf, blonde hair, long hair, pointed ears, green eyes, white dress, flower ornament, shy, pure, anime, masterpiece, best quality',
    price: 0,
  },
]

// ─── 客人种族 ──────────────────────────────────────────────────────────────────

export const GUEST_RACES = [
  '人类冒险家', '矮人战士', '兽人武者', '精灵游侠',
  '黑暗精灵盗贼', '人类商人', '魔法学徒', '退役骑士',
  '半兽人雇佣兵', '吸血贵族', '侏儒机械师', '海妖船长',
]

// ─── 客人性格 ──────────────────────────────────────────────────────────────────

export const GUEST_PERSONALITIES = [
  '粗犷豪爽', '温文尔雅', '腼腆内向', '傲慢自大',
  '神秘低调', '豪迈豁达', '敏感细腻', '老实憨厚',
]

// ─── 客人特性 ──────────────────────────────────────────────────────────────────

export const GUEST_TRAITS = [
  '财大气粗', '小气吝啬', '体力过人', '技巧熟练',
  '初次体验', '老顾客', '特殊癖好', '花心',
  '专一', '沉默寡言', '话痨',
]
