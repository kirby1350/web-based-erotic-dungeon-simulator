'use client'

import { useState, useRef, useEffect, type MutableRefObject } from 'react'
import { Send, Loader2, BookOpen, Square, RotateCcw, Wrench, Zap, Sparkles, ShieldAlert, Unlock, HeartCrack } from 'lucide-react'
import { Character, AppSettings, StatusEffect, Encounter, EXPLORE_GAIN, ENCOUNTER_CLEAR_GAIN, TARGET_FLOOR, getFloorTheme } from '@/lib/types'
import { cn } from '@/lib/utils'
import { cleanContent } from '@/lib/chat-protocol'
import { type ProgramTurnResult } from '@/lib/adventure-context'
import { MEMORY_CATEGORIES } from '@/lib/adventure-memory'
import { useAdventureSession } from '@/hooks/use-adventure-session'
import { TrapGenerator } from '@/components/trap-generator'
import { StatusPicker } from '@/components/status-picker'

function dispelChance(character: Character): number {
  const arousal = ((character.pleasure ?? 0) + (character.desire ?? 0)) / 2
  return Math.max(15, Math.min(90, Math.round(85 - arousal * 0.6 - (character.encounter ? 10 : 0))))
}

interface ChatPanelProps {
  character: Character
  settings: AppSettings
  onRequestImage: (scene: string) => void
  onCharacterUpdate: (updates: Partial<Character>) => void
  onTurnCommit: (character: Character) => void
  onBusyChange: (busy: boolean) => void
  exploreActionsRef?: MutableRefObject<{ explore: () => void; advanceFloor: () => void }>
}

export function ChatPanel({ character, settings, onRequestImage, onCharacterUpdate, onTurnCommit, onBusyChange, exploreActionsRef }: ChatPanelProps) {
  const { messages, summary, memory, summarising, loading, started, latestOptions, statsError, setStatsError,
    pending, beginTurn, retryPending, discardPending, stop } = useAdventureSession({ character, settings, onRequestImage, onTurnCommit, onBusyChange })
  const [input, setInput] = useState('')
  const [showToolMenu, setShowToolMenu] = useState(false)
  const [showTrapGenerator, setShowTrapGenerator] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingResultRef = useRef<ProgramTurnResult | null>(null)
  const sendMessage = (text: string, isStart = false) => {
    if (loading || summarising || pending) return
    const result = pendingResultRef.current
    pendingResultRef.current = null
    beginTurn(isStart ? character.name + '踏入地下城入口，请介绍起始场景并提供行动选项。' : text, result)
    setInput('')
  }
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

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
    await sendMessage('开始冒险', true)
  }

  // Escape button — client-authoritative progressive escape. Each attempt whittles the
  // encounter's restraint down one level; at 0 she breaks free. The outcome is decided
  // here and forced into the STATS parse via the turn result, so high pleasure/desire
  // can no longer wall the escape at 0% (it only makes the DM's narration more perilous).
  const attemptEscape = () => {
    if (loading || summarising || pending || !character.encounter) return
    const enc = character.encounter
    const newRestraint = enc.restraint - 1
    if (newRestraint < 0) {
      // fully break free this attempt
      pendingResultRef.current = { kind: 'escape', encounter: null, explorationProgress: Math.min(100, (character.explorationProgress ?? 0) + ENCOUNTER_CLEAR_GAIN) }
      sendMessage(`${character.name}尝试挣脱${enc.name}。`)
    } else {
      // weaken the bindings by one level, still trapped
      const weakened: Encounter = { ...enc, restraint: newRestraint }
      pendingResultRef.current = { kind: 'escape', encounter: weakened, explorationProgress: character.explorationProgress ?? 0 }
      sendMessage(`${character.name}尝试挣脱${enc.name}。`)
    }
  }

  // Surrender button — let the encounter ruin and discard her, then it ends.
  const acceptBroken = () => {
    if (loading || summarising || pending || !character.encounter) return
    sendMessage(`${character.name}彻底放弃抵抗，张开身体迎接${character.encounter.name}的肆意蹂躏，任由自己被玩弄、榨干到精神彻底崩坏，直到对方玩腻后，将这具失神瘫软、淫液淋漓的躯体随意丢弃在一旁。（请详细描写她被玩坏丢弃的过程，并在结束后让她脱离当前遭遇）`)
  }

  // Explore the current floor: a real DM turn narrating exploration (+ possible new
  // encounter), while advancing this floor's exploration progress toward 100%.
  const explore = () => {
    if (loading || summarising || pending || character.encounter) return
    const cur = character.explorationProgress ?? 0
    if (cur >= 100) return
    pendingResultRef.current = { kind: 'explore', explorationProgress: Math.min(100, cur + EXPLORE_GAIN) }
    const theme = getFloorTheme(character.floorThemes, character.floor ?? 1)
    sendMessage(`${character.name}继续探索本层「${theme.name}」。`)
  }

  // Descend to the next floor — only enabled once exploration hits 100% and no active
  // encounter. Floor progression is client-authoritative; the DM just narrates arrival.
  const advanceFloor = () => {
    if (loading || summarising || pending || character.encounter) return
    const curFloor = character.floor ?? 1
    if ((character.explorationProgress ?? 0) < 100 || curFloor >= TARGET_FLOOR) return
    const next = curFloor + 1
    const theme = getFloorTheme(character.floorThemes, next)
    pendingResultRef.current = { kind: 'advance', floor: next }
    sendMessage(`${character.name}前进到第 ${next} 层「${theme.name}」。`)
  }

  // expose explore/advance to the sibling CharacterCard (buttons live next to the progress bar)
  useEffect(() => {
    if (exploreActionsRef) exploreActionsRef.current = { explore, advanceFloor }
  })

  // Dispel a status effect — client rolls the success chance (see dispelChance), then the
  // outcome is forced into the STATS parse via the turn result so the DM can neither ignore
  // a success nor drop a failed status. The DM only narrates the result.
  const attemptDispel = (effect: StatusEffect) => {
    if (loading || summarising || pending) return
    const chance = dispelChance(character)
    const success = Math.random() * 100 < chance
    if (success) {
      pendingResultRef.current = { kind: 'dispel', removed: true, effect }
      sendMessage(`${character.name}尝试解除「${effect.title}」状态。`)
    } else {
      pendingResultRef.current = { kind: 'dispel', removed: false, effect }
      sendMessage(`${character.name}尝试解除「${effect.title}」状态。`)
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
        {statsError && <p className="text-sm text-yellow-400" role="alert">{statsError}</p>}
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
            if (loading || summarising || pending) return
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
                disabled={loading || summarising || !!pending}
                title="全力挣脱当前束缚"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-400/50 bg-rose-500/15 text-rose-200 text-xs font-bold hover:bg-rose-500/25 hover:border-rose-300 transition-all disabled:opacity-40"
              >
                <Unlock className="w-3.5 h-3.5" />
                奋力挣脱
              </button>
              <button
                onClick={acceptBroken}
                disabled={loading || summarising || !!pending}
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
              disabled={loading || summarising || !!pending}
              title={`尝试解除：${e.description || e.title}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-[11px] hover:bg-yellow-500/20 hover:border-yellow-400/50 disabled:opacity-40 transition-all"
            >
              {e.title}
              <Unlock className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {pending && (
        <div className="px-4 py-3 border-b border-amber-500/30 bg-amber-500/10 text-xs space-y-2" role="status">
          <p>{loading ? '正在生成本回合，角色数值将在完成后一起结算。' : '有一个待完成回合，角色数值尚未改变。刷新后也可继续。'}</p>
          {!loading && <div className="flex gap-3">
            <button onClick={retryPending} className="text-primary underline">{pending.phase === 'ready' ? '重试保存' : pending.phase === 'repair' ? '重试状态修复' : '继续生成'}</button>
            <button onClick={discardPending} className="text-muted-foreground underline">放弃本回合</button>
          </div>}
        </div>
      )}
      {memory.entries.length > 0 && (
        <details className="px-4 py-2 border-b border-border text-xs max-h-52 overflow-y-auto">
          <summary className="cursor-pointer text-primary">冒险记忆 · {memory.entries.filter((entry) => entry.status === 'active').length} 条进行中</summary>
          <ul className="mt-2 space-y-2">
            {memory.entries.map((entry) => <li key={entry.id}>
              <p>{MEMORY_CATEGORIES[entry.category]} · {entry.status === 'resolved' ? '已解决' : '进行中'}：{entry.text}</p>
              <details className="text-muted-foreground mt-1"><summary className="cursor-pointer">查看依据</summary>
                <p>{entry.evidence}</p><p className="break-all">来源回合：{entry.sourceTurnIds.join('、')}</p>
              </details>
            </li>)}
          </ul>
        </details>
      )}
      {/* Summary indicator */}
      {(summary || summarising) && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30">
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
          {summarising ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              正在归纳故事摘要…
              <button type="button" onClick={stop} className="ml-2 underline hover:text-foreground">跳过摘要</button>
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
            const labels = character.encounter ? ['抵抗·减轻', '抵抗·坚守', '享受·顺从', '堕落·求欢'] : ['行动一', '行动二', '行动三', '行动四']
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
              disabled={loading || summarising || !!pending}
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
            disabled={loading || summarising || !!pending}
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
          />
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {loading ? (
              <button
                onClick={stop}
                title="停止生成"
                className="p-2.5 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition-all"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => input.trim() && sendMessage(input.trim())}
                disabled={summarising || !!pending || !input.trim()}
                className="p-2.5 rounded-lg bg-primary text-primary-foreground glow-btn disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            {!loading && pending && (
              <button
                onClick={retryPending}
                disabled={summarising}
                title="继续待完成回合"
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
