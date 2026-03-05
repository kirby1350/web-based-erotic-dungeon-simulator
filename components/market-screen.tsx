'use client'

import { useState, useCallback, useEffect } from 'react'
import { ArrowLeft, RefreshCw, Loader2, Coins, ShoppingCart, Filter, Send } from 'lucide-react'
import { GameSave, MonstGirl, AppSettings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatBar } from '@/components/stat-bar'
import { ImageDisplay } from '@/components/image-display'
import { buildMarketGirlPrompt, buildOpeningDialoguePrompt } from '@/lib/prompt-builder'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'

interface MarketScreenProps {
  save: GameSave
  settings: AppSettings
  onSaveChange: (save: GameSave) => void
  onBack: () => void
}

export function MarketScreen({ save, settings, onSaveChange, onBack }: MarketScreenProps) {
  const { player, girls } = save

  const [step, setStep] = useState<'market' | 'purchase-dialogue'>('market')
  const [listings, setListings] = useState<MonstGirl[]>([])
  const [loading, setLoading] = useState(false)
  const [preference, setPreference] = useState(player.marketPreference ?? '')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchasedGirl, setPurchasedGirl] = useState<MonstGirl | null>(null)
  const [openingLoading, setOpeningLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'girl' | 'player'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [marketBanner, setMarketBanner] = useState('')

  // Market arrival opening
  useEffect(() => {
    const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
    if (!apiKey) return
    const prompt = buildOpeningDialoguePrompt('market', player, girls)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: settings.chatModel, apiKey, stream: false }),
    })
      .then((r) => r.json())
      .then((data) => { setMarketBanner((data.content ?? data.text ?? '').trim()) })
      .catch(() => {})
  }, [])

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const apiCall = async (prompt: string) => {
    const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: settings.chatModel, apiKey, stream: false }),
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return (data.content ?? data.text ?? '') as string
  }

  // ─── Generate market listings ───────────────────────────────────────────────

  const generateListings = useCallback(async () => {
    setLoading(true)
    setListings([])

    const existingNames = girls.map((g) => g.name)
    const results: MonstGirl[] = new Array(3).fill(null)

    await Promise.all(
      Array.from({ length: 3 }).map(async (_, i) => {
        const prompt = buildMarketGirlPrompt(preference, [
          ...existingNames,
          ...results.filter(Boolean).map((r) => r.name),
        ])
        try {
          const raw = await apiCall(prompt)
          const match = raw.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            results[i] = {
              id: nanoid(),
              name: parsed.name ?? `市场女孩${i + 1}`,
              race: parsed.race ?? '猫娘',
              age: parsed.age ?? '18',
              bodyDesc: parsed.bodyDesc ?? '',
              bodyTags: parsed.bodyTags ?? '',
              bust: Number(parsed.bust) || 85,
              waist: Number(parsed.waist) || 58,
              hip: Number(parsed.hip) || 88,
              personality: parsed.personality ?? '',
              personalityTags: parsed.personalityTags ?? '',
              outfit: parsed.outfit ?? '',
              outfitTags: parsed.outfitTags ?? '',
              otherDesc: parsed.otherDesc ?? '',
              otherTags: parsed.otherTags ?? '',
              affection: Number(parsed.affection) || 20,
              obedience: Number(parsed.obedience) || 25,
              lewdness: Number(parsed.lewdness) || 15,
              skills: parsed.skills ?? [],
              imageTags: parsed.imageTags ?? '1girl, anime, masterpiece, best quality',
              price: Number(parsed.price) || 200,
            }
          } else {
            results[i] = fallbackGirl(i)
          }
        } catch {
          results[i] = fallbackGirl(i)
        }
      })
    )

    setListings(results.filter(Boolean))
    setLoading(false)
  }, [preference, girls, settings])

  // ─── Purchase ───────────────────────────────────────────────────────────────

  const handlePurchase = async (girl: MonstGirl) => {
    const price = girl.price ?? 200
    if (player.gold < price) return
    setPurchasing(girl.id)

    const updatedSave: GameSave = {
      ...save,
      girls: [...girls, { ...girl, price: 0 }],
      player: { ...player, gold: player.gold - price, marketPreference: preference },
    }
    onSaveChange(updatedSave)
    setPurchasing(null)
    setPurchasedGirl(girl)
    setStep('purchase-dialogue')
    setOpeningLoading(true)
    setChatMessages([{ role: 'girl', text: '' }]) // placeholder for streaming
    
    const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
    const fallback = `……（${girl.name} 看了看四周，保持沉默）`
    try {
      const prompt = buildOpeningDialoguePrompt('purchase', player, [girl], { girl })
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: settings.chatModel, apiKey, stream: true }),
      })
      if (!res.ok || !res.body) throw new Error('API error')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? ''
              full += delta
              setChatMessages([{ role: 'girl', text: full }])
            } catch { /* skip */ }
          }
        }
      }
      if (!full.trim()) setChatMessages([{ role: 'girl', text: fallback }])
    } catch {
      setChatMessages([{ role: 'girl', text: fallback }])
    } finally {
      setOpeningLoading(false)
    }
  }

  // ─── Post-purchase chat ──────────────────────────────────────────────────────

  const sendChat = async () => {
    if (!chatInput.trim() || !purchasedGirl) return
    const userText = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'player', text: userText }])
    try {
      const history = chatMessages.map((m) => ({ role: m.role === 'girl' ? 'assistant' : 'user', content: m.text }))
      const system = `以第一人称扮演 ${purchasedGirl.name}（${purchasedGirl.race}），性格：${purchasedGirl.personality}。服从度 ${purchasedGirl.obedience}/100，刚被 ${player.name} 购入。回复30-60字。`
      const apiKey = settings.chatModel.startsWith('grok') ? settings.grokApiKey : settings.chatApiKey
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: userText }], model: settings.chatModel, apiKey, stream: false }),
      })
      if (res.ok) {
        const data = await res.json()
        setChatMessages((prev) => [...prev, { role: 'girl', text: (data.content ?? data.text ?? '').trim() }])
      }
    } catch { /* ignore */ }
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  if (step === 'purchase-dialogue' && purchasedGirl) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="border-b border-border px-4 py-3 flex items-center gap-3">
          <h1 className="text-sm font-bold gold-text">新成员加入</h1>
          <Badge variant="secondary" className="text-[10px] h-5 px-2">
            {purchasedGirl.name} · {purchasedGirl.race}
          </Badge>
        </header>

        <div className="flex flex-1 min-h-0 max-w-2xl mx-auto w-full">
          <div className="w-40 shrink-0 p-3">
            <ImageDisplay tags={purchasedGirl.imageTags} settings={settings} alt={purchasedGirl.name} className="w-full" />
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold gold-text">{purchasedGirl.name}</p>
              <p className="text-[10px] text-muted-foreground">{purchasedGirl.race} · {purchasedGirl.age}岁</p>
              {(purchasedGirl.bust || purchasedGirl.waist || purchasedGirl.hip) && (
                <p className="text-[10px] text-muted-foreground mt-0.5">B{purchasedGirl.bust} W{purchasedGirl.waist} H{purchasedGirl.hip}</p>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 border-l border-border">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {openingLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{purchasedGirl.name} 正在说话…</span>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'player' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed', msg.role === 'girl' ? 'bg-secondary text-foreground' : 'bg-primary/20 text-primary')}>
                      {msg.role === 'girl' && <p className="text-[10px] text-muted-foreground mb-1">{purchasedGirl.name}</p>}
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={`和 ${purchasedGirl.name} 说点什么…`} className="flex-1 h-9 text-sm bg-input" onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }} />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendChat} disabled={!chatInput.trim()}><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 flex justify-center">
          <Button className="h-10 px-8 glow-btn" onClick={onBack}>带她回娼馆</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-sm font-bold gold-text">奴隶市场</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs gold-text font-semibold">{player.gold} G</span>
        </div>
      </header>

      <div className="border-b border-border px-4 py-3 flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Filter className="w-3 h-3" />刷新偏好（例如：猫娘、巨乳、温柔型…）
          </Label>
          <Input value={preference} onChange={(e) => setPreference(e.target.value)} placeholder="留空则随机" className="h-8 text-sm bg-input" />
        </div>
        <Button className="h-8 px-4 gap-2 glow-btn shrink-0" onClick={generateListings} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {listings.length === 0 ? '刷新市场' : '重新刷新'}
        </Button>
      </div>

      {marketBanner && (
        <div className="px-4 py-2.5 bg-card/60 border-b border-border text-xs text-muted-foreground italic leading-relaxed">
          {marketBanner}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {listings.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">点击「刷新市场」查看今日在售的魔物娘</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在从奴隶商人处获取信息…</p>
          </div>
        )}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((girl) => {
              const canAfford = player.gold >= (girl.price ?? 200)
              return (
                <div key={girl.id} className={cn('bg-card border border-border rounded-xl overflow-hidden transition-all duration-200', canAfford && 'hover:border-primary/40')}>
                  <div className="aspect-[3/4] relative bg-secondary/20">
                    <ImageDisplay tags={girl.imageTags} settings={settings} alt={girl.name} className="w-full h-full" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{girl.name}</p>
                        <p className="text-[11px] text-muted-foreground">{girl.race} · {girl.age}岁</p>
                        {(girl.bust || girl.waist || girl.hip) && (
                          <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">B{girl.bust} / W{girl.waist} / H{girl.hip}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/40 text-amber-400">{girl.price} G</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{girl.personality}</p>
                    <div className="space-y-1">
                      <StatBar label="好感度" value={girl.affection} color="pink" size="sm" />
                      <StatBar label="服从度" value={girl.obedience} color="blue" size="sm" />
                      <StatBar label="淫乱度" value={girl.lewdness} color="rose" size="sm" />
                    </div>
                    {girl.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {girl.skills.map((s) => <Badge key={s} variant="secondary" className="text-[9px] h-4 px-1.5">{s}</Badge>)}
                      </div>
                    )}
                    <Button
                      className={cn('w-full h-8 text-xs mt-1', canAfford ? 'glow-btn' : '')}
                      variant={canAfford ? 'default' : 'outline'}
                      disabled={!canAfford || purchasing === girl.id}
                      onClick={() => handlePurchase(girl)}
                    >
                      {!canAfford ? `金币不足（需 ${girl.price} G）` : purchasing === girl.id ? '购入���…' : `购入（${girl.price} G）`}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function fallbackGirl(index: number): MonstGirl {
  const templates = [
    { name: '茉莉', race: '兔娘', age: '18', bodyDesc: '娇小可爱，白色兔耳，粉色短发', bodyTags: 'bunny ears, pink hair, petite', bust: 78, waist: 55, hip: 82, personality: '活泼好动，对什么都充满好奇', personalityTags: 'energetic, curious', outfit: '白色蓬蓬裙', outfitTags: 'white dress', otherDesc: '流浪而来', otherTags: 'wanderer', affection: 25, obedience: 30, lewdness: 20, skills: [], imageTags: '1girl, bunny ears, pink hair, white dress, anime, masterpiece, best quality', price: 150 },
    { name: '黎明', race: '黑暗精灵', age: '22', bodyDesc: '深棕肤色，白色长发，高挑身材', bodyTags: 'dark elf, dark skin, white hair', bust: 88, waist: 60, hip: 90, personality: '傲慢冷酷，但内心隐藏温柔', personalityTags: 'tsundere, cold', outfit: '暗紫色皮革轻甲', outfitTags: 'leather armor', otherDesc: '被族人驱逐的前精灵侦察兵', otherTags: 'exiled elf', affection: 15, obedience: 20, lewdness: 35, skills: ['低语诱惑'], imageTags: '1girl, dark elf, dark skin, white hair, leather armor, anime, masterpiece, best quality', price: 320 },
    { name: '珊珊', race: '牛娘', age: '20', bodyDesc: '丰满圆润，棕色牛角，温和笑容', bodyTags: 'holstaur, brown horns, large breasts', bust: 105, waist: 65, hip: 100, personality: '温柔贤淑，像大姐姐一样照顾人', personalityTags: 'gentle, nurturing', outfit: '白色农家风连衣裙', outfitTags: 'white rural dress', otherDesc: '前农场主人去世后独自流浪', otherTags: 'farm girl', affection: 45, obedience: 50, lewdness: 25, skills: ['按摩'], imageTags: '1girl, holstaur, large breasts, white dress, anime, masterpiece, best quality', price: 280 },
  ]
  return { id: nanoid(), ...templates[index % templates.length] }
}
