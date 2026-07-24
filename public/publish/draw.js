// Image generation.
//
// Two runtimes, one API (mirrors components/image-panel.tsx):
//   1) DZMM platform — window.dzmm.draw.generate({...}) → { images?: string[] }.
//   2) Self-host fallback — the same-origin Next routes:
//        PixAI:     POST /api/image/generate  → { id }        then poll /api/image/task/:id
//        TensorArt: POST /api/image/tensorart → { job:{ id } } then poll /api/image/tensorart/:id
//      Provider + model + keys come from D.state.settings.
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  function platformAvailable() {
    return !!(window.dzmm && window.dzmm.draw && window.dzmm.draw.generate);
  }
  // Kept for callers that gate the panel on availability; the /api fallback
  // means drawing is always available when self-hosted, so report true there.
  function available() { return true; }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function pollPixai(taskId, key) {
    for (var i = 0; i < 120; i++) {
      await sleep(1000);
      var res = await fetch('/api/image/task/' + taskId, { headers: key ? { 'x-pixai-key': key } : {} });
      if (!res.ok) throw new Error('轮询失败: ' + res.status);
      var data = await res.json();
      var status = data && data.status;
      if (status === 'completed') {
        var urls = (data && data.outputs && data.outputs.mediaUrls) || [];
        if (urls.length) return urls;
        throw new Error('图片生成完成但未返回 URL');
      }
      if (status === 'failed') throw new Error('PixAI 图片生成失败');
    }
    throw new Error('图片生成超时（120s）');
  }

  async function pollTensorart(jobId, key) {
    for (var i = 0; i < 120; i++) {
      await sleep(1000);
      var res = await fetch('/api/image/tensorart/' + jobId, { headers: key ? { 'x-tensorart-key': key } : {} });
      if (!res.ok) throw new Error('TensorArt 轮询失败: ' + res.status);
      var data = await res.json();
      var status = (data && data.job && data.job.status) || '';
      if (status === 'SUCCESS') {
        var imgs = (data && data.job && data.job.successInfo && data.job.successInfo.images) || [];
        var urls = imgs.map(function (im) { return im.url; }).filter(Boolean);
        if (urls.length) return urls;
        throw new Error('TensorArt 生成完成但未返回图片 URL');
      }
      if (status === 'FAILED') throw new Error('TensorArt 图片生成失败');
    }
    throw new Error('TensorArt 图片生成超时（120s）');
  }

  // Returns string[] of image URLs. Throws a readable error on failure.
  async function generate(prompt, negativePrompt) {
    var C = D.config;
    var neg = negativePrompt || C.IMAGE_NEGATIVE_PROMPT;

    // Platform SDK first (no keys / no polling).
    if (platformAvailable()) {
      var r = await window.dzmm.draw.generate({
        prompt: prompt, negativePrompt: neg,
        model: C.DRAW_MODEL, dimension: C.DRAW_DIMENSION, tagIds: [],
      });
      var images = (r && r.images) || [];
      if (!images.length) throw new Error('图片生成完成但未返回图片');
      return images;
    }

    // Self-host fallback → /api/image/*.
    var s = (D.state && D.state.settings) || {};
    var provider = s.imageProvider || 'pixai';

    if (provider === 'tensorart') {
      var taModel = (C.TENSORART_MODELS[s.tensorartModel] || C.TENSORART_MODELS.wai_nsfw_v16);
      var tres = await fetch('/api/image/tensorart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: prompt, modelId: taModel.modelId,
          width: C.IMAGE_WIDTH, height: C.IMAGE_HEIGHT,
          apiKey: s.tensorartApiKey || undefined,
        }),
      });
      if (!tres.ok) { var te = await tres.json().catch(function () { return {}; }); throw new Error((te && te.error) || 'TensorArt 请求失败'); }
      var tdata = await tres.json();
      var jobId = tdata && tdata.job && tdata.job.id;
      if (!jobId) throw new Error('未获取到 TensorArt Job ID');
      return pollTensorart(jobId, s.tensorartApiKey || '');
    }

    // default: PixAI
    var pxModel = (C.IMAGE_MODELS[s.imageModel] || C.IMAGE_MODELS.tsubaki_v2);
    var pres = await fetch('/api/image/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompts: prompt, negativePrompts: neg, modelId: pxModel.modelId,
        width: C.IMAGE_WIDTH, height: C.IMAGE_HEIGHT, batchSize: C.IMAGE_BATCH,
        apiKey: s.pixaiApiKey || undefined,
      }),
    });
    if (!pres.ok) { var pe = await pres.json().catch(function () { return {}; }); throw new Error((pe && pe.error) || 'PixAI 请求失败'); }
    var pdata = await pres.json();
    var taskId = pdata && pdata.id;
    if (!taskId) throw new Error('未获取到 PixAI 任务 ID');
    return pollPixai(taskId, s.pixaiApiKey || '');
  }

  D.draw = { available: available, platformAvailable: platformAvailable, generate: generate };
})(window.Dungeon);
