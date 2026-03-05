import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODELS } from '@/lib/types'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { messages, model, apiKey, grokApiKey } = await req.json()

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
          stream: true,
          temperature: 0.9,
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
          stream: true,
          temperature: 0.9,
          max_tokens: 2048,
        }),
      }
    )

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
