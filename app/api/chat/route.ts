import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODELS } from '@/lib/types'

export const runtime = 'edge'

/**
 * Parse a raw SSE body (text) into a single concatenated content string.
 * Handles both streaming and non-streaming JSON responses from the upstream API.
 */
function parseSseToContent(raw: string): string {
  // If it's a plain JSON object (non-streaming upstream), try that first
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      return parsed.choices?.[0]?.message?.content ?? parsed.choices?.[0]?.delta?.content ?? ''
    } catch {
      // fall through to SSE parsing
    }
  }

  // SSE stream parsing — upstream always returns SSE even when stream=false
  let content = ''
  for (const line of raw.split('\n')) {
    const stripped = line.trim()
    if (!stripped.startsWith('data:')) continue
    const data = stripped.slice(5).trim()
    if (data === '[DONE]') break
    try {
      const chunk = JSON.parse(data)
      const delta =
        chunk.choices?.[0]?.delta?.content ??
        chunk.choices?.[0]?.message?.content ??
        ''
      content += delta
    } catch {
      // skip malformed lines
    }
  }
  return content
}

export async function POST(req: NextRequest) {
  const { messages, model, apiKey, grokApiKey, stream: streamMode = true } = await req.json()

  const modelMeta = CHAT_MODELS.find((m) => m.value === model)
  const isGrok = modelMeta?.provider === 'grok'

  if (isGrok) {
    const key = grokApiKey || process.env.GROK_API_KEY
    if (!key) {
      return NextResponse.json({ error: '未配置 Grok API Key' }, { status: 401 })
    }
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'grok-4-latest',
          messages,
          stream: streamMode,
          temperature: 0.9,
        }),
      })
      if (!response.ok) {
        const err = await response.text()
        return NextResponse.json({ error: `Grok API 错误: ${err}` }, { status: response.status })
      }
      if (!streamMode) {
        const raw = await response.text()
        const content = parseSseToContent(raw)
        return NextResponse.json({ content })
      }
      return new NextResponse(response.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  // Default: gpt4novel provider
  const key = apiKey || process.env.CHAT_API_KEY
  if (!key) {
    return NextResponse.json({ error: '未配置 Chat API Key' }, { status: 401 })
  }

  try {
    const response = await fetch(
      'https://www.gpt4novel.com/api/xiaoshuoai/ext/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'Apex-Neo-0213-16k',
          messages,
          stream: true, // always request streaming; we parse SSE for non-stream callers
          temperature: 0.9,
          max_tokens: 2048,
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `API 错误: ${err}` }, { status: response.status })
    }

    if (!streamMode) {
      // Upstream always returns SSE; read full body and extract content
      const raw = await response.text()
      const content = parseSseToContent(raw)
      return NextResponse.json({ content })
    }

    return new NextResponse(response.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
