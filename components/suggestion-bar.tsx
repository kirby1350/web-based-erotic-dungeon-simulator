'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildSuggestionPrompt } from '@/lib/prompt-builder'
import { AppSettings } from '@/lib/types'

interface SuggestionBarProps {
  lastAssistantMessage: string
  sessionType: 'service' | 'training'
  playerTraits: string[]
  settings: AppSettings
  onSelect: (text: string) => void
  disabled?: boolean
}

export function SuggestionBar({
  lastAssistantMessage,
  sessionType,
  playerTraits,
  settings,
  onSelect,
  disabled = false,
}: SuggestionBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lastAssistantMessage) return
    const abortController = new AbortController()

    async function fetchSuggestions() {
      setLoading(true)
      setSuggestions([])
      try {
        const provider = settings.chatModel.startsWith('grok') ? 'grok' : 'default'
        const apiKey = provider === 'grok' ? settings.grokApiKey : settings.chatApiKey
        const prompt = buildSuggestionPrompt(sessionType, lastAssistantMessage, playerTraits)

        const res = await fetch('/api/chat', {
          method: 'POST',
          signal: abortController.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: settings.chatModel,
            apiKey,
            stream: false,
          }),
        })

        if (!res.ok) return
        const data = await res.json()
        const raw: string = data.content ?? data.text ?? ''
        const match = raw.match(/\[[\s\S]*\]/)
        if (match) {
          const parsed = JSON.parse(match[0]) as string[]
          setSuggestions(parsed.slice(0, 3))
        }
      } catch {
        // silently fail — suggestions are optional
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
    return () => abortController.abort()
  }, [lastAssistantMessage, sessionType, playerTraits, settings])

  if (!lastAssistantMessage) return null

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {loading ? (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-xs">生成建议中…</span>
        </div>
      ) : (
        suggestions.map((s, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-7 text-xs border-primary/30 text-primary/80 hover:bg-primary/10 hover:text-primary hover:border-primary/60"
            onClick={() => onSelect(s)}
          >
            {s}
          </Button>
        ))
      )}
    </div>
  )
}
