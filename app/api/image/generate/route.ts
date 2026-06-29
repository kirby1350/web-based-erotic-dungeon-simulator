import { NextRequest, NextResponse } from 'next/server'

const PIXAI_ENDPOINT = 'https://api.pixai.art/v1/task'
const DEFAULT_PIXAI_MODEL_ID = '1861558740588989558'
const DEFAULT_IMAGE_WIDTH = 768
const DEFAULT_IMAGE_HEIGHT = 1024
const DEFAULT_BATCH_SIZE = 1

export async function POST(req: NextRequest) {
  const { prompts, modelId, width, height, batchSize, apiKey } = await req.json()

  const key = apiKey || process.env.PIXAI_API_KEY

  if (!key) {
    return NextResponse.json({ error: '未配置 PixAI API Key' }, { status: 401 })
  }

  try {
    const response = await fetch(PIXAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        parameters: {
          prompts,
          modelId: modelId || DEFAULT_PIXAI_MODEL_ID,
          width: width || DEFAULT_IMAGE_WIDTH,
          height: height || DEFAULT_IMAGE_HEIGHT,
          batchSize: batchSize || DEFAULT_BATCH_SIZE,
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
