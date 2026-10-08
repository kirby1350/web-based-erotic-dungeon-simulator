const { test, expect } = require('@playwright/test')
const { character, reply } = require('../scripts/fixtures/adventure.cjs')
const seedSession = { messages: [
  { role: 'user', content: '检查石门', timestamp: 1, turnId: 'seed_1' },
  { role: 'assistant', content: reply(), timestamp: 2, turnId: 'seed_1' },
], summary: '', memory: { version: 1, entries: [] } }
const read = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon_game_v2')))
const sse = (content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`
const respond = (route, content) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(content) })

for (const mode of ['skip', 'timeout']) {
  test(`stalled summary ${mode} unlocks play and preserves the save`, async ({ page }) => {
    const session = { ...seedSession, messages: Array.from({ length: 10 }, (_, index) =>
      seedSession.messages.map(message => ({ ...message, turnId: `summary_${index}` }))).flat() }
    await setup(page, session)
    await page.clock.install()
    let release
    const gate = new Promise(resolve => { release = resolve })
    await page.route('**/api/chat', async route => {
      await gate
      await respond(route, JSON.stringify({ summary: 'Late summary', updates: [] })).catch(() => {})
    })
    await page.goto('/')
    const skip = page.getByRole('button', { name: '跳过摘要', exact: true })
    await expect(skip).toBeVisible()
    const before = await read(page)
    if (mode === 'skip') await skip.click()
    else await page.clock.fastForward(60_001)
    await expect(skip).toHaveCount(0)
    await expect(page.getByRole('button', { name: '探索', exact: true })).toBeEnabled()
    await expect(page.getByText(mode === 'skip'
      ? '已跳过摘要，原始对话已保留，可以继续游戏'
      : '摘要整理超时，已保留原始对话，可以继续游戏', { exact: true })).toBeVisible()
    release()
    expect(await read(page)).toEqual(before)
  })
}

async function setup(page, session = seedSession) {
  // All browser storage belongs to a fresh Playwright context, never the user's profile.
  await page.addInitScript(({ character, session }) => {
    if (localStorage.getItem('test_seeded')) return
    localStorage.setItem('test_seeded', '1')
    localStorage.setItem('dungeon_game_v2', JSON.stringify({ version: 2, character, session }))
  }, { character, session })
  await page.route('https://**/*', (route) => route.abort())
  // Prevent any fallback request to real chat or image services.
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Mock-only test"}' }))
}

test('network failure, reload and retry commit exactly one exploration turn', async ({ page }) => {
  await setup(page)
  const requests = []
  await page.route('**/api/chat', async (route) => {
    requests.push(route.request().postDataJSON())
    if (requests.length === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"模拟断网"}' })
    return respond(route, reply())
  })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await expect(page.getByRole('button', { name: '继续生成', exact: true })).toBeVisible()
  const failed = await read(page)
  expect(failed.character.explorationProgress).toBe(40)
  expect(failed.session.messages).toHaveLength(2)
  const id = failed.session.pendingTurn.id
  await page.reload()
  await page.getByRole('button', { name: '继续生成', exact: true }).click()
  await expect.poll(async () => (await read(page)).session.pendingTurn).toBeNull()
  const completed = await read(page)
  expect(completed.character.explorationProgress).toBe(60)
  expect(completed.session.messages).toHaveLength(4)
  expect(completed.session.turns[0].id).toBe(id)
  expect(requests[0].messages).toEqual(requests[1].messages)
  await expect(page.getByPlaceholder('输入你的行动或选择...')).toHaveCount(1)
})

test('invalid state repairs metadata only and keeps the original narrative', async ({ page }) => {
  await setup(page)
  const requests = []
  const story = '石门背后传来水声，地图上未标记的通道通向地下河。'
  await page.route('**/api/chat', (route) => {
    requests.push(route.request().postDataJSON())
    return respond(route, requests.length === 1 ? reply(character, story).replace('"hp":80', '"hp":"错误"') : reply().slice(reply().indexOf('[STATS')))
  })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await expect.poll(async () => (await read(page)).session.turns?.length ?? 0).toBe(1)
  const saved = await read(page)
  expect(saved.character.explorationProgress).toBe(60)
  expect(saved.session.messages.at(-1).content.startsWith(story)).toBe(true)
  expect(saved.session.turns[0].repaired).toBe(true)
  expect(requests).toHaveLength(2)
  expect(requests[1].messages[0].content).toContain('本请求只修复状态数据')
})

test('repair failure survives reload and retries only metadata', async ({ page }) => {
  await setup(page)
  const requests = []
  await page.route('**/api/chat', (route) => {
    requests.push(route.request().postDataJSON())
    return respond(route, requests.length === 1 ? reply().replace('"hp":80', '"hp":9000') : requests.length === 2 ? '[STATS:{' : reply().slice(reply().indexOf('[STATS')))
  })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await expect(page.getByRole('button', { name: '重试状态修复', exact: true })).toBeVisible()
  expect((await read(page)).character.explorationProgress).toBe(40)
  await page.reload()
  await page.getByRole('button', { name: '重试状态修复', exact: true }).click()
  await expect.poll(async () => (await read(page)).session.pendingTurn).toBeNull()
  expect((await read(page)).session.messages).toHaveLength(4)
  expect(requests[2].messages[0].content).toContain('本请求只修复状态数据')
})

test('cancel ignores late response and abandoning leaves the original character intact', async ({ page }) => {
  await setup(page)
  let release
  const gate = new Promise((resolve) => { release = resolve })
  await page.route('**/api/chat', async (route) => { await gate; await respond(route, reply()).catch(() => {}) })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await page.getByTitle('停止生成').click()
  await expect(page.getByRole('button', { name: '放弃本回合', exact: true })).toBeVisible()
  release()
  await page.getByRole('button', { name: '放弃本回合', exact: true }).click()
  await expect.poll(async () => (await read(page)).session.pendingTurn).toBeNull()
  expect((await read(page)).character.explorationProgress).toBe(40)
  expect((await read(page)).session.messages).toHaveLength(2)
})

test('mobile image tab preserves the single in-flight chat instance', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  let release
  const gate = new Promise((resolve) => { release = resolve })
  await page.route('**/api/chat', async (route) => { await gate; await respond(route, reply()) })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await page.getByRole('button', { name: '场景插图', exact: true }).click()
  await page.getByRole('button', { name: '冒险日志', exact: true }).click()
  await expect(page.getByTitle('停止生成')).toBeVisible()
  await expect(page.getByPlaceholder('输入你的行动或选择...')).toHaveCount(1)
  release()
  await expect.poll(async () => (await read(page)).session.pendingTurn).toBeNull()
  expect((await read(page)).session.messages).toHaveLength(4)
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true })
})

test('summary preserves evidence-backed memory through reload', async ({ page }, testInfo) => {
  const messages = Array.from({ length: 10 }, (_, index) => [
    { role: 'user', content: '继续调查', timestamp: index * 2, turnId: `turn_${index}` },
    { role: 'assistant', content: reply(character, '冒险者答应归还钥匙。'), timestamp: index * 2 + 1, turnId: `turn_${index}` },
  ]).flat()
  await setup(page, { ...seedSession, messages })
  await page.route('**/api/chat', (route) => respond(route, JSON.stringify({ summary: '答应归还钥匙，继续调查。', updates: [
    { id: 'return_key', category: 'promise', text: '归还钥匙', status: 'active', sourceTurnId: 'turn_7', evidence: '答应归还钥匙' },
  ] })))
  await page.goto('/')
  await expect(page.getByText('冒险记忆 · 1 条进行中')).toBeVisible()
  expect((await read(page)).session.messages).toHaveLength(4)
  await page.reload()
  await page.getByText('冒险记忆 · 1 条进行中').click()
  await expect(page.getByText('承诺 · 进行中：归还钥匙')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('desktop-memory.png'), fullPage: true })
})

test('storage failure before generation never sends a request', async ({ page }) => {
  await setup(page)
  let requests = 0
  await page.route('**/api/chat', (route) => { requests++; return respond(route, reply()) })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).waitFor()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dungeon_game_v2') throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await expect(page.getByText(/无法保存待完成回合/)).toBeVisible()
  expect(requests).toBe(0)
  expect((await read(page)).character.explorationProgress).toBe(40)
})

test('storage failure at commit retries saving without regenerating', async ({ page }) => {
  await setup(page)
  let requests = 0
  await page.route('**/api/chat', (route) => { requests++; return respond(route, reply()) })
  await page.goto('/')
  await page.getByRole('button', { name: '探索', exact: true }).waitFor()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    window.restoreStorageWrites = () => { Storage.prototype.setItem = original }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dungeon_game_v2' && JSON.parse(value).session?.turns?.length) throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '探索', exact: true }).click()
  await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible()
  expect((await read(page)).character.explorationProgress).toBe(40)
  expect((await read(page)).session.pendingTurn.phase).toBe('ready')
  await page.evaluate(() => window.restoreStorageWrites())
  await page.reload()
  await page.getByRole('button', { name: '重试保存', exact: true }).click()
  await expect.poll(async () => (await read(page)).session.pendingTurn).toBeNull()
  expect((await read(page)).character.explorationProgress).toBe(60)
  expect(requests).toBe(1)
})
