'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayerSetup } from '@/components/player-setup'
import { GirlCreator } from '@/components/girl-creator'
import { Player, MonstGirl } from '@/lib/types'
import { getSettings, saveGameSave } from '@/lib/storage'
import { cn } from '@/lib/utils'

type SetupStep = 'player' | 'girl'

const STEPS: { key: SetupStep; label: string }[] = [
  { key: 'player', label: '馆主信息' },
  { key: 'girl', label: '初始魔物娘' },
]

export default function SetupPage() {
  const router = useRouter()
  const settings = getSettings()
  const [step, setStep] = useState<SetupStep>('player')
  const [player, setPlayer] = useState<Player | null>(null)

  const handlePlayerComplete = (p: Player) => {
    setPlayer(p)
    setStep('girl')
  }

  const handleGirlComplete = (girl: MonstGirl) => {
    if (!player) return
    saveGameSave({ player, girls: [girl], currentDay: 1, phase: 'morning' })
    router.push('/game')
  }

  return (
    <div className="min-h-screen bg-[oklch(0.07_0.01_260)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl min-h-[92vh] max-h-[860px] rounded-xl dungeon-frame bg-background flex flex-col overflow-hidden">

        {/* Header */}
        <header className="border-b border-border px-5 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-bold gold-text tracking-wide">魔物娘娼馆</h1>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors',
                    step === s.key
                      ? 'bg-primary border-primary text-primary-foreground'
                      : i < STEPS.findIndex(x => x.key === step)
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-secondary border-border text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn(
                    'text-xs hidden sm:block transition-colors',
                    step === s.key ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 py-6">
          {step === 'player' && (
            <>
              <div className="mb-6">
                <h2 className="text-base font-bold text-foreground">馆主信息</h2>
                <p className="text-xs text-muted-foreground mt-1">设定你的名字和个人特性，这将影响 AI 生成的故事内容</p>
              </div>
              <PlayerSetup onComplete={handlePlayerComplete} />
            </>
          )}
          {step === 'girl' && (
            <>
              <div className="mb-6">
                <h2 className="text-base font-bold text-foreground">初始魔物娘</h2>
                <p className="text-xs text-muted-foreground mt-1">选择你的第一位魔物娘并自定义她的设定</p>
              </div>
              <GirlCreator settings={settings} onComplete={handleGirlComplete} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
