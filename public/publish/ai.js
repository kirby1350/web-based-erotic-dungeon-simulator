// Chat AI wrapper.
//
// Two runtimes, one API:
//   1) DZMM platform — window.dzmm.completions / dzmm.models (no keys, no CORS).
//   2) Self-host fallback — the same-origin Next routes /api/chat (SSE) and
//      /api/models, which proxy DZMM's gpt4novel ext/v1 endpoint (or Grok) with
//      the server's .env keys. Ported from lib/dzmm.ts + app/api/chat/route.ts.
//
// NOTE: dzmm.completions' callback receives the CUMULATIVE fullText so far
// (not a delta) and a `done` flag — we derive deltas from it. Our onDelta
// contract mirrors that: onDelta(delta, done, cumulativeText).
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var FALLBACK_MODEL = 'nalang-turbo-0826';
  var MAX_TOKENS = 4096;

  function hasPlatform() {
    return !!(window.dzmm && window.dzmm.completions);
  }

  // ---- Model list -----------------------------------------------------------
  async function listModels() {
    // Platform SDK first.
    try {
      if (window.dzmm && window.dzmm.models && window.dzmm.models.list) {
        var r = await window.dzmm.models.list();
        var models = (r && r.models) || [];
        var def = (r && r.defaultModel) || (models[0] && (models[0].id || models[0])) || FALLBACK_MODEL;
        return { models: models, defaultModel: def };
      }
    } catch (e) {
      console.warn('平台模型列表获取失败，回退 /api/models:', e && e.message);
    }
    // Self-host fallback → /api/models (returns { data: [{id, name, context_window}] }).
    try {
      var key = (D.state && D.state.settings && D.state.settings.chatApiKey) || '';
      var res = await fetch('/api/models', { headers: key ? { 'x-api-key': key } : {} });
      if (res.ok) {
        var data = await res.json();
        var list = Array.isArray(data && data.data) ? data.data : [];
        var norm = list.map(function (m) {
          var name = m.name || m.id;
          var label = m.context_window ? (name + ' · ' + Math.round(m.context_window / 1000) + 'K') : name;
          return { id: m.id, name: label };
        });
        return { models: norm, defaultModel: (norm[0] && norm[0].id) || FALLBACK_MODEL };
      }
    } catch (e2) {
      console.warn('AI 模型列表获取失败:', e2 && e2.message);
    }
    return { models: [], defaultModel: FALLBACK_MODEL };
  }

  // ---- Streaming SSE parser (ported from lib/sse.ts) -------------------------
  // Buffers across network chunks — a single `data:` line can split mid-flight.
  async function readSse(response, onLineDelta) {
    if (!response.body) return;
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    function handleLine(raw) {
      var line = raw.trim();
      if (line.indexOf('data:') !== 0) return;
      var payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      try {
        var json = JSON.parse(payload);
        var delta = json && json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
        if (delta) onLineDelta(delta);
      } catch (e) { /* keep-alive / non-JSON line — ignore */ }
    }
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        handleLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer) handleLine(buffer);
  }

  // ---- Completion -----------------------------------------------------------
  // Stream a completion. onDelta(delta, done, fullText) fires per chunk.
  // Resolves to the full text. `messages` already has the DM briefing folded
  // into the first user message by the caller.
  async function complete(opts) {
    var prev = '';

    if (hasPlatform()) {
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

    // Self-host fallback → /api/chat SSE proxy. The route picks provider
    // (DZMM vs Grok) from the model id and uses .env keys unless we pass ours.
    var s = (D.state && D.state.settings) || {};
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: opts.messages,
        model: opts.model,
        apiKey: s.chatApiKey || undefined,
        grokApiKey: s.grokApiKey || undefined,
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error((err && err.error) || ('请求失败（' + res.status + '）'));
    }
    await readSse(res, function (delta) {
      prev += delta;
      if (opts.onDelta) opts.onDelta(delta, false, prev);
    });
    if (opts.onDelta) opts.onDelta('', true, prev);
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
      console.warn('摘要生成失败:', e && e.message);
      return '';
    }
  }

  D.ai = {
    FALLBACK_MODEL: FALLBACK_MODEL,
    hasPlatform: hasPlatform,
    listModels: listModels,
    complete: complete,
    askDm: askDm,
    summarize: summarize,
  };
})(window.Dungeon);
