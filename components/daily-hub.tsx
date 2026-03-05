'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, Coins, Calendar, Store, Sword, ShoppingBag, Heart, Users, X, Send, Loader2 } from 'lucide-react'
import { GameSave, MonstGirl, AppSettings } from '@/lib/types'
import { GirlCard } from '@/components/girl-card'
import { InteractionPanel } from '@/components/interaction-panel'
import { StatBar } from '@/components/stat-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { buildOpeningDialoguePrompt } from '@/lib/prompt-builder'
import { cn } from '@/lib/utils'
import type { GameTab } from '@/app/game/page'

interface DailyHubProps {
  save: GameSave
  settings: AppSettings
  onSaveChange: (save: GameSave) => void
  onNavigate: (tab: GameTab) => void
  onOpenSettings: () => void
}

export function DailyHub({ save, settings, onSaveChange, onNavigate, onOpenSettings }: DailyHubProps) {
  const [girlsDrawerOpen, setGirlsDrawerOpen] = useState(false)
  const [interactingWith, setInteractingWith] = useState<MonstGirl | null>(null)
  const [chatMessages, setChatMessages] = useState<{ role: 'system' | 'player'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [opened, setOpened] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { player, girls } = save

  useEffect(() => {
    if (opened) return
    setOpened(true)
    const fallback = `欢迎回来，${player.name}。今天是第 ${save.currentDay} 天，你的娼馆已经开门了。`
    const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
    if (!apiKey) {
      setChatMessages([{ role: 'system', text: fallback }])
      return
    }
    setChatLoading(true)
    const prompt = buildOpeningDialoguePrompt('game-start', player, girls)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: settings.chatModel, apiKey, stream: false }),
    })
      .then((r) => r.json())
      .then((data) => {
        const text = (data.content ?? data.text ?? '').trim()
        setChatMessages([{ role: 'system', text: text || fallback }])
      })
      .catch(() => setChatMessages([{ role: 'system', text: fallback }]))
      .finally(() => setChatLoading(false))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const updateGirl = (updated: MonstGirl) => {
    onSaveChange({ ...save, girls: girls.map((g) => (g.id === updated.id ? updated : g)) })
  }

  const handleImageCached = (id: string, url: string) => {
    const girl = girls.find((g) => g.id === id)
    if (girl) updateGirl({ ...girl, imageUrl: url })
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return
    const text = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'player', text }])
    setChatLoading(true)
    try {
      const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
      const history = chatMessages.map((m) => ({ role: m.role === 'player' ? 'user' : 'assistant', content: m.text }))
      const system = `你是魔物娘娼馆的叙事引擎。玩家是 ${player.name}（特性：${player.traits.join('、') || '无'}）。馆内魔物娘：${girls.map((g) => g.name + '（' + g.race + '）').join('、') || '无'}。以简短的第三人称叙述回应玩家的行为（50字以内）。`
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: text }], model: settings.chatModel, apiKey, stream: false }),
      })
      if (res.ok) {
        const data = await res.json()
        const reply = (data.content ?? data.text ?? '').trim()
        if (reply) setChatMessages((prev) => [...prev, { role: 'system', text: reply }])
      }
    } catch { /* ignore */ }
    finally { setChatLoading(false) }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
          onClick={() => setGirlsDrawerOpen(true)}
        >
          <Users className="w-3.5 h-3.5" />
          <span>魔物娘</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-0.5">{girls.length}</Badge>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">第 {save.currentDay} 天</span>
          </div>
          <h1 className="text-sm font-bold gold-text tracking-wide">{player.name}的娼馆</h1>
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs gold-text font-semibold">{player.gold} G</span>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onOpenSettings}>
          <Settings className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 flex flex-col min-h-0 max-w-2xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {chatLoading && chatMessages.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>娼馆正在开门…</span>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={cn('flex', msg.role === 'player' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'system'
                  ? 'bg-card border border-border text-foreground/90'
                  : 'bg-primary/20 text-primary border border-primary/20'
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && chatMessages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl px-3.5 py-2.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action buttons as bottom tab bar */}
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              icon={Store}
              label="开张营业"
              color="primary"
              onClick={() => onNavigate('service')}
              disabled={girls.length === 0}
            />
            <ActionButton
              icon={Sword}
              label="调教魔物娘"
              color="rose"
              onClick={() => onNavigate('training')}
              disabled={girls.length === 0}
            />
            <ActionButton
              icon={ShoppingBag}
              label="奴隶市场"
              color="amber"
              onClick={() => onNavigate('market')}
            />
          </div>
        </div>

        <div className="border-t border-border px-4 py-3 flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-input border border-border rounded-md px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="和娼馆说点什么…"
            onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendChat} disabled={!chatInput.trim() || chatLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {girlsDrawerOpen && (
        <div className="absolute inset-0 z-50 flex">
          {/* Drawer slides from the LEFT */}
          <div className="w-72 bg-card border-r border-border flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-bold gold-text">馆内魔物娘</h2>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setGirlsDrawerOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {girls.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <p className="text-sm text-muted-foreground text-center">馆内还没有魔物娘</p>
                  <Button variant="outline" size="sm" onClick={() => { setGirlsDrawerOpen(false); onNavigate('market') }}>
                    前往奴隶市场
                  </Button>
                </div>
              ) : (
                girls.map((girl) => (
                  <div key={girl.id} className="bg-background rounded-xl border border-border p-3 flex gap-3">
                    <div className="w-14 shrink-0">
                      <GirlCard girl={girl} settings={settings} onImageCached={handleImageCached} compact className="w-full" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold gold-text">{girl.name}</span>
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{girl.race}</Badge>
                      </div>
                      {(girl.bust || girl.waist || girl.hip) && (
                        <p className="text-[9px] text-muted-foreground/60 font-mono">
                          B{girl.bust} W{girl.waist} H{girl.hip}
                        </p>
                      )}
                      <StatBar label="好感" value={girl.affection} color="pink" size="sm" />
                      <StatBar label="服从" value={girl.obedience} color="blue" size="sm" />
                      <StatBar label="淫乱" value={girl.lewdness} color="rose" size="sm" />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[10px] w-full mt-1"
                        onClick={() => { setGirlsDrawerOpen(false); setInteractingWith(girl) }}
                      >
                        <Heart className="w-3 h-3 mr-1" />互动
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setGirlsDrawerOpen(false)} />
        </div>
      )}

      {interactingWith && (
        <InteractionPanel
          girl={interactingWith}
          player={save.player}
          settings={settings}
          onClose={() => setInteractingWith(null)}
          onGirlUpdated={(updated) => { updateGirl(updated); setInteractingWith(updated) }}
        />
      )}
    </div>
  )
}

function ActionButton({ icon: Icon, label, color, onClick, disabled }: {
  icon: typeof Store
  label: string
  color: 'primary' | 'rose' | 'amber'
  onClick: () => void
  disabled?: boolean
}) {
  const c = {
    primary: { bg: 'bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/60', text: 'text-primary', icon: 'text-primary' },
    rose: { bg: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-400', icon: 'text-rose-400' },
    amber: { bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/60', text: 'text-amber-400', icon: 'text-amber-400' },
  }[color]
  return (
    <button
      className={cn('flex items-center justify-center gap-2 rounded-xl border py-2.5 transition-all duration-150 text-xs font-medium', c.bg, c.text, disabled && 'opacity-40 pointer-events-none')}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn('w-4 h-4', c.icon)} />
      {label}
    </button>
  )
}
