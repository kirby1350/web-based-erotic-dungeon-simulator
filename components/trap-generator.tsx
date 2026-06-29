'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, RefreshCw, Check, X, Zap, Shuffle } from 'lucide-react'
import { Character, PRESET_TRAPS } from '@/lib/types'
import { streamChatDeltas } from '@/lib/sse'
import { cn } from '@/lib/utils'

interface TrapGeneratorProps {
  character: Character
  settings: { chatModel: string; chatApiKey: string; grokApiKey?: string }
  onConfirm: (text: string) => void
  onClose: () => void
}

function buildRandomTrapPrompt(character: Character, hint?: string, currentLocation = '未知区域'): string {
  const bd = character.bodyDevelopment ?? { breast: 0, clitoris: 0, vagina: 0, anus: 0 }
  const se = character.statusEffects ?? []
  const typeRule = hint
    ? `1. 本次必须生成以下指定类型的陷阱（根据玩家当前状态自由发挥细节）：
   ${hint}`
    : `1. 随机选择一种陷阱类型（不可重复使用最近用过的），类型包括但不限于：
   - 触手系（普通/异形/寄生）
   - 粘液/史莱姆系
   - 催情植物/花粉/香气
   - 魔法拘束/淫纹/幻觉
   - 怪物巢穴（触手怪、史莱姆群、触手犬、半兽人等）
   - 机械/古代遗迹拘束装置
   - 催眠/幻觉镜子/魅魔领域
   - 寄生虫/卵注入系
   - 其他你能想到的重口色情陷阱`
  return `你现在是「极致色情随机陷阱生成器」，必须生成一个全新、高度色情的地下城陷阱事件。

当前玩家：${character.name}（${character.race}）
当前状态：快感度 ${character.pleasure}/100，欲望值 ${character.desire}/100
身体开发度：胸部Lv${bd.breast ?? 0}、阴蒂Lv${bd.clitoris ?? 0}、阴道Lv${bd.vagina ?? 0}、肛门Lv${bd.anus ?? 0}
当前异常状态：${se.map((s) => s.title).join('、') || '无'}
当前位置：${currentLocation}

【生成要求】
${typeRule}

2. 生成内容必须包含：
   - 陷阱名称（带色情味）
   - 详细触发过程（200字以上，极度色情，包含感官描写）
   - 陷入后立即发生的强制色情效果
   - 对玩家状态的影响
   - 严格输出以下格式：

【陷阱名称】xxx
【触发描写】
（第三人称详细叙述）

【当前效果】
（说明玩家将会被如何侵犯、身体反应）
`
}

export function TrapGenerator({ character, settings, onConfirm, onClose }: TrapGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  // remember the last hint so 「重新生成」 keeps the chosen trap type
  const lastHintRef = useRef<string | undefined>(undefined)

  const generate = useCallback(async (hint?: string) => {
    lastHintRef.current = hint
    setLoading(true)
    setError('')
    setResult('')

    const prompt = buildRandomTrapPrompt(character, hint)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: prompt },
          ],
          model: settings.chatModel,
          apiKey: settings.chatApiKey,
          grokApiKey: settings.grokApiKey ?? '',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '生成失败')
      }

      let fullText = ''
      await streamChatDeltas(res, (delta) => {
        fullText += delta
        setResult(fullText)
      })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [character, settings])

  // Extract displayable content (strip [SCENE] and [STATS])
  function cleanForDisplay(text: string): string {
    let out = text.replace(/\[SCENE:[^\]]*\]/gi, '')
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

  // On first render, auto-generate
  useEffect(() => {
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg dungeon-border rounded-xl bg-card flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-wider gold-text">随机陷阱生成器</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset type chips */}
        <div className="px-4 pt-3 flex flex-wrap gap-1.5 flex-shrink-0">
          <button
            onClick={() => { setActivePreset(null); generate() }}
            disabled={loading}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors disabled:opacity-40',
              activePreset === null
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
            )}
          >
            <Shuffle className="w-3 h-3" />
            完全随机
          </button>
          {PRESET_TRAPS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActivePreset(t.id); generate(t.hint) }}
              disabled={loading}
              title={t.hint}
              className={cn(
                'px-2.5 py-1 rounded-full border text-xs transition-colors disabled:opacity-40',
                activePreset === t.id
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && result === '' && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm">正在生成随机陷阱…</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive-foreground bg-destructive/20 border border-destructive/40 rounded-lg p-3">
              生成失败：{error}
            </div>
          )}

          {result && (
            <div className="relative">
              <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                {cleanForDisplay(result)}
              </pre>
              {loading && (
                <span className="inline-flex gap-0.5 ml-1">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!loading && (result || error) && (
          <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
            <button
              onClick={() => generate(lastHintRef.current)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm hover:border-primary/50 hover:bg-secondary/80 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重新生成
            </button>
            {result && (
              <button
                onClick={() => onConfirm(result)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold glow-btn transition-all'
                )}
              >
                <Check className="w-3.5 h-3.5" />
                确认使用此陷阱
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
