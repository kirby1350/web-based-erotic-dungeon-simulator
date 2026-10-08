import type { Character, ChatMessage, GameSession } from '@/lib/types'
import { resolveTurnCharacter, type ProgramTurnResult } from '@/lib/adventure-context'
import { inspectReply, serializeReply } from '@/lib/chat-protocol'

export const PROMPT_VERSION = 'adventure-v3'
export interface PendingTurn {
  id: string
  input: string
  startedAt: number
  before: Character
  result: ProgramTurnResult | null
  requestMessages: { role: string; content: string }[]
  model: string
  phase: 'generating' | 'repair' | 'ready'
  draft: string
  originalReply?: string
  repaired?: boolean
  promptVersion: string
}
export interface TurnRecord {
  id: string
  promptVersion: string
  model: string
  result: ProgramTurnResult | null
  before: Character
  after: Character
  input: string
  reply: string
  originalReply: string
  committedAt: number
  repaired: boolean
  contradictions: string[]
}

/** Pure transaction preparation. Persist the result once, then publish it to the UI. */
export function completeTurn(session: GameSession, pending: PendingTurn, content: string, repaired: boolean): { character: Character; session: GameSession; warnings: string[] } {
  const duplicate = session.turns?.find((turn) => turn.id === pending.id)
  if (duplicate) {
    if (session.turns?.at(-1)?.id !== pending.id) throw new Error('该回合已完成，不能覆盖后续回合')
    return { character: { ...duplicate.after, avatarUrl: pending.before.avatarUrl }, session, warnings: [] }
  }
  if (session.pendingTurn?.id !== pending.id) throw new Error('待完成回合已改变，请重新载入存档')
  const current = resolveTurnCharacter(pending.before, pending.result)
  const reply = inspectReply(content, current, pending.result)
  if (reply.errors.length || reply.metadataErrors.length || !reply.updates) throw new Error('回合输出尚未通过校验')
  const character = { ...current, ...reply.updates }
  const canonical = serializeReply(reply, character)
  const timestamp = Date.now()
  const messages: ChatMessage[] = [...session.messages,
    { role: 'user', content: pending.input, timestamp: pending.startedAt, turnId: pending.id },
    { role: 'assistant', content: canonical, timestamp, turnId: pending.id },
  ]
  const record: TurnRecord = { id: pending.id, promptVersion: pending.promptVersion, model: pending.model,
    result: pending.result, before: { ...pending.before, avatarUrl: null }, after: { ...character, avatarUrl: null }, input: pending.input, reply: canonical,
    originalReply: session.pendingTurn?.originalReply || session.pendingTurn?.draft || content,
    committedAt: timestamp, repaired, contradictions: reply.contradictions }
  return { character, session: { ...session, messages, pendingTurn: null, turns: [...(session.turns ?? []), record].slice(-20) }, warnings: reply.warnings }
}

export function pendingMessages(session: GameSession): ChatMessage[] {
  const pending = session.pendingTurn
  return pending ? [...session.messages,
    { role: 'user', content: pending.input, timestamp: pending.startedAt, turnId: pending.id },
    { role: 'assistant', content: pending.draft, timestamp: pending.startedAt, turnId: pending.id },
  ] : session.messages
}
