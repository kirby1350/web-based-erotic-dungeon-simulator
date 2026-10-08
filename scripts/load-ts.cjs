const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

/** Small test-only loader: exercises the real TypeScript modules with optional transport mocks. */
function createLoader(mocks = {}) {
  const cache = new Map()
  function load(id, parent = root) {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    if (!id.startsWith('@/') && !id.startsWith('.') && !path.isAbsolute(id)) return require(id)
    let filename = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(parent, id)
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx'
    if (cache.has(filename)) return cache.get(filename).exports
    const mod = { exports: {} }
    cache.set(filename, mod)
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText
    new Function('require', 'module', 'exports', output)((request) => load(request, path.dirname(filename)), mod, mod.exports)
    return mod.exports
  }
  return load
}
module.exports = { createLoader }
