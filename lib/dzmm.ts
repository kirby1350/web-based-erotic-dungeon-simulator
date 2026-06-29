// DZMM platform SDK adapter.
//
// On the DZMM platform the app runs inside an iframe and the host injects a
// global `window.dzmm` SDK — there is no server proxy and no API keys. When the
// SDK is absent (local self-host / normal Next.js), we fall back to the existing
// /api/* routes. This keeps ONE codebase serving both targets at runtime.

import { streamChatDeltas } from '@/lib/sse'

interface DzmmCompletionsOpts {
  model: string
  messages: { role: string; content: string }[]
  maxTokens?: number
}
// fullText is the cumulative text so far (not a delta); done flips true at the end
type DzmmCompletionsCb = (fullText: string, done: boolean) => void

interface DzmmDrawOpts {
  prompt: string
  negativePrompt?: string
  model?: string
  dimension?: string
  tagIds?: string[]
}

interface DzmmSDK {
  completions(opts: DzmmCompletionsOpts, cb: DzmmCompletionsCb): Promise<void>
  draw: { generate(opts: DzmmDrawOpts): Promise<{ images?: string[] }> }
  chat: {
    insert(id: null, msgs: { role: string; content: string }[]): Promise<void>
    list(): Promise<{ role: string; content: string }[]>
    clear(): Promise<void>
  }
}

declare global {
  interface Window {
    dzmm?: DzmmSDK
  }
}

const DZMM_MAX_TOKENS = 4096

let readyPromise: Promise<boolean> | null = null

// Resolves true once the host injects window.dzmm; false when not embedded.
// Cached, so the iframe handshake runs once.
export function dzmmReady(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (readyPromise) return readyPromise

  readyPromise = new Promise<boolean>((resolve) => {
    if (window.dzmm) { resolve(true); return }
    // Not inside an iframe → definitely self-host.
    if (window.parent === window) { resolve(false); return }

    // Embedded: announce ourselves and wait for the host's `dzmm:ready`.
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'dzmm:ready' || window.dzmm) {
        window.removeEventListener('message', handler)
        resolve(!!window.dzmm)
      }
    }
    window.addEventListener('message', handler)
    try { window.parent.postMessage('iframe:content-ready', '*') } catch { /* cross-origin */ }

    // Safety net: if the host never answers, fall back to self-host.
    setTimeout(() => {
      window.removeEventListener('message', handler)
      resolve(!!window.dzmm)
    }, 4000)
  })
  return readyPromise
}

export interface ChatStreamOpts {
  messages: { role: string; content: string }[]
  model: string
  apiKey?: string
  grokApiKey?: string
  signal?: AbortSignal
}

// Stream assistant text, invoking onDelta with incremental chunks.
// Uses window.dzmm.completions on-platform, else the /api/chat SSE route.
export async function chatStream(opts: ChatStreamOpts, onDelta: (delta: string) => void): Promise<void> {
  if (await dzmmReady()) {
    // The platform SDK takes a flat message list; mirror the rewrite and send
    // the system prompt as a leading user turn (safest across models).
    const messages = opts.messages.map((m) => (m.role === 'system' ? { ...m, role: 'user' } : m))
    let prev = ''
    await window.dzmm!.completions(
      { model: opts.model, messages, maxTokens: DZMM_MAX_TOKENS },
      (fullText) => {
        const delta = fullText.slice(prev.length)
        prev = fullText
        if (delta) onDelta(delta)
      },
    )
    return
  }

  // self-host fallback → /api/chat (SSE proxy with the user's keys)
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: opts.messages,
      model: opts.model,
      apiKey: opts.apiKey,
      grokApiKey: opts.grokApiKey,
    }),
    signal: opts.signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '请求失败')
  }
  await streamChatDeltas(res, onDelta)
}

// Generate images via the platform SDK (no polling). Returns image URLs.
export async function dzmmDraw(opts: { prompt: string; negativePrompt?: string; dimension?: string }): Promise<string[]> {
  const r = await window.dzmm!.draw.generate({
    prompt: opts.prompt,
    negativePrompt: opts.negativePrompt,
    model: 'anime',
    dimension: opts.dimension ?? 'portrait',
    tagIds: [],
  })
  return r?.images ?? []
}
