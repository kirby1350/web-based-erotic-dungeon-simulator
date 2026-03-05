'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Star, Shield, Flame, Wand2 } from 'lucide-react'
import { MonstGirl } from '@/lib/types'
import { StatBar } from '@/components/stat-bar'
import { ImageDisplay } from '@/components/image-display'
import { AppSettings } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface GirlCardProps {
  girl: MonstGirl
  settings: AppSettings
  onImageCached?: (id: string, url: string) => void
  selected?: boolean
  onSelect?: (girl: MonstGirl) => void
  compact?: boolean
  className?: string
}

export function GirlCard({
  girl,
  settings,
  onImageCached,
  selected = false,
  onSelect,
  compact = false,
  className,
}: GirlCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        selected
          ? 'border-primary bg-card dungeon-border'
          : 'border-border bg-card hover:border-primary/40',
        onSelect && 'cursor-pointer',
        className
      )}
      onClick={() => onSelect?.(girl)}
    >
      {/* Image section */}
      {!compact && (
        <div className="relative">
          <ImageDisplay
            tags={girl.imageTags}
            settings={settings}
            cachedUrl={girl.imageUrl}
            onUrlCached={(url) => onImageCached?.(girl.id, url)}
            alt={girl.name}
            className="w-full aspect-[3/4] rounded-none"
          />
          {selected && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Info section */}
      <div className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold gold-text leading-tight">{girl.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 py-0">
                {girl.race}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{girl.age}岁</span>
            </div>
          </div>
          {compact && (
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-1.5">
          <StatBar label="好感度" value={girl.affection} color="pink" size="sm" />
          <StatBar label="服从度" value={girl.obedience} color="blue" size="sm" />
          <StatBar label="淫乱度" value={girl.lewdness} color="rose" size="sm" />
        </div>

        {/* Expanded details */}
        {(!compact || expanded) && (
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
              {girl.personality}
            </p>
            {girl.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {girl.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 py-0 border-primary/30 text-primary/80"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price (market) */}
        {girl.price !== undefined && girl.price > 0 && (
          <div className="pt-1 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">市场价格</span>
            <span className="text-sm font-bold gold-text">{girl.price} G</span>
          </div>
        )}
      </div>
    </div>
  )
}
