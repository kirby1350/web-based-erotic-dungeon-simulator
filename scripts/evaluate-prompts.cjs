const fs = require('node:fs')
const path = require('node:path')
const { createLoader } = require('./load-ts.cjs')
const { character, effect, encounter, reply } = require('./fixtures/adventure.cjs')
const load = createLoader()
const { evaluateCases } = load('@/lib/adventure-eval')
const { PROMPT_VERSION } = load('@/lib/turn-engine')
const args = process.argv.slice(2)
const argument = (key) => { const index = args.indexOf(key); return index < 0 ? undefined : args[index + 1] }
const input = argument('--input')
let cases
if (input) {
  const data = JSON.parse(fs.readFileSync(input, 'utf8'))
  cases = Array.isArray(data) ? data : (data.session?.turns ?? []).map((turn, index, turns) => ({
    id: turn.id, before: turn.before, result: turn.result, output: turn.originalReply ?? turn.reply,
    previousNarrative: turns[index - 1]?.reply ?? '',
  }))
  if (!cases.length) throw new Error('输入没有可评估回合；需要新版导出存档或 EvaluationCase 数组')
} else {
  cases = [
    { id: 'ordinary', before: character, result: null, output: reply() },
    { id: 'escape-conflict', before: { ...character, encounter }, result: { kind: 'escape', encounter: null, explorationProgress: 80 }, output: reply({ ...character, encounter }) },
    { id: 'dispel-failure-conflict', before: { ...character, statusEffects: [effect] }, result: { kind: 'dispel', removed: false, effect }, output: reply() },
    { id: 'advance', before: { ...character, explorationProgress: 100 }, result: { kind: 'advance', floor: 2 }, output: reply({ ...character, floor: 2 }) },
    { id: 'truncated-state', before: character, result: null, output: reply().slice(0, reply().indexOf('[STATS')) + '[STATS:{"hp":80' },
    { id: 'repeated-narrative', before: character, result: null, output: reply(), previousNarrative: reply() },
  ]
}
const report = { version: argument('--label') ?? PROMPT_VERSION, source: input ? 'recorded-responses' : 'synthetic-fixtures', ...evaluateCases(cases) }
const compare = argument('--compare')
if (compare) {
  const previous = JSON.parse(fs.readFileSync(compare, 'utf8'))
  report.comparison = { against: previous.version, sameSampleCount: previous.count === report.count,
    formatSuccessRateDelta: report.formatSuccessRate - previous.formatSuccessRate,
    stateContradictionRateDelta: report.stateContradictionRate - previous.stateContradictionRate,
    repeatedNarrativeRateDelta: report.repeatedNarrativeRate - previous.repeatedNarrativeRate }
}
const output = argument('--output')
if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n') }
console.log(JSON.stringify(report, null, 2))
