'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Coins, Calendar, Store, Sword, ShoppingBag, Heart } from 'lucide-react'
import { GameSave, MonstGirl } from '@/lib/types'
import { GirlCard } from '@/components/girl-card'
import { InteractionPanel } from '@/components/interaction-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DailyHubProps {
  save: GameSave
  onSaveChange: (save: GameSave) => void
}

export function DailyHub({ save, onSaveChange }: DailyHubProps) {
  const router = useRouter()
  const [interactingWith, setInteractingWith] = useState<MonstGirl | null>(null)
  const { player, girls } = save

  const updateGirl = (updated: MonstGirl) => {
    const newGirls = girls.map((g) => (g.id === updated.id ? updated : g))
    onSaveChange({ ...save, girls: newGirls })
  }

  const handleImageCached = (id: string, url: string) => {
    const girl = girls.find((g) => g.id === id)
    if (girl) updateGirl({ ...girl, imageUrl: url })
  }

  const goToService = () => router.push('/game/service?type=service')
  const goToTraining = () => router.push('/game/service?type=training')
  const goToMarket = () => router.push('/game/market')

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-bold gold-text tracking-wide">
          {player.name}的娼馆
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">第 {save.currentDay} 天</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs gold-text font-semibold">{player.gold} G</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => router.push('/settings')}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Girls list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            馆内魔物娘（{girls.length}）
          </h2>
        </div>

        {girls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-muted-foreground">馆内还没有魔物娘</p>
            <Button variant="outline" size="sm" onClick={goToMarket}>
              前往奴隶市场
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {girls.map((girl) => (
              <div key={girl.id} className="relative group">
                <GirlCard
                  girl={girl}
                  settings={save.player as unknown as import('@/lib/types').AppSettings}
                  onImageCached={handleImageCached}
                  className="h-full"
                />
                {/* Hover overlay buttons */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 h-7 text-[10px]"
                    onClick={() => setInteractingWith(girl)}
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    互动
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-t border-border p-4">
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          <ActionButton
            icon={Store}
            label="开张营业"
            description="接待客人"
            color="primary"
            onClick={goToService}
            disabled={girls.length === 0}
          />
          <ActionButton
            icon={Sword}
            label="调教魔物娘"
            description="提升属性"
            color="rose"
            onClick={goToTraining}
            disabled={girls.length === 0}
          />
          <ActionButton
            icon={ShoppingBag}
            label="奴隶市场"
            description="购买魔物娘"
            color="amber"
            onClick={goToMarket}
          />
        </div>
      </div>

      {/* Interaction panel overlay */}
      {interactingWith && (
        <InteractionPanel
          girl={interactingWith}
          player={save.player}
          settings={save.player as unknown as import('@/lib/types').AppSettings}
          onClose={() => setInteractingWith(null)}
          onGirlUpdated={(updated) => {
            updateGirl(updated)
            setInteractingWith(updated)
          }}
        />
      )}
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  description,
  color,
  onClick,
  disabled,
}: {
  icon: typeof Store
  label: string
  description: string
  color: 'primary' | 'rose' | 'amber'
  onClick: () => void
  disabled?: boolean
}) {
  const colorMap = {
    primary: {
      bg: 'bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/60',
      text: 'text-primary',
      icon: 'text-primary',
    },
    rose: {
      bg: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-500/60',
      text: 'text-rose-400',
      icon: 'text-rose-400',
    },
    amber: {
      bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/60',
      text: 'text-amber-400',
      icon: 'text-amber-400',
    },
  }
  const c = colorMap[color]
  return (
    <button
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-150',
        c.bg,
        disabled && 'opacity-40 pointer-events-none'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn('w-6 h-6', c.icon)} />
      <div className="text-center">
        <p className={cn('text-xs font-semibold', c.text)}>{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
