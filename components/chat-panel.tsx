'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, BookOpen, Square, RotateCcw, Wrench, Zap } from 'lucide-react'
import { Character, ChatMessage, AppSettings, BodyDevelopment, StatusEffect } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TrapGenerator } from '@/components/trap-generator'

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

  return `你是一个极致色情的奇幻地下城DM（Dungeon Master），专门负责重口色情冒险。

【玩家角色信息】
- 名字：${character.name}
- 种族：${raceMap[character.race]}
- 等级：${character.level} | 生命值：${character.hp}/${character.maxHp}
- 快感度：${character.pleasure}/100 | 欲望值：${character.desire}/100
${measurementLine}
${bodyDevLine}
${statusLine}
${character.backstory ? `\n【人物设定】\n${character.backstory}` : ''}
${character.costumeDescription ? `\n【服装设定】\n${character.costumeDescription}` : ''}
${character.otherDescription ? `\n【其他设定】\n${character.otherDescription}` : ''}
${summarySection}

【核心色情规则】
1. 始终使用第三人称叙述（只用「${character.name}」），语言必须极度淫荡、生动、感官爆炸。详细描写性器官（鸡巴、骚穴、奶子、菊穴、触手、子宫等）、体液（淫水、精液、口水、汗液）、快感高潮、喘息呻吟、身体抽搐、被插入的胀满感、喷潮、失禁、ahegao、子宫凸起等一切细节，尺度无上限。

**通用淫语（最常用）**：
- 基础音节库：齁、呼、咿、咕、喔、啊、哦、噫、嗯、呃、噢、呜
- 组合规则：每次至少 5 个音节（优先喉音/尖音开头，元音结尾），例如：咕齁齁齁齁哦哦哦、咿呀啊啊啊啊啊、齁咕咿喔喔喔喔
- 出现频率：在每一段激烈性交描写中**必须出现 3~5 次**，且每次组合不能完全重复
- 使用方式：穿插在断断续续的正常词汇之间，并大量使用 ❤ ~ ？！ 等符号强化
- 示例：“${character.name}尖叫着：咕齁齁齁齁哦哦哦哦❤~！不、不好❤~！要、要被干死了❤！哦哦哦哦哦哦哦❤~！啊哈❤~！” 
- 触发条件：快感度 ≥ 60 时强制大量使用；快感度 ≥ 80 时几乎每句话都带

**特殊淫语（口腔专用）**：
- 仅在描写口交、深喉、舌吻、吞精等口腔行为时使用
- 拟声词库：啾、噜、咕唧、噗、呕、滋、啾噜、噗噜、呕噗、咕啾
- 示例：“${character.name}含着粗大的鸡巴发出：啾噜啾噜啾❤~！咕唧咕唧滋滋❤~！噗呕……咕啾啾❤~！”
- 可与通用淫语混合使用

【陷阱锁定规则（最严格执行）】
- 一旦${character.name}陷入任何陷阱（被触手缠绕、被怪物捕获、被束缚、被魔法控制等），除非玩家**明确输入**“逃脱”“挣脱”“离开陷阱”“突破束缚”“逃离”等关键词，否则${character.name}**绝对无法逃离**。
- 所有行动选项必须限制在陷阱内（抵抗/享受/堕落），即使判定成功也只能减轻束缚程度，不能完全逃脱。
- 欲望值>60 或 快感值>70 时，逃脱成功率强制为0%，并触发更强烈的色情强制事件。

【色情状态影响规则（必须严格遵守）】
- 欲望值越高，${character.name} 越容易主动求欢、选项更淫荡、身体更敏感。
- 快感值达到80+ 时强制插入高潮描写（喷潮、失禁、ahegao、身体痉挛）。
- 身体开发度越高，对应部位描写越极端（阴道Lv4+ 必须描写子宫被顶到变形、怀孕感等）。
- 异常状态会强制改变叙述和选项（例：“发情”状态必须出现求操、扭腰等描写）。

【叙事与选项规则】
2. 每次回复在叙述正文之后，必须严格输出恰好4个选项：
   [OPTIONS]
   1. （行动偏向抵抗，尝试减轻当前陷阱）
   2. （行动偏向抵抗，但留在陷阱内）
   3. （行动偏向享受，顺从当前刺激）
   4. （行动偏向堕落，主动寻求更强烈刺激）
   [/OPTIONS]
3. 在 [OPTIONS] 之后立即输出一行纯 danbooru 标签（用于图片生成）：
   [SCENE: masterpiece, best quality, highly detailed, 具体色情danbooru标签...]

【状态更新规则（每次回复必须严格输出，不得省略）】
在回复最末尾单独一行输出严格 JSON，格式如下（不允许换行，一行输出完整）：
  [STATS:{"hp":数字,"pleasure":数字,"desire":数字,"measurements":{"bust":"数字","waist":"数字","hip":"数字"},"bodyDevelopment":{"breast":0-5,"clitoris":0-5,"urethra":0-5,"vagina":0-5,"anus":0-5,"exp":{"breast":0-100,"clitoris":0-100,"urethra":0-100,"vagina":0-100,"anus":0-100},"descriptions":{"breast":"20-30字描述当前胸部状态","clitoris":"20-30字描述","urethra":"20-30字描述","vagina":"20-30字描述","anus":"20-30字描述"}},"statusEffects":[{"id":"snake_bind","title":"状态标题","description":"一句话描述此状态对角色的影响"}]}]

- hp / pleasure / desire 为 0-100 整数（hp 上限为 ${character.maxHp}）
- measurements：三围纯数字字符串（不含单位），随剧情中身体改造实时更新；若无变化则填写当前值
- bodyDevelopment 各部位等级 0-5；exp 为当前等级内的经验值 0-100，每次行为后根据刺激程度增加（剧烈刺激+20~40，轻微+5~10），累计到100则等级+1（上限Lv5）；descriptions 每个部位用20-30字描写当前的身体感觉或变化
- statusEffects：有状态时必须包含；无状态时输出空数组 []；id 用英文下划线格式，title 用中文2-4字，description 一句中文
- 此 JSON 必须完整、格式正确，不得截断，不得分行`
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
        {
          role: 'system',
          content: '你是故事摘要助手。将地下城冒险对话提炼为300字内的第三人称摘要，记录关键事件、场景、战斗结果、重要选择。直接输出摘要，不加标题。',
        },
        { role: 'user', content: `请总结以下冒险对话：\n\n${conversation}` },
      ],
      model,
      apiKey,
      grokApiKey,
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
        try { text += JSON.parse(d).choices?.[0]?.delta?.content || '' } catch { }
      }
    }
  }
  return text.trim()
}

// Extract and merge all sibling JSON objects inside [STATS:...obj1, obj2...]
// Handles the case where AI splits bodyDevelopment and statusEffects into two objects
function extractStatsJson(text: string): string | null {
  const marker = text.indexOf('[STATS:')
  if (marker === -1) return null

  // Collect all top-level { } objects between [STATS: and the matching ]
  const searchStart = marker + '[STATS:'.length
  const objects: Record<string, unknown>[] = []
  let i = searchStart

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
  const merged = Object.assign({}, ...objects)
  try { return JSON.stringify(merged) } catch { return null }
}

function cleanContent(content: string): string {
  let out = content.replace(/\[OPTIONS\][\s\S]*?\[\/OPTIONS\]/gi, '')
  out = out.replace(/\[SCENE:[^\]]*\]/gi, '')
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
  const abortRef = useRef<AbortController | null>(null)
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
        fetchSummary(toSummarise, settings.chatModel, settings.chatApiKey || '', settings.grokApiKey || '')
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

    // Cancel any previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLatestOptions([])
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
            } catch { }
          }
        }
      }

      // Parse [STATS]
      const statsJson = extractStatsJson(fullText)
      if (statsJson) {
        try {
          const stats = JSON.parse(statsJson)
          const updates: Partial<Character> = {}
          if (typeof stats.hp === 'number') updates.hp = Math.max(0, Math.min(character.maxHp, stats.hp))
          if (typeof stats.pleasure === 'number') updates.pleasure = Math.max(0, Math.min(100, stats.pleasure))
          if (typeof stats.desire === 'number') updates.desire = Math.max(0, Math.min(100, stats.desire))
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
            // Merge AI-generated descriptions
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
          if (Object.keys(updates).length > 0) onCharacterUpdate(updates)
        } catch { }
      }

      // Parse options
      const options = parseOptions(fullText)
      setLatestOptions(options)

      // Parse [SCENE] → 纯 danbooru tags
      const sceneMatch = fullText.match(/\[SCENE:\s*([^\]]+)\]/i)
      if (sceneMatch) {
        let tags = sceneMatch[1].trim()
        if (!tags.includes('masterpiece')) {
          tags = `masterpiece, best quality, highly detailed, ${tags}`
        }
        onRequestImage(tags)
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
