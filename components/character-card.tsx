'use client'

import { Character } from '@/lib/types'
import { RACE_INFO } from '@/lib/types'
import { Heart, Shield, Zap, Brain, RotateCcw, Flame, Sparkles } from 'lucide-react'

interface CharacterCardProps {
  character: Character
  onReset: () => void
}

export function CharacterCard({ character, onReset }: CharacterCardProps) {
  const raceInfo = RACE_INFO[character.race]

  return (
    <div className="p-3 border-b border-border">
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
        {/* 快感度 */}
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
        {/* 欲望值 */}
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
  )
}
