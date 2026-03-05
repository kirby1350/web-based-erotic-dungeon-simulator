'use client'

import { cn } from '@/lib/utils'

interface StatBarProps {
  label: string
  value: number
  max?: number
  color?: 'gold' | 'rose' | 'pink' | 'blue' | 'green' | 'purple'
  size?: 'sm' | 'md'
  showValue?: boolean
  className?: string
}

const COLOR_MAP = {
  gold: {
    bar: 'bg-amber-400',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_6px_rgba(251,191,36,0.5)]',
  },
  rose: {
    bar: 'bg-rose-500',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_6px_rgba(244,63,94,0.5)]',
  },
  pink: {
    bar: 'bg-pink-400',
    text: 'text-pink-400',
    glow: 'shadow-[0_0_6px_rgba(244,114,182,0.5)]',
  },
  blue: {
    bar: 'bg-sky-400',
    text: 'text-sky-400',
    glow: 'shadow-[0_0_6px_rgba(56,189,248,0.4)]',
  },
  green: {
    bar: 'bg-emerald-400',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_6px_rgba(52,211,153,0.4)]',
  },
  purple: {
    bar: 'bg-violet-400',
    text: 'text-violet-400',
    glow: 'shadow-[0_0_6px_rgba(167,139,250,0.4)]',
  },
}

export function StatBar({
  label,
  value,
  max = 100,
  color = 'gold',
  size = 'md',
  showValue = true,
  className,
}: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const c = COLOR_MAP[color]

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'font-sans tracking-wide',
            size === 'sm' ? 'text-[10px] text-muted-foreground' : 'text-xs text-muted-foreground'
          )}
        >
          {label}
        </span>
        {showValue && (
          <span className={cn('font-mono font-semibold', size === 'sm' ? 'text-[10px]' : 'text-xs', c.text)}>
            {value}/{max}
          </span>
        )}
      </div>
      <div
        className={cn(
          'w-full rounded-full overflow-hidden bg-secondary',
          size === 'sm' ? 'h-1' : 'h-1.5'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', c.bar, c.glow)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
