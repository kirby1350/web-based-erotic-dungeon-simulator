// Image panel: generate scene art via the platform draw SDK (D.draw).
// Mirrors components/image-panel.tsx: char tags + scene + preset + style + custom,
// auto-generate banner on a new [SCENE], manual prompt, thumbnails, request-id guard.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function esc(s) { return D.render.escapeHtml(s); }
  function $(id) { return document.getElementById(id); }

  var st = { images: [], loading: false, error: '', reqId: 0, pending: '', active: null, custom: '', showCustom: false };

  function buildPrompt(scene) {
    var s = D.state.settings || {};
    var c = D.state.character || {};
    var charTags = (c.danbooruTags || '').trim();
    var styleTags = (D.config.IMAGE_STYLES[s.imageStyle] || D.config.IMAGE_STYLES.none).tags;
    var presetTags = (D.config.IMAGE_TAG_PRESETS[s.imageTagPreset] || D.config.IMAGE_TAG_PRESETS.none).tags;
    var custom = (s.imageStyleCustom || '').trim();
    var parts = [charTags, scene, presetTags, styleTags, custom].filter(Boolean);
    return D.config.withQualityPrefix(parts.join(', '));
  }

  async function generate(scene) {
    if (st.loading) return; // guard against double-submit
    var prompt = buildPrompt(scene || D.config.DEFAULT_SCENE_PROMPT);
    st.loading = true; st.error = ''; st.pending = '';
    var id = ++st.reqId;
    render();
    try {
      var urls = await D.draw.generate(prompt, D.config.IMAGE_NEGATIVE_PROMPT);
      if (id !== st.reqId) return; // a newer request superseded this one
      st.images = urls.map(function (u) { return { url: u }; }).concat(st.images).slice(0, 20);
      st.active = urls[0];
    } catch (e) {
      console.error('绘图失败:', e && e.code, e && e.message, e && e.stack);
      if (id === st.reqId) st.error = '绘图失败：' + ((e && e.message) || e) + (e && e.code ? '（' + e.code + '）' : '');
    } finally {
      if (id === st.reqId) { st.loading = false; render(); }
    }
  }

  function notifyScene(scene) { st.pending = scene; if (!st.loading) render(); }

  function render() {
    var host = $('image-panel');
    if (!host) return;
    var main = st.active
      ? '<img src="' + esc(st.active) + '" alt="场景插图" class="img-main">'
      : '<div class="img-empty">场景插图将在这里显示<br><span class="muted">AI 会根据剧情自动生成插图</span></div>';
    var overlay = st.loading ? '<div class="img-loading">正在绘制场景…</div>' : '';
    var pending = (st.pending && !st.loading)
      ? '<div class="img-pending"><span class="muted">新场景已就绪</span><button class="btn primary tiny img-gen">生成插图</button></div>'
      : '';
    var err = st.error ? '<div class="img-err">' + esc(st.error) + '</div>' : '';
    var thumbs = st.images.length > 1
      ? '<div class="img-thumbs">' + st.images.map(function (im) {
          return '<button class="img-thumb' + (im.url === st.active ? ' active' : '') + '" data-url="' + esc(im.url) + '"><img src="' + esc(im.url) + '" alt=""></button>';
        }).join('') + '</div>'
      : '';
    var customBox = st.showCustom
      ? '<div class="img-custom"><input id="img-custom-input" class="input" placeholder="描述要生成的场景（英文更佳）…" value="' + esc(st.custom) + '">' +
        '<button class="btn primary tiny img-custom-gen"' + (st.loading ? ' disabled' : '') + '>生成场景</button></div>'
      : '';

    host.innerHTML =
      '<div class="img-stage">' + main + overlay + pending + '</div>' + err +
      '<button class="img-toggle">🪄 手动生成图片 ' + (st.showCustom ? '▲' : '▼') + '</button>' + customBox + thumbs;

    var gen = host.querySelector('.img-gen'); if (gen) gen.addEventListener('click', function () { generate(st.pending); });
    var tg = host.querySelector('.img-toggle'); if (tg) tg.addEventListener('click', function () { st.showCustom = !st.showCustom; render(); });
    var ci = host.querySelector('#img-custom-input');
    if (ci) ci.addEventListener('input', function (e) { st.custom = e.target.value; });
    var cg = host.querySelector('.img-custom-gen');
    if (cg) cg.addEventListener('click', function () { generate(st.custom.trim() || D.config.DEFAULT_SCENE_PROMPT); });
    Array.prototype.forEach.call(host.querySelectorAll('.img-thumb'), function (b) {
      b.addEventListener('click', function () { st.active = b.getAttribute('data-url'); render(); });
    });
  }

  function reset() { st.images = []; st.active = null; st.error = ''; st.pending = ''; st.loading = false; render(); }

  D.image = { render: render, notifyScene: notifyScene, generate: generate, reset: reset };
})(window.Dungeon);
