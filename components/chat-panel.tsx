'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, BookOpen } from 'lucide-react'
import { Character, ChatMessage, AppSettings, BodyDevelopment, StatusEffect } from '@/lib/types'
import { cn } from '@/lib/utils'

const SUMMARY_THRESHOLD = 10
const RECENT_KEEP = 4

interface ChatPanelProps {
  character: Character
  settings: AppSettings
  onRequestImage: (scene: string) => void
  onCharacterUpdate: (updates: Partial<Character>) => void
}

function buildSystemPrompt(character: Character, summary?: string): string {
  const raceMap: Record<string, string> = {
    human: '人族',
    elf: '精灵族',
    tauren: '牛人族',
  }
  const measurements = character.measurements ?? {}
  const measurementLine =
    measurements.bust || measurements.waist || measurements.hip
      ? `- 三围：胸围 ${measurements.bust || '?'} cm / 腰围 ${measurements.waist || '?'} cm / 臀围 ${measurements.hip || '?'} cm`
      : ''

  const bd = character.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 }
  const se = character.statusEffects ?? []
  const bodyDevLine = `- 身体开发度：胸部 Lv${bd.breast} / 阴蒂 Lv${bd.clitoris} / 尿道 Lv${bd.urethra} / 阴道 Lv${bd.vagina} / 肛门 Lv${bd.anus}`
  const statusLine = se.length > 0 ? `- 异常状态：${se.map((s) => s.title).join('、')}` : '- 异常状态：无'
  const summarySection = summary ? `\n【故事摘要（之前发生的事情）】\n${summary}\n` : ''

  return `你是一个极致沉浸的奇幻地下城DM（Dungeon Master）。

【玩家角色信息】
- 名字：${character.name}
- 种族：${raceMap[character.race]}
- 力量：${character.stats.strength} / 敏捷：${character.stats.agility} / 智力：${character.stats.intelligence}
- 等级：${character.level} | 生命值：${character.hp}/${character.maxHp}
- 快感度：${character.pleasure}/100 | 欲望值：${character.desire}/100
${measurementLine}
${bodyDevLine}
${statusLine}
${character.backstory ? `- 背景故事：${character.backstory}` : ''}
${summarySection}
【叙事规则】
1. 叙述时始终使用角色名「${character.name}」，不使用"你"或"您"。例如："${character.name}感到一阵颤抖..."
2. 语言生动沉浸，富有奇幻色彩，深度描写感官细节。
3. 战斗或特殊事件时根据属性、快感度、欲望值综合判定结果，增加随机性与紧张感。
4. 【陷阱规则】当${character.name}陷入陷阱（被束缚、被控制、被怪物捕获等）后，除非玩家明确选择"逃脱"相关的行动，否则${character.name}不会自动逃离陷阱，剧情将持续在陷阱中发展。
5. 遭遇重要场景时，在正文叙述结束后，输出：[SCENE: 英文场景描述]
6. 严格根据故事摘要保持剧情连贯，不得遗忘已发生事件。

【选项格式规则（必须严格执行）】
每次回复，在叙述正文之后、[SCENE] 和 [STATS] 之前，必须输出恰好4个行动选项，格式如下：
[OPTIONS]
1. （行动偏向抵抗，尝试挣脱当前陷阱或困境）
2. （行动偏向抵抗，但不逃离陷阱，在陷阱中强撑/反抗）
3. （行动偏向享受，顺从地感受当前刺激）
4. （行动偏向堕落，主动沉沦于陷阱，寻求更多刺激）
[/OPTIONS]
每个选项必须是针对当前剧情的具体行动描述，不能过于笼统。

【状态更新规则（必须严格执行）】
在回复的最末尾，单独一行输出以下 JSON 块（即使没有变化也必须输出）：
[STATS:{"hp":数字,"pleasure":数字,"desire":数字,"bodyDevelopment":{"breast":0-5,"clitoris":0-5,"urethra":0-5,"vagina":0-5,"anus":0-5},"statusEffects":[{"id":"唯一id","title":"状态名","description":"一句话描述"}]}]

状态规则：
- hp / pleasure / desire 为整数（0-100，hp 上限 ${character.maxHp}）
- bodyDevelopment 各部位 0-5 整数，发生对应刺激时升级
- statusEffects：新增状态则添加，消除则移除，无异常则为 []
- 此 JSON 块必须在所有文字内容的最末尾，格式严格正确，不得有额外文字`
}

async function fetchSummary(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? '玩家' : '地下城主'}：${m.content}`)
    .join('\n')

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: '你是故事摘要助手。将地下城冒险对话提炼为300字内的第三人称摘要，记录关键事件、场景、战斗结果、重要选择。直接输出摘要，不加标题。',
        },
        { role: 'user', content: `请总结以下冒险对话：\n\n${conversation}` },
      ],
      model,
      apiKey,
    }),
  })

  if (!res.ok) return ''
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        const d = line.slice(6).trim()
        if (d === '[DONE]') continue
        try { text += JSON.parse(d).choices?.[0]?.delta?.content || '' } catch { /* ignore */ }
      }
    }
  }
  return text.trim()
}

// Extract the JSON object from [STATS:{...}] by counting balanced braces
function extractStatsJson(text: string): string | null {
  const marker = text.indexOf('[STATS:')
  if (marker === -1) return null
  const start = text.indexOf('{', marker)
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

// Strip [STATS:...] and [SCENE:...] and [OPTIONS]...[/OPTIONS] from display text
function cleanContent(content: string): string {
  // Remove [OPTIONS]...[/OPTIONS]
  let out = content.replace(/\[OPTIONS\][\s\S]*?\[\/OPTIONS\]/gi, '')
  // Remove [SCENE:...]
  out = out.replace(/\[SCENE:[^\]]*\]/gi, '')
  // Remove [STATS:{...}] by finding balanced braces
  const marker = out.indexOf('[STATS:')
  if (marker !== -1) {
    const braceStart = out.indexOf('{', marker)
    if (braceStart !== -1) {
      let depth = 0
      for (let i = braceStart; i < out.length; i++) {
        if (out[i] === '{') depth++
        else if (out[i] === '}') {
          depth--
          if (depth === 0) {
            // Remove from [STATS: to the closing ] after the }
            const closeTag = out.indexOf(']', i)
            const end = closeTag !== -1 ? closeTag + 1 : i + 1
            out = out.slice(0, marker) + out.slice(end)
            break
          }
        }
      }
    }
  }
  return out.trim()
}

// Parse options from [OPTIONS]...[/OPTIONS] block
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, latestOptions])

  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length
    if (assistantCount > 0 && assistantCount % SUMMARY_THRESHOLD === 0 && !summarising && !loading) {
      const toSummarise = messages.slice(0, messages.length - RECENT_KEEP)
      if (toSummarise.length === 0) return
      setSummarising(true)
      fetchSummary(toSummarise, settings.chatModel, settings.chatApiKey || '')
        .then((newSummary) => {
          if (newSummary) {
            setSummary((prev) => (prev ? `${prev}\n\n${newSummary}` : newSummary))
            setMessages((prev) => prev.slice(-RECENT_KEEP))
          }
        })
        .finally(() => setSummarising(false))
    }
  }, [messages, summarising, loading, settings.chatModel, settings.chatApiKey])

  const sendMessage = useCallback(async (userText: string, isStart = false) => {
    if (loading) return

    setLatestOptions([])

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
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '请求失败')
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
      const allMsgs = [...newMessages, assistantMsg]
      setMessages(allMsgs)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content || ''
              fullText += delta
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText }
                return updated
              })
            } catch { /* ignore */ }
          }
        }
      }

      // Parse [STATS:...] and update character using balanced-brace extraction
      const statsJson = extractStatsJson(fullText)
      if (statsJson) {
        try {
          const stats = JSON.parse(statsJson)
          const updates: Partial<Character> = {}
          if (typeof stats.hp === 'number') updates.hp = Math.max(0, Math.min(character.maxHp, stats.hp))
          if (typeof stats.pleasure === 'number') updates.pleasure = Math.max(0, Math.min(100, stats.pleasure))
          if (typeof stats.desire === 'number') updates.desire = Math.max(0, Math.min(100, stats.desire))
          if (stats.bodyDevelopment && typeof stats.bodyDevelopment === 'object') {
            const prev = character.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 }
            const bd: BodyDevelopment = { ...prev }
            for (const key of ['breast', 'clitoris', 'urethra', 'vagina', 'anus'] as const) {
              if (typeof stats.bodyDevelopment[key] === 'number') {
                bd[key] = Math.max(0, Math.min(5, stats.bodyDevelopment[key]))
              }
            }
            updates.bodyDevelopment = bd
          }
          if (Array.isArray(stats.statusEffects)) {
            updates.statusEffects = (stats.statusEffects as StatusEffect[]).filter(
              (s) => s && typeof s.id === 'string' && typeof s.title === 'string'
            )
          }
          if (Object.keys(updates).length > 0) onCharacterUpdate(updates)
        } catch { /* invalid JSON */ }
      }

      // Parse options
      const options = parseOptions(fullText)
      setLatestOptions(options)

      // Parse [SCENE:...] and trigger image
      const sceneMatch = fullText.match(/\[SCENE:\s*([^\]]+)\]/i)
      if (sceneMatch) {
        let scenePrompt = sceneMatch[1].trim()
        if (!scenePrompt.toLowerCase().includes('masterpiece')) {
          scenePrompt = `${scenePrompt}, masterpiece, best quality, highly detailed, dark fantasy lighting`
        }
        onRequestImage(scenePrompt)
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `出错了：${String(e)}`, timestamp: Date.now() },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, character, summary, settings, onRequestImage, onCharacterUpdate])

  const startAdventure = async () => {
    setStarted(true)
    await sendMessage('开始冒险', true)
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
            前方是未知的地下城，充满了宝藏、危险与传说。<br />你的每一次选择都将影响命运。
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
            const labels = ['抵抗·逃脱', '抵抗·坚守', '享受', '堕落']
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
          <button
            onClick={() => input.trim() && sendMessage(input.trim())}
            disabled={loading || summarising || !input.trim()}
            className="p-2.5 rounded-lg bg-primary text-primary-foreground glow-btn disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 px-1">按 Enter 发送，Shift+Enter 换行</p>
      </div>
    </div>
  )
}
