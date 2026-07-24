// Save/load via the platform dzmm.kv, with a localStorage fallback.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var SAVE_KEY = 'dungeon-static-save-v1';
  var SETTINGS_KEY = 'dungeon-static-settings-v1';

  function hasKv() {
    return typeof window.dzmm !== 'undefined' && window.dzmm && window.dzmm.kv;
  }

  async function kvPut(key, value) {
    if (hasKv()) {
      try { await window.dzmm.kv.put(key, value); return; }
      catch (e) { /* fall through to localStorage */ }
    }
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  async function kvGet(key) {
    if (hasKv()) {
      try {
        var data = await window.dzmm.kv.get(key);
        return (data && typeof data.value !== 'undefined') ? data.value : null;
      } catch (e) { /* fall through to localStorage */ }
    }
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function kvDel(key) {
    if (hasKv() && typeof window.dzmm.kv.delete === 'function') {
      try { await window.dzmm.kv.delete(key); } catch (e) {}
    }
    if (hasKv()) { try { await window.dzmm.kv.put(key, null); } catch (e) {} }
    try { localStorage.removeItem(key); } catch (_) {}
  }

  // ---- Game-save helpers (single slot) ----
  function loadSave() { return kvGet(SAVE_KEY); }
  function writeSave(save) { return kvPut(SAVE_KEY, save); }
  function clearSave() { return kvDel(SAVE_KEY); }

  // ---- Settings ----
  // API keys are only needed for the self-host /api/* fallback (ai.js / draw.js)
  // when NOT running on the DZMM platform. Leave them blank to use the server's
  // .env keys; fill them in to override per-browser.
  function defaultSettings() {
    return {
      chatModel: '', proseStyle: 'standard',
      imageStyle: 'none', imageTagPreset: 'none', imageStyleCustom: '',
      imageProvider: 'pixai', imageModel: 'tsubaki_v2', tensorartModel: 'wai_nsfw_v16',
      chatApiKey: '', grokApiKey: '', pixaiApiKey: '', tensorartApiKey: '',
    };
  }
  function sanitizeSettings(s) {
    var d = defaultSettings();
    var m = Object.assign(d, s || {});
    var C = D.config;
    if (!C.PROSE_STYLE_LABELS[m.proseStyle]) m.proseStyle = 'standard';
    if (!C.IMAGE_STYLES[m.imageStyle]) m.imageStyle = 'none';
    if (!C.IMAGE_TAG_PRESETS[m.imageTagPreset]) m.imageTagPreset = 'none';
    if (!C.IMAGE_PROVIDERS[m.imageProvider]) m.imageProvider = 'pixai';
    if (!C.IMAGE_MODELS[m.imageModel]) m.imageModel = 'tsubaki_v2';
    if (!C.TENSORART_MODELS[m.tensorartModel]) m.tensorartModel = 'wai_nsfw_v16';
    if (typeof m.chatModel !== 'string') m.chatModel = '';
    if (typeof m.imageStyleCustom !== 'string') m.imageStyleCustom = '';
    ['chatApiKey', 'grokApiKey', 'pixaiApiKey', 'tensorartApiKey'].forEach(function (k) {
      if (typeof m[k] !== 'string') m[k] = '';
    });
    return m;
  }
  async function loadSettings() { return sanitizeSettings(await kvGet(SETTINGS_KEY)); }
  function saveSettings(s) { return kvPut(SETTINGS_KEY, s); }

  // ---- Export / import the whole save (settings + game) ----
  async function exportAll() {
    var bundle = { version: 2, settings: await loadSettings(), save: await loadSave() };
    return JSON.stringify(bundle, null, 2);
  }
  // Throws on malformed JSON so callers can show why. Returns true on success.
  async function importAll(raw) {
    var data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('文件格式无效');
    if (data.settings) await saveSettings(sanitizeSettings(data.settings));
    if (data.save) await writeSave(data.save);
    return true;
  }

  D.storage = {
    SAVE_KEY: SAVE_KEY, SETTINGS_KEY: SETTINGS_KEY,
    kvPut: kvPut, kvGet: kvGet, kvDel: kvDel,
    loadSave: loadSave, writeSave: writeSave, clearSave: clearSave,
    defaultSettings: defaultSettings, sanitizeSettings: sanitizeSettings,
    loadSettings: loadSettings, saveSettings: saveSettings,
    exportAll: exportAll, importAll: importAll,
  };
})(window.Dungeon);
