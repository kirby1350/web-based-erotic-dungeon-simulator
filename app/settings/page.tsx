'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { getSettings, saveSettings, clearGameSave, getGameSave } from '@/lib/storage'
import { AppSettings } from '@/lib/types'
import { SettingsPanel } from '@/components/settings-panel'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hasSave, setHasSave] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
    setHasSave(!!getGameSave())
  }, [])

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s)
    saveSettings(s)
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 4000)
      return
    }
    clearGameSave()
    router.push('/setup')
  }

  if (!settings) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-bold gold-text">设置</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
        </div>

        {hasSave && (
          <div className="bg-card border border-rose-500/20 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              危险操作
            </h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">重置存档</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  删除当前存档并返回角色创建界面，此操作不可撤销
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={
                  confirmReset
                    ? 'border-rose-500 text-rose-400 hover:bg-rose-500/10'
                    : 'border-rose-500/30 text-rose-400/70 hover:border-rose-500 hover:text-rose-400'
                }
                onClick={handleReset}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {confirmReset ? '再次点击确认' : '重置存档'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
