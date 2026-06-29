// DOM rendering helpers. Pure view layer — app.js owns state and wiring.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var OPT_KINDS = ['行动 一', '行动 二', '行动 三', '行动 四'];

  // ---- Creator ----
  function renderPresets(activeName, onPick) {
    var host = $('preset-list');
    host.innerHTML = '';
    D.data.CHARACTER_PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset-btn' + (p.name === activeName ? ' active' : '');
      var avatar = p.avatarUrl
        ? '<img class="preset-avatar" src="' + escapeHtml(p.avatarUrl) + '" alt="" loading="lazy">'
        : '<span class="preset-avatar">' + escapeHtml(p.icon || '?') + '</span>';
      b.innerHTML = avatar +
        '<span class="pname">' + escapeHtml(p.name) + '</span>' +
        '<span class="muted">' + escapeHtml(D.data.RACE_INFO[p.race].label) + '</span>';
      b.addEventListener('click', function () { onPick(p); });
      host.appendChild(b);
    });
  }

  function renderRaces(activeRace, onPick) {
    var host = $('race-list');
    host.innerHTML = '';
    Object.keys(D.data.RACE_INFO).forEach(function (key) {
      var info = D.data.RACE_INFO[key];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'race-btn' + (key === activeRace ? ' active' : '');
      b.innerHTML = '<span class="race-icon">' + escapeHtml(info.icon) + '</span>' +
        '<span>' + escapeHtml(info.label) + '</span>';
      b.addEventListener('click', function () { onPick(key); });
      host.appendChild(b);
    });
    $('race-desc').textContent = D.data.RACE_INFO[activeRace].description;
  }

  // ---- Game: status bar ----
  function bar(label, val, max, color) {
    var pct = Math.max(0, Math.min(100, Math.round((val / max) * 100)));
    return '<div class="stat"><div class="stat-top"><span>' + label + '</span><span>' +
      val + '/' + max + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' +
      pct + '%;background:' + color + '"></div></div></div>';
  }

  function renderStats(c) {
    var floor = c.floor || 1;
    var theme = D.data.getFloorTheme(c.floorThemes, floor);
    var bd = c.bodyDevelopment || { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 };
    var devLine = '开发度 胸' + bd.breast + ' 蒂' + bd.clitoris + ' 尿' + bd.urethra + ' 阴' + bd.vagina + ' 肛' + bd.anus;
    $('stat-bar').innerHTML =
      bar('生命', c.hp, c.maxHp, 'var(--good)') +
      bar('快感', c.pleasure, 100, 'var(--rose)') +
      bar('欲望', c.desire, 100, 'var(--purple)') +
      '<div class="stat chip"><span class="chip-box">第 ' + floor + '/' + D.data.TARGET_FLOOR +
      ' 层 · ' + escapeHtml(theme.name) + '</span></div>' +
      '<div class="stat chip"><span class="chip-box">' + escapeHtml(devLine) + '</span></div>';
  }

  function renderEncounter(c) {
    var el = $('encounter-bar');
    var enc = c.encounter;
    if (!enc) { el.className = 'encounter-bar hidden'; el.innerHTML = ''; return; }
    el.className = 'encounter-bar';
    el.innerHTML =
      '<div><span class="muted" style="font-size:.6rem;letter-spacing:.1em">' +
      (enc.kind === 'monster' ? '遭遇怪物' : '陷入陷阱') + '</span> ' +
      '<span class="e-title">' + escapeHtml(enc.name) + '</span>' +
      '<span class="e-lv">束缚 Lv' + enc.restraint + '</span></div>' +
      (enc.summary ? '<div class="e-summary">' + escapeHtml(enc.summary) + '</div>' : '');
  }

  function renderStatusEffects(c, onDispel) {
    var el = $('status-bar');
    var se = c.statusEffects || [];
    if (se.length === 0) { el.className = 'status-effects hidden'; el.innerHTML = ''; return; }
    el.className = 'status-effects';
    el.innerHTML = '<span class="se-label">异常状态 · 点击尝试解除</span>';
    se.forEach(function (e) {
      var b = document.createElement('button');
      b.className = 'se-chip btn';
      b.title = '尝试解除：' + (e.description || e.title);
      b.textContent = e.title;
      b.addEventListener('click', function () { onDispel(e); });
      el.appendChild(b);
    });
  }

  // ---- Game: messages ----
  function renderMessages(messages, charName, loading) {
    var host = $('messages');
    host.innerHTML = '';
    messages.forEach(function (m, i) {
      var div = document.createElement('div');
      if (m.role === 'user') {
        div.className = 'msg user';
        div.innerHTML = '<span class="who">' + escapeHtml(charName) + '</span>' +
          escapeHtml(m.content);
      } else {
        div.className = 'msg dm';
        var body = D.parser.cleanContent(m.content);
        var isLast = i === messages.length - 1;
        var inner = '<span class="who">地下城主</span>';
        if (loading && isLast && m.content === '') {
          inner += '<span class="dots"><span></span><span></span><span></span></span>';
        } else {
          inner += escapeHtml(body);
        }
        div.innerHTML = inner;
      }
      host.appendChild(div);
    });
    host.scrollTop = host.scrollHeight;
  }

  function renderOptions(options, loading, onPick) {
    var el = $('options');
    if (loading || !options || options.length === 0) {
      el.className = 'options hidden'; el.innerHTML = ''; return;
    }
    el.className = 'options';
    el.innerHTML = '';
    options.forEach(function (opt, i) {
      var b = document.createElement('button');
      b.className = 'opt-btn';
      b.innerHTML = '<span class="opt-kind">' + OPT_KINDS[i] + '</span>' + escapeHtml(opt);
      b.addEventListener('click', function () { onPick(i, opt); });
      el.appendChild(b);
    });
  }

  function renderScene(scene) {
    var el = $('scene-box');
    if (!scene) { el.className = 'scene-box hidden'; el.innerHTML = ''; return; }
    el.className = 'scene-box';
    el.innerHTML = '<b>场景标签</b> ' + escapeHtml(scene);
  }

  function setError(msg, onDismiss) {
    var el = $('error-box');
    if (!msg) { el.className = 'error-box hidden'; el.innerHTML = ''; return; }
    el.className = 'error-box';
    el.innerHTML = '<span>' + escapeHtml(msg) + '</span><button title="忽略">✕</button>';
    el.querySelector('button').addEventListener('click', function () {
      el.className = 'error-box hidden'; el.innerHTML = '';
      if (onDismiss) onDismiss();
    });
  }

  D.render = {
    escapeHtml: escapeHtml,
    renderPresets: renderPresets,
    renderRaces: renderRaces,
    renderStats: renderStats,
    renderEncounter: renderEncounter,
    renderStatusEffects: renderStatusEffects,
    renderMessages: renderMessages,
    renderOptions: renderOptions,
    renderScene: renderScene,
    setError: setError,
  };
})(window.Dungeon);
