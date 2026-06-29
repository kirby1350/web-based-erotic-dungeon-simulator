// Image generation via the platform window.dzmm.draw SDK.
// dzmm.draw.generate({ prompt, negativePrompt, model, dimension, tagIds })
//   resolves to { images?: string[] }  (array of image URLs).
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function available() {
    return !!(window.dzmm && window.dzmm.draw && window.dzmm.draw.generate);
  }

  // Returns string[] of image URLs. Throws a readable error on failure.
  async function generate(prompt, negativePrompt) {
    if (!available()) {
      throw new Error('平台绘图接口 (window.dzmm.draw.generate) 不可用');
    }
    var r = await window.dzmm.draw.generate({
      prompt: prompt,
      negativePrompt: negativePrompt || D.config.IMAGE_NEGATIVE_PROMPT,
      model: D.config.DRAW_MODEL,
      dimension: D.config.DRAW_DIMENSION,
      tagIds: [],
    });
    var images = (r && r.images) || [];
    if (!images.length) throw new Error('图片生成完成但未返回图片');
    return images;
  }

  D.draw = { available: available, generate: generate };
})(window.Dungeon);
