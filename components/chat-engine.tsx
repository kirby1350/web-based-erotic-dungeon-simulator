'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChatMessage, AppSettings } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ChatEngineHandle {
  sendMessage: (content: string) => Promise<void>
}

interface ChatEngineProps {
  systemPrompt: string
  messages: ChatMessage[]
  onMessagesChange: (msgs: ChatMessage[]) => void
  settings: AppSettings
  onAssistantReply?: (content: string) => void
  onStreamComplete?: (fullContent: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  showInput?: boolean
}

export const ChatEngine = forwardRef<ChatEngineHandle, ChatEngineProps>(
  function ChatEngine(
    {
      systemPrompt,
      messages,
      onMessagesChange,
      settings,
      onAssistantReply,
      onStreamComplete,
      disabled = false,
      placeholder = '输入你的行动…',
      className,
      showInput = true,
    },
    ref
  ) {
    const [input, setInput] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [streamingText, setStreamingText] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingText])

    const sendMessage = useCallback(
      async (content: string) => {
        if (!content.trim() || streaming) return

        const userMsg: ChatMessage = { role: 'user', content: content.trim() }
        const next = [...messages, userMsg]
        onMessagesChange(next)
        setInput('')
        setStreaming(true)
        setStreamingText('')

        const controller = new AbortController()
        abortRef.current = controller

        try {
          const provider = settings.chatModel.startsWith('grok') ? 'grok' : 'default'
          const apiKey =
            provider === 'grok' ? settings.grokApiKey : settings.chatApiKey

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                ...next,
              ],
              model: settings.chatModel,
              apiKey,
              stream: true,
            }),
          })

          if (!res.ok || !res.body) {
            throw new Error(`HTTP ${res.status}`)
          }

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let full = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            // SSE: "data: <text>\n\n"
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const text = line.slice(6)
                if (text === '[DONE]') continue
                try {
                  const parsed = JSON.parse(text)
                  const delta = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? ''
                  full += delta
                  setStreamingText(full)
                  onAssistantReply?.(full)
                } catch {
                  // plain text fallback
                  full += text
                  setStreamingText(full)
                }
              }
            }
          }

          if (full) {
            const assistantMsg: ChatMessage = { role: 'assistant', content: full }
            onMessagesChange([...next, assistantMsg])
            onStreamComplete?.(full)
          }
        } catch (err: unknown) {
          if ((err as Error)?.name !== 'AbortError') {
            const errMsg: ChatMessage = {
              role: 'assistant',
              content: '[连接失败，请检查 API 设置]',
            }
            onMessagesChange([...next, errMsg])
          }
        } finally {
          setStreaming(false)
          setStreamingText('')
          abortRef.current = null
        }
      },
      [messages, streaming, systemPrompt, settings, onMessagesChange, onAssistantReply, onStreamComplete]
    )

    useImperativeHandle(ref, () => ({ sendMessage }))

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    }

    const stopStream = () => {
      abortRef.current?.abort()
    }

    const allMessages = streaming
      ? [...messages, { role: 'assistant' as const, content: streamingText }]
      : messages

    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {allMessages
            .filter((m) => m.role !== 'system')
            .map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user' ? 'message-user ml-8' : 'message-ai mr-4'
                )}
              >
                {msg.role === 'user' && (
                  <p className="text-[10px] text-muted-foreground mb-1">你</p>
                )}
                <p className="whitespace-pre-wrap text-foreground/90">
                  {msg.content}
                  {msg.role === 'assistant' && streaming && i === allMessages.filter((m) => m.role !== 'system').length - 1 && (
                    <span className="inline-block w-1 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
                  )}
                </p>
              </div>
            ))}
          {allMessages.filter((m) => m.role !== 'system').length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground/40 italic">故事即将展开…</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {showInput && (
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || streaming}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-input text-sm"
              rows={2}
            />
            {streaming ? (
              <Button
                size="icon"
                variant="destructive"
                className="h-9 w-9 shrink-0"
                onClick={stopStream}
              >
                <Square className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 glow-btn"
                disabled={!input.trim() || disabled}
                onClick={() => sendMessage(input)}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }
)
