'use client'

import { useState } from 'react'
import { Character, BodyPart } from '@/lib/types'
import { RACE_INFO } from '@/lib/types'
import {
  Heart, Shield, Zap, Brain, RotateCcw,
  Flame, Sparkles, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CharacterCardProps {
  character: Character
  onReset: () => void
}

const BODY_PART_LABELS: Record<BodyPart, string> = {
  breast: '胸部',
  clitoris: '阴蒂',
  urethra: '尿道',
  vagina: '阴道',
  anus: '肛门',
}

const DEVELOPMENT_DESCRIPTIONS: Record<number, string> = {
  0: '未开发',
  1: '初步敏感',
  2: '逐渐适应',
  3: '充分开发',
  4: '高度敏感',
  5: '完全开发',
}

function DevelopmentDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2.5 h-2.5 rounded-sm transition-colors',
            i < level
              ? 'bg-pink-500'
              : 'bg-secondary border border-border/60'
          )}
        />
      ))}
    </div>
  )
}

export function CharacterCard({ character, onReset }: CharacterCardProps) {
  const raceInfo = RACE_INFO[character.race]
  const [showBody, setShowBody] = useState(false)
  const [showStatus, setShowStatus] = useState(false)

  const statusEffects = character?.statusEffects ?? []
  const bodyDevelopment = character?.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 }
  const hasStatusEffects = statusEffects.length > 0

  return (
    <div className="border-b border-border">
      {/* Base info */}
      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-secondary">
            {character.avatarUrl ? (
              <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                {character.name[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm truncate gold-text">{character.name}</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex-shrink-0">
                Lv.{character.level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{raceInfo.label}</p>
          </div>

          <button
            onClick={onReset}
            title="重新创建角色"
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* HP Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1 text-red-400">
              <Heart className="w-3 h-3" />
              <span>生命值</span>
            </div>
            <span className="text-muted-foreground">{character.hp}/{character.maxHp}</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${(character.hp / character.maxHp) * 100}%` }}
            />
          </div>
        </div>

        {/* Pleasure & Desire bars */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1 text-pink-400">
                <Sparkles className="w-3 h-3" />
                <span>快感度</span>
              </div>
              <span className="text-muted-foreground">{character.pleasure}</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full transition-all"
                style={{ width: `${character.pleasure}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="w-3 h-3" />
                <span>欲望值</span>
              </div>
              <span className="text-muted-foreground">{character.desire}</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${character.desire}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: Shield, label: '力量', value: character.stats.strength, color: 'text-orange-400' },
            { icon: Zap, label: '敏捷', value: character.stats.agility, color: 'text-green-400' },
            { icon: Brain, label: '智力', value: character.stats.intelligence, color: 'text-blue-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-secondary rounded-lg p-2 text-center">
              <Icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${color}`} />
              <div className={`text-sm font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body Status Section */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowBody((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <span className="tracking-wider font-semibold text-pink-400/80">身体状态</span>
          {showBody ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showBody && (
          <div className="px-3 pb-3 space-y-2.5">
            {/* Measurements */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '胸围', value: character.measurements.bust },
                { label: '腰围', value: character.measurements.waist },
                { label: '臀围', value: character.measurements.hip },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-pink-400">
                    {value ? `${value}` : '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  {value && <div className="text-[9px] text-muted-foreground/50">cm</div>}
                </div>
              ))}
            </div>

            {/* Development Levels */}
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground/60 tracking-widest uppercase px-0.5">开发度</div>
              {(Object.keys(BODY_PART_LABELS) as BodyPart[]).map((part) => {
                const level = bodyDevelopment[part]
                const aiDesc = bodyDevelopment.descriptions?.[part]
                const staticDesc = DEVELOPMENT_DESCRIPTIONS[level] ?? '未开发'
                return (
                  <div key={part} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10 flex-shrink-0">{BODY_PART_LABELS[part]}</span>
                      <DevelopmentDots level={level} />
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 leading-snug pl-12">
                      {aiDesc || staticDesc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status Effects Section */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowStatus((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className={cn('w-3.5 h-3.5', hasStatusEffects ? 'text-yellow-400' : 'text-muted-foreground/40')} />
            <span className={cn('tracking-wider font-semibold', hasStatusEffects ? 'text-yellow-400/80' : 'text-muted-foreground/60')}>
              异常状态
            </span>
            {hasStatusEffects && (
              <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                {statusEffects.length}
              </span>
            )}
          </div>
          {showStatus ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {showStatus && (
          <div className="px-3 pb-3">
            {hasStatusEffects ? (
              <div className="space-y-2">
                {statusEffects.map((effect) => (
                  <div key={effect.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <div className="text-xs font-semibold text-yellow-400 mb-0.5">{effect.title}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">{effect.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground/40 text-center py-2">暂无异常状态</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
