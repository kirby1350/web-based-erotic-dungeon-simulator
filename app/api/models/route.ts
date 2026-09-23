import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Proxy the DZMM model list so the API key stays server-side and CORS is avoided.
export async function GET() {
  const key = process.env.DZMM_API_TOKEN || process.env.CHAT_API_KEY
  if (!key) return NextResponse.json({ error: '请在服务端配置 DZMM_API_TOKEN' }, { status: 401 })

  try {
    const response = await fetch('https://api.sillytraven.dev/api/ai/v2/models', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
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
