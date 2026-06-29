import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODELS } from '@/lib/types'

export const runtime = 'edge'

const CHAT_TEMPERATURE = 0.9
// Generous cap: a rich scene plus the trailing [STATS]/[DESC] JSON must both fit,
// otherwise the structured tail gets truncated and can't be parsed.
const CHAT_MAX_TOKENS = 4096
const DEFAULT_CHAT_MODEL = 'x-apex-neo-16k'
const DEFAULT_GROK_MODEL = 'grok-4-latest'
const GROK_ENDPOINT = 'https://api.x.ai/v1/chat/completions'
const DZMM_ENDPOINT = 'https://www.gpt4novel.com/api/xiaoshuoai/ext/v1/chat/completions'

export async function POST(req: NextRequest) {
  const { messages, model, apiKey, grokApiKey } = await req.json()

  // Determine which provider to use based on the selected model
  const modelMeta = CHAT_MODELS.find((m) => m.value === model)
  const isGrok = modelMeta?.provider === 'grok'

  if (isGrok) {
    const key = grokApiKey || process.env.GROK_API_KEY
    if (!key) {
      return NextResponse.json({ error: '未配置 Grok API Key' }, { status: 401 })
    }
    try {
      const response = await fetch(GROK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || DEFAULT_GROK_MODEL,
          messages,
          stream: true,
          temperature: CHAT_TEMPERATURE,
        }),
      })
      if (!response.ok) {
        const err = await response.text()
        return NextResponse.json({ error: `Grok API 错误: ${err}` }, { status: response.status })
      }
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  // Default provider
  const key = apiKey || process.env.CHAT_API_KEY
  if (!key) {
    return NextResponse.json({ error: '未配置 Chat API Key' }, { status: 401 })
  }

  try {
    const response = await fetch(DZMM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_CHAT_MODEL,
        messages,
        stream: true,
        temperature: CHAT_TEMPERATURE,
        max_tokens: CHAT_MAX_TOKENS,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `API 错误: ${err}` }, { status: response.status })
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
