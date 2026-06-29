// The AI turn loop: build messages, stream the DM reply, parse markers, apply
// them to the character. Shares state via D.state and view helpers via D.ui.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var R = D.render, P = D.parser, AI = D.ai;
  var START_DISPLAY = '（探索开始）';

  function clampInt(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor(v))); }

  function toApi(s, m) {
    if (m.role === 'user' && m.content === START_DISPLAY) {
      return s.character.name + ' ' + D.prompts.START_INSTRUCTION;
    }
    return m.content;
  }

  function applyMarkers(full) {
    var c = D.state.character;
    var stats = P.extractMarkerJson(full, 'STATS');
    if (stats) {
      if (typeof stats.hp === 'number') c.hp = clampInt(stats.hp, 0, c.maxHp);
      if (typeof stats.resolve === 'number') c.resolve = clampInt(stats.resolve, 0, 100);
      if (typeof stats.corruption === 'number') c.corruption = clampInt(stats.corruption, 0, 100);
      if (typeof stats.floor === 'number' && stats.floor >= 1) c.floor = Math.floor(stats.floor);
      if ('encounter' in stats) {
        var e = stats.encounter;
        if (e && typeof e === 'object' && typeof e.name === 'string' && e.name.length > 0) {
          c.encounter = {
            id: (typeof e.id === 'string' && e.id) ? e.id : e.name.replace(/\s+/g, '_').toLowerCase(),
            name: e.name, kind: e.kind === 'monster' ? 'monster' : 'trap',
            summary: typeof e.summary === 'string' ? e.summary : '',
            restraint: typeof e.restraint === 'number' ? clampInt(e.restraint, 0, 3) : 0,
          };
        } else { c.encounter = null; }
      }
      if (Array.isArray(stats.statusEffects)) {
        c.statusEffects = stats.statusEffects
          .filter(function (s) { return s && typeof s.title === 'string' && s.title.length > 0; })
          .map(function (s) {
            return {
              id: (s.id && typeof s.id === 'string') ? s.id : s.title.replace(/\s+/g, '_').toLowerCase(),
              title: s.title, description: s.description || '',
            };
          });
      }
    } else if (/\[STATS/i.test(full)) {
      R.setError('本回合状态更新失败（AI 输出的状态格式有误）。');
    }
    var desc = P.extractMarkerJson(full, 'DESC');
    if (desc) {
      c.desc = c.desc || {};
      ['mind', 'body', 'gear'].forEach(function (k) {
        if (typeof desc[k] === 'string' && desc[k].length > 0) c.desc[k] = desc[k];
      });
    }
  }

  async function runTurn() {
    var s = D.state;
    if (s.loading) return;
    s.loading = true;
    var id = ++s.reqId;
    R.setError('');
    D.ui.setBusy(true);

    var hist = s.messages.slice(-24).map(function (m) { return { role: m.role, content: toApi(s, m) }; });
    var apiMessages = [
      { role: 'user', content: D.prompts.buildDmPrompt(s.character, s.summary || '') },
      { role: 'assistant', content: '（地下城主已就位，等待冒险者的行动。）' },
    ].concat(hist);

    var assistant = { role: 'assistant', content: '' };
    s.messages.push(assistant);
    s.latestOptions = []; s.scene = '';
    D.ui.rerender();

    try {
      var full = await AI.askDm({
        model: s.model, messages: apiMessages,
        onDelta: function (chunk, done, buffer) {
          if (id !== s.reqId) return; // a newer request superseded this one
          assistant.content = buffer;
          R.renderMessages(s.messages, s.character.name, true);
        },
      });
      if (id !== s.reqId) return;
      assistant.content = full;
      applyMarkers(full);
      s.latestOptions = P.parseOptions(full);
      s.scene = P.parseScene(full);
    } catch (err) {
      console.error('AI 请求失败:', err && err.code, err && err.message, err && err.stack);
      if (id === s.reqId) {
        s.messages.pop();
        R.setError('地下城主沉默了（请求失败：' + ((err && err.message) || err) + '）。可重试上一步行动。');
      }
    } finally {
      if (id === s.reqId) {
        s.loading = false;
        D.ui.setBusy(false);
        D.ui.rerender();
        D.ui.persist();
      }
    }
  }

  D.turn = { runTurn: runTurn, START_DISPLAY: START_DISPLAY };
})(window.Dungeon);
