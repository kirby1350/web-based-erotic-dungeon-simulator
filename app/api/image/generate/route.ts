import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompts, modelId, width, height, batchSize, apiKey } = await req.json()

  const key = apiKey || process.env.PIXAI_API_KEY

  if (!key) {
    return NextResponse.json({ error: '未配置 PixAI API Key' }, { status: 401 })
  }

  try {
    const response = await fetch('https://api.pixai.art/v1/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        parameters: {
          prompts,
          modelId: modelId || '1861558740588989558',
          width: width || 768,
          height: height || 1024,
          batchSize: batchSize || 1,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `PixAI 错误: ${err}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
