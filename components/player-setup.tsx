'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Player } from '@/lib/types'
import { PLAYER_TRAITS, PLAYER_FETISHES } from '@/lib/game-data'
import { cn } from '@/lib/utils'

interface PlayerSetupProps {
  onComplete: (player: Player) => void
}

export function PlayerSetup({ onComplete }: PlayerSetupProps) {
  const [name, setName] = useState('')
  const [traits, setTraits] = useState<string[]>([])
  const [customTraits, setCustomTraits] = useState('')
  const [fetishes, setFetishes] = useState<string[]>([])

  const toggleTrait = (t: string) =>
    setTraits((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const toggleFetish = (f: string) =>
    setFetishes((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))

  const canContinue = name.trim().length > 0

  const handleSubmit = () => {
    if (!canContinue) return
    onComplete({
      name: name.trim(),
      traits,
      customTraits: customTraits.trim(),
      fetishes,
      gold: 500,
      day: 1,
      guestPreference: '',
      marketPreference: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* 馆主名称 */}
      <div className="space-y-2">
        <Label htmlFor="player-name" className="text-sm text-foreground/80">馆主名称</Label>
        <Input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入你的名字"
          className="bg-input border-border text-base h-11"
          maxLength={20}
        />
      </div>

      {/* 特性 */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm text-foreground/80">性格特性</Label>
          <p className="text-xs text-muted-foreground mt-0.5">选择 1-3 个特性（可多选）</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLAYER_TRAITS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTrait(t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border transition-all duration-150',
                traits.includes(t)
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground/80'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义特性 */}
      <div className="space-y-2">
        <Label htmlFor="custom-traits" className="text-xs text-muted-foreground">自定义特性（可选）</Label>
        <Input
          id="custom-traits"
          value={customTraits}
          onChange={(e) => setCustomTraits(e.target.value)}
          placeholder="例如：天生魅力、擅长绑缚、眼神犀利……"
          className="bg-input h-9 text-sm"
          maxLength={80}
        />
      </div>

      {/* 癖好 */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm text-foreground/80">个人癖好</Label>
          <p className="text-xs text-muted-foreground mt-0.5">选择你感兴趣的癖好（可多选）</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLAYER_FETISHES.map((f) => (
            <button
              key={f}
              onClick={() => toggleFetish(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border transition-all duration-150',
                fetishes.includes(f)
                  ? 'border-rose-500/60 bg-rose-500/10 text-rose-400'
                  : 'border-border text-muted-foreground hover:border-rose-500/30 hover:text-foreground/80'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 当前选择摘要 */}
      {(traits.length > 0 || fetishes.length > 0) && (
        <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
          {traits.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground shrink-0">特性：</span>
              {traits.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">{t}</Badge>
              ))}
            </div>
          )}
          {fetishes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground shrink-0">癖好：</span>
              {fetishes.map((f) => (
                <Badge key={f} variant="secondary" className="text-[10px] h-4 px-1.5 border-rose-500/20 text-rose-400/70">{f}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <Button className="w-full h-11 glow-btn" disabled={!canContinue} onClick={handleSubmit}>
        确认信息，选择魔物娘
      </Button>
    </div>
  )
}
