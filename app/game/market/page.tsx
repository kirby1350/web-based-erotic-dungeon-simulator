'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getGameSave, saveGameSave, getSettings } from '@/lib/storage'
import { GameSave, AppSettings } from '@/lib/types'
import { MarketScreen } from '@/components/market-screen'

export default function MarketPage() {
  const router = useRouter()
  const [save, setSave] = useState<GameSave | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loaded, setLoaded] = useState(false)

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

  if (!loaded || !save || !settings) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <MarketScreen save={save} settings={settings} onSaveChange={handleSaveChange} />
}
