'use client'

import { useState, useCallback, useRef } from 'react'
import { Settings } from 'lucide-react'
import { Character, AppSettings } from '@/lib/types'
import { getSettings, saveCharacter } from '@/lib/storage'
import { CharacterCard } from '@/components/character-card'
import { ChatPanel } from '@/components/chat-panel'
import { ImagePanel } from '@/components/image-panel'
import { SettingsPanel } from '@/components/settings-panel'

export type ExploreActions = { explore: () => void; advanceFloor: () => void }
interface GameScreenProps { character: Character; onReset: () => void }

export function GameScreen({ character: initialCharacter, onReset }: GameScreenProps) {
  const [character, setCharacter] = useState<Character>(initialCharacter)
  const [settings, setSettings] = useState<AppSettings>(() => getSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [pendingScene, setPendingScene] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'chat' | 'image'>('chat')
  const [busy, setBusy] = useState(false)
  const actions = useRef<ExploreActions>({ explore: () => {}, advanceFloor: () => {} })
  const handleRequestImage = useCallback((scene: string) => { setPendingScene(scene) }, [])
  const handleSceneHandled = useCallback(() => setPendingScene(undefined), [])
  const handleCharacterUpdate = useCallback((updates: Partial<Character>) => {
    setCharacter((previous) => {
      const next = { ...previous, ...updates }
      saveCharacter(next)
      return next
    })
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <h1 className="text-base font-bold gold-text tracking-widest">地下城探险</h1>
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs text-muted-foreground">
          <Settings className="w-3.5 h-3.5" />设置
        </button>
      </header>
      <div className="flex md:hidden border-b border-border">
        {(['chat', 'image'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-xs ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {tab === 'chat' ? '冒险日志' : `场景插图${pendingScene ? ' •' : ''}`}
          </button>
        ))}
      </div>
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <section className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[55%] md:border-r border-border min-h-0`}>
          <CharacterCard character={character} busy={busy} onReset={() => { if (!busy) onReset() }}
            onExplore={() => { if (!busy) actions.current.explore() }} onAdvanceFloor={() => { if (!busy) actions.current.advanceFloor() }} />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel character={character} settings={settings} onRequestImage={handleRequestImage}
              onCharacterUpdate={handleCharacterUpdate} onTurnCommit={setCharacter} onBusyChange={setBusy} exploreActionsRef={actions} />
          </div>
        </section>
        <section className={`${activeTab === 'image' ? 'block' : 'hidden'} md:block w-full md:w-[45%] min-h-0 overflow-hidden`}>
          <ImagePanel settings={settings} character={character} pendingScene={pendingScene} onSceneHandled={handleSceneHandled} />
        </section>
      </main>
      {showSettings && <SettingsPanel settings={settings} onSettingsChange={setSettings} onClose={() => setShowSettings(false)} canImport={!busy} />}
    </div>
  )
}
