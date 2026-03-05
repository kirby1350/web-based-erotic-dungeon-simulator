'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getGameSave, saveGameSave, getSettings } from '@/lib/storage'
import { GameSave, AppSettings } from '@/lib/types'
import { DailyHub } from '@/components/daily-hub'
import { ServiceScreen } from '@/components/service-screen'
import { MarketScreen } from '@/components/market-screen'

export type GameTab = 'hub' | 'service' | 'training' | 'market'

export default function GamePage() {
  const router = useRouter()
  const [save, setSave] = useState<GameSave | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<GameTab>('hub')

  useEffect(() => {
    const s = getGameSave()
    if (!s) {
      router.replace('/setup')
      return
    }
    setSave(s)
    setSettings(getSettings())
    setLoaded(true)
  }, [router])

  const handleSaveChange = (updated: GameSave) => {
    setSave(updated)
    saveGameSave(updated)
  }

  if (!loaded || !save || !settings) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden">
      {activeTab === 'hub' && (
        <DailyHub
          save={save}
          settings={settings}
          onSaveChange={handleSaveChange}
          onNavigate={setActiveTab}
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
    </div>
  )
}
