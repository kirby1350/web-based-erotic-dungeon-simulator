// Settings constants: chat prose styles, image styles / tag presets, and the
// shared image prompt helpers (ported from lib/types.ts + lib/prompts.ts).
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var PROSE_STYLE_LABELS = {
    standard: { label: '标准', hint: '均衡叙事，仅常驻去油约束' },
    dense: { label: '重油堆叠', hint: '极致密集的感官堆叠流（仍遵守去油黑名单）' },
  };

  // Optional prose-style injection appended to the DM system prompt.
  var PROSE_STYLE_PROMPTS = {
    standard: '',
    dense: '【文风：重油堆叠（极致密集感官流）】\n' +
      '本回合采用「重油堆叠」文风——在严格遵守上方【文风禁令】黑名单的前提下，把描写密度推到极致（密集 ≠ 偷懒，堆叠词必须新鲜、具体、贴合角色）：\n' +
      '1. 形容词链：每个出场的身体部位前，连续堆叠 4 个以上「质感/肥度/油润/温度」修饰词不停顿。\n' +
      '2. 功能化定语：用该部位的性用途或性史当作长定语（如「榨精专用甬道」「能吞没整根的肥熟乳沟」）。\n' +
      '3. 通感四件套：每个画面同时调动 质感+温度+气味+声音 中至少三样。\n' +
      '4. 一部位一招牌喻体（须新鲜、不在同一段重复）：奶=吊钟/奶山，屄=馒头，臀=肉山/磨盘，后庭=螺纹，嘴=章鱼嘴/丁香小舌。\n' +
      '5. 自造四字贬抑词当节奏锤：艳畜、母畜、肉壶、雌躯 之类。\n' +
      '6. 气味轴贯穿全段：雌臭/狐骚/荷尔蒙媚香/油淫香汗，并与具体部位绑定。\n' +
      '7. 细节闭环：颜色、道具、剧情前后呼应。',
  };

  var IMAGE_STYLES = {
    none: { label: '无', tags: '' },
    'dk.senie': { label: 'dk.senie', tags: 'dk.senie, watercolor, soft lineart, pastel colors, dreamy lighting' },
    hakai_shin: { label: 'Hakai Shin', tags: 'hakai_shin, detailed shading, dynamic pose, vibrant colors, anime illustration' },
    shiokonbu: { label: 'shiokonbu', tags: 'shiokonbu, detailed lineart, soft shading, moe style, clean illustration' },
    piromizu: { label: 'piromizu', tags: 'piromizu, glossy skin, detailed body, soft gradient, erotic illustration' },
    nohito: { label: 'nohito', tags: 'nohito, expressive face, fine details, dramatic lighting, anime art style' },
    masami_chie: { label: 'masami chie', tags: 'masami chie, soft lineart, delicate shading, warm palette, detailed illustration' },
    thirty_8ght: { label: 'thirty_8ght', tags: 'thirty_8ght, glossy skin, detailed shading, thick thighs, erotic illustration' },
  };

  var IMAGE_TAG_PRESETS = {
    none: { label: '无', tags: '' },
    curvy: {
      label: '丰乳肥臀',
      tags: 'curvy, huge breasts, huge nipples, huge areolae, large clitoris, clitoris, fat mons, lactation, female ejaculation',
    },
  };

  var IMAGE_QUALITY_PREFIX = 'masterpiece, best quality, highly detailed';
  var IMAGE_NEGATIVE_PROMPT =
    'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry';
  var DEFAULT_SCENE_PROMPT = 'dungeon entrance, mysterious stone corridor, torchlight, dark fantasy';
  var DRAW_MODEL = 'anime';
  var DRAW_DIMENSION = 'portrait';

  // ---- Self-host image providers (used by the /api/image/* fallback in draw.js) ----
  // Mirrors lib/types.ts IMAGE_MODELS / TENSORART_MODELS.
  var IMAGE_MODELS = {
    tsubaki_v2: { label: 'Tsubaki v2', modelId: '1983308862240288769' },
  };
  var TENSORART_MODELS = {
    wai_nsfw_v16: { label: 'WAI-NSFW-V16', modelId: '943946051788787917' },
    jankuv6: { label: 'JANKUV6', modelId: '934122074308367585' },
  };
  var IMAGE_PROVIDERS = {
    pixai: { label: 'PixAI' },
    tensorart: { label: 'TensorArt' },
  };
  var IMAGE_WIDTH = 768;
  var IMAGE_HEIGHT = 1280;
  var IMAGE_BATCH = 4;

  // ---- Chat providers (used by the /api/chat fallback in ai.js) ----
  // The /api/chat route picks the provider server-side from CHAT_MODELS, but we
  // mirror the grok id list so the client can pass the right key when the user
  // supplies one. Anything not listed here is treated as the DZMM default.
  var GROK_MODEL_IDS = ['grok-4-latest', 'grok-3', 'grok-3-mini'];
  function isGrokModel(id) {
    if (!id) return false;
    return GROK_MODEL_IDS.indexOf(id) !== -1 || /^grok/i.test(id);
  }

  function withQualityPrefix(tags) {
    var t = (tags || '').trim();
    if (/masterpiece/i.test(t)) return t;
    return IMAGE_QUALITY_PREFIX + ', ' + t;
  }

  D.config = {
    PROSE_STYLE_LABELS: PROSE_STYLE_LABELS,
    PROSE_STYLE_PROMPTS: PROSE_STYLE_PROMPTS,
    IMAGE_STYLES: IMAGE_STYLES,
    IMAGE_TAG_PRESETS: IMAGE_TAG_PRESETS,
    IMAGE_MODELS: IMAGE_MODELS,
    TENSORART_MODELS: TENSORART_MODELS,
    IMAGE_PROVIDERS: IMAGE_PROVIDERS,
    IMAGE_WIDTH: IMAGE_WIDTH,
    IMAGE_HEIGHT: IMAGE_HEIGHT,
    IMAGE_BATCH: IMAGE_BATCH,
    IMAGE_QUALITY_PREFIX: IMAGE_QUALITY_PREFIX,
    IMAGE_NEGATIVE_PROMPT: IMAGE_NEGATIVE_PROMPT,
    DEFAULT_SCENE_PROMPT: DEFAULT_SCENE_PROMPT,
    DRAW_MODEL: DRAW_MODEL,
    DRAW_DIMENSION: DRAW_DIMENSION,
    GROK_MODEL_IDS: GROK_MODEL_IDS,
    isGrokModel: isGrokModel,
    withQualityPrefix: withQualityPrefix,
  };
})(window.Dungeon);
