'use client'

import { useState, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, Check, X, Zap, Shuffle } from 'lucide-react'
import { Character, PRESET_TRAPS, ProseStyle, getFloorTheme } from '@/lib/types'
import { chatStream } from '@/lib/dzmm'
import { cn } from '@/lib/utils'
import { buildRandomTrapPrompt } from '@/lib/prompts'

// Optional body-part specialization. If none picked, no特化 — the trap stays general.
const FOCUS_PARTS: { id: string; label: string }[] = [
  { id: 'breast', label: '胸部/乳头' },
  { id: 'clitoris', label: '阴蒂' },
  { id: 'urethra', label: '尿道' },
  { id: 'vagina', label: '阴道' },
  { id: 'anus', label: '肛门' },
  { id: 'mouth', label: '口腔/喉咙' },
]

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
  // ids of type chips toggled on; 2+ selected → traps are fused into one compound trap
  const [selected, setSelected] = useState<string[]>([])
  // optional preferred body part(s) to specialize the trap around; empty → no特化
  const [focus, setFocus] = useState<string[]>([])
  // remember the last hints/focus so 「重新生成」 keeps the chosen trap type(s) and部位
  const lastHintsRef = useRef<string[] | undefined>(undefined)
  const lastFocusRef = useRef<string[] | undefined>(undefined)

  const generate = useCallback(async (hints?: string[], focusParts?: string[]) => {
    lastHintsRef.current = hints
    lastFocusRef.current = focusParts
    setLoading(true)
    setError('')
    setResult('')

    const floorNo = character.floor ?? 1
    const theme = getFloorTheme(character.floorThemes, floorNo)
    const focusLabels = (focusParts ?? [])
      .map((id) => FOCUS_PARTS.find((p) => p.id === id)?.label)
      .filter((l): l is string => Boolean(l))
    const prompt = buildRandomTrapPrompt(character, hints, `地下城第 ${floorNo} 层「${theme.name}」（${theme.ambience}）`, settings.proseStyle, focusLabels)

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
          {/* Quick actions: fully random / random combo of two types */}
          <button
            onClick={() => { setSelected([]); generate(undefined, focus) }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-secondary text-muted-foreground text-xs transition-colors hover:border-primary/40 disabled:opacity-40"
          >
            <Shuffle className="w-3 h-3" />
            完全随机
          </button>
          <button
            onClick={() => {
              const pool = [...PRESET_TRAPS]
              const pick: typeof PRESET_TRAPS = []
              while (pick.length < 2 && pool.length) {
                pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
              }
              setSelected(pick.map((p) => p.id))
              generate(pick.map((p) => p.hint), focus)
            }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/5 text-primary/90 text-xs transition-colors hover:border-primary/60 disabled:opacity-40"
          >
            <Shuffle className="w-3 h-3" />
            随机组合
          </button>
          {PRESET_TRAPS.map((t) => (
            <button
              key={t.id}
              onClick={() =>
                setSelected((prev) =>
                  prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                )
              }
              disabled={loading}
              title={t.hint}
              className={cn(
                'px-2.5 py-1 rounded-full border text-xs transition-colors disabled:opacity-40',
                selected.includes(t.id)
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Preferred body part(s) — optional specialization; none = no特化 */}
        <div className="px-4 pt-2.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground/80 mr-0.5">偏好部位</span>
            {FOCUS_PARTS.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  setFocus((prev) =>
                    prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                  )
                }
                disabled={loading}
                className={cn(
                  'px-2 py-0.5 rounded-full border text-[11px] transition-colors disabled:opacity-40',
                  focus.includes(p.id)
                    ? 'border-rose-400/60 bg-rose-500/10 text-rose-300'
                    : 'border-border bg-secondary text-muted-foreground hover:border-rose-400/40'
                )}
              >
                {p.label}
              </button>
            ))}
            {focus.length > 0 && (
              <button
                onClick={() => setFocus([])}
                disabled={loading}
                className="text-[11px] text-muted-foreground/70 hover:text-foreground underline underline-offset-2 disabled:opacity-40"
              >
                清除
              </button>
            )}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground/60">不选则不做部位特化</p>
        </div>

        {/* Generate button for manually selected type(s) */}
        {selected.length > 0 && (
          <div className="px-4 pt-2 flex-shrink-0">
            <button
              onClick={() => generate(
                selected
                  .map((id) => PRESET_TRAPS.find((t) => t.id === id)?.hint)
                  .filter((h): h is string => Boolean(h)),
                focus
              )}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-primary/90 text-primary-foreground text-xs font-bold transition-all hover:bg-primary disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5" />
              {selected.length >= 2 ? `融合生成（${selected.length} 种类型）` : '生成此陷阱'}
            </button>
          </div>
        )}

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
              onClick={() => generate(lastHintsRef.current, lastFocusRef.current)}
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
