// Character card: avatar, HP/快感/欲望, collapsible body-development bars and
// status effects. Ported from components/character-card.tsx.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function esc(s) { return D.render.escapeHtml(s); }

  var PART_LABELS = { breast: '胸部', clitoris: '阴蒂', urethra: '尿道', vagina: '阴道', anus: '肛门' };
  var PARTS = ['breast', 'clitoris', 'urethra', 'vagina', 'anus'];
  var DEV_DESC = {
    0: '此处尚未经历任何开发，对外界刺激几乎没有反应。',
    1: '经过初步触碰，开始产生隐约的酥麻感，偶尔不自觉地轻微收缩。',
    2: '已逐渐适应规律刺激，敏感度明显提升，被触碰时会渗出液体。',
    3: '经过充分开发，稍加刺激便迅速充血膨胀，高潮越来越容易。',
    4: '高度敏感，轻微摩擦或语言挑逗也会引发强烈快感与不受控收缩。',
    5: '已被彻底开发，永久过敏感，稍有刺激便高潮颤抖并大量溢液。',
  };

  var open = { body: false, status: false };

  function devBar(level, exp) {
    var max = level >= 5;
    var w = max ? 100 : exp;
    return '<span class="dev-lv lv' + level + '">Lv' + level + '</span>' +
      '<span class="dev-track"><span class="dev-fill" style="width:' + w + '%"></span></span>' +
      '<span class="dev-exp">' + (max ? 'MAX' : (exp + '/100')) + '</span>';
  }

  function render(c, onReset) {
    var host = document.getElementById('char-card');
    if (!host || !c) return;
    var theme = D.data.getFloorTheme(c.floorThemes, c.floor || 1);
    var bd = c.bodyDevelopment || { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 };
    var se = c.statusEffects || [];
    var avatar = c.avatarUrl
      ? '<img src="' + esc(c.avatarUrl) + '" alt="" class="cc-avatar">'
      : '<div class="cc-avatar cc-avatar-ph">' + esc((c.name || '?')[0]) + '</div>';

    var m = c.measurements || {};
    var measures = [['胸围', m.bust], ['腰围', m.waist], ['臀围', m.hip]].map(function (p) {
      return '<div class="cc-measure"><div class="cc-mv">' + (p[1] ? esc(p[1]) : '—') + '</div><div class="cc-ml">' + p[0] + (p[1] ? ' cm' : '') + '</div></div>';
    }).join('');

    var devRows = PARTS.map(function (k) {
      var lv = bd[k] || 0;
      var exp = (bd.exp && bd.exp[k]) || 0;
      var desc = (bd.descriptions && bd.descriptions[k]) || DEV_DESC[lv] || DEV_DESC[0];
      return '<div class="cc-dev"><div class="cc-dev-top"><span class="cc-part">' + PART_LABELS[k] + '</span>' + devBar(lv, exp) + '</div>' +
        '<p class="cc-dev-desc">' + esc(desc) + '</p></div>';
    }).join('');

    var statusBody = se.length
      ? se.map(function (e) {
          return '<div class="cc-se"><div class="cc-se-t">' + esc(e.title) + '</div><div class="cc-se-d">' + esc(e.description || '') + '</div></div>';
        }).join('')
      : '<div class="cc-empty">暂无异常状态</div>';

    host.innerHTML =
      '<div class="cc-head">' + avatar +
      '<div class="cc-id"><div class="cc-name gold">' + esc(c.name) + '</div>' +
      '<div class="cc-sub"><span class="muted">' + esc(D.data.RACE_INFO[c.race].label) + '</span>' +
      '<span class="cc-floor">第 ' + (c.floor || 1) + '/' + D.data.TARGET_FLOOR + ' 层 · ' + esc(theme.name) + '</span></div></div>' +
      '<button class="cc-reset btn ghost tiny" title="重新创建角色">重置</button></div>' +
      '<button class="cc-toggle" data-sec="body">身体状态 ' + (open.body ? '▲' : '▼') + '</button>' +
      (open.body ? '<div class="cc-sec"><div class="cc-measures">' + measures + '</div>' + devRows + '</div>' : '') +
      '<button class="cc-toggle" data-sec="status">异常状态' + (se.length ? '（' + se.length + '）' : '') + ' ' + (open.status ? '▲' : '▼') + '</button>' +
      (open.status ? '<div class="cc-sec">' + statusBody + '</div>' : '');

    host.querySelector('.cc-reset').addEventListener('click', onReset);
    Array.prototype.forEach.call(host.querySelectorAll('.cc-toggle'), function (b) {
      b.addEventListener('click', function () { open[b.getAttribute('data-sec')] = !open[b.getAttribute('data-sec')]; render(c, onReset); });
    });
  }

  D.card = { render: render };
})(window.Dungeon);
