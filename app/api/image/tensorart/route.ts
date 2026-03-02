import { NextRequest, NextResponse } from 'next/server'

function randomRequestId(): string {
  return Array.from({ length: 18 }, () => Math.floor(Math.random() * 10)).join('')
}

export async function POST(req: NextRequest) {
  try {
    const { prompts, modelId, width = 768, height = 1280, apiKey } = await req.json()

    const key = apiKey || process.env.TENSORART_API_KEY
    if (!key) return NextResponse.json({ error: '未配置 TensorArt API Key' }, { status: 400 })

    const body = {
      request_id: randomRequestId(),
      stages: [
        {
          type: 'INPUT_INITIALIZE',
          inputInitialize: {
            seed: -1,
            count: 4,
          },
        },
        {
          type: 'DIFFUSION',
          diffusion: {
            width,
            height,
            prompts: [{ text: prompts }],
            negativePrompts: [
              {
                text: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
              },
            ],
            sdModel: modelId,
            sdVae: 'ae.sft',
            sampler: 'Euler a',
            steps: 25,
            cfgScale: 7,
            clipSkip: 2,
          },
        },
      ],
    }

    const res = await fetch('https://ap-east-1.tensorart.cloud/v1/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `TensorArt 提交失败: ${res.status} ${text}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
