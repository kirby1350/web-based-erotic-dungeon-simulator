'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getGameSave } from '@/lib/storage'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const save = getGameSave()
    if (save) {
      router.replace('/game')
    } else {
      router.replace('/setup')
    }
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm gold-text tracking-widest">魔物娘娼馆</p>
      </div>
    </div>
  )
}

