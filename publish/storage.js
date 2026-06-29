// Save/load via the platform dzmm.kv, with a localStorage fallback.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var SAVE_KEY = 'dungeon-static-save-v1';

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
    // Also overwrite with null in case delete is unsupported.
    if (hasKv()) { try { await window.dzmm.kv.put(key, null); } catch (e) {} }
    try { localStorage.removeItem(key); } catch (_) {}
  }

  // ---- Game-save helpers (single slot) ----
  async function loadSave() {
    return await kvGet(SAVE_KEY);
  }

  async function writeSave(save) {
    await kvPut(SAVE_KEY, save);
  }

  async function clearSave() {
    await kvDel(SAVE_KEY);
  }

  D.storage = {
    SAVE_KEY: SAVE_KEY,
    kvPut: kvPut,
    kvGet: kvGet,
    kvDel: kvDel,
    loadSave: loadSave,
    writeSave: writeSave,
    clearSave: clearSave,
  };
})(window.Dungeon);
