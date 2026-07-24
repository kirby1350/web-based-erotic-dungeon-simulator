// Settings modal: chat model (live list), prose style, image style / tag preset /
// custom tags, plus export/import of the whole save. Ported from settings-panel.tsx.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function esc(s) { return D.render.escapeHtml(s); }

  function opt(value, label, sel) {
    return '<option value="' + esc(value) + '"' + (value === sel ? ' selected' : '') + '>' + esc(label) + '</option>';
  }
  function selectFromMap(map, sel) {
    return Object.keys(map).map(function (k) { return opt(k, map[k].label, sel); }).join('');
  }
  function modelOptions(sel) {
    var models = D.state.models || [];
    if (!models.length) return opt(sel || D.ai.FALLBACK_MODEL, (sel || D.ai.FALLBACK_MODEL) + '（默认）', sel);
    return models.map(function (m) {
      var id = m.id || m; var name = m.name || id;
      return opt(id, name, sel);
    }).join('');
  }

  function close() { var r = document.getElementById('modal-root'); r.className = 'modal-root hidden'; r.innerHTML = ''; }

  function open() {
    var s = D.state.settings || D.storage.defaultSettings();
    var C = D.config;
    var root = document.getElementById('modal-root');
    root.className = 'modal-root';
    root.innerHTML =
      '<div class="modal"><div class="modal-head"><span class="gold">设置</span><button class="modal-x">✕</button></div>' +
      '<div class="modal-body">' +
      '<label class="field-label">对话模型</label><select id="set-model" class="input">' + modelOptions(s.chatModel || D.state.model) + '</select>' +
      '<label class="field-label">叙事文风</label><select id="set-prose" class="input">' + selectFromMap(C.PROSE_STYLE_LABELS, s.proseStyle) + '</select>' +
      '<label class="field-label">画风</label><select id="set-style" class="input">' + selectFromMap(C.IMAGE_STYLES, s.imageStyle) + '</select>' +
      '<label class="field-label">附加标签组</label><select id="set-preset" class="input">' + selectFromMap(C.IMAGE_TAG_PRESETS, s.imageTagPreset) + '</select>' +
      '<label class="field-label">自定义图片标签（英文）</label><input id="set-custom" class="input" value="' + esc(s.imageStyleCustom || '') + '" placeholder="extra danbooru tags…">' +
      // ---- Self-host section (ignored on the DZMM platform) ----
      '<hr class="divider">' +
      '<div class="set-hint muted">以下仅在「自建部署」（非平台）时生效：图源与 API Key。留空则使用服务器 .env 的密钥。</div>' +
      '<label class="field-label">图片来源</label><select id="set-imgprovider" class="input">' + selectFromMap(C.IMAGE_PROVIDERS, s.imageProvider) + '</select>' +
      '<label class="field-label">PixAI 模型</label><select id="set-pixaimodel" class="input">' + selectFromMap(C.IMAGE_MODELS, s.imageModel) + '</select>' +
      '<label class="field-label">TensorArt 模型</label><select id="set-tamodel" class="input">' + selectFromMap(C.TENSORART_MODELS, s.tensorartModel) + '</select>' +
      '<label class="field-label">DZMM(gpt4novel) API Key</label><input id="set-chatkey" class="input" type="password" value="' + esc(s.chatApiKey || '') + '" placeholder="留空用服务器 .env" autocomplete="off">' +
      '<label class="field-label">Grok (xAI) API Key</label><input id="set-grokkey" class="input" type="password" value="' + esc(s.grokApiKey || '') + '" placeholder="仅选 Grok 模型时需要" autocomplete="off">' +
      '<label class="field-label">PixAI API Key</label><input id="set-pixaikey" class="input" type="password" value="' + esc(s.pixaiApiKey || '') + '" placeholder="留空用服务器 .env" autocomplete="off">' +
      '<label class="field-label">TensorArt API Key</label><input id="set-takey" class="input" type="password" value="' + esc(s.tensorartApiKey || '') + '" placeholder="留空用服务器 .env" autocomplete="off">' +
      '<hr class="divider">' +
      '<div class="set-io"><button class="btn tiny" id="set-export">导出存档</button>' +
      '<button class="btn tiny" id="set-import">导入存档</button>' +
      '<input type="file" id="set-file" accept="application/json" class="hidden"></div>' +
      '<div id="set-msg" class="set-msg"></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn" id="set-cancel">取消</button><button class="btn primary" id="set-save">保存</button></div></div>';

    function msg(t) { document.getElementById('set-msg').textContent = t || ''; }
    root.querySelector('.modal-x').addEventListener('click', close);
    root.querySelector('#set-cancel').addEventListener('click', close);
    root.querySelector('#set-save').addEventListener('click', function () {
      function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
      var next = {
        chatModel: val('set-model'),
        proseStyle: val('set-prose'),
        imageStyle: val('set-style'),
        imageTagPreset: val('set-preset'),
        imageStyleCustom: val('set-custom').trim(),
        imageProvider: val('set-imgprovider'),
        imageModel: val('set-pixaimodel'),
        tensorartModel: val('set-tamodel'),
        chatApiKey: val('set-chatkey').trim(),
        grokApiKey: val('set-grokkey').trim(),
        pixaiApiKey: val('set-pixaikey').trim(),
        tensorartApiKey: val('set-takey').trim(),
      };
      D.state.settings = D.storage.sanitizeSettings(next);
      D.state.model = D.state.settings.chatModel || D.state.model;
      D.storage.saveSettings(D.state.settings);
      close();
    });
    root.querySelector('#set-export').addEventListener('click', async function () {
      try {
        var json = await D.storage.exportAll();
        var blob = new Blob([json], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'dungeon-save.json';
        document.body.appendChild(a); a.click(); a.remove();
        msg('已导出 dungeon-save.json');
      } catch (e) { msg('导出失败：' + (e && e.message)); }
    });
    root.querySelector('#set-import').addEventListener('click', function () { document.getElementById('set-file').click(); });
    root.querySelector('#set-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = async function () {
        try { await D.storage.importAll(String(reader.result)); msg('导入成功，刷新后生效'); }
        catch (err) { msg('导入失败：' + (err && err.message)); }
      };
      reader.readAsText(f);
    });
  }

  D.settings = { open: open, close: close };
})(window.Dungeon);
