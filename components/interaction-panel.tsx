'use client'

import { useState } from 'react'
import { Gift, Shirt, MessageCircle, X, Heart, Loader2 } from 'lucide-react'
import { MonstGirl, Player, ChatMessage, AppSettings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatBar } from '@/components/stat-bar'
import { ImageDisplay } from '@/components/image-display'
import { ChatEngine } from '@/components/chat-engine'
import { buildInteractionSystemPrompt, buildOpeningDialoguePrompt } from '@/lib/prompt-builder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface InteractionPanelProps {
  girl: MonstGirl
  player: Player
  settings: AppSettings
  onClose: () => void
  onGirlUpdated: (updated: MonstGirl) => void
}

type InteractionType = 'chat' | 'gift' | 'outfit'

const GIFT_OPTIONS = [
  { name: '小礼物', cost: 20, affectionBonus: 5 },
  { name: '精美首饰', cost: 80, affectionBonus: 15 },
  { name: '稀有宝石', cost: 200, affectionBonus: 30 },
]

export function InteractionPanel({ girl, player, settings, onClose, onGirlUpdated }: InteractionPanelProps) {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<InteractionType>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [openingLoading, setOpeningLoading] = useState(false)
  const [newOutfit, setNewOutfit] = useState(girl.outfit)
  const [newOutfitTags, setNewOutfitTags] = useState(girl.outfitTags)
  const [outfitImageKey, setOutfitImageKey] = useState(0) // bump to force ImageDisplay re-mount after outfit change
  const [giftFeedback, setGiftFeedback] = useState('')
  const [imageUrl, setImageUrl] = useState(girl.imageUrl)

  // Called when user clicks "开始互动" — sends the opening greeting
  const handleStart = () => {
    setStarted(true)
    const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
    const fallback = `……（${girl.name} 看了看你，${girl.affection >= 50 ? '露出了微笑' : '保持着沉默'}）`
    if (!apiKey) {
      setMessages([{ role: 'assistant', content: fallback }])
      return
    }
    setOpeningLoading(true)
    const prompt = buildOpeningDialoguePrompt('interaction', player, [girl], { girl })
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: settings.chatModel, apiKey, stream: false }),
    })
      .then((r) => r.json())
      .then((data) => {
        const text = (data.content ?? data.text ?? '').trim()
        setMessages([{ role: 'assistant', content: text || fallback }])
      })
      .catch(() => setMessages([{ role: 'assistant', content: fallback }]))
      .finally(() => setOpeningLoading(false))
  }

  const systemPrompt = buildInteractionSystemPrompt(player, girl, mode)

  const handleGift = (gift: { name: string; cost: number; affectionBonus: number }) => {
    if (player.gold < gift.cost) return
    const updated: MonstGirl = { ...girl, affection: Math.min(100, girl.affection + gift.affectionBonus) }
    onGirlUpdated(updated)
    setGiftFeedback(`送出了「${gift.name}」！${girl.name} 的好感度 +${gift.affectionBonus}`)
    setTimeout(() => setGiftFeedback(''), 3000)
  }

  const handleOutfitChange = () => {
    const updated: MonstGirl = {
      ...girl,
      outfit: newOutfit,
      outfitTags: newOutfitTags,
      imageTags: girl.imageTags.replace(girl.outfitTags, newOutfitTags),
      imageUrl: undefined,
    }
    onGirlUpdated(updated)
    setImageUrl(undefined)
    setOutfitImageKey((k) => k + 1) // force re-mount → autoGenerate will fire
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden dungeon-border">

        {/* Header — always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold gold-text">{girl.name}</h2>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{girl.race}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Pre-start screen: girl profile + start button */}
        {!started ? (
          <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
            {/* Left: portrait */}
            <div className="w-full sm:w-44 shrink-0 p-3 border-b sm:border-b-0 sm:border-r border-border">
              <ImageDisplay
                tags={girl.imageTags}
                settings={settings}
                cachedUrl={imageUrl}
                onUrlCached={(url) => { setImageUrl(url); onGirlUpdated({ ...girl, imageUrl: url }) }}
                alt={girl.name}
                className="w-full"
              />
            </div>
            {/* Right: stats, personality, backstory, start button */}
            <div className="flex-1 p-5 flex flex-col gap-4 justify-between min-h-0 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">属性</p>
                  <div className="space-y-2">
                    <StatBar label="好感度" value={girl.affection} color="pink" size="sm" />
                    <StatBar label="服从度" value={girl.obedience} color="blue" size="sm" />
                    <StatBar label="淫乱度" value={girl.lewdness} color="rose" size="sm" />
                  </div>
                </div>
                {girl.personality && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">性格</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{girl.personality}</p>
                  </div>
                )}
                {girl.backstory && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">背景</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{girl.backstory}</p>
                  </div>
                )}
              </div>
              <Button className="w-full h-10 glow-btn" onClick={handleStart}>
                <Heart className="w-4 h-4 mr-2" />
                开始与 {girl.name} 互动
              </Button>
            </div>
          </div>
        ) : (
          /* Active interaction screen */
          <div className="flex flex-1 min-h-0">
            {/* Sidebar: image + stats */}
            <div className="w-44 border-r border-border p-3 space-y-3 flex-shrink-0 overflow-y-auto">
              <ImageDisplay
                tags={girl.imageTags}
                settings={settings}
                cachedUrl={imageUrl}
                onUrlCached={(url) => { setImageUrl(url); onGirlUpdated({ ...girl, imageUrl: url }) }}
                alt={girl.name}
                className="w-full"
              />
              <div className="space-y-1.5">
                <StatBar label="好感度" value={girl.affection} color="pink" size="sm" />
                <StatBar label="服从度" value={girl.obedience} color="blue" size="sm" />
                <StatBar label="淫乱度" value={girl.lewdness} color="rose" size="sm" />
              </div>
              {openingLoading && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>准备中…</span>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground leading-relaxed">{girl.personality}</p>
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Mode tabs */}
              <div className="flex border-b border-border shrink-0">
                {([
                  { key: 'chat', label: '闲聊', icon: MessageCircle },
                  { key: 'gift', label: '送礼', icon: Gift },
                  { key: 'outfit', label: '换装', icon: Shirt },
                ] as { key: InteractionType; label: string; icon: typeof MessageCircle }[]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors',
                      mode === key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setMode(key)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Chat mode */}
              {mode === 'chat' && (
                openingLoading ? (
                  <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{girl.name} 正在思考开场白…</span>
                  </div>
                ) : (
                  <ChatEngine
                    systemPrompt={systemPrompt}
                    messages={messages}
                    onMessagesChange={setMessages}
                    settings={settings}
                    className="flex-1 min-h-0"
                    placeholder={`和 ${girl.name} 说点什么…`}
                  />
                )
              )}

              {/* Gift mode */}
              {mode === 'gift' && (
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <p className="text-xs text-muted-foreground">
                    当前金币：<span className="gold-text font-semibold">{player.gold} G</span>
                  </p>
                  {giftFeedback && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-xs text-primary">
                      {giftFeedback}
                    </div>
                  )}
                  <div className="space-y-2">
                    {GIFT_OPTIONS.map((g) => (
                      <div key={g.name} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium">{g.name}</p>
                          <p className="text-[10px] text-muted-foreground">好感度 +{g.affectionBonus}</p>
                        </div>
                        <Button size="sm" className="h-7 text-xs" disabled={player.gold < g.cost} onClick={() => handleGift(g)}>
                          {g.cost} G
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outfit mode */}
              {mode === 'outfit' && (
                <div className="flex-1 flex gap-4 p-4 overflow-y-auto">
                  {/* Left: preview */}
                  <div className="w-36 shrink-0">
                    <ImageDisplay
                      key={outfitImageKey}
                      tags={newOutfitTags
                        ? girl.imageTags.replace(girl.outfitTags, newOutfitTags)
                        : girl.imageTags}
                      settings={settings}
                      cachedUrl={outfitImageKey === 0 ? imageUrl : undefined}
                      onUrlCached={(url) => { setImageUrl(url); onGirlUpdated({ ...girl, imageUrl: url }) }}
                      alt={girl.name}
                      autoGenerate={outfitImageKey > 0}
                      className="w-full"
                    />
                  </div>
                  {/* Right: inputs */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">服装描述</Label>
                      <Input value={newOutfit} onChange={(e) => setNewOutfit(e.target.value)} className="bg-input text-sm h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">服装 TAG（英文，用于生图）</Label>
                      <Input
                        value={newOutfitTags}
                        onChange={(e) => setNewOutfitTags(e.target.value)}
                        className="bg-input text-xs font-mono h-9"
                        placeholder="dress, white, lace, ..."
                      />
                    </div>
                    <Button className="w-full h-9 text-sm glow-btn" onClick={handleOutfitChange} disabled={!newOutfit.trim()}>
                      确认换装并重新生图
                    </Button>
                    <p className="text-[10px] text-muted-foreground">确认后将根据新服装 TAG 自动生成图片</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
