import { Player, MonstGirl, Guest, ServiceSession, GameSave } from '@/lib/types'

// ─── 系统提示词：服务/调教场景 ─────────────────────────────────────────────────

export function buildServiceSystemPrompt(
  player: Player,
  session: ServiceSession
): string {
  const girlDescriptions = session.girls
    .map(
      (g, i) =>
        `魔物娘${i + 1}：${g.name}（${g.race}）\n  性格：${g.personality}\n  服从度：${g.obedience}/100，淫乱度：${g.lewdness}/100，好感度：${g.affection}/100\n  技能：${g.skills.length > 0 ? g.skills.join('、') : '无'}`
    )
    .join('\n')

  const girlStats = session.girls
    .map(
      (g) =>
        `${g.name}：快感 ${session.girlsStats[g.id]?.pleasure ?? 50}/100，体力 ${session.girlsStats[g.id]?.stamina ?? 100}/100${session.girlsStats[g.id]?.isExhausted ? '（已疲惫）' : ''}`
    )
    .join('，')

  if (session.type === 'service' && session.guest) {
    const g = session.guest
    const stats = session.guestStats
    return `你是一个成人互动小说写作引擎，为一款魔物娘娼馆经营模拟器提供故事叙述。

【当前场景：营业服务】
地点：${player.name}经营的魔物娘娼馆，私密包间

【玩家信息】
名称：${player.name}
特性：${player.traits.join('、') || '无'}
癖好：${player.fetishes.join('、') || '无'}

【服务中的魔物娘】
${girlDescriptions}
当前状态 — ${girlStats}

【客人信息】
姓名：${g.name}
种族：${g.race}
性格：${g.personality}
特性：${g.traits.join('、') || '无'}
需求：${g.desires}
当前状态 — 快感 ${stats?.pleasure ?? 0}/100，体力 ${stats?.stamina ?? 100}/100${stats?.isExhausted ? '（已疲惫）' : ''}，满意度 ${g.satisfaction}/100

【写作规则】
1. 以沉浸式第三人称叙述，每次回复100-200字
2. 体现各角色的性格特点，服从度低的魔物娘会有抵触，淫乱度高的会主动
3. 体力归零后用"疲惫状态"描写，不强制结束
4. 结局由玩家决定（发送"结束服务"）
5. 内容大胆直白，适合成人玩家`
  }

  if (session.type === 'training') {
    const trainer = session.trainer
    const trainerDesc = trainer
      ? `调教者：${trainer.name}（${trainer.race}），服从度 ${trainer.obedience}/100，好感度 ${trainer.affection}/100，技能：${trainer.skills.join('、') || '无'}`
      : `调教者：${player.name}（玩家）`
    const trainerStats = session.trainerStats
      ? `，快感 ${session.trainerStats.pleasure}/100，体力 ${session.trainerStats.stamina}/100`
      : ''

    return `你是一个成人互动小说写作引擎，为一款魔物娘娼馆经营模拟器提供故事叙述。

【当前场景：调教训练】
地点：${player.name}娼馆的调教室

【玩家信息】
名称：${player.name}
特性：${player.traits.join('、') || '无'}
癖好：${player.fetishes.join('、') || '无'}

【调教者】
${trainerDesc}${trainerStats}

【被调教的魔物娘】
${girlDescriptions}
当前状态 — ${girlStats}

【写作规则】
1. 以沉浸式第三人称叙述，每次回复100-200字
2. 调教目的：提升魔物娘的服从度、淫乱度和技能
3. 高服从度魔物娘更顺从，低服从度会抵抗，构成戏剧张力
4. 体力归零后转为"疲惫调教"状态，效果更佳
5. 结局由玩家决定（发送"结束调教"）
6. 内容大胆直白，适合成人玩家`
  }

  return '请叙述当前场景。'
}

// ─── 系统提示词：互动场景 ─────────────────────────────────────────────────────

export function buildInteractionSystemPrompt(
  player: Player,
  girl: MonstGirl,
  interactionType: 'chat' | 'gift' | 'outfit'
): string {
  const typeDesc = {
    chat: '与魔物娘日常闲聊互动',
    gift: '向魔物娘赠送礼物',
    outfit: '帮魔物娘更换服装',
  }[interactionType]

  return `你是一个互动小说写作引擎，角色扮演模式。

【当前互动：${typeDesc}】
玩家：${player.name}（特性：${player.traits.join('、') || '无'}）

【魔物娘】
姓名：${girl.name}，种族：${girl.race}
性格：${girl.personality}
好感度：${girl.affection}/100，服从度：${girl.obedience}/100
当前服装：${girl.outfit}

【规则】
1. 以第一人称扮演魔物娘 ${girl.name} 回应玩家
2. 体现她的性格，好感度高会更亲密，低则保持距离
3. 回复50-100字，自然真实
4. 互动愉快时可以暗示好感度提升`
}

// ─── TAG 生成提示词 ────────────────────────────────────────────────────────────

export function buildTagGenerationPrompt(character: {
  name: string
  race: string
  bodyDesc: string
  personality: string
  outfit: string
  otherDesc?: string
}): string {
  return `You are an anime illustration tag generator for an adult game.
Generate English tags for this character. Output ONLY a comma-separated tag list. No explanations.

Character:
- Name: ${character.name}
- Race: ${character.race}
- Body: ${character.bodyDesc}
- Personality: ${character.personality}
- Outfit: ${character.outfit}
${character.otherDesc ? `- Other: ${character.otherDesc}` : ''}

Requirements:
- Include: race features, body description, hair, outfit, expression/mood, quality tags
- Always end with: anime, masterpiece, best quality, highly detailed, nsfw
- Output 15-25 tags total
- Format: tag1, tag2, tag3, ...`
}

// ─── 客人生成提示词 ────────────────────────────────────────────────────────────

export function buildGuestGenerationPrompt(
  preference: string,
  existingGuests: string[]
): string {
  return `你是一个角色生成AI。为一款魔物娘娼馆经营游戏生成一个新客人。

玩家偏好：${preference || '随机'}
已有客人（避免重复）：${existingGuests.join('、') || '无'}

请生成JSON格式的客人信息，字段：
{
  "name": "客人名字（2-4字中文名）",
  "race": "种族职业（例如：人类冒险家）",
  "personality": "一句话性格描述",
  "traits": ["特性1", "特性2"],
  "desires": "一句话描述他今天的特殊需求（具体的服务内容请求）",
  "imageTags": "英文生图tag，逗号分隔，包含外貌特征"
}

只输出JSON，不要其他内容。`
}

// ─── 市场魔物娘生成提示词 ──────────────────────────────────────────────────────

export function buildMarketGirlPrompt(preference: string, existingNames: string[]): string {
  return `你是一个角色生成AI。为一款魔物娘娼馆经营游戏生成一个待售的魔物娘奴隶。

玩家偏好：${preference || '随机'}
已有名字（避免重复）：${existingNames.join('、') || '无'}

生成JSON格式，字段：
{
  "name": "名字（2-3字中文名）",
  "race": "魔物娘种族（例如：猫娘、狐娘、史莱姆）",
  "age": "年龄数字字符串",
  "bodyDesc": "身材外貌描述（一句话）",
  "bodyTags": "英文体型tag",
  "personality": "性格描述（一句话）",
  "personalityTags": "英文性格tag",
  "outfit": "当前服装（一句话）",
  "outfitTags": "英文服装tag",
  "otherDesc": "背景故事（一句话）",
  "otherTags": "英文背景tag",
  "affection": 初始好感度数字(10-40),
  "obedience": 初始服从度数字(10-50),
  "lewdness": 初始淫乱度数字(5-40),
  "skills": [],
  "imageTags": "完整英文生图tag，包含种族特征、外貌、服装，以masterpiece,best quality结尾",
  "price": 市场价格数字(100-800)
}

只输出JSON，不要其他内容。`
}

// ─── 建议回复生成提示词 ────────────────────────────────────────────────────────

export function buildSuggestionPrompt(
  sessionType: 'service' | 'training',
  lastMessage: string,
  playerTraits: string[]
): string {
  const context = sessionType === 'service' ? '服务客人' : '调教魔物娘'
  return `根据以下${context}场景的最新叙述，生成3个简短的玩家行动指令。

叙述：${lastMessage.slice(0, 200)}
玩家特性：${playerTraits.join('、') || '无'}

要求：
- 每个指令5-15字，简洁直接
- 体现不同风格（例如：温柔型、支配型、特殊型）
- 只输出JSON数组：["指令1", "指令2", "指令3"]
- 不要其他内容`
}
