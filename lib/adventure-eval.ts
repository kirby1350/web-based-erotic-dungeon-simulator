import type { Character } from '@/lib/types'
import { resolveTurnCharacter, type ProgramTurnResult } from '@/lib/adventure-context'
import { cleanContent, inspectReply } from '@/lib/chat-protocol'

export interface EvaluationCase {
  id: string
  before: Character
  result: ProgramTurnResult | null
  output: string
  previousNarrative?: string
}

/** A lexical repetition signal, not a claim to judge narrative quality. */
export function repetitionScore(previous: string, current: string): number {
  const grams = (value: string) => {
    const text = cleanContent(value).replace(/[\p{P}\p{Z}\s]/gu, '').toLowerCase()
    return new Set(Array.from({ length: Math.max(0, text.length - 2) }, (_, index) => text.slice(index, index + 3)))
  }
  const a = grams(previous)
  const b = grams(current)
  if (a.size < 10 || b.size < 10) return 0
  const overlap = [...a].filter((gram) => b.has(gram)).length
  return 2 * overlap / (a.size + b.size)
}

export function evaluateCases(cases: EvaluationCase[]) {
  const results = cases.map((item) => {
    const reply = inspectReply(item.output, resolveTurnCharacter(item.before, item.result), item.result)
    return { id: item.id, formatValid: !reply.errors.length && !reply.metadataErrors.length,
      contradictions: reply.contradictions, errors: [...reply.errors, ...reply.metadataErrors],
      repetition: repetitionScore(item.previousNarrative ?? '', item.output) }
  })
  const rate = (count: number) => results.length ? Number((count / results.length).toFixed(4)) : 0
  return { count: results.length,
    formatSuccessRate: rate(results.filter((item) => item.formatValid).length),
    stateContradictionRate: rate(results.filter((item) => item.contradictions.length > 0).length),
    repeatedNarrativeRate: rate(results.filter((item) => item.repetition >= 0.85).length), results }
}
