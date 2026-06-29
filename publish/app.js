// UI state, creator, event wiring, persistence, boot. The AI turn loop lives in
// turn.js and shares state via D.state / view helpers via D.ui.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var R = D.render, P = D.parser, S = D.storage, AI = D.ai;

  var state = {
    character: null, messages: [], summary: '', latestOptions: [], scene: '',
    loading: false, reqId: 0, model: AI.FALLBACK_MODEL, draftRace: 'human', draftAvatar: null,
  };
  D.state = state;

  function $(id) { return document.getElementById(id); }
  function show(view) {
    $('creator-view').className = 'view' + (view === 'creator' ? '' : ' hidden');
    $('game-view').className = 'view' + (view === 'game' ? '' : ' hidden');
  }

  // ---------- Creator ----------
  function refreshCreator(activeName) {
    R.renderPresets(activeName || '', applyPreset);
    R.renderRaces(state.draftRace, function (r) { state.draftRace = r; refreshCreator(activeName); });
    $('create-btn').disabled = !$('name-input').value.trim();
  }
  function applyPreset(p) {
    $('name-input').value = p.name;
    state.draftRace = p.race;
    state.draftAvatar = p.avatarUrl || null;
    $('m-bust').value = p.measurements.bust || '';
    $('m-waist').value = p.measurements.waist || '';
    $('m-hip').value = p.measurements.hip || '';
    $('backstory-input').value = p.backstory || '';
    $('costume-input').value = p.costumeDescription || '';
    $('other-input').value = p.otherDescription || '';
    $('tags-input').value = p.danbooruTags || '';
    refreshCreator(p.name);
  }
  function createCharacter() {
    var name = $('name-input').value.trim();
    if (!name) return;
    state.character = {
      name: name, race: state.draftRace,
      measurements: { bust: $('m-bust').value.trim(), waist: $('m-waist').value.trim(), hip: $('m-hip').value.trim() },
      backstory: $('backstory-input').value.trim(),
      costumeDescription: $('costume-input').value.trim(),
      otherDescription: $('other-input').value.trim(),
      danbooruTags: $('tags-input').value.trim(),
      avatarUrl: state.draftAvatar || null,
      hp: 100, maxHp: 100, pleasure: 0, desire: 0,
      bodyDevelopment: { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 },
      floor: 1, floorThemes: D.data.rollFloorThemes(), encounter: null,
      statusEffects: [],
    };
    state.messages = []; state.summary = ''; state.latestOptions = []; state.scene = '';
    persist();
    enterGame();
  }

  // ---------- Game view ----------
  function enterGame() {
    show('game');
    $('char-name').textContent = state.character.name;
    var firstTurn = state.messages.length === 0;
    $('start-btn').className = 'btn primary' + (firstTurn ? '' : ' hidden');
    $('send-btn').className = 'btn primary' + (firstTurn ? ' hidden' : '');
    rerender();
  }
  function rerender() {
    var c = state.character;
    if (!c) return;
    R.renderStats(c);
    R.renderEncounter(c);
    R.renderStatusEffects(c, dispel);
    R.renderMessages(state.messages, c.name, state.loading);
    R.renderOptions(state.latestOptions, state.loading, function (i, opt) { sendAction(opt); });
    R.renderScene(state.scene);
  }
  function setBusy(busy) {
    $('send-btn').disabled = busy;
    $('start-btn').disabled = busy;
    $('action-input').disabled = busy;
  }

  // ---------- Persistence ----------
  function persist() {
    if (!state.character) return;
    S.writeSave({
      character: state.character, messages: state.messages, summary: state.summary,
      latestOptions: state.latestOptions, scene: state.scene, updatedAt: Date.now(),
    });
  }
  D.ui = { rerender: rerender, persist: persist, setBusy: setBusy };

  // ---------- Actions ----------
  function sendAction(text) {
    if (state.loading || !text || !text.trim()) return;
    state.messages.push({ role: 'user', content: text.trim() });
    $('action-input').value = '';
    rerender();
    D.turn.runTurn();
  }
  function startAdventure() {
    if (state.loading) return;
    $('start-btn').className = 'btn primary hidden';
    $('send-btn').className = 'btn primary';
    state.messages.push({ role: 'user', content: D.turn.START_DISPLAY });
    rerender();
    D.turn.runTurn();
  }
  function dispel(effect) {
    if (state.loading) return;
    sendAction(state.character.name + '咬紧牙关，凝聚意志试图驱散身上的「' + effect.title +
      '」状态（' + effect.description + '）。请依据当前快感、欲望与身体开发度判定能否解除（越契合当前处境越难解，欲望或快感过高时几乎无法靠意志摆脱）：成功则在 [STATS] 的 statusEffects 中移除它，失败则保留甚至加剧并触发更强烈的色情事件。');
  }
  function resetGame() {
    if (!window.confirm('确定要重置吗？当前存档将被清除。')) return;
    state.reqId++; state.loading = false;
    S.clearSave();
    state.character = null; state.messages = []; state.summary = '';
    state.latestOptions = []; state.scene = ''; state.draftRace = 'human'; state.draftAvatar = null;
    ['name-input', 'm-bust', 'm-waist', 'm-hip', 'backstory-input', 'costume-input', 'other-input', 'tags-input']
      .forEach(function (idv) { $(idv).value = ''; });
    refreshCreator('');
    show('creator');
  }

  // ---------- Boot ----------
  async function boot() {
    refreshCreator('');
    $('name-input').addEventListener('input', function () { refreshCreator(); });
    $('create-btn').addEventListener('click', createCharacter);
    $('start-btn').addEventListener('click', startAdventure);
    $('send-btn').addEventListener('click', function () { sendAction($('action-input').value); });
    $('reset-btn').addEventListener('click', resetGame);
    $('action-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAction($('action-input').value); }
    });

    AI.listModels().then(function (r) { state.model = r.defaultModel || AI.FALLBACK_MODEL; });

    var save = await S.loadSave();
    if (save && save.character && Array.isArray(save.messages)) {
      state.character = save.character;
      state.messages = save.messages;
      state.summary = save.summary || '';
      state.scene = save.scene || '';
      var lastDm = null;
      for (var i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === 'assistant') { lastDm = state.messages[i]; break; }
      }
      state.latestOptions = lastDm ? P.parseOptions(lastDm.content) : (save.latestOptions || []);
      enterGame();
    } else {
      show('creator');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.Dungeon);
