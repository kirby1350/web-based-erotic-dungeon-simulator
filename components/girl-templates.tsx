'use client'

import { useState } from 'react'
import { Check, ImageIcon } from 'lucide-react'
import { GIRL_TEMPLATES, GIRL_TEMPLATE_IMAGES, RACES } from '@/lib/game-data'
import { MonstGirl } from '@/lib/types'
import { StatBar } from '@/components/stat-bar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface GirlTemplatesProps {
  onSelect: (template: Omit<MonstGirl, 'id' | 'imageUrl'>, idx: number) => void
}

export function GirlTemplates({ onSelect }: GirlTemplatesProps) {
  const [selected, setSelected] = useState<number | null>(null)

  const handleSelect = (idx: number) => {
    setSelected(idx)
    onSelect(GIRL_TEMPLATES[idx], idx)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {GIRL_TEMPLATES.map((tmpl, i) => {
        const race = RACES.find((r) => r.name === tmpl.race)
        const isSelected = selected === i
        const presetImage = GIRL_TEMPLATE_IMAGES[i] ?? null
        return (
          <button
            key={i}
            className={cn(
              'relative text-left rounded-xl border transition-all duration-200 overflow-hidden',
              isSelected
                ? 'border-primary dungeon-border'
                : 'border-border bg-card hover:border-primary/40'
            )}
            onClick={() => handleSelect(i)}
          >
            {/* Portrait area */}
            <div className="w-full aspect-[3/4] bg-muted/20 relative">
              {presetImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={presetImage} alt={tmpl.name} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-muted/10 to-muted/30">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/20" />
                  <span className="text-[9px] text-muted-foreground/30">{tmpl.race}</span>
                </div>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              {/* Name overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                <p className="text-xs font-semibold gold-text leading-none">{tmpl.name}</p>
                <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0 mt-1">{tmpl.race}</Badge>
              </div>
            </div>

            {/* Stats footer */}
            <div className="p-2.5 space-y-1.5 bg-card">
              <StatBar label="好感" value={tmpl.affection} color="pink" size="sm" showValue={false} />
              <StatBar label="服从" value={tmpl.obedience} color="blue" size="sm" showValue={false} />
              <StatBar label="淫乱" value={tmpl.lewdness} color="rose" size="sm" showValue={false} />
              {race && (
                <p className="text-[9px] text-muted-foreground/50 leading-relaxed line-clamp-1 mt-0.5">
                  {race.description}
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
