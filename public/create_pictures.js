/**
 * create_pictures.js — 图片生成模块
 *
 * 使用 dzmm.draw.generate API 生成场景插图。
 * 对外暴露 window.ImagePanel 对象，由 game.js 调用。
 */

(function () {
  'use strict';

  /* ============================================================
     配置 & 常量
     ============================================================ */

  const IMAGE_STYLES = {
    none:          { label: '无',           tags: '' },
    'dk.senie':    { label: 'dk.senie',     tags: 'dk.senie, watercolor, soft lineart, pastel colors, dreamy lighting' },
    hakai_shin:    { label: 'Hakai Shin',   tags: 'hakai_shin, detailed shading, dynamic pose, vibrant colors, anime illustration' },
    shiokonbu:     { label: 'shiokonbu',    tags: 'shiokonbu, detailed lineart, soft shading, moe style, clean illustration' },
    piromizu:      { label: 'piromizu',     tags: 'piromizu, glossy skin, detailed body, soft gradient, erotic illustration' },
    nohito:        { label: 'nohito',       tags: 'nohito, expressive face, fine details, dramatic lighting, anime art style' },
    masami_chie:   { label: 'masami chie',  tags: 'masami chie, soft lineart, delicate shading, warm palette, detailed illustration' },
  };

  const DIMENSIONS = {
    portrait:  { label: '竖向 (3:4)', value: 'portrait' },
    landscape: { label: '横向 (4:3)', value: 'landscape' },
    square:    { label: '正方 (1:1)', value: 'square' },
  };

  /* ============================================================
     状态
     ============================================================ */

  const state = {
    images: [],        // [{ url, prompt }]
    activeUrl: null,
    loading: false,
    error: null,
    pendingScene: null,
    showPromptBox: false,
    customPrompt: '',
    // 从设置中读取
    imageStyle: 'none',
    imageStyleCustom: '',
    dimension: 'portrait',
  };

  /* ============================================================
     DOM 引用（在 init() 时绑定）
     ============================================================ */

  let dom = {};

  /* ============================================================
     渲染
     ============================================================ */

  function renderImage() {
    if (!dom.imageMain) return;

    // 主图
    if (state.activeUrl) {
      dom.imageMain.innerHTML = `<img class="scene-img" src="${state.activeUrl}" alt="场景插图">`;
    } else {
      dom.imageMain.innerHTML = `
        <div class="image-placeholder">
          <div class="image-placeholder-icon">&#128444;</div>
          <p>场景插图将在这里显示</p>
          <span>AI 将根据冒险剧情自动生成插图</span>
        </div>`;
    }

    // 加载遮罩
    if (state.loading) {
      dom.imageMain.insertAdjacentHTML('beforeend', `
        <div class="image-loading-overlay">
          <div class="spinner"></div>
          <p>正在绘制场景...</p>
        </div>`);
    }

    // 待处理场景提示
    if (state.pendingScene && !state.loading) {
      dom.imageMain.insertAdjacentHTML('beforeend', `
        <div class="pending-scene-bar">
          <div class="pending-scene-inner">
            <span>&#10024;</span>
            <span class="pending-scene-text">新场景：${state.pendingScene}</span>
            <button class="btn-gen-scene" id="btnGenScene">生成插图</button>
          </div>
        </div>`);
      document.getElementById('btnGenScene')?.addEventListener('click', handleAutoGenerate);
    }
  }

  function renderError() {
    if (!dom.imageError) return;
    if (state.error) {
      dom.imageError.textContent = state.error;
      dom.imageError.classList.remove('hidden');
    } else {
      dom.imageError.classList.add('hidden');
    }
  }

  function renderThumbnails() {
    if (!dom.thumbnailsRow) return;
    if (state.images.length <= 1) {
      dom.thumbnailsRow.classList.add('hidden');
      return;
    }
    dom.thumbnailsRow.classList.remove('hidden');
    dom.thumbnailsRow.innerHTML = state.images.map((img, i) => `
      <button class="thumb-btn ${img.url === state.activeUrl ? 'active' : ''}" data-index="${i}">
        <img src="${img.url}" alt="">
      </button>`).join('');
    dom.thumbnailsRow.querySelectorAll('.thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        state.activeUrl = state.images[idx].url;
        renderImage();
        renderThumbnails();
      });
    });
  }

  function renderPromptBox() {
    if (!dom.customPromptBox) return;
    if (state.showPromptBox) {
      dom.customPromptBox.classList.remove('hidden');
    } else {
      dom.customPromptBox.classList.add('hidden');
    }
    if (dom.customPromptToggleIcon) {
      dom.customPromptToggleIcon.textContent = state.showPromptBox ? '▲' : '▼';
    }
  }

  /* ============================================================
     生成逻辑
     ============================================================ */

  async function generateImage(prompt) {
    if (!window.dzmm?.draw?.generate) {
      state.error = '图片生成 SDK 未就绪，请稍后再试';
      renderError();
      return;
    }

    state.loading = true;
    state.error = null;
    renderImage();
    renderError();

    try {
      const settings = window.GameSettings ? window.GameSettings.get() : {};
      const styleKey = settings.imageStyle || state.imageStyle;
      const customTags = settings.imageStyleCustom || state.imageStyleCustom || '';
      const styleTags = (IMAGE_STYLES[styleKey] ?? IMAGE_STYLES['none']).tags;
      const allStyleTags = [styleTags, customTags].filter(Boolean).join(', ');
      const finalPrompt = allStyleTags ? `${prompt}, ${allStyleTags}` : prompt;

      const dimension = settings.dimension || state.dimension || 'portrait';

      const result = await window.dzmm.draw.generate({
        prompt: finalPrompt,
        negativePrompt: 'low quality, blurry, bad anatomy, text, watermark, ugly, deformed',
        model: 'anime',
        dimension,
        tagIds: [],
      });

      if (result.images && result.images.length > 0) {
        const newImages = result.images.map(url => ({ url, prompt }));
        state.images = [...newImages, ...state.images].slice(0, 20);
        state.activeUrl = result.images[0];
        state.error = null;
      } else {
        state.error = '图片生成完成但未返回图片';
      }
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('配额')) {
        state.error = '今日图片生成配额已用完，明天再来吧';
      } else if (msg.includes('敏感')) {
        state.error = '检测到禁忌内容，请调整提示词';
      } else {
        state.error = `生成失败：${msg}`;
      }
    } finally {
      state.loading = false;
      renderImage();
      renderError();
      renderThumbnails();
    }
  }

  /* ============================================================
     事件处理
     ============================================================ */

  async function handleAutoGenerate() {
    if (!state.pendingScene) return;
    const scene = state.pendingScene;
    state.pendingScene = null;
    renderImage();
    await generateImage(scene);
  }

  async function handleCustomGenerate() {
    const rawPrompt = (state.customPrompt || '').trim()
      || 'dungeon entrance, mysterious stone corridor, torchlight, dark fantasy';
    await generateImage(rawPrompt);
  }

  /* ============================================================
     初始化
     ============================================================ */

  function init() {
    dom = {
      imageMain:            document.getElementById('imageMain'),
      imageError:           document.getElementById('imageError'),
      thumbnailsRow:        document.getElementById('thumbnailsRow'),
      customPromptBox:      document.getElementById('customPromptBox'),
      customPromptToggle:   document.getElementById('customPromptToggle'),
      customPromptToggleIcon: document.getElementById('customPromptToggleIcon'),
      customPromptInput:    document.getElementById('customPromptInput'),
      btnCustomGen:         document.getElementById('btnCustomGen'),
    };

    // Toggle prompt box
    dom.customPromptToggle?.addEventListener('click', () => {
      state.showPromptBox = !state.showPromptBox;
      renderPromptBox();
    });

    // Custom prompt input
    dom.customPromptInput?.addEventListener('input', (e) => {
      state.customPrompt = e.target.value;
    });

    // Generate button
    dom.btnCustomGen?.addEventListener('click', handleCustomGenerate);

    // Initial render
    renderImage();
    renderError();
    renderThumbnails();
    renderPromptBox();
  }

  /* ============================================================
     公开 API
     ============================================================ */

  window.ImagePanel = {
    init,

    /**
     * 由 game.js 调用，设置待生成的场景描述。
     * @param {string} scene - danbooru tags 字符串
     */
    setPendingScene(scene) {
      state.pendingScene = scene;
      renderImage();
    },

    /**
     * 直接触发图片生成（不需要用户点击）。
     * @param {string} prompt
     */
    generate(prompt) {
      return generateImage(prompt);
    },

    /**
     * 更新设置（由 settings panel 调用）
     * @param {{ imageStyle: string, imageStyleCustom: string, dimension: string }} settings
     */
    updateSettings(settings) {
      if (settings.imageStyle !== undefined) state.imageStyle = settings.imageStyle;
      if (settings.imageStyleCustom !== undefined) state.imageStyleCustom = settings.imageStyleCustom;
      if (settings.dimension !== undefined) state.dimension = settings.dimension;
    },

    IMAGE_STYLES,
    DIMENSIONS,
  };
})();
