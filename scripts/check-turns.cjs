const assert = require('node:assert/strict')
const { createLoader } = require('./load-ts.cjs')
const { character, effect, encounter, reply } = require('./fixtures/adventure.cjs')
const load = createLoader()
const { inspectReply, extractMarkerJson, replaceStateMetadata, cleanContent } = load('@/lib/chat-protocol')
const { completeTurn, PROMPT_VERSION } = load('@/lib/turn-engine')
const { resolveTurnCharacter } = load('@/lib/adventure-context')
const { emptyMemory, mergeMemoryResponse, buildMemoryInput, MAX_SUMMARY_CHARS } = load('@/lib/adventure-memory')
const { buildSystemPrompt } = load('@/lib/prompts')
const makePending = (result = null) => ({ id: 'turn_1', input: '检查石门', before: structuredClone(character),
  startedAt: 1, phase: 'generating', draft: '', promptVersion: PROMPT_VERSION, model: 'fixture', requestMessages: [], result })
const pending = makePending({ kind: 'explore', explorationProgress: 60 })
const session = { messages: [], summary: '', memory: emptyMemory(), pendingTurn: pending }

for (const content of [reply().slice(0, reply().indexOf('[STATS')), reply().replace('"hp":80', '"hp":80.5'),
  reply().replace('"hp":80', '"hp":"80"'), reply().replace('"hp":80', '"hp":999'),
  reply().replace('"encounter":null', '"encounter":{}'),
  reply().replace('"statusEffects":[]', `"statusEffects":${JSON.stringify([effect, effect])}`),
  reply().replace('"statusEffects":[]', `"statusEffects":${JSON.stringify([{ ...effect, id: 'bad id' }])}`),
  reply().replace('"exp":{"breast":37}', '"exp":{"breast":1e999}')]) {
  assert.ok(inspectReply(content, character, null).metadataErrors.length)
  assert.throws(() => completeTurn(session, pending, content, false))
  assert.equal(session.messages.length, 0)
  assert.equal(pending.before.explorationProgress, 40)
}
assert.equal(extractMarkerJson('[STATS:{"hp":80', 'STATS'), null)
assert.equal(extractMarkerJson('[STATS:{"hp":80}]\n[STATS:{"hp":1}]', 'STATS'), null)
assert.equal(extractMarkerJson('[STATS:｛"hp"：80｝]', 'STATS').hp, 80)
const partial = reply().slice(0, reply().indexOf('[STATS')) + '[STATS:{"hp":'
const repaired = replaceStateMetadata(partial, reply().slice(reply().indexOf('[STATS')))
assert.equal(cleanContent(repaired), cleanContent(partial))
assert.equal(inspectReply(repaired, character, null).metadataErrors.length, 0)
const completed = completeTurn(session, pending, repaired, true)
assert.equal(completed.character.explorationProgress, 60)
assert.equal(completed.session.messages.length, 2)
assert.equal(completed.session.pendingTurn, null)
assert.equal(completed.session.turns[0].repaired, true)
assert.equal(completeTurn(completed.session, pending, repaired, true).session.messages.length, 2)
assert.equal(completeTurn(completed.session, pending, repaired, true).character.explorationProgress, 60)
assert.equal(inspectReply(reply().replace('"floor":1', '"floor":9'), character, null).updates.floor, 1)
const escape = { kind: 'escape', encounter: null, explorationProgress: 80 }
const escaped = resolveTurnCharacter({ ...character, encounter }, escape)
assert.equal(inspectReply(reply({ ...character, encounter }), escaped, escape).updates.encounter, null)
const dispel = { kind: 'dispel', removed: false, effect }
assert.equal(inspectReply(reply(), { ...character, statusEffects: [effect] }, dispel).updates.statusEffects[0].id, effect.id)

const events = [{ role: 'assistant', turnId: 'turn_1', content: reply(character, '守门人请求找回钥匙，冒险者答应归还。'), timestamp: 1 }]
const update = { id: 'return_key', category: 'promise', text: '归还钥匙给守门人', status: 'active', sourceTurnId: 'turn_1', evidence: '冒险者答应归还' }
const memory = mergeMemoryResponse(JSON.stringify({ summary: '答应归还钥匙。', updates: [update] }), emptyMemory(), events)
assert.equal(memory.memory.entries[0].sourceTurnIds[0], 'turn_1')
assert.equal(mergeMemoryResponse(JSON.stringify({ summary: '仍在探索。', updates: [] }), memory.memory, events).memory.entries.length, 1)
assert.equal(mergeMemoryResponse(JSON.stringify({ summary: '编造事实', updates: [{ ...update, sourceTurnId: 'missing' }] }), memory.memory, events), null)
assert.equal(mergeMemoryResponse(JSON.stringify({ summary: '编造事实', updates: [{ ...update, evidence: '检查门锁' }] }), memory.memory, events), null)
assert.equal(mergeMemoryResponse('not json', memory.memory, events), null)
assert.equal(mergeMemoryResponse(JSON.stringify({ summary: ' ', updates: [] }), memory.memory, events), null)
assert.equal(mergeMemoryResponse(JSON.stringify({ summary: '记'.repeat(MAX_SUMMARY_CHARS + 1), updates: [] }), memory.memory, events), null)
assert.ok(mergeMemoryResponse(JSON.stringify({ summary: '🗝'.repeat(MAX_SUMMARY_CHARS), updates: [] }), memory.memory, events))
const memoryInput = JSON.parse(buildMemoryInput('旧摘要', memory.memory, events))
assert.equal(memoryInput.previousSummary, '旧摘要')
assert.equal(memoryInput.events[0].content.includes('[STATS'), false)
const resolvedEvents = [{ role: 'assistant', turnId: 'turn_2', content: reply(character, '钥匙已经交还守门人，承诺完成。'), timestamp: 2 }]
const resolved = mergeMemoryResponse(JSON.stringify({ summary: '已归还钥匙。', updates: [{ ...update, status: 'resolved', sourceTurnId: 'turn_2', evidence: '承诺完成' }] }), memory.memory, resolvedEvents)
assert.deepEqual(resolved.memory.entries[0].sourceTurnIds, ['turn_1', 'turn_2'])
assert.equal(resolved.memory.entries[0].status, 'resolved')
const prompt = buildSystemPrompt(character, memory.summary, 'standard', null, memory.memory)
assert.equal(prompt.split('【当前状态快照与回合时点】').length - 1, 1)
assert.equal(prompt.split('【输出协议与合法示例】').length - 1, 1)
assert.equal(prompt.includes('"hp":数字'), false)
assert.equal(prompt.includes('归还钥匙给守门人'), true)
const { evaluateCases, repetitionScore } = load('@/lib/adventure-eval')
const report = evaluateCases([{ id: 'bad-floor', before: character, result: null, output: reply({ ...character, floor: 9 }), previousNarrative: reply() }])
assert.equal(report.formatSuccessRate, 1)
assert.equal(report.stateContradictionRate, 1)
assert.equal(report.repeatedNarrativeRate, 1)
assert.equal(repetitionScore('', reply()), 0)

// Durable store migration and atomic failure: no partially committed character/story.
const data = new Map()
let failWrites = false
global.window = {}
global.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => { if (failWrites) throw new Error('QuotaExceeded'); data.set(key, value) },
  removeItem: (key) => data.delete(key),
}
const storage = load('@/lib/storage')
data.set('dungeon_character', JSON.stringify(character))
data.set('dungeon_session', JSON.stringify({ messages: events.map(({ turnId, ...message }) => message), summary: '旧摘要' }))
assert.equal(storage.getSession().messages[0].turnId, 'legacy_1')
storage.saveGame(character, session)
assert.equal(storage.getSession().pendingTurn.id, 'turn_1')
assert.equal(storage.getCharacter().explorationProgress, 40)
failWrites = true
assert.throws(() => storage.saveGame(completed.character, completed.session))
assert.equal(storage.getCharacter().explorationProgress, 40)
assert.equal(storage.getSession().pendingTurn.id, 'turn_1')
failWrites = false
storage.saveGame(completed.character, { ...completed.session, memory: memory.memory })
assert.equal(storage.getCharacter().explorationProgress, 60)
assert.equal(storage.getSession().messages.length, 2)
const backup = storage.exportAll()
storage.clearCharacter()
storage.clearSession()
storage.importAll(backup)
assert.equal(storage.getSession().memory.entries[0].id, 'return_key')
assert.equal(storage.getCharacter().explorationProgress, 60)
assert.equal(JSON.parse(backup).settings.grokApiKey, '')
console.log('Turn checks passed: strict validation, repair, atomic commit/retry, evidence memory, migration and storage failure.')
