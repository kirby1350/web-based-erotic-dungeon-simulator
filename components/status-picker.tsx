'use client'

import { useState } from 'react'
import { X, Check, Sparkles, Trash2 } from 'lucide-react'
import { Character, StatusEffect, PRESET_STATUS_EFFECTS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatusPickerProps {
  character: Character
  onApply: (effects: StatusEffect[]) => void
  onClose: () => void
}

const PRESET_IDS = new Set(PRESET_STATUS_EFFECTS.map((s) => s.id))

export function StatusPicker({ character, onApply, onClose }: StatusPickerProps) {
  const [effects, setEffects] = useState<StatusEffect[]>(character.statusEffects ?? [])

  const has = (id: string) => effects.some((e) => e.id === id)

  const togglePreset = (preset: StatusEffect) => {
    setEffects((prev) =>
      prev.some((e) => e.id === preset.id)
        ? prev.filter((e) => e.id !== preset.id)
        : [...prev, preset]
    )
  }

  const removeEffect = (id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id))
  }

  // status effects on the character that aren't from the preset list (AI-generated)
  const customEffects = effects.filter((e) => !PRESET_IDS.has(e.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg dungeon-border rounded-xl bg-card flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-wider gold-text">施加异常状态</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            {PRESET_STATUS_EFFECTS.map((preset) => {
              const active = has(preset.id)
              return (
                <button
                  key={preset.id}
                  onClick={() => togglePreset(preset)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start gap-2.5',
                    active
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-secondary hover:border-primary/40'
                  )}
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                    )}
                  >
                    {active && <Check className="w-3 h-3" />}
                  </span>
                  <span>
                    <span className={cn('block text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
                      {preset.title}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                      {preset.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Custom (AI-generated) effects, removable */}
          {customEffects.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground tracking-wider">剧情中产生的状态</p>
              {customEffects.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-secondary/50"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">{e.title}</span>
                    {e.description && (
                      <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{e.description}</span>
                    )}
                  </span>
                  <button
                    onClick={() => removeEffect(e.id)}
                    title="移除"
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive-foreground transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm hover:border-primary/50 transition-all"
          >
            取消
          </button>
          <button
            onClick={() => onApply(effects)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold glow-btn transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            应用（{effects.length} 个状态）
          </button>
        </div>
      </div>
    </div>
  )
}
