'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, RefreshCw, Loader2, Send } from 'lucide-react'
import {
  GameSave,
  MonstGirl,
  Guest,
  ChatMessage,
  ServiceSession,
  AppSettings,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatBar } from '@/components/stat-bar'
import { GirlCard } from '@/components/girl-card'
import { GuestCard } from '@/components/guest-card'
import { ChatEngine, ChatEngineHandle } from '@/components/chat-engine'
import { SuggestionBar } from '@/components/suggestion-bar'
import {
  buildServiceSystemPrompt,
  buildGuestGenerationPrompt,
} from '@/lib/prompt-builder'
import {
  createServiceSession,
  applyStatDelta,
  estimateStatDelta,
  calcServiceReward,
  calcGirlStatGrowth,
  updateGuestSatisfaction,
  findEligibleTrainers,
} from '@/lib/game-engine'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'
import {
  GUEST_RACES,
  GUEST_PERSONALITIES,
  GUEST_TRAITS,
} from '@/lib/game-data'

// ─── Types ──────────────────────────────────────────────────────────────────

type ServiceStep =
  | 'pick-type'       // service: pick girls; training: pick girls + trainer
  | 'pick-guest'      // service only: show guest, option to reroll
  | 'active'          // main session
  | 'result'

interface ServiceScreenProps {
  save: GameSave
  type: 'service' | 'training'
  settings: AppSettings
  onSaveChange: (save: GameSave) => void
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ServiceScreen({ save, type, settings, onSaveChange }: ServiceScreenProps) {
  const router = useRouter()
  const { player, girls } = save

  const [step, setStep] = useState<ServiceStep>('pick-type')
  const [selectedGirls, setSelectedGirls] = useState<string[]>([])
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [guestLoading, setGuestLoading] = useState(false)
  const [session, setSession] = useState<ServiceSession | null>(null)
  const [lastAiMsg, setLastAiMsg] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [goldEarned, setGoldEarned] = useState(0)

  const chatRef = useRef<ChatEngineHandle>(null)
  const eligibleTrainers = findEligibleTrainers(girls)

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const toggleGirl = (id: string) => {
    setSelectedGirls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const generateGuest = useCallback(async () => {
    setGuestLoading(true)
    try {
      const prompt = buildGuestGenerationPrompt(player.guestPreference, [])
      const apiKey = settings.chatModel.startsWith('grok')
        ? settings.grokApiKey
        : settings.chatApiKey
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: settings.chatModel,
          apiKey,
          stream: false,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const raw: string = data.content ?? data.text ?? ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setGuest({
          id: nanoid(),
          name: parsed.name ?? '神秘客人',
          race: parsed.race ?? GUEST_RACES[Math.floor(Math.random() * GUEST_RACES.length)],
          personality: parsed.personality ?? GUEST_PERSONALITIES[Math.floor(Math.random() * GUEST_PERSONALITIES.length)],
          traits: parsed.traits ?? [],
          desires: parsed.desires ?? '享受特殊服务',
          imageTags: parsed.imageTags ?? '1man, adventurer, anime, masterpiece',
          satisfaction: 0,
        })
      } else {
        // Fallback: random guest
        setGuest({
          id: nanoid(),
          name: `${['雷克', '阿尔', '马克', '路德'][Math.floor(Math.random() * 4)]}`,
          race: GUEST_RACES[Math.floor(Math.random() * GUEST_RACES.length)],
          personality: GUEST_PERSONALITIES[Math.floor(Math.random() * GUEST_PERSONALITIES.length)],
          traits: [GUEST_TRAITS[Math.floor(Math.random() * GUEST_TRAITS.length)]],
          desires: '寻找一夜的温柔与欢愉',
          imageTags: '1man, adventurer, anime, masterpiece, best quality',
          satisfaction: 0,
        })
      }
    } catch {
      // Fallback guest on error
      setGuest({
        id: nanoid(),
        name: '匿名旅行者',
        race: '人类冒险家',
        personality: '温文尔雅',
        traits: ['初次体验'],
        desires: '想体验一下这里的特别服务',
        imageTags: '1man, adventurer, young, anime, masterpiece, best quality',
        satisfaction: 0,
      })
    } finally {
      setGuestLoading(false)
    }
  }, [player.guestPreference, settings])

  // ─── Step: pick-type ─────────────────────────────────────────────────────

  const handleConfirmGirls = async () => {
    if (selectedGirls.length === 0) return
    if (type === 'service') {
      await generateGuest()
      setStep('pick-guest')
    } else {
      setStep('pick-guest')
    }
  }

  // ─── Step: pick-guest → start session ─────────────────────────────────────

  const startSession = () => {
    const sessionGirls = girls.filter((g) => selectedGirls.includes(g.id))
    const trainer =
      type === 'training' && selectedTrainerId
        ? girls.find((g) => g.id === selectedTrainerId)
        : undefined

    const newSession = createServiceSession(type, sessionGirls, {
      guest: type === 'service' && guest ? guest : undefined,
      trainer: type === 'training' ? trainer : undefined,
    })
    setSession(newSession)
    setStep('active')
  }

  // ─── Session: stat updates on AI reply ────────────────────────────────────

  const handleStreamComplete = useCallback(
    (fullContent: string) => {
      setLastAiMsg(fullContent)
      if (!session) return

      const delta = estimateStatDelta(fullContent)

      setSession((prev) => {
        if (!prev) return prev
        const newGirlsStats = { ...prev.girlsStats }
        for (const g of prev.girls) {
          newGirlsStats[g.id] = applyStatDelta(newGirlsStats[g.id], delta)
        }

        let newGuestStats = prev.guestStats
        if (newGuestStats) {
          newGuestStats = applyStatDelta(newGuestStats, delta)
        }

        let newTrainerStats = prev.trainerStats
        if (newTrainerStats) {
          newTrainerStats = applyStatDelta(newTrainerStats, delta)
        }

        let newGuest = prev.guest
        if (newGuest) {
          newGuest = updateGuestSatisfaction(newGuest, delta.pleasureDelta)
        }

        return {
          ...prev,
          girlsStats: newGirlsStats,
          guestStats: newGuestStats,
          trainerStats: newTrainerStats,
          guest: newGuest,
          messages,
        }
      })
    },
    [session, messages]
  )

  // ─── End session ──────────────────────────────────────────────────────────

  const endSession = () => {
    if (!session) return

    let updatedGirls = [...girls]
    let earned = 0

    if (session.type === 'service' && session.guest) {
      earned = calcServiceReward(session.guest, session)
    }

    const turnCount = messages.filter((m) => m.role === 'user').length
    for (const girl of session.girls) {
      const growth = calcGirlStatGrowth(girl, session, turnCount)
      updatedGirls = updatedGirls.map((g) =>
        g.id === girl.id ? { ...g, ...growth } : g
      )
    }

    setGoldEarned(earned)
    const updatedSave: GameSave = {
      ...save,
      girls: updatedGirls,
      player: {
        ...player,
        gold: player.gold + earned,
        day: save.currentDay,
      },
    }
    onSaveChange(updatedSave)
    setStep('result')
  }

  // ─── System prompt ────────────────────────────────────────────────────────

  const systemPrompt =
    session
      ? buildServiceSystemPrompt(player, { ...session, messages })
      : ''

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => (step === 'active' ? endSession() : router.push('/game'))}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-bold gold-text">
          {type === 'service' ? '开张营业' : '调教训练'}
        </h1>
        <Badge variant="secondary" className="text-[10px] h-5 px-2">
          {step === 'pick-type' && '选择魔物娘'}
          {step === 'pick-guest' && (type === 'service' ? '确认客人' : '选择调教者')}
          {step === 'active' && '进行中'}
          {step === 'result' && '结束'}
        </Badge>
      </header>

      {/* ── Step: pick-type ── */}
      {step === 'pick-type' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              选择参与{type === 'service' ? '服务' : '调教'}的魔物娘（可多选）
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {girls.map((girl) => (
                <GirlCard
                  key={girl.id}
                  girl={girl}
                  settings={settings}
                  selected={selectedGirls.includes(girl.id)}
                  onSelect={(g) => toggleGirl(g.id)}
                  compact
                />
              ))}
            </div>
          </div>

          {type === 'training' && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                选择调教者（好感度 60+ 的魔物娘，或由馆主亲自调教）
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={cn(
                    'px-4 py-2 rounded-full text-xs border transition-all',
                    selectedTrainerId === null
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                  onClick={() => setSelectedTrainerId(null)}
                >
                  馆主亲自调教
                </button>
                {eligibleTrainers.map((g) => (
                  <button
                    key={g.id}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs border transition-all',
                      selectedTrainerId === g.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                    onClick={() => setSelectedTrainerId(g.id)}
                  >
                    {g.name}（好感 {g.affection}）
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 bg-background pt-2 pb-4">
            <Button
              className="w-full h-11 glow-btn"
              disabled={selectedGirls.length === 0}
              onClick={handleConfirmGirls}
            >
              {type === 'service' ? '生成��日客人' : '开始调教'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: pick-guest ── */}
      {step === 'pick-guest' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {type === 'service' && (
            <>
              <p className="text-sm text-muted-foreground">今日来访客人</p>
              {guestLoading ? (
                <div className="flex items-center justify-center h-40 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">生成客人中…</span>
                </div>
              ) : guest ? (
                <GuestCard guest={guest} settings={settings} />
              ) : null}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 gap-2"
                  disabled={guestLoading}
                  onClick={generateGuest}
                >
                  <RefreshCw className="w-4 h-4" />
                  换一个客人
                </Button>
                <Button
                  className="flex-1 h-10 glow-btn"
                  disabled={!guest || guestLoading}
                  onClick={startSession}
                >
                  开始服务
                </Button>
              </div>
            </>
          )}

          {type === 'training' && (
            <>
              <p className="text-sm text-muted-foreground">
                调教对象：
                {girls
                  .filter((g) => selectedGirls.includes(g.id))
                  .map((g) => g.name)
                  .join('、')}
              </p>
              <p className="text-sm text-muted-foreground">
                调教者：
                {selectedTrainerId
                  ? girls.find((g) => g.id === selectedTrainerId)?.name ?? '未知'
                  : `馆主 ${player.name}`}
              </p>
              <Button className="w-full h-11 glow-btn" onClick={startSession}>
                开始调教
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Step: active ── */}
      {step === 'active' && session && (
        <div className="flex flex-1 min-h-0">
          {/* Left panel: character stats */}
          <div className="w-52 border-r border-border flex flex-col overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Girls */}
              {session.girls.map((girl) => {
                const stats = session.girlsStats[girl.id]
                return (
                  <div key={girl.id} className="bg-secondary/20 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold gold-text">{girl.name}</span>
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                        {girl.race}
                      </Badge>
                    </div>
                    {stats && (
                      <>
                        <StatBar label="快感" value={stats.pleasure} color="pink" size="sm" />
                        <StatBar label="体力" value={stats.stamina} color="blue" size="sm" />
                        {stats.isExhausted && (
                          <Badge variant="outline" className="text-[8px] border-amber-500/40 text-amber-400">
                            已疲惫
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                )
              })}

              {/* Guest */}
              {session.guest && session.guestStats && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-amber-400">
                      {session.guest.name}
                    </span>
                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                      客
                    </Badge>
                  </div>
                  <StatBar label="快感" value={session.guestStats.pleasure} color="gold" size="sm" />
                  <StatBar label="体力" value={session.guestStats.stamina} color="green" size="sm" />
                  <StatBar
                    label="满意"
                    value={session.guest.satisfaction}
                    color="rose"
                    size="sm"
                  />
                </div>
              )}

              {/* Trainer */}
              {session.trainer && session.trainerStats && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-primary">
                      {session.trainer.name}
                    </span>
                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                      调教者
                    </Badge>
                  </div>
                  <StatBar label="快感" value={session.trainerStats.pleasure} color="pink" size="sm" />
                  <StatBar label="体力" value={session.trainerStats.stamina} color="blue" size="sm" />
                </div>
              )}
            </div>

            {/* End button */}
            <div className="mt-auto p-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={endSession}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                结束{type === 'service' ? '服务' : '调教'}
              </Button>
            </div>
          </div>

          {/* Right: chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <ChatEngine
              ref={chatRef}
              systemPrompt={systemPrompt}
              messages={messages}
              onMessagesChange={setMessages}
              settings={settings}
              onStreamComplete={handleStreamComplete}
              showInput={false}
              className="flex-1 min-h-0"
            />
            <SuggestionBar
              lastAssistantMessage={lastAiMsg}
              sessionType={type}
              playerTraits={player.traits}
              settings={settings}
              onSelect={(text) => chatRef.current?.sendMessage(text)}
            />
            {/* Standalone input */}
            <div className="border-t border-border px-3 pb-3 pt-2 flex gap-2 items-end">
              <InputArea onSend={(val) => chatRef.current?.sendMessage(val)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Step: result ── */}
      {step === 'result' && session && (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold gold-text">
              {type === 'service' ? '服务结束' : '调教结束'}
            </h2>
            <p className="text-sm text-muted-foreground">本次活动已完成</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm space-y-3">
            {type === 'service' && (
              <>
                {session.guest && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">客人满意度</span>
                    <span className="text-sm font-semibold text-amber-400">
                      {session.guest.satisfaction} / 100
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">本次收入</span>
                  <span className="text-sm font-semibold gold-text">+{goldEarned} G</span>
                </div>
              </>
            )}
            <div className="h-px bg-border" />
            <p className="text-xs text-muted-foreground text-center">
              各魔物娘的属性已根据本次活动结果提升
            </p>
          </div>

          <Button className="w-full max-w-sm h-11 glow-btn" onClick={() => router.push('/game')}>
            返回大厅
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Standalone input component ──────────────────────────────────────────────

function InputArea({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 min-h-[56px] max-h-[100px] resize-none bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="描述你的行动…（Enter 发送，Shift+Enter 换行）"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (value.trim()) { onSend(value.trim()); setValue('') }
          }
        }}
      />
      <Button
        size="icon"
        className="h-9 w-9 shrink-0 glow-btn"
        disabled={!value.trim()}
        onClick={() => { if (value.trim()) { onSend(value.trim()); setValue('') } }}
      >
        <Send className="w-3.5 h-3.5" />
      </Button>
    </>
  )
}
