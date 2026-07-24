// Orchestrator: shared state, game view, persistence, actions, layout, boot.
// Creation lives in creator.js; the AI turn loop in turn.js; panels/modals in
// card.js / image.js / settings.js / tools.js.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var R = D.render, P = D.parser, S = D.storage, AI = D.ai;

  var state = {
    character: null, messages: [], summary: '', latestOptions: [], scene: '',
    loading: false, summarising: false, reqId: 0,
    model: AI.FALLBACK_MODEL, models: [], settings: S.defaultSettings(),
    draftRace: 'human', draftAvatar: null, lastUserInput: '', tab: 'chat',
  };
  D.state = state;

  function $(id) { return document.getElementById(id); }
  function show(view) {
    $('creator-view').className = 'view' + (view === 'creator' ? '' : ' hidden');
    $('game-view').className = 'view' + (view === 'game' ? '' : ' hidden');
  }

  function enterGame(character, fresh) {
    if (character) state.character = character;
    if (fresh) { state.messages = []; state.summary = ''; state.latestOptions = []; state.scene = ''; persist(); }
    show('game');
    var firstTurn = state.messages.length === 0;
    $('start-btn').className = 'btn primary' + (firstTurn ? '' : ' hidden');
    $('send-btn').className = 'btn primary' + (firstTurn ? ' hidden' : '');
    D.image.render();
    rerender();
  }

  function rerender() {
    var c = state.character;
    if (!c) return;
    R.renderStats(c);
    R.renderEncounter(c, { onEscape: attemptEscape, onSurrender: acceptBroken }, state.loading);
    R.renderSummaryBar(state.summary, state.summarising);
    R.renderStatusEffects(c, dispel);
    R.renderMessages(state.messages, c.name, state.loading);
    R.renderOptions(state.latestOptions, state.loading, function (i, opt) { sendAction(opt); });
    R.renderScene(state.scene);
    D.card.render(c, resetGame);
    var rt = $('retry-btn'); if (rt) rt.className = 'btn ghost tiny' + ((state.lastUserInput && !state.loading) ? '' : ' hidden');
  }

  function setBusy(busy) {
    ['send-btn', 'start-btn', 'action-input'].forEach(function (id) { var el = $(id); if (el) el.disabled = busy || state.summarising; });
  }

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
    state.lastUserInput = text.trim();
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
  function retry() { if (state.lastUserInput) sendAction(state.lastUserInput); }
  function dispel(effect) {
    if (state.loading) return;
    sendAction(state.character.name + '咬紧牙关，凝聚意志试图驱散身上的「' + effect.title + '」状态（' + effect.description +
      '）。请依据当前快感、欲望与身体开发度判定能否解除（越契合处境越难解，欲望或快感过高时几乎无法靠意志摆脱）：成功则在 [STATS] 的 statusEffects 中移除它，失败则保留甚至加剧并触发更强烈的色情事件。');
  }
  function attemptEscape() {
    var enc = state.character.encounter;
    if (state.loading || !enc) return;
    sendAction(state.character.name + '拼尽全力挣扎，奋力挣脱束缚、突破当前的' + enc.name + '，逃脱、逃离这个遭遇！');
  }
  function acceptBroken() {
    var enc = state.character.encounter;
    if (state.loading || !enc) return;
    sendAction(state.character.name + '彻底放弃抵抗，张开身体迎接' + enc.name + '的肆意蹂躏，任由自己被玩弄、榨干到精神彻底崩坏，直到对方玩腻后将这具失神瘫软的躯体随意丢弃。（请详细描写被玩坏丢弃的过程，并在结束后让她脱离当前遭遇）');
  }
  function applyStatus(effects) {
    if (!state.character) return;
    state.character.statusEffects = effects;
    persist(); rerender();
  }
  function fillInput(text) {
    var ta = $('action-input'); if (ta) { ta.value = text; ta.focus(); }
  }

  function switchTab(tab) {
    state.tab = tab;
    $('tab-chat').classList.toggle('active', tab === 'chat');
    $('tab-image').classList.toggle('active', tab === 'image');
    $('col-chat').classList.toggle('tab-hidden', tab !== 'chat');
    $('col-image').classList.toggle('tab-hidden', tab !== 'image');
  }

  function resetGame() {
    if (!window.confirm('确定要重置吗？当前存档将被清除。')) return;
    state.reqId++; state.loading = false;
    S.clearSave();
    state.character = null; state.messages = []; state.summary = '';
    state.latestOptions = []; state.scene = ''; state.lastUserInput = '';
    D.image.reset();
    D.creator.resetForm();
    show('creator');
  }

  // ---------- Boot ----------
  async function boot() {
    state.settings = await S.loadSettings();
    state.model = state.settings.chatModel || AI.FALLBACK_MODEL;
    D.creator.init();

    $('start-btn').addEventListener('click', startAdventure);
    $('send-btn').addEventListener('click', function () { sendAction($('action-input').value); });
    $('retry-btn').addEventListener('click', retry);
    $('settings-btn').addEventListener('click', function () { D.settings.open(); });
    $('trap-btn').addEventListener('click', function () { D.tools.openTrap(fillInput); });
    $('status-btn').addEventListener('click', function () { D.tools.openStatus(state.character.statusEffects || [], applyStatus); });
    $('tab-chat').addEventListener('click', function () { switchTab('chat'); });
    $('tab-image').addEventListener('click', function () { switchTab('image'); });
    $('action-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAction($('action-input').value); }
    });

    AI.listModels().then(function (r) {
      state.models = r.models || [];
      if (!state.settings.chatModel) state.model = r.defaultModel || AI.FALLBACK_MODEL;
    });

    var save = await S.loadSave();
    if (save && save.character && Array.isArray(save.messages)) {
      state.character = save.character; state.messages = save.messages;
      state.summary = save.summary || ''; state.scene = save.scene || '';
      var lastDm = null;
      for (var i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === 'assistant') { lastDm = state.messages[i]; break; }
      }
      state.latestOptions = lastDm ? P.parseOptions(lastDm.content) : (save.latestOptions || []);
      if (state.scene) D.image.notifyScene(D.config.withQualityPrefix(state.scene));
      enterGame();
    } else {
      show('creator');
    }
  }

  D.app = { enterGame: enterGame, resetGame: resetGame, fillInput: fillInput, applyStatus: applyStatus };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Dungeon);
