'use client'

import { Guest } from '@/lib/types'
import { ImageDisplay } from '@/components/image-display'
import { AppSettings } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { StatBar } from '@/components/stat-bar'
import { cn } from '@/lib/utils'

interface GuestCardProps {
  guest: Guest
  settings: AppSettings
  onImageCached?: (id: string, url: string) => void
  selected?: boolean
  onSelect?: (guest: Guest) => void
  compact?: boolean
  className?: string
}

export function GuestCard({
  guest,
  settings,
  onImageCached,
  selected = false,
  onSelect,
  compact = false,
  className,
}: GuestCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        selected
          ? 'border-amber-500/70 bg-card dungeon-border'
          : 'border-border bg-card hover:border-amber-500/30',
        onSelect && 'cursor-pointer',
        className
      )}
      onClick={() => onSelect?.(guest)}
    >
      {!compact && (
        <ImageDisplay
          tags={guest.imageTags}
          settings={settings}
          cachedUrl={guest.imageUrl}
          onUrlCached={(url) => onImageCached?.(guest.id, url)}
          alt={guest.name}
          className="w-full aspect-[3/4] rounded-none"
        />
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-amber-400 leading-tight">{guest.name}</h3>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 py-0 mt-0.5">
              {guest.race}
            </Badge>
          </div>
          {selected && (
            <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-background" />
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
          &ldquo;{guest.desires}&rdquo;
        </p>

        {!compact && (
          <>
            <p className="text-[10px] text-muted-foreground">{guest.personality}</p>
            {guest.traits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {guest.traits.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 py-0 border-amber-500/30 text-amber-400/70"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            <StatBar label="满意度" value={guest.satisfaction} color="gold" size="sm" />
          </>
        )}
      </div>
    </div>
  )
}
