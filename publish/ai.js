// Platform AI wrapper around window.dzmm.completions / dzmm.models.
// NOTE: dzmm.completions' callback receives the CUMULATIVE fullText so far
// (not a delta) and a `done` flag — we derive deltas from it.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var FALLBACK_MODEL = 'nalang-turbo-0826';
  var MAX_TOKENS = 4096;

  async function listModels() {
    try {
      if (window.dzmm && window.dzmm.models && window.dzmm.models.list) {
        var r = await window.dzmm.models.list();
        var models = (r && r.models) || [];
        var def = (r && r.defaultModel) || (models[0] && (models[0].id || models[0])) || FALLBACK_MODEL;
        return { models: models, defaultModel: def };
      }
    } catch (e) {
      console.error('AI 模型列表获取失败:', e && e.code, e && e.message);
    }
    return { models: [], defaultModel: FALLBACK_MODEL };
  }

  // Stream a completion. onDelta(delta, done, fullText) fires per chunk.
  // Resolves to the full text. `messages` already has the DM briefing folded
  // into the first user message by the caller.
  async function complete(opts) {
    if (!window.dzmm || !window.dzmm.completions) {
      throw new Error('平台 AI 接口 (window.dzmm.completions) 不可用');
    }
    var prev = '';
    await window.dzmm.completions(
      { model: opts.model, messages: opts.messages, maxTokens: opts.maxTokens || MAX_TOKENS },
      function (fullText, done) {
        fullText = fullText || '';
        var delta = fullText.slice(prev.length);
        prev = fullText;
        if (opts.onDelta) opts.onDelta(delta, !!done, prev);
      }
    );
    return prev;
  }

  // alias kept for callers that read it as "ask the DM"
  function askDm(opts) { return complete(opts); }

  // Summarise a conversation into a rolling summary string (non-streaming use).
  async function summarize(model, conversation) {
    try {
      var text = await complete({
        model: model,
        messages: [{ role: 'user', content: D.prompts.SUMMARY_PROMPT + conversation }],
        maxTokens: 1024,
      });
      return (text || '').trim();
    } catch (e) {
      console.error('摘要生成失败:', e && e.code, e && e.message);
      return '';
    }
  }

  D.ai = {
    FALLBACK_MODEL: FALLBACK_MODEL,
    listModels: listModels,
    complete: complete,
    askDm: askDm,
    summarize: summarize,
  };
})(window.Dungeon);
