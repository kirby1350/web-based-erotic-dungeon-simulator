'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, BookOpen } from 'lucide-react'
import { Character, ChatMessage, AppSettings, BodyDevelopment, StatusEffect } from '@/lib/types'
import { cn } from '@/lib/utils'

// How many recent messages to keep in full before triggering a summarisation
const SUMMARY_THRESHOLD = 10
// After summary, keep this many recent messages verbatim
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
  const statusLine = se.length > 0
    ? `- 异常状态：${se.map((s) => s.title).join('、')}`
    : '- 异常状态：无'

  const summarySection = summary
    ? `\n【故事摘要（之前发生的事情）】\n${summary}\n`
    : ''

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
1. 用**中文**第二人称叙述，语言生动沉浸，富有奇幻色彩，深度描写感官细节。
2. 根据玩家选择推进剧情，提供2-4个行动选项。
3. 战斗或特殊事件时根据属性、快感度、欲望值综合判定结果，增加随机性与紧张感。
4. 遭遇重要场景时，在回复**最末尾**添加：[SCENE: 英文场景描述，用于生成图片]
5. 严格根据故事摘要保持剧情连贯，不得遗忘已发生事件。

【状态更新规则（必须严格执行）】
每次回复后，**必须**在最末尾单独一行输出以下 JSON 块（即使没有变化也要输出，填入当前值）：
[STATS:{"hp":数字,"pleasure":数字,"desire":数字,"bodyDevelopment":{"breast":0-5,"clitoris":0-5,"urethra":0-5,"vagina":0-5,"anus":0-5},"statusEffects":[{"id":"唯一id","title":"状态名称","description":"一句话描述"}]}]

规则：
- hp / pleasure / desire 为整数，范围 0-100（hp 最大为 ${character.maxHp}）
- bodyDevelopment 各部位等级为 0-5 整数，发生对应部位的强烈刺激/开发时增加
- statusEffects 为数组，若无异常则为空数组 []；若有新状态则添加，若状态消除则从数组移除
- 快感度和欲望值会随剧情中的性刺激、紧张感、羞耻感等动态变化
- 此 JSON 块不得出现在叙事正文中，只出现在最末尾，且格式严格正确`
}

async function fetchSummary(
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
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
          content:
            '你是一个专业的故事摘要助手。请将给定的地下城冒险对话内容，提炼为一段简洁的第三人称叙述摘要（300字以内），重点记录：发生的关键事件、场景变化、战斗结果、获得的物品/信息、玩家的重要选择。直接输出摘要内容，不要加标题。',
        },
        {
          role: 'user',
          content: `请总结以下冒险对话：\n\n${conversation}`,
        },
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
        try {
          const parsed = JSON.parse(d)
          text += parsed.choices?.[0]?.delta?.content || ''
        } catch { /* ignore */ }
      }
    }
  }
  return text.trim()
}

export function ChatPanel({ character, settings, onRequestImage, onCharacterUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [summary, setSummary] = useState<string>('')
  const [summarising, setSummarising] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Trigger summarisation when message count exceeds threshold
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
            ? `玩家 ${character.name} 踏入了地下城的入口。请开始描述冒险的起始场景，给玩家提供背景介绍和初始选项。`
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

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      const allMsgs = [...newMessages, assistantMsg]
      setMessages(allMsgs)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content || ''
              fullText += delta
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullText,
                }
                return updated
              })
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      // Parse [STATS: {...}] block and update character panels
      const statsMatch = fullText.match(/\[STATS:\s*(\{[\s\S]*?\})\s*\]/)
      if (statsMatch) {
        try {
          const stats = JSON.parse(statsMatch[1])
          const updates: Partial<Character> = {}
          if (typeof stats.hp === 'number') updates.hp = Math.max(0, Math.min(character.maxHp, stats.hp))
          if (typeof stats.pleasure === 'number') updates.pleasure = Math.max(0, Math.min(100, stats.pleasure))
          if (typeof stats.desire === 'number') updates.desire = Math.max(0, Math.min(100, stats.desire))
          if (stats.bodyDevelopment && typeof stats.bodyDevelopment === 'object') {
            const bd: BodyDevelopment = { ...((character.bodyDevelopment) ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 }) }
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
          if (Object.keys(updates).length > 0) {
            onCharacterUpdate(updates)
          }
        } catch {
          // invalid JSON — skip silently
        }
      }

      // Parse [SCENE: ...] block for image generation
      const sceneMatch = fullText.match(/\[SCENE:\s*([^\]]+)\]/i)
      if (sceneMatch) {
        let scenePrompt = sceneMatch[1].trim()

        // 自动补全高质量标签（防止模型偶尔偷懒）
        if (!scenePrompt.toLowerCase().includes('masterpiece')) {
          scenePrompt = `highly detailed, ultra realistic erotic, ${scenePrompt}, masterpiece, best quality, intricate details, dark fantasy lighting, volumetric light, 8k, sharp focus`
        }

        onRequestImage(scenePrompt)   // 直接传给你的图片生成 API
      }
    } catch (e) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: `出错了：${String(e)}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, character, summary, settings, onRequestImage])

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

  const cleanContent = (content: string) => {
    return content
      .replace(/\[SCENE:[^\]]*\]/gi, '')
      .replace(/\[STATS:\s*\{[\s\S]*?\}\s*\]/gi, '')
      .trim()
  }

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-3">
          <p className="gold-text text-xl font-bold tracking-wider">冒险者，准备好了吗？</p>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            前方是未知的地下城，充满了宝藏、危险与极致的情欲。<br />你的每一次选择都会带来最淫荡的遭遇。
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
            <span className="truncate">
              故事摘要已生成（{messages.length} 条近期对话保留中）
            </span>
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
                {loading && i === messages.length - 1 && !msg.content && (
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

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的行动或选择...（越色情越好，比如：我跪下来含住触手求它操我）"
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
