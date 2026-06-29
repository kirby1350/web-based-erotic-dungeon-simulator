'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, BookOpen, Square, RotateCcw, Wrench, Zap, Sparkles, ShieldAlert, Unlock } from 'lucide-react'
import { Character, ChatMessage, AppSettings, BodyDevelopment, BodyPart, StatusEffect } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getSession, saveSession } from '@/lib/storage'
import { streamChatDeltas } from '@/lib/sse'
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

interface ChatPanelProps {
  character: Character
  settings: AppSettings
  onRequestImage: (scene: string) => void
  onCharacterUpdate: (updates: Partial<Character>) => void
}

async function fetchSummary(messages: ChatMessage[], model: string, apiKey: string, grokApiKey: string): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? '玩家' : '地下城主'}：${m.content}`)
    .join('\n')

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: buildSummaryUserPrompt(conversation) },
      ],
      model,
      apiKey,
      grokApiKey,
    }),
  })

  if (!res.ok) {
    console.error('fetchSummary failed:', res.status)
    return ''
  }
  let text = ''
  await streamChatDeltas(res, (delta) => { text += delta })
  return text.trim()
}

// Extract and merge all sibling JSON objects inside [MARKER:...obj1, obj2...]
// Handles the case where AI splits content into two objects. `marker` is e.g. 'STATS' or 'DESC'.
function extractMarkerJson(text: string, marker: string): Record<string, unknown> | null {
  const tag = `[${marker}:`
  const start = text.indexOf(tag)
  if (start === -1) return null

  // Collect all top-level { } objects between [MARKER: and the matching ]
  const objects: Record<string, unknown>[] = []
  let i = start + tag.length

  while (i < text.length) {
    // Skip whitespace and commas between objects
    if (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === ',') { i++; continue }
    // Stop at closing ]
    if (text[i] === ']') break
    // Start of an object
    if (text[i] === '{') {
      let depth = 0
      const objStart = i
      while (i < text.length) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') {
          depth--
          if (depth === 0) {
            const objStr = text.slice(objStart, i + 1)
            try { objects.push(JSON.parse(objStr)) } catch { /* skip malformed */ }
            i++
            break
          }
        }
        i++
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
function stripMarkerBlock(text: string, marker: string): string {
  const tag = `[${marker}:`
  const start = text.indexOf(tag)
  if (start === -1) return text
  const braceStart = text.indexOf('{', start)
  if (braceStart === -1) {
    // marker without a brace — drop to the next ] (or to end if missing)
    const closeTag = text.indexOf(']', start)
    return closeTag !== -1 ? text.slice(0, start) + text.slice(closeTag + 1) : text.slice(0, start)
  }
  let depth = 0
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) {
        const closeTag = text.indexOf(']', i)
        const end = closeTag !== -1 ? closeTag + 1 : i + 1
        return text.slice(0, start) + text.slice(end)
      }
    }
  }
  // Unbalanced (truncated) — drop everything from the marker on
  return text.slice(0, start)
}

function cleanContent(content: string): string {
  let out = content.replace(/\[OPTIONS\][\s\S]*?\[\/OPTIONS\]/gi, '')
  out = out.replace(/\[SCENE:[^\]]*\]/gi, '')
  out = stripMarkerBlock(out, 'STATS')
  out = stripMarkerBlock(out, 'DESC')
  return out.trim()
}

function parseOptions(content: string): string[] {
  const block = content.match(/\[OPTIONS\]([\s\S]*?)\[\/OPTIONS\]/i)
  if (!block) return []
  const lines = block[1].split('\n').map((l) => l.trim()).filter(Boolean)
  return lines
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 4)
}

export function ChatPanel({ character, settings, onRequestImage, onCharacterUpdate }: ChatPanelProps) {
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
      { role: 'system', content: buildSystemPrompt(character, summary || undefined) },
      ...newMessages.map((m) => ({
        role: m.role,
        content:
          m.role === 'user' && m.content === '（冒险开始）'
            ? `${character.name} 踏入了地下城的入口。请开始描述冒险的起始场景，给出背景介绍和初始选项。`
            : m.content,
      })),
    ]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: settings.chatModel,
          apiKey: settings.chatApiKey,
          grokApiKey: settings.grokApiKey,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '请求失败')
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
      const allMsgs = [...newMessages, assistantMsg]
      setMessages(allMsgs)

      let fullText = ''
      await streamChatDeltas(res, (delta) => {
        fullText += delta
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText }
          return updated
        })
      })

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
          if ('encounter' in stats) {
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

          if (Object.keys(updates).length > 0) onCharacterUpdate(updates)
        } catch (err) {
          console.error('STATS JSON parse failed:', err, stats)
          setStatsError('本回合角色数值更新失败（AI 输出的状态格式有误）')
        }
      } else if (/\[STATS/i.test(fullText)) {
        // marker present but couldn't extract a usable object
        console.error('STATS block present but unparseable')
        setStatsError('本回合角色数值更新失败（AI 输出的状态格式有误）')
      }

      // Parse options
      const options = parseOptions(fullText)
      setLatestOptions(options)

      // Parse [SCENE] → 纯 danbooru tags
      const sceneMatch = fullText.match(/\[SCENE:\s*([^\]]+)\]/i)
      if (sceneMatch) {
        onRequestImage(withQualityPrefix(sceneMatch[1]))
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

  // Escape button on the encounter banner — sends the escape keywords immediately
  // (matches the prompt's 陷阱锁定规则 trigger words: 逃脱/挣脱/突破束缚/逃离).
  const attemptEscape = () => {
    if (loading || !character.encounter) return
    sendMessage(`${character.name}拼尽全力挣扎，奋力挣脱束缚、突破当前的${character.encounter.name}，逃脱、逃离这个遭遇！`)
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
            <button
              onClick={attemptEscape}
              disabled={loading}
              title="全力挣脱当前束缚"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-400/50 bg-rose-500/15 text-rose-200 text-xs font-bold hover:bg-rose-500/25 hover:border-rose-300 transition-all disabled:opacity-40 flex-shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" />
              奋力挣脱
            </button>
          </div>
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
                  <span>施加异常状态</span>
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
