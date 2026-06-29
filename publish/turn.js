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

  var PARTS = ['breast', 'clitoris', 'urethra', 'vagina', 'anus'];

  function applyMarkers(full) {
    var c = D.state.character;
    var stats = P.extractMarkerJson(full, 'STATS');
    if (stats) {
      if (typeof stats.hp === 'number') c.hp = clampInt(stats.hp, 0, c.maxHp);
      if (typeof stats.pleasure === 'number') c.pleasure = clampInt(stats.pleasure, 0, 100);
      if (typeof stats.desire === 'number') c.desire = clampInt(stats.desire, 0, 100);
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
      if (stats.measurements && typeof stats.measurements === 'object') {
        var pm = c.measurements || { bust: '', waist: '', hip: '' };
        ['bust', 'waist', 'hip'].forEach(function (k) {
          if (stats.measurements[k] != null) pm[k] = String(stats.measurements[k]).replace(/[^0-9.]/g, '');
        });
        c.measurements = pm;
      }
      if (stats.bodyDevelopment && typeof stats.bodyDevelopment === 'object') {
        var bd = c.bodyDevelopment || { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 };
        PARTS.forEach(function (k) {
          if (typeof stats.bodyDevelopment[k] === 'number') bd[k] = clampInt(stats.bodyDevelopment[k], 0, 5);
        });
        if (stats.bodyDevelopment.exp && typeof stats.bodyDevelopment.exp === 'object') {
          bd.exp = bd.exp || {};
          PARTS.forEach(function (k) {
            if (typeof stats.bodyDevelopment.exp[k] === 'number') bd.exp[k] = clampInt(stats.bodyDevelopment.exp[k], 0, 100);
          });
        }
        c.bodyDevelopment = bd;
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
      var bd2 = c.bodyDevelopment || {};
      bd2.descriptions = bd2.descriptions || {};
      PARTS.forEach(function (k) {
        if (typeof desc[k] === 'string' && desc[k].length > 0) bd2.descriptions[k] = desc[k];
      });
      c.bodyDevelopment = bd2;
    }
  }

  async function runTurn() {
    var s = D.state;
    if (s.loading) return;
    s.loading = true;
    var id = ++s.reqId;
    R.setError('');
    D.ui.setBusy(true);

    var proseStyle = (s.settings && s.settings.proseStyle) || 'standard';
    var hist = s.messages.slice(-24).map(function (m) { return { role: m.role, content: toApi(s, m) }; });
    var apiMessages = [
      { role: 'user', content: D.prompts.buildDmPrompt(s.character, s.summary || '', proseStyle) },
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
      var scene = P.parseScene(full);
      s.scene = scene;
      if (scene && D.image && D.image.notifyScene) D.image.notifyScene(D.config.withQualityPrefix(scene));
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
        maybeSummarize(s);
      }
    }
  }

  var SUMMARY_THRESHOLD = 10; // summarise after this many assistant turns
  var RECENT_KEEP = 4;        // keep this many recent messages verbatim

  // Roll older history into s.summary so the context stays bounded.
  async function maybeSummarize(s) {
    if (s.summarising) return;
    var assistantCount = s.messages.filter(function (m) { return m.role === 'assistant'; }).length;
    if (assistantCount === 0 || assistantCount % SUMMARY_THRESHOLD !== 0) return;
    var older = s.messages.slice(0, s.messages.length - RECENT_KEEP);
    var removeCount = older.length;
    if (removeCount <= 0) return;

    s.summarising = true;
    D.ui.rerender();
    try {
      var conversation = older.map(function (m) {
        return (m.role === 'user' ? '玩家' : '地下城主') + '：' + toApi(s, m);
      }).join('\n');
      var newSummary = await AI.summarize(s.model, conversation);
      if (newSummary) {
        s.summary = s.summary ? (s.summary + '\n\n' + newSummary) : newSummary;
        s.messages = s.messages.slice(removeCount); // drop exactly what we summarised
        D.ui.persist();
      }
    } catch (e) {
      console.error('摘要失败:', e && e.message);
    } finally {
      s.summarising = false;
      D.ui.rerender();
    }
  }

  D.turn = { runTurn: runTurn, START_DISPLAY: START_DISPLAY };
})(window.Dungeon);
