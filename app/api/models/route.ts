import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// Proxy the DZMM model list so the API key stays server-side and CORS is avoided.
export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key') || process.env.CHAT_API_KEY || ''

  try {
    const response = await fetch('https://www.gpt4novel.com/api/xiaoshuoai/ext/v2/models', {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `模型列表获取失败: ${err}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
