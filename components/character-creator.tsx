'use client'

import { useState, useRef } from 'react'
import { Upload, User, Sword, Wand2, Shield } from 'lucide-react'
import { Character, Race, RACE_INFO, CharacterStats, CharacterMeasurements } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CharacterCreatorProps {
  onComplete: (character: Character) => void
}

const RACE_ICONS: Record<Race, React.ReactNode> = {
  human: <Sword className="w-5 h-5" />,
  elf: <Wand2 className="w-5 h-5" />,
  tauren: <Shield className="w-5 h-5" />,
}

export function CharacterCreator({ onComplete }: CharacterCreatorProps) {
  const [name, setName] = useState('')
  const [race, setRace] = useState<Race>('human')
  const [stats, setStats] = useState<CharacterStats>({ strength: 5, agility: 5, intelligence: 5 })
  const [measurements, setMeasurements] = useState<CharacterMeasurements>({ bust: '', waist: '', hip: '' })
  const [backstory, setBackstory] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalPoints = stats.strength + stats.agility + stats.intelligence
  const maxPoints = 20

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const adjustStat = (stat: keyof CharacterStats, delta: number) => {
    setStats((prev) => {
      const newVal = prev[stat] + delta
      if (newVal < 1 || newVal > 10) return prev
      const newTotal = totalPoints + delta
      if (newTotal > maxPoints) return prev
      return { ...prev, [stat]: newVal }
    })
  }

  const handleRaceChange = (r: Race) => {
    setRace(r)
    // Reset stats when race changes
    setStats({ strength: 5, agility: 5, intelligence: 5 })
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const raceBonus = RACE_INFO[race].bonuses
    const finalStats: CharacterStats = {
      strength: Math.min(15, stats.strength + (raceBonus.strength || 0)),
      agility: Math.min(15, stats.agility + (raceBonus.agility || 0)),
      intelligence: Math.min(15, stats.intelligence + (raceBonus.intelligence || 0)),
    }
    const character: Character = {
      name: name.trim(),
      race,
      stats: finalStats,
      measurements,
      backstory: backstory.trim(),
      avatarUrl,
      level: 1,
      hp: 100,
      maxHp: 100,
    }
    onComplete(character)
  }

  const StatControl = ({ label, key: statKey }: { label: string; key: keyof CharacterStats }) => {
    const val = stats[statKey]
    const bonus = RACE_INFO[race].bonuses[statKey] || 0
    return (
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm w-20 text-right">{label}</span>
        <button
          onClick={() => adjustStat(statKey, -1)}
          className="w-7 h-7 rounded border border-border bg-secondary hover:border-primary hover:text-primary transition-colors flex items-center justify-center text-lg leading-none"
          disabled={val <= 1}
        >
          −
        </button>
        <div className="flex gap-1 items-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-3 h-3 rounded-sm transition-colors',
                i < val ? 'bg-primary' : 'bg-secondary border border-border'
              )}
            />
          ))}
        </div>
        <button
          onClick={() => adjustStat(statKey, 1)}
          className="w-7 h-7 rounded border border-border bg-secondary hover:border-primary hover:text-primary transition-colors flex items-center justify-center text-lg leading-none"
          disabled={val >= 10 || totalPoints >= maxPoints}
        >
          +
        </button>
        <span className="text-xs gold-text w-8">{val}</span>
        {bonus > 0 && (
          <span className="text-xs text-green-400">(+{bonus})</span>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gold-text tracking-widest mb-2">地下城探险</h1>
          <p className="text-muted-foreground text-sm tracking-wider">创建你的冒险者</p>
        </div>

        <div className="dungeon-border rounded-xl bg-card p-6 space-y-6">
          {/* Avatar Upload */}
          <div className="flex gap-6 items-start">
            <div
              className={cn(
                'w-28 h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all flex-shrink-0',
                dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60 bg-secondary'
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="角色头像" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground text-center px-2">上传头像</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />

            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block tracking-wider">角色名称</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入你的角色名..."
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Race Selection */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block tracking-wider">选择种族</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(RACE_INFO) as Race[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRaceChange(r)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs',
                        race === r
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {RACE_ICONS[r]}
                      <span className="font-semibold">{RACE_INFO[r].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Race description */}
          <div className="bg-secondary/50 rounded-lg px-4 py-2 border border-border">
            <div className="flex items-center gap-2 mb-1">
              {RACE_ICONS[race]}
              <span className="text-sm font-semibold text-foreground">{RACE_INFO[race].label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{RACE_INFO[race].description}</p>
          </div>

          {/* Measurements 三围 */}
          <div>
            <label className="text-xs text-muted-foreground mb-3 block tracking-wider">三围（厘米，选填）</label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: 'bust', label: '胸围', placeholder: '如 88' },
                  { key: 'waist', label: '腰围', placeholder: '如 60' },
                  { key: 'hip', label: '臀围', placeholder: '如 90' },
                ] as { key: keyof CharacterMeasurements; label: string; placeholder: string }[]
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted-foreground/70 mb-1 block text-center">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={30}
                      max={200}
                      value={measurements[key]}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-primary transition-colors pr-7"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/60">cm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-muted-foreground tracking-wider">属性分配</label>
              <span className="text-xs text-muted-foreground">
                已用 <span className={cn('font-bold', totalPoints >= maxPoints ? 'text-red-400' : 'gold-text')}>{totalPoints}</span> / {maxPoints} 点
              </span>
            </div>
            <div className="space-y-3">
              <StatControl label="力量" key="strength" />
              <StatControl label="敏捷" key="agility" />
              <StatControl label="智力" key="intelligence" />
            </div>
          </div>

          {/* Backstory */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block tracking-wider">人物设定（选填）</label>
            <textarea
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
              placeholder="描述你的角色背景故事、性格特点、过往经历..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold tracking-widest text-sm glow-btn transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            踏入地下城
          </button>
        </div>
      </div>
    </div>
  )
}
