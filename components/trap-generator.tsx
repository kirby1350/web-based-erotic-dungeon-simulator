'use client'

import { useState, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, Check, X, Zap, Shuffle } from 'lucide-react'
import { Character, PRESET_TRAPS, ProseStyle, getFloorTheme } from '@/lib/types'
import { chatStream } from '@/lib/dzmm'
import { cn } from '@/lib/utils'
import { buildRandomTrapPrompt } from '@/lib/prompts'

interface TrapGeneratorProps {
  character: Character
  settings: { chatModel: string; chatApiKey: string; grokApiKey?: string; proseStyle?: ProseStyle }
  onConfirm: (text: string) => void
  onClose: () => void
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

    const floorNo = character.floor ?? 1
    const theme = getFloorTheme(character.floorThemes, floorNo)
    const prompt = buildRandomTrapPrompt(character, hint, `地下城第 ${floorNo} 层「${theme.name}」（${theme.ambience}）`, settings.proseStyle)

    try {
      let fullText = ''
      await chatStream(
        {
          messages: [{ role: 'user', content: prompt }],
          model: settings.chatModel,
          apiKey: settings.chatApiKey,
          grokApiKey: settings.grokApiKey ?? '',
        },
        (delta) => {
          fullText += delta
          setResult(fullText)
        },
      )
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [character, settings])

  // Extract displayable content (strip [SCENE], [STATS] and [DESC] blocks)
  function cleanForDisplay(text: string): string {
    let out = text.replace(/\[SCENE:[^\]]*\]/gi, '')
    for (const marker of ['[STATS:', '[DESC:']) {
      const start = out.indexOf(marker)
      if (start === -1) continue
      const braceStart = out.indexOf('{', start)
      if (braceStart === -1) continue
      let depth = 0
      for (let i = braceStart; i < out.length; i++) {
        if (out[i] === '{') depth++
        else if (out[i] === '}') {
          depth--
          if (depth === 0) {
            const closeTag = out.indexOf(']', i)
            const end = closeTag !== -1 ? closeTag + 1 : i + 1
            out = out.slice(0, start) + out.slice(end)
            break
          }
        }
      }
    }
    return out.trim()
  }

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
          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Zap className="w-6 h-6 text-primary/50" />
              <span className="text-sm">选择上方的陷阱类型，或点击「完全随机」开始生成</span>
            </div>
          )}

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
