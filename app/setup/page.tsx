'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayerSetup } from '@/components/player-setup'
import { GirlCreator } from '@/components/girl-creator'
import { Player, MonstGirl } from '@/lib/types'
import { getSettings } from '@/lib/storage'
import { saveGameSave } from '@/lib/storage'
import { cn } from '@/lib/utils'

type SetupStep = 'player' | 'girl'

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
    saveGameSave({
      player,
      girls: [girl],
      currentDay: 1,
      phase: 'morning',
    })
    router.push('/game')
  }

  const STEPS: { key: SetupStep; label: string }[] = [
    { key: 'player', label: '馆主信息' },
    { key: 'girl', label: '初始魔物娘' },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold gold-text tracking-wide">魔物娘娼馆</h1>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-border" />}
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
                      step === s.key
                        ? 'bg-primary border-primary text-primary-foreground'
                        : s.key === 'girl' && step === 'girl'
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-secondary border-border text-muted-foreground'
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs hidden sm:block',
                      step === s.key ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-3xl w-full mx-auto px-6 py-8 flex-1">
          {step === 'player' && (
            <div>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-foreground">馆主信息</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  请设定你的名字和个人特性，这将影响 AI 生成的故事内容
                </p>
              </div>
              <PlayerSetup onComplete={handlePlayerComplete} />
            </div>
          )}

          {step === 'girl' && (
            <div>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-foreground">初始魔物娘</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  选择你的第一位魔物娘并自定义她的设定，她将是你娼馆的基石
                </p>
              </div>
              <GirlCreator settings={settings} onComplete={handleGirlComplete} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
