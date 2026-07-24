// AI marker parsing, ported from the original chat-panel.tsx.
// Models emit unstable output (full-width punctuation, truncated JSON, missing
// close tags, varied bullets) — these helpers stay defensive about all of it.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  // Convert STRUCTURAL full-width punctuation to ASCII, while leaving punctuation
  // *inside string values* (narrative text) untouched.
  function normalizeJsonPunctuation(s) {
    var map = { '：': ':', '，': ',', '｛': '{', '｝': '}', '［': '[', '］': ']', '　': ' ' };
    var out = '';
    var inStr = false;
    var esc = false;
    for (var k = 0; k < s.length; k++) {
      var ch = s[k];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; out += ch; continue; }
      out += (!inStr && map[ch]) ? map[ch] : ch;
    }
    return out;
  }

  // Best-effort parse of a JSON object that may use full-width punctuation or be
  // truncated mid-stream. Repairs open strings, dangling keys, trailing commas
  // and unbalanced brackets.
  function parseJsonLenient(raw) {
    var normalized = normalizeJsonPunctuation(raw);
    try { return JSON.parse(normalized); } catch (e) { /* repair below */ }

    var s = normalized;
    var stack = [];
    var inStr = false;
    var esc = false;
    for (var k = 0; k < s.length; k++) {
      var ch = s[k];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') stack.pop();
    }
    if (inStr) s += '"';
    s = s.replace(/[,{]\s*"[^"]*"\s*:?\s*$/, function (m) { return m[0] === '{' ? '{' : ''; });
    s = s.replace(/,\s*$/, '');
    while (stack.length) s += (stack.pop() === '{' ? '}' : ']');
    s = s.replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(s); } catch (e2) { return null; }
  }

  // Extract and merge all sibling JSON objects inside [MARKER:...obj1, obj2...].
  // Tolerant of full-width colon and a final object truncated by the token limit.
  function extractMarkerJson(text, marker) {
    var re = new RegExp('\\[' + marker + '\\s*[:：]', 'i');
    var m = re.exec(text);
    if (!m) return null;

    var objects = [];
    var i = m.index + m[0].length;
    // Recognise both ASCII and full-width braces — models often emit ｛｝.
    var isOpen = function (x) { return x === '{' || x === '｛'; };
    var isClose = function (x) { return x === '}' || x === '｝'; };

    while (i < text.length) {
      var ch = text[i];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',' || ch === '，' || ch === '　') { i++; continue; }
      if (ch === ']' || ch === '］') break;
      if (isOpen(ch)) {
        var depth = 0;
        var inStr = false;
        var esc = false;
        var closed = false;
        var objStart = i;
        for (; i < text.length; i++) {
          var c = text[i];
          if (esc) { esc = false; continue; }
          if (c === '\\') { esc = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (isOpen(c)) depth++;
          else if (isClose(c)) {
            depth--;
            if (depth === 0) {
              var parsed = parseJsonLenient(text.slice(objStart, i + 1));
              if (parsed) objects.push(parsed);
              i++;
              closed = true;
              break;
            }
          }
        }
        if (!closed) {
          var tail = parseJsonLenient(text.slice(objStart));
          if (tail) objects.push(tail);
          break;
        }
      } else {
        i++;
      }
    }

    if (objects.length === 0) return null;
    return Object.assign.apply(Object, [{}].concat(objects));
  }

  // Everything from the first structured marker onward is UI metadata, not prose.
  var MARKER_START = /\[OPTIONS\]|\[SCENE|\[STATS|\[DESC/i;

  function cleanContent(content) {
    var idx = content.search(MARKER_START);
    return (idx === -1 ? content : content.slice(0, idx)).trim();
  }

  // Read the [OPTIONS] body up to its close tag, the next marker, or end.
  // Accept "1." / "-" / "•" bullet styles.
  function parseOptions(content) {
    var block = content.match(/\[OPTIONS\]([\s\S]*?)(?:\[\/OPTIONS\]|\[SCENE|\[STATS|\[DESC|$)/i);
    if (!block) return [];
    return block[1]
      .split('\n')
      .map(function (l) { return l.trim(); })
      .filter(Boolean)
      .map(function (l) { return l.replace(/^[-*•]\s*/, '').replace(/^\d+[.、)]\s*/, '').trim(); })
      .filter(function (l) { return l.length > 0; })
      .slice(0, 4);
  }

  // [SCENE: tags] → cleaned danbooru tag string, or '' if absent.
  function parseScene(content) {
    var m = content.match(/\[SCENE\s*[:：]\s*([^\]]+)\]/i);
    if (!m) return '';
    return m[1].replace(/，/g, ',').replace(/　/g, ' ').trim();
  }

  D.parser = {
    normalizeJsonPunctuation: normalizeJsonPunctuation,
    parseJsonLenient: parseJsonLenient,
    extractMarkerJson: extractMarkerJson,
    cleanContent: cleanContent,
    parseOptions: parseOptions,
    parseScene: parseScene,
  };
})(window.Dungeon);
