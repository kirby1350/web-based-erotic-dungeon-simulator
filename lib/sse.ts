// Parse an OpenAI-style SSE chat-completion stream.
//
// Network chunks don't align to SSE line boundaries — a single `data: {...}`
// line can be split across two reads. We buffer across chunks and only hand
// off complete lines, so no token is dropped or mangled mid-flight.
export async function streamChatDeltas(
  response: Response,
  onDelta: (content: string) => void,
): Promise<void> {
  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = (raw: string) => {
    const line = raw.trim()
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    try {
      const delta = JSON.parse(data).choices?.[0]?.delta?.content
      if (delta) onDelta(delta)
    } catch {
      // keep-alive / non-JSON line — safe to ignore
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) !== -1) {
      handleLine(buffer.slice(0, nl))
      buffer = buffer.slice(nl + 1)
    }
  }
  // flush any trailing line that arrived without a closing newline
  buffer += decoder.decode()
  if (buffer) handleLine(buffer)
}
