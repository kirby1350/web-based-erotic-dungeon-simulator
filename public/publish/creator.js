// Character creation view: presets, race, measurements, descriptions, danbooru
// tags, and local avatar upload (data URL). Ported from character-creator.tsx.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function refresh(activeName) {
    D.render.renderPresets(activeName || '', applyPreset);
    D.render.renderRaces(D.state.draftRace, function (r) { D.state.draftRace = r; refresh(activeName); });
    $('create-btn').disabled = !$('name-input').value.trim();
  }

  function setAvatar(url) {
    D.state.draftAvatar = url || null;
    var box = $('avatar-box');
    if (box) box.innerHTML = url ? '<img src="' + D.render.escapeHtml(url) + '" alt="">' : '上传头像';
  }

  function applyPreset(p) {
    $('name-input').value = p.name;
    D.state.draftRace = p.race;
    $('m-bust').value = p.measurements.bust || '';
    $('m-waist').value = p.measurements.waist || '';
    $('m-hip').value = p.measurements.hip || '';
    $('backstory-input').value = p.backstory || '';
    $('costume-input').value = p.costumeDescription || '';
    $('other-input').value = p.otherDescription || '';
    $('tags-input').value = p.danbooruTags || '';
    setAvatar(p.avatarUrl || null);
    refresh(p.name);
  }

  function handleFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var reader = new FileReader();
    reader.onload = function (e) { setAvatar(String(e.target.result)); };
    reader.readAsDataURL(file);
  }

  function create() {
    var name = $('name-input').value.trim();
    if (!name) return;
    var character = {
      name: name, race: D.state.draftRace,
      measurements: { bust: $('m-bust').value.trim(), waist: $('m-waist').value.trim(), hip: $('m-hip').value.trim() },
      backstory: $('backstory-input').value.trim(),
      costumeDescription: $('costume-input').value.trim(),
      otherDescription: $('other-input').value.trim(),
      danbooruTags: $('tags-input').value.trim(),
      avatarUrl: D.state.draftAvatar || null,
      hp: 100, maxHp: 100, pleasure: 0, desire: 0,
      bodyDevelopment: { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 },
      floor: 1, floorThemes: D.data.rollFloorThemes(), encounter: null, statusEffects: [],
    };
    D.app.enterGame(character, true);
  }

  function resetForm() {
    D.state.draftRace = 'human';
    setAvatar(null);
    ['name-input', 'm-bust', 'm-waist', 'm-hip', 'backstory-input', 'costume-input', 'other-input', 'tags-input']
      .forEach(function (id) { $(id).value = ''; });
    refresh('');
  }

  function init() {
    refresh('');
    $('name-input').addEventListener('input', function () { refresh(); });
    $('create-btn').addEventListener('click', create);
    var box = $('avatar-box'), file = $('avatar-file');
    if (box && file) {
      box.addEventListener('click', function () { file.click(); });
      file.addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; if (f) handleFile(f); });
      box.addEventListener('dragover', function (e) { e.preventDefault(); box.classList.add('drag'); });
      box.addEventListener('dragleave', function () { box.classList.remove('drag'); });
      box.addEventListener('drop', function (e) { e.preventDefault(); box.classList.remove('drag'); handleFile(e.dataTransfer.files[0]); });
    }
  }

  D.creator = { init: init, resetForm: resetForm };
})(window.Dungeon);
