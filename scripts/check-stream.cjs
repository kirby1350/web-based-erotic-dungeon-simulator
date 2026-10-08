const assert = require('node:assert/strict')
const { createLoader } = require('./load-ts.cjs')
async function main() {
  let callback
  let finish
  global.window = { dzmm: { completions: (_options, onText) => { callback = onText; return new Promise((resolve) => { finish = resolve }) } } }
  const { chatStream } = createLoader()('@/lib/dzmm')
  const controller = new AbortController()
  const received = []
  const task = chatStream({ messages: [], model: 'fixture', signal: controller.signal }, (delta) => received.push(delta))
  await new Promise((resolve) => setImmediate(resolve))
  callback('开始')
  controller.abort()
  await assert.rejects(task, { name: 'AbortError' })
  callback('开始迟到的内容')
  finish()
  assert.deepEqual(received, ['开始'])
  const { streamChatDeltas } = createLoader()('@/lib/sse')
  const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"跨块中文"}}]}\n\ndata: [DONE]\n\n')
  const response = new Response(new ReadableStream({ start(stream) { for (const byte of bytes) stream.enqueue(Uint8Array.of(byte)); stream.close() } }))
  let content = ''
  await streamChatDeltas(response, (delta) => { content += delta })
  assert.equal(content, '跨块中文')
  console.log('Stream checks passed: SDK cancellation, late callbacks and split UTF-8 SSE.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
