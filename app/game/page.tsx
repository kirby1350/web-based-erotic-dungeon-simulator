'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'
import { getGameSave, saveGameSave, getSettings, saveSettings, clearGameSave } from '@/lib/storage'
import { GameSave, AppSettings } from '@/lib/types'
import { DailyHub } from '@/components/daily-hub'
import { ServiceScreen } from '@/components/service-screen'
import { MarketScreen } from '@/components/market-screen'
import { SettingsPanel } from '@/components/settings-panel'
import { Button } from '@/components/ui/button'

export type GameTab = 'hub' | 'service' | 'training' | 'market'

export default function GamePage() {
  const router = useRouter()
  const [save, setSave] = useState<GameSave | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<GameTab>('hub')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 4000)
      return
    }
    clearGameSave()
    router.replace('/setup')
  }

  useEffect(() => {
    const s = getGameSave()
    if (!s) { router.replace('/setup'); return }
    setSave(s)
    setSettings(getSettings())
    setLoaded(true)
  }, [router])

  const handleSaveChange = (updated: GameSave) => {
    setSave(updated)
    saveGameSave(updated)
  }

  const handleSettingsChange = (updated: AppSettings) => {
    setSettings(updated)
    saveSettings(updated)
  }

  if (!loaded || !save || !settings) {
    return (
      <div className="h-screen flex items-center justify-center bg-[oklch(0.07_0.01_260)]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    /* outer canvas — very dark background */
    <div className="min-h-screen bg-[oklch(0.07_0.01_260)] flex items-center justify-center p-4 sm:p-6">
      {/* centered frame */}
      <div className="relative w-full max-w-2xl h-[92vh] max-h-[860px] rounded-xl overflow-hidden dungeon-frame bg-background flex flex-col">

        {/* tab content fills the frame */}
        {activeTab === 'hub' && (
          <DailyHub
            save={save}
            settings={settings}
            onSaveChange={handleSaveChange}
            onNavigate={setActiveTab}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {(activeTab === 'service' || activeTab === 'training') && (
          <ServiceScreen
            key={activeTab}
            save={save}
            type={activeTab === 'service' ? 'service' : 'training'}
            settings={settings}
            onSaveChange={handleSaveChange}
            onBack={() => setActiveTab('hub')}
          />
        )}
        {activeTab === 'market' && (
          <MarketScreen
            save={save}
            settings={settings}
            onSaveChange={handleSaveChange}
            onBack={() => setActiveTab('hub')}
          />
        )}

        {/* Settings drawer — slides in from right, scoped inside frame */}
        <div
          className={`absolute inset-y-0 right-0 w-80 bg-card border-l border-border flex flex-col z-50 transition-transform duration-300 ease-in-out ${settingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-bold gold-text">设置</h2>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSettingsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
          </div>
          {/* 危险操作 — 重置存档 */}
          <div className="shrink-0 border-t border-rose-500/20 p-4">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">危险操作</p>
            <Button
              variant="outline"
              size="sm"
              className={`w-full h-8 text-xs ${confirmReset ? 'border-rose-500 text-rose-400 hover:bg-rose-500/10' : 'border-rose-500/30 text-rose-400/60 hover:border-rose-500 hover:text-rose-400'}`}
              onClick={handleReset}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {confirmReset ? '再次点击确认重置' : '重置存档'}
            </Button>
          </div>
        </div>

        {/* Settings backdrop (inside frame) */}
        {settingsOpen && (
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
