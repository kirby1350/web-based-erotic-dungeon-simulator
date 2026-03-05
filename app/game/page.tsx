'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getGameSave, saveGameSave } from '@/lib/storage'
import { GameSave } from '@/lib/types'
import { DailyHub } from '@/components/daily-hub'
import { getSettings } from '@/lib/storage'

export default function GamePage() {
  const router = useRouter()
  const [save, setSave] = useState<GameSave | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const s = getGameSave()
    if (!s) {
      router.replace('/setup')
      return
    }
    // Inject settings into save for API access
    const settings = getSettings()
    setSave({ ...s, player: { ...s.player } } as GameSave & { settings: typeof settings })
    setLoaded(true)
  }, [router])

  const handleSaveChange = (updated: GameSave) => {
    setSave(updated)
    saveGameSave(updated)
  }

  if (!loaded || !save) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <DailyHub save={save} onSaveChange={handleSaveChange} />
}
