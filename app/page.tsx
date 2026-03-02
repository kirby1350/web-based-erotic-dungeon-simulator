'use client'

import { useState, useEffect } from 'react'
import { Character } from '@/lib/types'
import { getCharacter, saveCharacter, clearCharacter } from '@/lib/storage'
import { CharacterCreator } from '@/components/character-creator'
import { GameScreen } from '@/components/game-screen'

export default function HomePage() {
  const [character, setCharacter] = useState<Character | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = getCharacter()
    if (saved) setCharacter(saved)
    setLoaded(true)
  }, [])

  const handleCharacterComplete = (char: Character) => {
    saveCharacter(char)
    setCharacter(char)
  }

  const handleReset = () => {
    clearCharacter()
    setCharacter(null)
  }

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">载入中...</p>
        </div>
      </div>
    )
  }

  if (!character) {
    return <CharacterCreator onComplete={handleCharacterComplete} />
  }

  return <GameScreen character={character} onReset={handleReset} />
}
