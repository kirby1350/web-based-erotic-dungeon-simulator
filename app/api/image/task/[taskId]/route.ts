import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const apiKey = req.headers.get('x-pixai-key') || process.env.PIXAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: '未配置 PixAI API Key' }, { status: 401 })
  }

  try {
    const response = await fetch(`https://api.pixai.art/v1/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
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
