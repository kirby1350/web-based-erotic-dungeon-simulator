import { MonstGirl, Guest, ParticipantStats, ServiceSession, Player } from '@/lib/types'

// ─── 服务/调教数值计算 ──────────────────────────────────────────────────────────

/**
 * 根据AI回复内容关键词估算数值变化
 */
export function estimateStatDelta(text: string): {
  pleasureDelta: number
  staminaDelta: number
} {
  const lowerText = text.toLowerCase()

  // 快感提升关键词
  const pleasureUpWords = ['呻吟', '颤抖', '高潮', '快感', '喘息', '颤栗', '销魂', '舒服', '满足', '享受']
  const pleasureDownWords = ['抵抗', '拒绝', '挣扎', '哭泣', '疼痛', '不舒服']

  // 体力消耗关键词
  const staminaHighDrainWords = ['激烈', '猛烈', '疯狂', '不停', '连续', '极限']
  const staminaLowDrainWords = ['轻柔', '温柔', '缓慢', '轻轻', '休息']

  let pleasureDelta = 5
  let staminaDelta = -8

  for (const w of pleasureUpWords) {
    if (text.includes(w)) pleasureDelta += 4
  }
  for (const w of pleasureDownWords) {
    if (text.includes(w)) pleasureDelta -= 3
  }
  for (const w of staminaHighDrainWords) {
    if (text.includes(w)) staminaDelta -= 5
  }
  for (const w of staminaLowDrainWords) {
    if (text.includes(w)) staminaDelta += 3
  }

  return {
    pleasureDelta: Math.max(0, Math.min(20, pleasureDelta)),
    staminaDelta: Math.max(-25, Math.min(-2, staminaDelta)),
  }
}

/**
 * 应用数值变化，处理体力归零
 */
export function applyStatDelta(
  stats: ParticipantStats,
  delta: { pleasureDelta: number; staminaDelta: number }
): ParticipantStats {
  const newStamina = Math.max(0, Math.min(100, stats.stamina + delta.staminaDelta))
  const newPleasure = Math.max(0, Math.min(100, stats.pleasure + delta.pleasureDelta))
  return {
    pleasure: newPleasure,
    stamina: newStamina,
    isExhausted: newStamina === 0,
  }
}

/**
 * 计算服务结束后的金币收入
 */
export function calcServiceReward(guest: Guest, session: ServiceSession): number {
  const basePay = 50
  const satisfactionBonus = Math.floor(guest.satisfaction / 10) * 10
  const girlCountBonus = (session.girls.length - 1) * 20
  const totalPleasure = Object.values(session.girlsStats).reduce(
    (sum, s) => sum + s.pleasure,
    0
  )
  const pleasureBonus = Math.floor(totalPleasure / session.girls.length / 20) * 5
  return Math.max(20, basePay + satisfactionBonus + girlCountBonus + pleasureBonus)
}

/**
 * 计算服务/调教后魔物娘属性变化
 */
export function calcGirlStatGrowth(
  girl: MonstGirl,
  session: ServiceSession,
  turnCount: number
): Partial<MonstGirl> {
  const stats = session.girlsStats[girl.id]
  if (!stats) return {}

  const pleasureRatio = stats.pleasure / 100
  const isTraining = session.type === 'training'

  // 好感度：服务中适度提升
  const affectionDelta = isTraining
    ? Math.floor(Math.random() * 3) + 2
    : Math.floor(pleasureRatio * 5) + 1

  // 服从度：调教场景提升更多
  const obedienceDelta = isTraining
    ? Math.floor(Math.random() * 5) + 3
    : Math.floor(Math.random() * 2)

  // 淫乱度：高快感时提升
  const lewdnessDelta = stats.pleasure > 70
    ? Math.floor(Math.random() * 4) + 2
    : Math.floor(Math.random() * 2)

  return {
    affection: Math.min(100, girl.affection + affectionDelta),
    obedience: Math.min(100, girl.obedience + obedienceDelta),
    lewdness: Math.min(100, girl.lewdness + lewdnessDelta),
  }
}

/**
 * 初始化会话数值
 */
export function initParticipantStats(): ParticipantStats {
  return { pleasure: 0, stamina: 100, isExhausted: false }
}

/**
 * 初始化服务会话
 */
export function createServiceSession(
  type: 'service' | 'training',
  girls: MonstGirl[],
  options: { guest?: Guest; trainer?: MonstGirl }
): ServiceSession {
  const girlsStats: Record<string, ParticipantStats> = {}
  for (const g of girls) {
    girlsStats[g.id] = initParticipantStats()
  }
  return {
    type,
    girls,
    messages: [],
    girlsStats,
    guest: options.guest,
    guestStats: options.guest ? initParticipantStats() : undefined,
    trainer: options.trainer,
    trainerStats: options.trainer ? initParticipantStats() : undefined,
  }
}

/**
 * 检查是否有足够好感度的魔物娘可担任调教者
 */
export function findEligibleTrainers(girls: MonstGirl[], excludeId?: string): MonstGirl[] {
  return girls.filter((g) => g.affection >= 60 && g.id !== excludeId)
}

/**
 * 更新满意度（服务场景）
 */
export function updateGuestSatisfaction(guest: Guest, pleasureDelta: number): Guest {
  const delta = Math.floor(pleasureDelta / 2)
  return { ...guest, satisfaction: Math.min(100, Math.max(0, guest.satisfaction + delta)) }
}
