// Platform AI wrapper around window.dzmm.completions / dzmm.models.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var FALLBACK_MODEL = 'nalang-turbo-0826';

  // Returns { models: [...], defaultModel } — never rejects.
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

  // Stream a DM completion. `messages` is the full role:'user'/'assistant' array
  // (the DM briefing is already folded into the first user message by the caller).
  // onDelta(chunk, done, buffer) fires per streamed chunk. Resolves to the full text.
  async function askDm(opts) {
    var model = opts.model;
    var messages = opts.messages;
    var onDelta = opts.onDelta;
    var buffer = '';

    if (!window.dzmm || !window.dzmm.completions) {
      throw new Error('平台 AI 接口 (window.dzmm.completions) 不可用');
    }

    await window.dzmm.completions(
      { model: model, messages: messages, maxTokens: 2000 },
      function (chunk, done) {
        if (chunk) buffer += chunk;
        if (onDelta) onDelta(chunk || '', done, buffer);
      }
    );
    return buffer;
  }

  D.ai = {
    FALLBACK_MODEL: FALLBACK_MODEL,
    listModels: listModels,
    askDm: askDm,
  };
})(window.Dungeon);
