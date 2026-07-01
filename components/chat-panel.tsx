'use client'

import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { Send, Loader2, BookOpen, Square, RotateCcw, Wrench, Zap, Sparkles, ShieldAlert, Unlock, HeartCrack } from 'lucide-react'
import { Character, ChatMessage, AppSettings, BodyDevelopment, BodyPart, StatusEffect, Encounter, EXPLORE_GAIN, ENCOUNTER_CLEAR_GAIN, TARGET_FLOOR, getFloorTheme } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getSession, saveSession } from '@/lib/storage'
import { chatStream } from '@/lib/dzmm'
import {
  buildSystemPrompt,
  buildSummaryUserPrompt,
  SUMMARY_SYSTEM_PROMPT,
  withQualityPrefix,
} from '@/lib/prompts'
import { TrapGenerator } from '@/components/trap-generator'
import { StatusPicker } from '@/components/status-picker'

const SUMMARY_THRESHOLD = 10
const RECENT_KEEP = 4

// Client-side success chance (%) for dispelling a status effect by sheer will.
// Calm → easy; highly aroused / restrained → hard, but never truly impossible.
function dispelChance(character: Character): number {
  const arousal = ((character.pleasure ?? 0) + (character.desire ?? 0)) / 2
  const restrainedPenalty = character.encounter ? 10 : 0
  const chance = 85 - arousal * 0.6 - restrainedPenalty
  return Math.max(15, Math.min(90, Math.round(chance)))
}

interface ChatPanelProps {
  character: Character
  settings: AppSettings
  onRequestImage: (scene: string) => void
  onCharacterUpdate: (updates: Partial<Character>) => void
  // lets the CharacterCard's exploration buttons drive this panel's explore/advance turns
  exploreActionsRef?: MutableRefObject<{ explore: () => void; advanceFloor: () => void }>
}

async function fetchSummary(messages: ChatMessage[], model: string, apiKey: string, grokApiKey: string): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? '玩家' : '地下城主'}：${m.content}`)
    .join('\n')

  let text = ''
  try {
    await chatStream(
      {
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: buildSummaryUserPrompt(conversation) },
        ],
        model,
        apiKey,
        grokApiKey,
      },
      (delta) => { text += delta },
    )
  } catch (e) {
    console.error('fetchSummary failed:', e)
    return ''
  }
  return text.trim()
}

// Models often emit the JSON with full-width punctuation (：，｛｝ etc.) instead of
// ASCII — valid-looking but unparseable. Convert the STRUCTURAL ones to ASCII,
// while leaving punctuation *inside string values* (narrative text) untouched.
function normalizeJsonPunctuation(s: string): string {
  const map: Record<string, string> = {
    '：': ':', '，': ',', '｛': '{', '｝': '}', '［': '[', '］': ']', '　': ' ',
  }
  let out = ''
  let inStr = false
  let esc = false
  for (let k = 0; k < s.length; k++) {
    const ch = s[k]
    if (esc) { out += ch; esc = false; continue }
    if (ch === '\\') { out += ch; esc = true; continue }
    if (ch === '"') { inStr = !inStr; out += ch; continue }
    out += !inStr && map[ch] ? map[ch] : ch
  }
  return out
}

// Best-effort parse of a JSON object string that may use full-width punctuation
// or be truncated mid-stream (the STATS/DESC tail can be cut off at the token limit).
function parseJsonLenient(raw: string): Record<string, unknown> | null {
  const normalized = normalizeJsonPunctuation(raw)
  try { return JSON.parse(normalized) } catch { /* fall through to repair */ }

  let s = normalized
  // Walk it tracking string/escape state and a bracket stack, so we can close
  // whatever the truncation left open.
  const stack: string[] = []
  let inStr = false
  let esc = false
  for (let k = 0; k < s.length; k++) {
    const ch = s[k]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') stack.pop()
  }
  if (inStr) s += '"'                                   // close a string cut mid-value
  s = s.replace(/[,{]\s*"[^"]*"\s*:?\s*$/, (m) => (m[0] === '{' ? '{' : '')) // drop a dangling key
  s = s.replace(/,\s*$/, '')                            // drop a trailing comma
  while (stack.length) s += stack.pop() === '{' ? '}' : ']'  // close open brackets
  s = s.replace(/,\s*([}\]])/g, '$1')                  // remove commas before closers
  try { return JSON.parse(s) } catch { return null }
}

// Extract and merge all sibling JSON objects inside [MARKER:...obj1, obj2...].
// `marker` is e.g. 'STATS' or 'DESC'. Tolerant of a full-width colon (：) and of
// a final object truncated by the token limit.
function extractMarkerJson(text: string, marker: string): Record<string, unknown> | null {
  const re = new RegExp(`\\[${marker}\\s*[:：]`, 'i')
  const m = re.exec(text)
  if (!m) return null

  const objects: Record<string, unknown>[] = []
  let i = m.index + m[0].length

  while (i < text.length) {
    const ch = text[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') { i++; continue }
    if (ch === ']') break
    if (ch === '{') {
      let depth = 0
      let inStr = false
      let esc = false
      let closed = false
      const objStart = i
      for (; i < text.length; i++) {
        const c = text[i]
        if (esc) { esc = false; continue }
        if (c === '\\') { esc = true; continue }
        if (c === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (c === '{') depth++
        else if (c === '}') {
          depth--
          if (depth === 0) {
            const parsed = parseJsonLenient(text.slice(objStart, i + 1))
            if (parsed) objects.push(parsed)
            i++
            closed = true
            break
          }
        }
      }
      if (!closed) {
        // unterminated final object — truncated by the token limit; repair it
        const parsed = parseJsonLenient(text.slice(objStart))
        if (parsed) objects.push(parsed)
        break
      }
    } else {
      i++
    }
  }

  if (objects.length === 0) return null
  // Merge all objects into one (later objects override earlier ones for same keys)
  return Object.assign({}, ...objects)
}

// Strip a [MARKER:{...}] block (with balanced braces) from text.
// Everything from the first structured marker onward is UI metadata, not prose.
// Markers ([OPTIONS]/[SCENE]/[STATS]/[DESC]) always follow the narrative, and the
// model is inconsistent about closing tags and full/half-width colons — so we cut
// the narrative at the first marker rather than matching each block precisely.
const MARKER_START = /\[OPTIONS\]|\[SCENE|\[STATS|\[DESC/i

function cleanContent(content: string): string {
  const idx = content.search(MARKER_START)
  return (idx === -1 ? content : content.slice(0, idx)).trim()
}

function parseOptions(content: string): string[] {
  // Capture the [OPTIONS] body up to its close tag, the next marker, or end —
  // the model often omits [/OPTIONS]. Accept "1." / "-" / "•" bullet styles.
  const block = content.match(/\[OPTIONS\]([\s\S]*?)(?:\[\/OPTIONS\]|\[SCENE|\[STATS|\[DESC|$)/i)
  if (!block) return []
  return block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s*/, '').replace(/^\d+[.、)]\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 4)
}

export function ChatPanel({ character, settings, onRequestImage, onCharacterUpdate, exploreActionsRef }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [summary, setSummary] = useState<string>('')
  const [summarising, setSummarising] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [latestOptions, setLatestOptions] = useState<string[]>([])
  const [lastUserInput, setLastUserInput] = useState<string>('')
  const [showToolMenu, setShowToolMenu] = useState(false)
  const [showTrapGenerator, setShowTrapGenerator] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [statsError, setStatsError] = useState('')
  const restoredRef = useRef(false)
  const summarisingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // client-authoritative overrides for the current turn: the player's escape/dispel
  // outcome is decided on click; these force the STATS parser to honour it so the DM
  // can't silently re-bind her or re-add a dispelled status.
  const escapeOverrideRef = useRef<{ encounter: Encounter | null } | null>(null)
  const dispelResultRef = useRef<{ id: string; removed: boolean; effect: StatusEffect } | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, latestOptions])

  // Restore a previously saved adventure (chat history + summary) on mount
  useEffect(() => {
    const session = getSession()
    if (session && session.messages.length > 0) {
      setMessages(session.messages)
      setSummary(session.summary)
      setStarted(true)
      // rebuild the action buttons from the last DM reply
      const lastAssistant = [...session.messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) setLatestOptions(parseOptions(lastAssistant.content))
    }
    restoredRef.current = true
  }, [])

  // Persist the adventure after each completed turn (skip mid-stream churn)
  useEffect(() => {
    if (!restoredRef.current || !started || loading) return
    if (messages.length === 0) return
    saveSession({ messages, summary })
  }, [messages, summary, started, loading])

  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length
    if (assistantCount === 0 || assistantCount % SUMMARY_THRESHOLD !== 0) return
    // Ref lock: state updates are async, so `summarising` can still read false
    // on a rapid re-render and double-fire. The ref flips synchronously.
    if (summarisingRef.current || loading) return

    const toSummarise = messages.slice(0, messages.length - RECENT_KEEP)
    const removeCount = toSummarise.length
    if (removeCount === 0) return

    summarisingRef.current = true
    setSummarising(true)
    fetchSummary(toSummarise, settings.chatModel, settings.chatApiKey || '', settings.grokApiKey || '')
      .then((newSummary) => {
        if (newSummary) {
          setSummary((prev) => (prev ? `${prev}\n\n${newSummary}` : newSummary))
          // Drop exactly the messages we summarised (by count), preserving any
          // new messages the user sent while the summary was in flight.
          setMessages((prev) => prev.slice(removeCount))
        }
      })
      .catch((e) => console.error('summarisation failed:', e))
      .finally(() => {
        summarisingRef.current = false
        setSummarising(false)
      })
  }, [messages, loading, settings.chatModel, settings.chatApiKey, settings.grokApiKey])

  const sendMessage = useCallback(async (userText: string, isStart = false) => {
    if (loading) return

    // Cancel any previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLatestOptions([])
    setStatsError('')
    if (!isStart) setLastUserInput(userText)

    const userMsg: ChatMessage = {
      role: 'user',
      content: isStart ? '（冒险开始）' : userText,
      timestamp: Date.now(),
    }

    const newMessages = isStart ? [userMsg] : [...messages, userMsg]
    if (!isStart) setMessages(newMessages)
    setInput('')
    setLoading(true)

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt(character, summary || undefined, settings.proseStyle) },
      ...newMessages.map((m) => ({
        role: m.role,
        content:
          m.role === 'user' && m.content === '（冒险开始）'
            ? `${character.name} 踏入了地下城的入口。请开始描述冒险的起始场景，给出背景介绍和初始选项。`
            : m.content,
      })),
    ]

    try {
      const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
      const allMsgs = [...newMessages, assistantMsg]
      setMessages(allMsgs)

      let fullText = ''
      await chatStream(
        {
          messages: apiMessages,
          model: settings.chatModel,
          apiKey: settings.chatApiKey,
          grokApiKey: settings.grokApiKey,
          signal: controller.signal,
        },
        (delta) => {
          fullText += delta
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText }
            return updated
          })
        },
      )

      // Parse [STATS] (lightweight numeric core)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats = extractMarkerJson(fullText, 'STATS') as any
      if (stats) {
        try {
          const updates: Partial<Character> = {}
          if (typeof stats.hp === 'number') updates.hp = Math.max(0, Math.min(character.maxHp, stats.hp))
          if (typeof stats.pleasure === 'number') updates.pleasure = Math.max(0, Math.min(100, stats.pleasure))
          if (typeof stats.desire === 'number') updates.desire = Math.max(0, Math.min(100, stats.desire))
          if (typeof stats.floor === 'number' && stats.floor >= 1) updates.floor = Math.floor(stats.floor)
          // encounter: object = locked into a trap/monster; null = freed. Only touch
          // the field when the key is present, so a malformed turn keeps the last value.
          if (escapeOverrideRef.current) {
            // player-driven escape this turn — force the client outcome, ignore the DM's
            // encounter field so it can't silently re-bind her (exploration already granted)
            updates.encounter = escapeOverrideRef.current.encounter
            escapeOverrideRef.current = null
          } else if ('encounter' in stats) {
            const e = stats.encounter
            if (e && typeof e === 'object' && typeof e.name === 'string' && e.name.length > 0) {
              updates.encounter = {
                id: typeof e.id === 'string' && e.id ? e.id : e.name.replace(/\s+/g, '_').toLowerCase(),
                name: e.name,
                kind: e.kind === 'monster' ? 'monster' : 'trap',
                summary: typeof e.summary === 'string' ? e.summary : '',
                restraint: typeof e.restraint === 'number' ? Math.max(0, Math.min(3, Math.floor(e.restraint))) : 0,
              }
            } else {
              updates.encounter = null
              // encounter just resolved (escaped or played-to-broken) → advance floor exploration
              if (character.encounter) {
                updates.explorationProgress = Math.min(100, (character.explorationProgress ?? 0) + ENCOUNTER_CLEAR_GAIN)
              }
            }
          }
          // Update measurements if AI changes them (e.g. body transformation)
          if (stats.measurements && typeof stats.measurements === 'object') {
            const prev = character.measurements ?? { bust: '', waist: '', hip: '' }
            const m = { ...prev }
            if (stats.measurements.bust != null) m.bust = String(stats.measurements.bust).replace(/[^0-9.]/g, '')
            if (stats.measurements.waist != null) m.waist = String(stats.measurements.waist).replace(/[^0-9.]/g, '')
            if (stats.measurements.hip != null) m.hip = String(stats.measurements.hip).replace(/[^0-9.]/g, '')
            updates.measurements = m
          }
          if (stats.bodyDevelopment && typeof stats.bodyDevelopment === 'object') {
            const prev = character.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 }
            const bd: BodyDevelopment = { ...prev }
            ;(['breast', 'clitoris', 'urethra', 'vagina', 'anus'] as const).forEach((key) => {
              if (typeof stats.bodyDevelopment[key] === 'number') {
                bd[key] = Math.max(0, Math.min(5, stats.bodyDevelopment[key]))
              }
            })
            // Merge exp values
            if (stats.bodyDevelopment.exp && typeof stats.bodyDevelopment.exp === 'object') {
              const prevExp = prev.exp ?? {}
              const newExp = { ...prevExp }
              ;(['breast', 'clitoris', 'urethra', 'vagina', 'anus'] as const).forEach((key) => {
                if (typeof stats.bodyDevelopment.exp[key] === 'number') {
                  newExp[key] = Math.max(0, Math.min(100, stats.bodyDevelopment.exp[key]))
                }
              })
              bd.exp = newExp
            }
            // Legacy fallback: descriptions still nested inside STATS
            if (stats.bodyDevelopment.descriptions && typeof stats.bodyDevelopment.descriptions === 'object') {
              bd.descriptions = { ...(prev.descriptions ?? {}), ...stats.bodyDevelopment.descriptions }
            }
            updates.bodyDevelopment = bd
          }
          if (Array.isArray(stats.statusEffects)) {
            // Accept entries with at least a title; auto-generate id if missing
            updates.statusEffects = (stats.statusEffects as StatusEffect[])
              .filter((s) => s && typeof s.title === 'string' && s.title.length > 0)
              .map((s) => ({
                id: s.id && typeof s.id === 'string' ? s.id : s.title.replace(/\s+/g, '_').toLowerCase(),
                title: s.title,
                description: s.description ?? '',
              }))
          }
          // player-driven dispel this turn — force the rolled outcome regardless of the DM:
          // on success drop the status even if re-listed; on failure keep it even if dropped
          if (dispelResultRef.current) {
            const { id, removed, effect } = dispelResultRef.current
            let base = updates.statusEffects ?? character.statusEffects ?? []
            if (removed) {
              base = base.filter((e) => e.id !== id)
            } else if (!base.some((e) => e.id === id)) {
              base = [...base, effect]
            }
            updates.statusEffects = base
            dispelResultRef.current = null
          }

          // Parse [DESC] (separate marker — long body descriptions, parsed independently
          // so a truncated DESC never breaks the core STATS update)
          const desc = extractMarkerJson(fullText, 'DESC')
          if (desc) {
            const prevBd = (updates.bodyDevelopment ?? character.bodyDevelopment) ?? {
              breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0,
            }
            const cleaned: Partial<Record<BodyPart, string>> = {}
            ;(['breast', 'clitoris', 'urethra', 'vagina', 'anus'] as const).forEach((key) => {
              if (typeof desc[key] === 'string' && (desc[key] as string).length > 0) {
                cleaned[key] = desc[key] as string
              }
            })
            updates.bodyDevelopment = {
              ...prevBd,
              descriptions: { ...(prevBd.descriptions ?? {}), ...cleaned },
            }
          }

          // any floor increase begins a fresh floor → reset exploration progress
          if (typeof updates.floor === 'number' && updates.floor > (character.floor ?? 1)) {
            updates.explorationProgress = 0
          }

          if (Object.keys(updates).length > 0) onCharacterUpdate(updates)
        } catch (err) {
          console.warn('STATS JSON parse failed:', err, stats)
          setStatsError('本回合角色数值更新失败（AI 输出的状态格式有误）')
        }
      } else if (/\[STATS/i.test(fullText)) {
        // marker present but couldn't extract a usable object
        console.warn('STATS block present but unparseable')
        setStatsError('本回合角色数值更新失败（AI 输出的状态格式有误）')
      }

      // Parse options
      const options = parseOptions(fullText)
      setLatestOptions(options)

      // Parse [SCENE] → danbooru tags (tolerate full-width colon/comma/space)
      const sceneMatch = fullText.match(/\[SCENE\s*[:：]\s*([^\]]+)\]/i)
      if (sceneMatch) {
        const tags = sceneMatch[1].replace(/，/g, ',').replace(/　/g, ' ')
        onRequestImage(withQualityPrefix(tags))
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // User stopped generation — do nothing
        return
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `出错了：${String(e)}`, timestamp: Date.now() },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, character, summary, settings, onRequestImage, onCharacterUpdate])

  useEffect(() => {
    if (!showToolMenu) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-tool-menu]')) setShowToolMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showToolMenu])

  const startAdventure = async () => {
    setStarted(true)
    await sendMessage('开始冒险', true)
  }

  // Escape button — client-authoritative progressive escape. Each attempt whittles the
  // encounter's restraint down one level; at 0 she breaks free. The outcome is decided
  // here and forced into the STATS parse via escapeOverrideRef, so high pleasure/desire
  // can no longer wall the escape at 0% (it only makes the DM's narration more perilous).
  const attemptEscape = () => {
    if (loading || !character.encounter) return
    const enc = character.encounter
    const newRestraint = enc.restraint - 1
    if (newRestraint < 0) {
      // fully break free this attempt
      escapeOverrideRef.current = { encounter: null }
      onCharacterUpdate({
        encounter: null,
        explorationProgress: Math.min(100, (character.explorationProgress ?? 0) + ENCOUNTER_CLEAR_GAIN),
      })
      sendMessage(`${character.name}拼尽最后的力气，终于挣脱了${enc.name}的束缚、成功脱困！（请详细叙述她挣脱成功、逃离这个遭遇的过程；本回合她已彻底脱离，STATS 的 encounter 必须为 null）`)
    } else {
      // weaken the bindings by one level, still trapped
      const weakened: Encounter = { ...enc, restraint: newRestraint }
      escapeOverrideRef.current = { encounter: weakened }
      onCharacterUpdate({ encounter: weakened })
      sendMessage(`${character.name}奋力挣扎，好不容易将${enc.name}的束缚削弱了一分（束缚强度降到 Lv${newRestraint}），却仍未能完全脱身。（请据此叙述她艰难削弱束缚、但尚未逃脱的过程，以及随之而来的强烈色情反噬；STATS 的 encounter 沿用原 id「${enc.id}」，restraint 设为 ${newRestraint}）`)
    }
  }

  // Surrender button — let the encounter ruin and discard her, then it ends.
  const acceptBroken = () => {
    if (loading || !character.encounter) return
    sendMessage(`${character.name}彻底放弃抵抗，张开身体迎接${character.encounter.name}的肆意蹂躏，任由自己被玩弄、榨干到精神彻底崩坏，直到对方玩腻后，将这具失神瘫软、淫液淋漓的躯体随意丢弃在一旁。（请详细描写她被玩坏丢弃的过程，并在结束后让她脱离当前遭遇）`)
  }

  // Explore the current floor: a real DM turn narrating exploration (+ possible new
  // encounter), while advancing this floor's exploration progress toward 100%.
  const explore = () => {
    if (loading || character.encounter) return
    const cur = character.explorationProgress ?? 0
    if (cur >= 100) return
    onCharacterUpdate({ explorationProgress: Math.min(100, cur + EXPLORE_GAIN) })
    const theme = getFloorTheme(character.floorThemes, character.floor ?? 1)
    sendMessage(`${character.name}打起精神，继续深入探索本层「${theme.name}」……（请描写她在这片区域中探索前行的所见所感，视情况让她遭遇本层主题相关的全新陷阱或怪物，或发现可搜刮之物）`)
  }

  // Descend to the next floor — only enabled once exploration hits 100% and no active
  // encounter. Floor progression is client-authoritative; the DM just narrates arrival.
  const advanceFloor = () => {
    if (loading || character.encounter) return
    const curFloor = character.floor ?? 1
    if ((character.explorationProgress ?? 0) < 100 || curFloor >= TARGET_FLOOR) return
    const next = curFloor + 1
    const theme = getFloorTheme(character.floorThemes, next)
    onCharacterUpdate({ floor: next, explorationProgress: 0, encounter: null })
    sendMessage(`${character.name}走下通往深处的阶梯，踏入地下城第 ${next} / ${TARGET_FLOOR} 层「${theme.name}」。（请先用一段叙述描写这层崭新的风貌与氛围：${theme.ambience}；再让她在其中开始新的探索）`)
  }

  // expose explore/advance to the sibling CharacterCard (buttons live next to the progress bar)
  useEffect(() => {
    if (exploreActionsRef) exploreActionsRef.current = { explore, advanceFloor }
  })

  // Dispel a status effect — client rolls the success chance (see dispelChance), then the
  // outcome is forced into the STATS parse via dispelResultRef so the DM can neither ignore
  // a success nor drop a failed status. The DM only narrates the result.
  const attemptDispel = (effect: StatusEffect) => {
    if (loading) return
    const chance = dispelChance(character)
    const success = Math.random() * 100 < chance
    if (success) {
      const remaining = (character.statusEffects ?? []).filter((e) => e.id !== effect.id)
      dispelResultRef.current = { id: effect.id, removed: true, effect }
      onCharacterUpdate({ statusEffects: remaining })
      sendMessage(`${character.name}咬紧牙关凝聚意志，成功驱散了身上的「${effect.title}」状态（${effect.description}）。（成功！请叙述她奋力摆脱该状态的过程；本回合该状态已被驱散，STATS 的 statusEffects 中不要再包含「${effect.title}」）`)
    } else {
      dispelResultRef.current = { id: effect.id, removed: false, effect }
      sendMessage(`${character.name}试图凝聚意志驱散身上的「${effect.title}」状态（${effect.description}），却在快感与欲望的冲刷下功亏一篑。（失败！请叙述她努力摆脱却被该状态反噬、意志溃散的过程，状态非但未解除反而更缠人；STATS 的 statusEffects 中必须继续保留「${effect.title}」）`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) sendMessage(input.trim())
    }
  }

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-3">
          <p className="gold-text text-xl font-bold tracking-wider">冒险者，准备好了吗？</p>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            前方是充满极致情欲的地下城。<br />你的每一次选择都会带来最淫荡的遭遇。
          </p>
        </div>
        <button
          onClick={startAdventure}
          className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold tracking-widest glow-btn text-sm"
        >
          开始探险
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Trap Generator Modal */}
      {showTrapGenerator && (
        <TrapGenerator
          character={character}
          settings={settings}
          onConfirm={(text) => {
            setShowTrapGenerator(false)
            setInput(text)
            textareaRef.current?.focus()
          }}
          onClose={() => setShowTrapGenerator(false)}
        />
      )}
      {/* Status Effect Picker Modal */}
      {showStatusPicker && (
        <StatusPicker
          character={character}
          onApply={(effects) => {
            onCharacterUpdate({ statusEffects: effects })
            setShowStatusPicker(false)
          }}
          onClose={() => setShowStatusPicker(false)}
        />
      )}
      {/* Current encounter banner (locked into a trap/monster) */}
      {character.encounter && (
        <div className="px-4 py-2.5 border-b border-rose-500/40 bg-gradient-to-r from-rose-950/60 to-purple-950/40">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest text-rose-400/70">
                  {character.encounter.kind === 'monster' ? '遭遇怪物' : '陷入陷阱'}
                </span>
                <span className="text-sm font-bold text-rose-200">{character.encounter.name}</span>
                <span className="text-[10px] text-rose-300/80 bg-rose-500/15 px-1.5 py-0.5 rounded-full">
                  束缚 Lv{character.encounter.restraint}
                </span>
              </div>
              {character.encounter.summary && (
                <p className="text-[11px] text-rose-100/70 leading-snug mt-0.5 truncate">
                  {character.encounter.summary}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={attemptEscape}
                disabled={loading}
                title="全力挣脱当前束缚"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-400/50 bg-rose-500/15 text-rose-200 text-xs font-bold hover:bg-rose-500/25 hover:border-rose-300 transition-all disabled:opacity-40"
              >
                <Unlock className="w-3.5 h-3.5" />
                奋力挣脱
              </button>
              <button
                onClick={acceptBroken}
                disabled={loading}
                title="放弃抵抗，被玩坏后丢弃"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-400/40 bg-purple-500/15 text-purple-200 text-xs font-bold hover:bg-purple-500/25 hover:border-purple-300 transition-all disabled:opacity-40"
              >
                <HeartCrack className="w-3.5 h-3.5" />
                被玩坏丢掉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active status effects — click a chip to attempt dispelling it in-fiction */}
      {character.statusEffects && character.statusEffects.length > 0 && (
        <div className="px-4 py-2 border-b border-yellow-500/20 bg-yellow-500/5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-yellow-400/60 mr-0.5">异常状态 · 点击尝试解除（成功率 {dispelChance(character)}%）</span>
          {character.statusEffects.map((e) => (
            <button
              key={e.id}
              onClick={() => attemptDispel(e)}
              disabled={loading}
              title={`尝试解除：${e.description || e.title}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-[11px] hover:bg-yellow-500/20 hover:border-yellow-400/50 disabled:opacity-40 transition-all"
            >
              {e.title}
              <Unlock className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Summary indicator */}
      {(summary || summarising) && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30">
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
          {summarising ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              正在归纳故事摘要…
            </span>
          ) : (
            <span className="truncate">故事摘要已生成（{messages.length} 条近期对话保留中）</span>
          )}
        </div>
      )}

      {/* Stats parse warning */}
      {statsError && (
        <div className="px-4 py-2 border-b border-yellow-500/30 flex items-center justify-between gap-2 text-xs text-yellow-400 bg-yellow-500/10">
          <span className="flex items-center gap-1.5">
            <Square className="w-3 h-3 flex-shrink-0" />
            {statsError}
          </span>
          <button
            onClick={() => setStatsError('')}
            className="text-yellow-400/70 hover:text-yellow-300 px-1"
            title="忽略"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg p-3 text-sm leading-relaxed',
              msg.role === 'user' ? 'message-user ml-8' : 'message-ai mr-4'
            )}
          >
            {msg.role === 'user' ? (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {character.avatarUrl ? (
                    <img src={character.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs text-primary">{character.name[0]}</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">{character.name}</span>
                  <p className="text-foreground">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-xs gold-text mb-1 block tracking-wider">地下城主</span>
                <p className="text-foreground whitespace-pre-wrap">{cleanContent(msg.content)}</p>
                {loading && i === messages.length - 1 && msg.content === '' && (
                  <div className="flex gap-1 mt-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action options */}
      {latestOptions.length > 0 && !loading && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-2">
          {latestOptions.map((opt, i) => {
            const colors = [
              'border-blue-500/40 text-blue-300 hover:bg-blue-500/10',
              'border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10',
              'border-pink-500/40 text-pink-300 hover:bg-pink-500/10',
              'border-red-500/40 text-red-300 hover:bg-red-500/10',
            ]
            const labels = ['抵抗·减轻', '抵抗·坚守', '享受·顺从', '堕落·求欢']
            return (
              <button
                key={i}
                onClick={() => {
                  setInput(`${i + 1}. ${opt}`)
                  textareaRef.current?.focus()
                }}
                className={cn(
                  'text-left px-3 py-2 rounded-lg border text-xs leading-snug transition-colors',
                  colors[i] ?? 'border-border text-muted-foreground hover:bg-secondary'
                )}
              >
                <span className="block text-[10px] opacity-60 mb-0.5 tracking-wider">{labels[i]}</span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2 items-end">
          {/* Tool button */}
          <div className="relative flex-shrink-0" data-tool-menu>
            <button
              onClick={() => setShowToolMenu((v) => !v)}
              title="工具"
              disabled={loading || summarising}
              className={cn(
                'p-2.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 transition-all',
                showToolMenu && 'border-primary/60 text-primary bg-primary/10'
              )}
            >
              <Wrench className="w-4 h-4" />
            </button>
            {showToolMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-44 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={() => {
                    setShowToolMenu(false)
                    setShowTrapGenerator(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>随机陷阱生成器</span>
                </button>
                <button
                  onClick={() => {
                    setShowToolMenu(false)
                    setShowStatusPicker(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors border-t border-border"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>异常状态管理</span>
                </button>
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的行动或选择..."
            rows={2}
            disabled={loading || summarising}
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
          />
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {loading ? (
              <button
                onClick={() => abortRef.current?.abort()}
                title="停止生成"
                className="p-2.5 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition-all"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => input.trim() && sendMessage(input.trim())}
                disabled={summarising || !input.trim()}
                className="p-2.5 rounded-lg bg-primary text-primary-foreground glow-btn disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            {!loading && lastUserInput && (
              <button
                onClick={() => sendMessage(lastUserInput)}
                disabled={summarising}
                title="重试上一条"
                className="p-2.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 px-1">按 Enter 发送，Shift+Enter 换行</p>
      </div>
    </div>
  )
}
