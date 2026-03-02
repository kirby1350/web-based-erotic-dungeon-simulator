'use client'

import { useState, useRef } from 'react'
import { Upload, Sword, Wand2, Shield, Sparkles } from 'lucide-react'
import { Character, Race, RACE_INFO, CharacterMeasurements, CHARACTER_PRESETS, CharacterPreset } from '@/lib/types'
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
  const [measurements, setMeasurements] = useState<CharacterMeasurements>({ bust: '', waist: '', hip: '' })
  const [backstory, setBackstory] = useState('')
  const [costumeDescription, setCostumeDescription] = useState('')
  const [otherDescription, setOtherDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setAvatarUrl(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const applyPreset = (preset: CharacterPreset) => {
    setName(preset.name)
    setRace(preset.race)
    setMeasurements(preset.measurements)
    setBackstory(preset.backstory)
    setCostumeDescription(preset.costumeDescription)
    setOtherDescription(preset.otherDescription)
    setAvatarUrl(preset.avatarUrl ?? null)
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const character: Character = {
      name: name.trim(),
      race,
      measurements,
      backstory: backstory.trim(),
      costumeDescription: costumeDescription.trim(),
      otherDescription: otherDescription.trim(),
      avatarUrl,
      level: 1,
      hp: 100,
      maxHp: 100,
      pleasure: 0,
      desire: 0,
      bodyDevelopment: { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 },
      statusEffects: [],
    }
    onComplete(character)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gold-text tracking-widest mb-2">地下城探险</h1>
          <p className="text-muted-foreground text-sm tracking-wider">创建你的冒险者</p>
        </div>

        <div className="dungeon-border rounded-xl bg-card p-6 space-y-6">

          {/* Presets */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              预设角色
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CHARACTER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-xs',
                    name === preset.name
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {preset.avatarUrl ? (
                    <img
                      src={preset.avatarUrl}
                      alt={preset.name}
                      className="w-14 h-14 rounded-lg object-cover object-top"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  )}
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-[10px] opacity-60">{RACE_INFO[preset.race].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* Avatar + Name + Race */}
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

              <div>
                <label className="text-xs text-muted-foreground mb-2 block tracking-wider">选择种族</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(RACE_INFO) as Race[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRace(r)}
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

          {/* Measurements */}
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

          {/* Three description fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block tracking-wider">人物设定（选填）</label>
              <textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder="描述角色的背景故事、性格特点、过往经历..."
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block tracking-wider">服装设定（选填）</label>
              <textarea
                value={costumeDescription}
                onChange={(e) => setCostumeDescription(e.target.value)}
                placeholder="描述角色的服装、外貌特征、装备道具..."
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block tracking-wider">其他设定（选填）</label>
              <textarea
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                placeholder="其他补充设定，例如特殊能力、癖好、禁忌..."
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>

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
