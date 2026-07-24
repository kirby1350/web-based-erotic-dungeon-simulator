// Tool modals: random trap generator + status-effect picker.
// Ported from components/trap-generator.tsx and components/status-picker.tsx.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function esc(s) { return D.render.escapeHtml(s); }
  function root() { return document.getElementById('modal-root'); }
  function close() { var r = root(); r.className = 'modal-root hidden'; r.innerHTML = ''; }

  function stripMarkers(t) {
    return String(t || '').replace(/\[SCENE[:：][^\]]*\]/gi, '')
      .replace(/\[STATS[\s\S]*$/i, '').replace(/\[DESC[\s\S]*$/i, '').trim();
  }

  // ---------------- Trap generator ----------------
  function openTrap(onConfirm) {
    var trap = { loading: false, result: '', error: '', hint: undefined };
    var r = root(); r.className = 'modal-root';
    var chips = '<button class="trap-chip" data-hint="">完全随机</button>' +
      D.data.PRESET_TRAPS.map(function (t) {
        return '<button class="trap-chip" data-hint="' + esc(t.hint) + '" title="' + esc(t.hint) + '">' + esc(t.name) + '</button>';
      }).join('');
    r.innerHTML =
      '<div class="modal"><div class="modal-head"><span class="gold">随机陷阱生成器</span><button class="modal-x">✕</button></div>' +
      '<div class="trap-chips">' + chips + '</div>' +
      '<div class="modal-body"><div id="trap-content" class="trap-content"><div class="cc-empty">选择上方陷阱类型，或点「完全随机」开始</div></div></div>' +
      '<div class="modal-foot"><button class="btn" id="trap-regen" disabled>重新生成</button><button class="btn primary" id="trap-confirm" disabled>确认使用</button></div></div>';

    function paint() {
      var el = document.getElementById('trap-content');
      if (trap.error) el.innerHTML = '<div class="img-err">生成失败：' + esc(trap.error) + '</div>';
      else if (trap.loading && !trap.result) el.innerHTML = '<div class="cc-empty">正在生成随机陷阱…</div>';
      else el.textContent = stripMarkers(trap.result);
      document.getElementById('trap-regen').disabled = trap.loading || (!trap.result && !trap.error);
      document.getElementById('trap-confirm').disabled = trap.loading || !trap.result;
    }
    async function generate(hint) {
      if (trap.loading) return;
      trap.loading = true; trap.result = ''; trap.error = ''; trap.hint = hint;
      paint();
      var c = D.state.character;
      var theme = D.data.getFloorTheme(c.floorThemes, c.floor || 1);
      var loc = '地下城第 ' + (c.floor || 1) + ' 层「' + theme.name + '」（' + theme.ambience + '）';
      var prompt = D.prompts.buildRandomTrapPrompt(c, hint || undefined, loc, (D.state.settings || {}).proseStyle);
      try {
        await D.ai.complete({
          model: D.state.model, messages: [{ role: 'user', content: prompt }], maxTokens: 2000,
          onDelta: function (d, done, full) { trap.result = full; paint(); },
        });
      } catch (e) { trap.error = (e && e.message) || String(e); }
      finally { trap.loading = false; paint(); }
    }

    r.querySelector('.modal-x').addEventListener('click', close);
    Array.prototype.forEach.call(r.querySelectorAll('.trap-chip'), function (b) {
      b.addEventListener('click', function () { generate(b.getAttribute('data-hint') || undefined); });
    });
    document.getElementById('trap-regen').addEventListener('click', function () { generate(trap.hint); });
    document.getElementById('trap-confirm').addEventListener('click', function () {
      if (trap.result) { onConfirm(trap.result); close(); }
    });
  }

  // ---------------- Status picker ----------------
  function openStatus(current, onApply) {
    var effects = (current || []).slice();
    var presetIds = {};
    D.data.PRESET_STATUS_EFFECTS.forEach(function (p) { presetIds[p.id] = true; });
    var r = root(); r.className = 'modal-root';

    function draw() {
      var has = {}; effects.forEach(function (e) { has[e.id] = true; });
      var presets = D.data.PRESET_STATUS_EFFECTS.map(function (p) {
        return '<button class="sp-row' + (has[p.id] ? ' active' : '') + '" data-id="' + esc(p.id) + '">' +
          '<span class="sp-check">' + (has[p.id] ? '✓' : '') + '</span>' +
          '<span><b>' + esc(p.title) + '</b><span class="sp-desc">' + esc(p.description) + '</span></span></button>';
      }).join('');
      var custom = effects.filter(function (e) { return !presetIds[e.id]; });
      var customHtml = custom.length ? '<div class="sp-label">剧情中产生的状态</div>' + custom.map(function (e) {
        return '<div class="sp-custom"><span><b>' + esc(e.title) + '</b> <span class="sp-desc">' + esc(e.description || '') + '</span></span>' +
          '<button class="sp-del btn ghost tiny" data-id="' + esc(e.id) + '">移除</button></div>';
      }).join('') : '';
      r.innerHTML =
        '<div class="modal"><div class="modal-head"><span class="gold">异常状态管理</span><button class="modal-x">✕</button></div>' +
        '<div class="modal-body">' + presets + customHtml +
        '<div class="sp-add"><div class="sp-label">添加自定义状态</div>' +
        '<input id="sp-title" class="input" placeholder="状态名称（如：母乳奴隶）"><input id="sp-desc" class="input" placeholder="状态描述（选填）">' +
        '<button class="btn tiny" id="sp-add-btn">添加状态</button></div></div>' +
        '<div class="modal-foot"><button class="btn" id="sp-cancel">取消</button><button class="btn primary" id="sp-apply">应用（' + effects.length + '）</button></div></div>';

      r.querySelector('.modal-x').addEventListener('click', close);
      document.getElementById('sp-cancel').addEventListener('click', close);
      document.getElementById('sp-apply').addEventListener('click', function () { onApply(effects); close(); });
      Array.prototype.forEach.call(r.querySelectorAll('.sp-row'), function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-id');
          if (has[id]) effects = effects.filter(function (e) { return e.id !== id; });
          else { var p = D.data.PRESET_STATUS_EFFECTS.filter(function (x) { return x.id === id; })[0]; if (p) effects.push(p); }
          draw();
        });
      });
      Array.prototype.forEach.call(r.querySelectorAll('.sp-del'), function (b) {
        b.addEventListener('click', function () { var id = b.getAttribute('data-id'); effects = effects.filter(function (e) { return e.id !== id; }); draw(); });
      });
      document.getElementById('sp-add-btn').addEventListener('click', function () {
        var title = document.getElementById('sp-title').value.trim();
        if (!title) return;
        var base = title.replace(/\s+/g, '_').toLowerCase() || 'custom', id = base, n = 1;
        while (effects.some(function (e) { return e.id === id; })) id = base + '_' + (n++);
        effects.push({ id: id, title: title, description: document.getElementById('sp-desc').value.trim() });
        draw();
      });
    }
    draw();
  }

  D.tools = { openTrap: openTrap, openStatus: openStatus, close: close };
})(window.Dungeon);
