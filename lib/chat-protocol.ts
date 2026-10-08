import { z } from 'zod'
import { ENCOUNTER_CLEAR_GAIN, TARGET_FLOOR, type Character } from '@/lib/types'
import { enforceTurnResult, type ProgramTurnResult } from '@/lib/adventure-context'

const PARTS = ['breast', 'clitoris', 'urethra', 'vagina', 'anus'] as const
const MARKER_START = /\[OPTIONS\]|\[SCENE|\[STATS|\[DESC/i
const bounded = (max: number) => z.number().finite().int().min(0).max(max)
const text = (max: number) => z.string().trim().min(1).max(max)
const descriptions = z.object(Object.fromEntries(PARTS.map((part) => [part, text(300).optional()])) as Record<typeof PARTS[number], z.ZodOptional<z.ZodString>>).strict()
const experience = z.object(Object.fromEntries(PARTS.map((part) => [part, bounded(100).optional()])) as Record<typeof PARTS[number], z.ZodOptional<z.ZodNumber>>).strict()
const development = z.object({
  breast: bounded(5), clitoris: bounded(5), urethra: bounded(5), vagina: bounded(5), anus: bounded(5),
  exp: experience.optional(), descriptions: descriptions.optional(),
}).strict()
const effectSchema = z.object({ id: text(100), title: text(40), description: z.string().max(500) }).strict()
const encounterSchema = z.object({
  id: text(100), name: text(100), kind: z.enum(['trap', 'monster']), summary: z.string().max(500), restraint: bounded(3),
}).strict()
const measurement = z.string().regex(/^(?:\d+(?:\.\d+)?|)$/).max(12)

function statsSchema(character: Character) {
  const knownIds = new Set([...(character.statusEffects ?? []).map((effect) => effect.id), character.encounter?.id])
  const validId = (id: string) => knownIds.has(id) || /^[a-z][a-z0-9_-]*$/.test(id)
  return z.object({
    hp: bounded(character.maxHp), pleasure: bounded(100), desire: bounded(100),
    floor: z.number().int().min(1).max(TARGET_FLOOR),
    encounter: encounterSchema.refine((value) => validId(value.id), 'invalid encounter id').nullable(),
    measurements: z.object({ bust: measurement, waist: measurement, hip: measurement }).strict(),
    bodyDevelopment: development,
    statusEffects: z.array(effectSchema).max(100)
      .refine((effects) => new Set(effects.map((effect) => effect.id)).size === effects.length, 'duplicate status ids')
      .refine((effects) => effects.every((effect) => validId(effect.id)), 'invalid status id'),
  }).strict()
}

function normalizeJsonPunctuation(value: string): string {
  const punctuation: Record<string, string> = { '：': ':', '，': ',', '｛': '{', '｝': '}', '［': '[', '］': ']', '　': ' ' }
  let quoted = false
  let escaped = false
  return Array.from(value).map((char) => {
    if (escaped) { escaped = false; return char }
    if (char === '\\' && quoted) { escaped = true; return char }
    if (char === '"') quoted = !quoted
    return quoted ? char : punctuation[char] ?? char
  }).join('')
}

/** Accept complete JSON only. Never invent missing braces, values, or array entries. */
export function extractMarkerJson(content: string, marker: string): Record<string, unknown> | null {
  const matches = [...content.matchAll(new RegExp(`\\[${marker}\\s*[:：]`, 'gi'))]
  if (matches.length !== 1) return null
  const match = matches[0]
  const tail = normalizeJsonPunctuation(content.slice(match.index! + match[0].length)).trimStart()
  if (!tail.startsWith('{')) return null
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = 0; index < tail.length; index++) {
    const char = tail[index]
    if (escaped) { escaped = false; continue }
    if (char === '\\' && quoted) { escaped = true; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (quoted) continue
    if (char === '{') depth++
    if (char === '}' && --depth === 0) {
      if (!tail.slice(index + 1).trimStart().startsWith(']')) return null
      try { return JSON.parse(tail.slice(0, index + 1)) } catch { return null }
    }
  }
  return null
}

export function cleanContent(content: string): string {
  const index = content.search(MARKER_START)
  return (index < 0 ? content : content.slice(0, index)).trim()
}

export function parseOptions(content: string): string[] {
  const match = content.match(/\[OPTIONS\]([\s\S]*?)(?:\[\/OPTIONS\]|\[SCENE|\[STATS|\[DESC|$)/i)
  return match ? match[1].split('\n').map((line) => line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.、)]\s*/, '')).filter(Boolean) : []
}

export interface ReplyInspection {
  narrative: string
  options: string[]
  scene: string
  updates: Partial<Character> | null
  errors: string[]
  metadataErrors: string[]
  warnings: string[]
  contradictions: string[]
}

export function inspectReply(content: string, character: Character, result: ProgramTurnResult | null): ReplyInspection {
  const narrative = cleanContent(content)
  const options = parseOptions(content)
  const scene = content.match(/\[SCENE\s*[:：]\s*([^\]]+)\]/i)?.[1].replace(/，/g, ',').trim() ?? ''
  const errors: string[] = []
  const metadataErrors: string[] = []
  const warnings: string[] = []
  const contradictions: string[] = []
  if (!narrative) errors.push('正文缺失')
  if (options.length !== 4 || new Set(options).size !== 4) errors.push('需要四个不同的行动选项')
  if (!scene || scene.length > 2000 || !/^[\x20-\x7E]+$/.test(scene)) errors.push('场景标签无效')
  const parsed = statsSchema(character).safeParse(extractMarkerJson(content, 'STATS'))
  let updates: Partial<Character> | null = null
  if (!parsed.success) {
    metadataErrors.push(...parsed.error.issues.map((issue) => `STATS.${issue.path.join('.') || '结构'}`))
  } else {
    const stats = parsed.data
    updates = { ...stats, bodyDevelopment: {
      ...character.bodyDevelopment, ...stats.bodyDevelopment,
      exp: { ...character.bodyDevelopment.exp, ...stats.bodyDevelopment.exp },
      descriptions: { ...character.bodyDevelopment.descriptions, ...stats.bodyDevelopment.descriptions },
    } }
    if (character.encounter && !stats.encounter && result?.kind !== 'escape') {
      updates.explorationProgress = Math.min(100, (character.explorationProgress ?? 0) + ENCOUNTER_CLEAR_GAIN)
    }
    if (stats.floor !== (character.floor ?? 1)) contradictions.push('floor')
    if (result?.kind === 'escape' && JSON.stringify(stats.encounter) !== JSON.stringify(result.encounter)) contradictions.push('encounter')
    if (result?.kind === 'dispel' && stats.statusEffects.some((effect) => effect.id === result.effect.id) === result.removed) contradictions.push('statusEffects')
    const desc = descriptions.safeParse(extractMarkerJson(content, 'DESC'))
    if (desc.success) updates.bodyDevelopment!.descriptions = { ...updates.bodyDevelopment!.descriptions, ...desc.data }
    else warnings.push('状态描述不完整，已保留原描述')
    updates = enforceTurnResult(character, updates, result)
  }
  return { narrative, options, scene, updates, errors, metadataErrors, warnings, contradictions }
}

/** Replace only machine-readable state; the accepted narrative and choices remain byte-identical. */
export function replaceStateMetadata(content: string, metadata: string): string {
  const index = content.search(/\[STATS\s*[:：]|\[DESC\s*[:：]/i)
  return `${(index < 0 ? content : content.slice(0, index)).trimEnd()}\n${metadata.trim()}`
}

export function serializeReply(inspection: ReplyInspection, character: Character): string {
  const { descriptions: desc, ...bodyDevelopment } = character.bodyDevelopment
  const stats = { hp: character.hp, pleasure: character.pleasure, desire: character.desire, floor: character.floor ?? 1,
    encounter: character.encounter ?? null, measurements: character.measurements, bodyDevelopment, statusEffects: character.statusEffects }
  return `${inspection.narrative}\n[OPTIONS]\n${inspection.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}\n[/OPTIONS]\n[SCENE: ${inspection.scene}]\n[STATS:${JSON.stringify(stats)}]\n[DESC:${JSON.stringify(desc ?? {})}]`
}
