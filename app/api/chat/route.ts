import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { messages, model, apiKey } = await req.json()

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

    // Forward the stream directly
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
