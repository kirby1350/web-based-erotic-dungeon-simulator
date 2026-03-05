'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { GIRL_TEMPLATES, RACES } from '@/lib/game-data'
import { MonstGirl } from '@/lib/types'
import { StatBar } from '@/components/stat-bar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface GirlTemplatesProps {
  onSelect: (template: Omit<MonstGirl, 'id' | 'imageUrl'>) => void
}

export function GirlTemplates({ onSelect }: GirlTemplatesProps) {
  const [selected, setSelected] = useState<number | null>(null)

  const handleSelect = (idx: number) => {
    setSelected(idx)
    onSelect(GIRL_TEMPLATES[idx])
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {GIRL_TEMPLATES.map((tmpl, i) => {
        const race = RACES.find((r) => r.name === tmpl.race)
        const isSelected = selected === i
        return (
          <button
            key={i}
            className={cn(
              'relative text-left rounded-xl border p-4 transition-all duration-200 space-y-2.5',
              isSelected
                ? 'border-primary bg-primary/10 dungeon-border'
                : 'border-border bg-card hover:border-primary/40 hover:bg-card/80'
            )}
            onClick={() => handleSelect(i)}
          >
            {isSelected && (
              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}

            {/* Header */}
            <div>
              <p className="text-sm font-semibold gold-text">{tmpl.name}</p>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 py-0 mt-1">
                {tmpl.race}
              </Badge>
            </div>

            {/* Personality snippet */}
            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
              {tmpl.personality}
            </p>

            {/* Mini stats */}
            <div className="space-y-1.5">
              <StatBar label="好感度" value={tmpl.affection} color="pink" size="sm" showValue={false} />
              <StatBar label="服从度" value={tmpl.obedience} color="blue" size="sm" showValue={false} />
              <StatBar label="淫乱度" value={tmpl.lewdness} color="rose" size="sm" showValue={false} />
            </div>

            {/* Race description */}
            {race && (
              <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
                {race.description}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
