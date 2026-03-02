'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Image as ImageIcon } from 'lucide-react'
import { Character, ChatMessage, AppSettings, IMAGE_MODELS, IMAGE_STYLES } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  character: Character
  settings: AppSettings
  onRequestImage: (scene: string) => void
}

function buildSystemPrompt(character: Character): string {
  const raceMap: Record<string, string> = {
    human: '人族',
    elf: '精灵族',
    tauren: '牛人族',
  }
  return `你是一个专业的地下城主持人（DM），负责主持一场沉浸式的文字地下城冒险RPG游戏。
  
玩家角色信息：
- 名字：${character.name}
- 种族：${raceMap[character.race]}
- 力量：${character.stats.strength}，敏捷：${character.stats.agility}，智力：${character.stats.intelligence}
- 等级：${character.level}
- 生命值：${character.hp}/${character.maxHp}
${character.backstory ? `- 背景故事：${character.backstory}` : ''}

请遵循以下规则：
1. 用中文进行叙述，语言生动、沉浸，富有奇幻色彩
2. 根据玩家的选择推进剧情，提供2-4个有意义的行动选项
3. 战斗时根据角色属性计算结果，增加随机性和紧张感
4. 适时描述环境、声音、气味等细节增强代入感
5. 遭遇重要场景时，在回复末尾添加一行：[SCENE: 简短英文场景描述，用于图片生成]
6. 保持故事连贯性，记住玩家的历史选择`
}

export function ChatPanel({ character, settings, onRequestImage }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
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

  const startAdventure = async () => {
    setStarted(true)
    await sendMessage('开始冒险', true)
  }

  const sendMessage = async (userText: string, isStart = false) => {
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
      { role: 'system', content: buildSystemPrompt(character) },
      ...newMessages.map((m) => ({
        role: m.role,
        content: m.role === 'user' && m.content === '（冒险开始）'
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

      // Convert scene to danbooru tags via chat API then trigger image generation
      const sceneMatch = fullText.match(/\[SCENE:\s*([^\]]+)\]/)
      if (sceneMatch) {
        const sceneDesc = sceneMatch[1].trim()
        try {
          const tagRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: 'You are a danbooru tag expert. Convert the given scene description into concise danbooru-style image generation tags. Output ONLY the comma-separated tags, no explanations. Always include quality tags: masterpiece, best quality, highly detailed. Include appropriate character, environment and atmosphere tags.',
                },
                {
                  role: 'user',
                  content: `Convert to danbooru tags: "${sceneDesc}"`,
                },
              ],
              model: settings.chatModel,
              apiKey: settings.chatApiKey,
            }),
          })
          if (tagRes.ok) {
            const tagReader = tagRes.body!.getReader()
            const tagDecoder = new TextDecoder()
            let tagText = ''
            while (true) {
              const { done, value } = await tagReader.read()
              if (done) break
              const chunk = tagDecoder.decode(value)
              for (const line of chunk.split('\n')) {
                if (line.startsWith('data: ')) {
                  const d = line.slice(6).trim()
                  if (d === '[DONE]') continue
                  try {
                    const parsed = JSON.parse(d)
                    tagText += parsed.choices?.[0]?.delta?.content || ''
                  } catch { /* ignore */ }
                }
              }
            }
            const tags = tagText.trim()
            onRequestImage(tags || sceneDesc)
          } else {
            onRequestImage(sceneDesc)
          }
        } catch {
          onRequestImage(sceneDesc)
        }
      }
    } catch (e) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: `⚠️ 出错了：${String(e)}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) sendMessage(input.trim())
    }
  }

  const cleanContent = (content: string) => {
    return content.replace(/\[SCENE:[^\]]*\]/g, '').trim()
  }

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-3">
          <p className="gold-text text-xl font-bold tracking-wider">冒险者，准备好了吗？</p>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            前方是未知的地下城，充满了宝藏、危险与传说。<br />你的选择将决定一切。
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
            placeholder="输入你的行动或选择..."
            rows={2}
            disabled={loading}
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
          />
          <button
            onClick={() => input.trim() && sendMessage(input.trim())}
            disabled={loading || !input.trim()}
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
