'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getGameSave, saveGameSave, getSettings } from '@/lib/storage'
import { GameSave, AppSettings } from '@/lib/types'
import { ServiceScreen } from '@/components/service-screen'

function ServicePageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const type = (params.get('type') ?? 'service') as 'service' | 'training'

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

  return (
    <ServiceScreen
      save={save}
      type={type}
      settings={settings}
      onSaveChange={handleSaveChange}
    />
  )
}

export default function ServicePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ServicePageInner />
    </Suspense>
  )
}
