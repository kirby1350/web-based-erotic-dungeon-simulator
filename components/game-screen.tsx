'use client'

import { useState, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { Character, AppSettings } from '@/lib/types'
import { getSettings } from '@/lib/storage'
import { CharacterCard } from '@/components/character-card'
import { ChatPanel } from '@/components/chat-panel'
import { ImagePanel } from '@/components/image-panel'
import { SettingsPanel } from '@/components/settings-panel'

interface GameScreenProps {
  character: Character
  onReset: () => void
}

export function GameScreen({ character: initialCharacter, onReset }: GameScreenProps) {
  const [character, setCharacter] = useState<Character>(initialCharacter)
  const [settings, setSettings] = useState<AppSettings>(() => getSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [pendingScene, setPendingScene] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'chat' | 'image'>('chat')

  const handleRequestImage = useCallback((scene: string) => {
    setPendingScene(scene)
    setActiveTab('image')
  }, [])

  const handleSceneHandled = useCallback(() => {
    setPendingScene(undefined)
  }, [])

  const handleCharacterUpdate = useCallback((updates: Partial<Character>) => {
    setCharacter((prev) => ({ ...prev, ...updates }))
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <h1 className="text-base font-bold gold-text tracking-widest">地下城探险</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:border-primary/60 transition-colors text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-3.5 h-3.5" />
          设置
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Desktop: two-column layout */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* Left: character info + chat */}
          <div className="w-[55%] flex flex-col border-r border-border overflow-hidden">
            <CharacterCard character={character} onReset={onReset} />
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                character={character}
                settings={settings}
                onRequestImage={handleRequestImage}
                onCharacterUpdate={handleCharacterUpdate}
              />
            </div>
          </div>

          {/* Right: image */}
          <div className="w-[45%] overflow-hidden">
            <ImagePanel
              settings={settings}
              character={character}
              pendingScene={pendingScene}
              onSceneHandled={handleSceneHandled}
            />
          </div>
        </div>

        {/* Mobile: tabbed layout */}
        <div className="flex md:hidden flex-col flex-1 overflow-hidden">
          <div className="flex border-b border-border flex-shrink-0">
            {[
              { key: 'chat', label: '冒险日志' },
              { key: 'image', label: '场景插图' + (pendingScene ? ' •' : '') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as 'chat' | 'image')}
                className={`flex-1 py-2.5 text-xs font-semibold tracking-wider transition-colors ${
                  activeTab === key
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <CharacterCard character={character} onReset={onReset} />

          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <ChatPanel
                character={character}
                settings={settings}
                onRequestImage={handleRequestImage}
                onCharacterUpdate={handleCharacterUpdate}
              />
            ) : (
              <ImagePanel
                settings={settings}
                character={character}
                pendingScene={pendingScene}
                onSceneHandled={handleSceneHandled}
              />
            )}
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
