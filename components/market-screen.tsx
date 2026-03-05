'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Loader2, Coins, ShoppingCart, Filter } from 'lucide-react'
import { GameSave, MonstGirl, AppSettings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatBar } from '@/components/stat-bar'
import { ImageDisplay } from '@/components/image-display'
import { buildMarketGirlPrompt } from '@/lib/prompt-builder'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'

interface MarketScreenProps {
  save: GameSave
  settings: AppSettings
  onSaveChange: (save: GameSave) => void
}

export function MarketScreen({ save, settings, onSaveChange }: MarketScreenProps) {
  const router = useRouter()
  const { player, girls } = save

  const [listings, setListings] = useState<MonstGirl[]>([])
  const [loading, setLoading] = useState(false)
  const [preference, setPreference] = useState(player.marketPreference ?? '')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchasedId, setPurchasedId] = useState<string | null>(null)

  // ─── Generate market listings ───────────────────────────────────────────────

  const generateListings = useCallback(async () => {
    setLoading(true)
    setListings([])
    setPurchasedId(null)

    const existingNames = girls.map((g) => g.name)
    const apiKey = settings.chatModel.startsWith('grok')
      ? settings.grokApiKey
      : settings.chatApiKey

    const results: MonstGirl[] = []

    // Generate 3 girls in parallel
    await Promise.all(
      Array.from({ length: 3 }).map(async (_, i) => {
        const prompt = buildMarketGirlPrompt(preference, [
          ...existingNames,
          ...results.map((r) => r.name),
        ])
        try {
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
            results[i] = {
              id: nanoid(),
              name: parsed.name ?? `市场女孩${i + 1}`,
              race: parsed.race ?? '猫娘',
              age: parsed.age ?? '18',
              bodyDesc: parsed.bodyDesc ?? '',
              bodyTags: parsed.bodyTags ?? '',
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
          }
        } catch {
          // Fallback girl
          results[i] = fallbackGirl(i)
        }
      })
    )

    setListings(results.filter(Boolean))
    setLoading(false)
  }, [preference, girls, settings])

  // ─── Purchase ───────────────────────────────────────────────────────────────

  const handlePurchase = (girl: MonstGirl) => {
    const price = girl.price ?? 200
    if (player.gold < price) return
    setPurchasing(girl.id)

    const updatedSave: GameSave = {
      ...save,
      girls: [...girls, { ...girl, price: 0 }],
      player: { ...player, gold: player.gold - price, marketPreference: preference },
    }
    onSaveChange(updatedSave)
    setPurchasedId(girl.id)
    setPurchasing(null)
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => router.push('/game')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-bold gold-text">奴隶市场</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs gold-text font-semibold">{player.gold} G</span>
        </div>
      </header>

      {/* Preference filter */}
      <div className="border-b border-border px-4 py-3 flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            刷新偏好（例如：猫娘、巨乳、温柔型…）
          </Label>
          <Input
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            placeholder="留空则随机"
            className="h-8 text-sm bg-input"
          />
        </div>
        <Button
          className="h-8 px-4 gap-2 glow-btn shrink-0"
          onClick={generateListings}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {listings.length === 0 ? '刷新市场' : '重新刷新'}
        </Button>
      </div>

      {/* Listings */}
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
              const isPurchased = purchasedId === girl.id
              const canAfford = player.gold >= (girl.price ?? 200)
              return (
                <div
                  key={girl.id}
                  className={cn(
                    'bg-card border border-border rounded-xl overflow-hidden transition-all duration-200',
                    isPurchased && 'opacity-50 border-dashed',
                    !isPurchased && canAfford && 'hover:border-primary/40'
                  )}
                >
                  {/* Image */}
                  <div className="aspect-[3/4] relative bg-secondary/20">
                    <ImageDisplay
                      tags={girl.imageTags}
                      settings={settings}
                      alt={girl.name}
                      className="w-full h-full"
                    />
                    {isPurchased && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-primary/80 text-primary-foreground text-xs">
                          已购入
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{girl.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {girl.race} · {girl.age}岁
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 border-amber-500/40 text-amber-400"
                      >
                        {girl.price} G
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {girl.personality}
                    </p>

                    <div className="space-y-1">
                      <StatBar label="好感度" value={girl.affection} color="pink" size="sm" />
                      <StatBar label="服从度" value={girl.obedience} color="blue" size="sm" />
                      <StatBar label="淫乱度" value={girl.lewdness} color="rose" size="sm" />
                    </div>

                    {girl.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {girl.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[9px] h-4 px-1.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      className={cn('w-full h-8 text-xs mt-1', canAfford && !isPurchased ? 'glow-btn' : '')}
                      variant={isPurchased ? 'secondary' : canAfford ? 'default' : 'outline'}
                      disabled={isPurchased || !canAfford || purchasing === girl.id}
                      onClick={() => handlePurchase(girl)}
                    >
                      {isPurchased
                        ? '已购入'
                        : !canAfford
                        ? `金币不足（需 ${girl.price} G）`
                        : purchasing === girl.id
                        ? '购入中…'
                        : `购入（${girl.price} G）`}
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

// ─── Fallback girl ───────────────────────────────────────────────────────────

function fallbackGirl(index: number): MonstGirl {
  const templates = [
    {
      name: '茉莉',
      race: '兔娘',
      age: '18',
      bodyDesc: '娇小可爱，白色兔耳，粉色短发',
      bodyTags: 'bunny ears, pink hair, short hair, petite, cute',
      personality: '活泼好动，对什么都充满好奇',
      personalityTags: 'energetic, curious, cheerful',
      outfit: '白色蓬蓬裙，兔尾点缀',
      outfitTags: 'white fluffy dress, bunny tail, cute outfit',
      otherDesc: '从远方集市流浪而来',
      otherTags: 'wanderer, market',
      affection: 25,
      obedience: 30,
      lewdness: 20,
      skills: [],
      imageTags: '1girl, bunny ears, pink hair, white dress, cute, petite, anime, masterpiece, best quality',
      price: 150,
    },
    {
      name: '黎明',
      race: '黑暗精灵',
      age: '22',
      bodyDesc: '深棕肤色，白色长发，紫色眼睛，高挑身材',
      bodyTags: 'dark elf, dark skin, white hair, purple eyes, tall',
      personality: '傲慢冷酷，但对真正欣赏她的人会卸下防备',
      personalityTags: 'arrogant, cold, secretly warm, tsundere',
      outfit: '暗紫色皮革轻甲，露出小腹',
      outfitTags: 'dark purple leather armor, midriff, dark elf armor',
      otherDesc: '被族人驱逐的前精灵侦察兵',
      otherTags: 'exiled elf, former scout',
      affection: 15,
      obedience: 20,
      lewdness: 35,
      skills: ['低语诱惑'],
      imageTags: '1girl, dark elf, dark skin, white hair, purple eyes, leather armor, tall, anime, masterpiece, best quality',
      price: 320,
    },
    {
      name: '珊珊',
      race: '牛娘',
      age: '20',
      bodyDesc: '丰满圆润，棕色牛角，牛尾，温和笑容',
      bodyTags: 'holstaur, brown horns, cow tail, large breasts, plump, warm smile',
      personality: '温柔贤淑，像大姐姐一样照顾人',
      personalityTags: 'gentle, nurturing, elder sister type, warm',
      outfit: '白色农家风连衣裙，蓝色围裙',
      outfitTags: 'white rural dress, blue apron, wholesome',
      otherDesc: '前农场主人去世后独自流浪',
      otherTags: 'farm girl, lost owner',
      affection: 45,
      obedience: 50,
      lewdness: 25,
      skills: ['按摩'],
      imageTags: '1girl, holstaur, cow horns, cow tail, large breasts, white dress, gentle, anime, masterpiece, best quality',
      price: 280,
    },
  ]
  return { id: nanoid(), ...templates[index % templates.length] }
}
