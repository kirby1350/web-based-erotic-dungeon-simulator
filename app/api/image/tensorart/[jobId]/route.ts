import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const apiKey = req.headers.get('x-tensorart-key') || process.env.TENSORART_API_KEY

  if (!apiKey) return NextResponse.json({ error: '未配置 TensorArt API Key' }, { status: 400 })

  const res = await fetch(`https://ap-east-1.tensorart.cloud/v1/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: `查询失败: ${res.status}` }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
