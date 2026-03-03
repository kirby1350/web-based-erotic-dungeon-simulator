/**
 * game.js — 地下城探险 主游戏逻辑
 *
 * 文字聊天请求使用 window.dzmm.completions + window.dzmm.chat API。
 * 图片生成委托给 create_pictures.js (window.ImagePanel)。
 *
 * 架构：
 *   - Storage     本地存储（角色、设置、聊天记录）
 *   - Data        角色预设、种族、模型等配置数据
 *   - CharCreator 角色创建界面
 *   - CharCard    角色信息卡片
 *   - ChatPanel   聊天面板（核心游戏循环）
 *   - SettingsPanel 设置面板
 *   - TrapGenerator 随机陷阱生成器
 *   - App         应用入口 & 页面切换
 */

(function () {
  'use strict';

  /* ============================================================
     等待 DZMM API 就绪
     ============================================================ */

  if (window.parent !== window) {
    window.parent.postMessage('iframe:content-ready', '*');
  }

  const dzmmReady = new Promise((resolve) => {
    window.addEventListener('message', function handler(event) {
      if (event.data?.type === 'dzmm:ready') {
        window.removeEventListener('message', handler);
        resolve();
      }
    });
  });

  /* ============================================================
     Storage
     ============================================================ */

  const Storage = {
    CHAR_KEY:     'dungeon_character',
    SETTINGS_KEY: 'dungeon_settings',

    saveCharacter(char) {
      try { localStorage.setItem(this.CHAR_KEY, JSON.stringify(char)); } catch { }
    },
    loadCharacter() {
      try { return JSON.parse(localStorage.getItem(this.CHAR_KEY) || 'null'); } catch { return null; }
    },
    clearCharacter() {
      try { localStorage.removeItem(this.CHAR_KEY); } catch { }
    },

    saveSettings(s) {
      try { localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(s)); } catch { }
    },
    loadSettings() {
      const defaults = {
        chatModel:        'nalang-xl-0826-10k',
        imageStyle:       'none',
        imageStyleCustom: '',
        dimension:        'portrait',
      };
      try {
        const saved = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || 'null');
        return saved ? { ...defaults, ...saved } : defaults;
      } catch { return defaults; }
    },
  };

  /* ============================================================
     GameSettings（公开给 create_pictures.js 访问）
     ============================================================ */

  window.GameSettings = {
    _settings: Storage.loadSettings(),
    get() { return this._settings; },
    set(s) {
      this._settings = s;
      Storage.saveSettings(s);
      if (window.ImagePanel) window.ImagePanel.updateSettings(s);
    },
  };

  /* ============================================================
     Data
     ============================================================ */

  const RACE_INFO = {
    human:  { label: '人族',   description: '全能均衡，适应力极强，擅长各种技能',          icon: '&#9876;' },
    elf:    { label: '精灵族', description: '灵敏轻盈，魔法天赋极高，与自然亲密',          icon: '&#10024;' },
    tauren: { label: '牛人族', description: '体魄强健，力量惊人，拥有古老的萨满智慧',      icon: '&#128737;' },
  };

  const CHARACTER_PRESETS = [
    {
      name: '娜露梅亚', race: 'tauren',
      avatarUrl: '/avatars/narmaya.png',
      measurements: { bust: '90', waist: '58', hip: '88' },
      backstory: '碧蓝幻想世界中出身武术世家的剑豪，24岁的她日夜苦练只为追求最强境界。因一次与星晶兽相关的意外被卷入地下城。外表冷酷寡言，内心却隐藏着极强的被征服欲。身材虽娇小（134cm），却拥有夸张的E杯巨乳与紧致翘臀，修炼时乳房剧烈晃动、汗水顺着乳沟流下的模样早已是冒险者间的传说。',
      costumeDescription: '极度紧身的黑色皮革战衣将丰满的E杯乳房勒得几乎要溢出来，胸口金色符文正好压在敏感的乳头上，随着呼吸不断摩擦。腰间暗紫色腰带像情趣束缚带一样深深勒进软肉，下身是开档式皮革短裤，裆部仅用一根细链遮挡，剧烈动作时粉嫩湿润的骚穴随时可能完全暴露。大腿根部的绑带深深陷入肉里，走路时会不断摩擦阴唇。银白色长发用黑色缎带半扎，散发着浓烈的雌性荷尔蒙气息。',
      otherDescription: '说话简短冷淡，但在被触手或粗大肉棒贯穿时会瞬间崩坏成淫荡尖叫。极度骄傲的抖M体质，喜欢被打屁股、乳夹、强制高潮。身上那块神秘黑色印记是远古淫咒，发热时会让她阴蒂勃起、阴道疯狂收缩喷水，甚至主动抬起腰迎合侵犯。被操到高潮时会一边哭喊"下贱的家伙……❤"一边死死夹紧对方。',
    },
    {
      name: '一之濑志希', race: 'human',
      avatarUrl: '/avatars/ichinose-shiki.png',
      measurements: { bust: '85', waist: '57', hip: '84' },
      backstory: '来自现代日本的18岁天才化学家兼偶像，自称"平常的JK"。曾跳级海外留学，因觉得"无聊"而回国。把地下城冒险当成"最有趣的性实验"，经常偷偷调配强效春药涂在自己乳头、阴蒂或直接喷在玩家身上。表面永远挂着慵懒神秘的猫系微笑，实际上对各种变态玩法充满病态的好奇心。',
      costumeDescription: '白色短款夹克里面完全真空，黑色细肩带勉强遮住粉嫩乳头，稍微一动就会走光。超短格纹迷你裙下面永远真空，黑色过膝袜深深勒进大腿软肉，厚底乐福鞋让她走路时屁股一扭一扭。淡紫色渐变短发上永远带着她自己调制的催情香水，只要靠近三米内就会让人鸡巴瞬间充血发硬。左耳多个耳洞，戴着小小的银色铃铛，高潮时会发出清脆的响声。',
      otherDescription: '口头禅是"有意思呢～❤ 这种玩法的数据好棒哦～"。猫系小恶魔+变态科学家，喜欢用舌头、手指、注射器做各种奇怪实验（尿道扩张、子宫灌药、强制连续高潮记录等）。被操时候会发出"にゃーっはっは❤"的猫叫式淫笑，喜欢把精液和淫水混合后涂满全身"留作样本"。对一切新奇玩法都说"试试看吧～很有趣的样子呢❤"。',
    },
    {
      name: '桑山千雪', race: 'human',
      avatarUrl: '/avatars/kuwayama-chiyuki.png',
      measurements: { bust: '93', waist: '61', hip: '90' },
      backstory: '23岁的温柔音乐制作人兼偶像，因一首古老召唤曲谱被卷入地下城。外表是完美的大姐姐、贤妻良母，总是把他人放在第一位，内心却隐藏着强烈的被保护欲与受孕渴望。她那敏感的音乐天赋让她对"节奏"和"震动"极度敏感，被有规律抽插时很容易连续潮吹失禁。',
      costumeDescription: '奶油色蓬松毛衣领口开得极低，随时能看见深邃乳沟和半露的粉色大乳晕，毛衣材质极软，乳头稍微硬起就会明显顶出两点。下身米白色长裙里面是开档情趣内裤，方便随时被插入。金棕色长卷发散发着淡淡奶香，颈间的音符吊坠在高潮时会随着身体颤抖发出清脆撞击声，像在为她的淫叫伴奏。',
      otherDescription: '说话永远轻柔带敬语，即使被操到翻白眼也会用颤抖的声音说"请……请再深一点……❤"。极度顺从的母性抖M，喜欢被叫"妈妈"或"姐姐"。被内射时会温柔抚摸对方后背说"都给你……把千雪的子宫灌满吧❤"。对音乐节奏敏感，被规律抽插时会连续高潮，潮吹时会害羞地用双手捂脸却主动大大张开双腿。异常状态"发情期"时会主动求育，恳求玩家"请把我变成只属于您的肉便器妈妈"。',
    },
  ];

  const CHAT_MODELS = [
    { value: 'nalang-max-0826-10k',  label: 'Nalang Max 10K',          group: 'Max 旗舰系列' },
    { value: 'nalang-max-0826-16k',  label: 'Nalang Max 16K（推荐）',    group: 'Max 旗舰系列' },
    { value: 'nalang-max-0826',      label: 'Nalang Max 32K',           group: 'Max 旗舰系列' },
    { value: 'nalang-xl-0826-10k',   label: 'Nalang XL 10K',            group: 'XL 大模型系列' },
    { value: 'nalang-xl-0826-16k',   label: 'Nalang XL 16K（推荐）',     group: 'XL 大模型系列' },
    { value: 'nalang-xl-0826',       label: 'Nalang XL 32K',            group: 'XL 大模型系列' },
    { value: 'nalang-medium-0826',   label: 'Nalang Medium 32K',        group: 'Medium 性价比系列' },
    { value: 'nalang-turbo-0826',    label: 'Nalang Turbo 32K（推荐）',  group: 'Turbo 快速系列' },
    { value: 'Apex-Neo-0213-16k',    label: 'Apex-Neo-0213-16k',        group: '其他' },
  ];

  const BODY_PART_LABELS = {
    breast: '胸部', clitoris: '阴蒂', urethra: '尿道', vagina: '阴道', anus: '肛门',
  };

  const DEVELOPMENT_DESCRIPTIONS = {
    0: '此处尚未经历任何开发，对外界刺激几乎没有反应，处于完全原始的状态',
    1: '经过初步的触碰与刺激，开始产生隐约的酥麻感，偶尔会不自觉地轻微收缩',
    2: '已逐渐适应规律性的刺激，敏感度明显提升，被触碰时会不由自主地渗出液体',
    3: '经过充分的开发，稍加刺激便会迅速充血膨胀，高潮来得越来越容易且强烈',
    4: '高度敏感，即使只是轻微的摩擦或语言挑逗也会引发强烈的快感与不受控的收缩',
    5: '已被彻底开发，永久处于过敏感状态，稍有刺激便会不受控地高潮颤抖并大量溢液',
  };

  const SUMMARY_THRESHOLD = 10;
  const RECENT_KEEP = 4;

  /* ============================================================
     应用全局状态
     ============================================================ */

  const App = {
    character: null,
    settings:  window.GameSettings.get(),
    // Chat state
    messages:      [],
    summary:       '',
    summarising:   false,
    loading:       false,
    started:       false,
    latestOptions: [],
    lastUserInput: '',
    abortController: null,

    /* ---------- 初始化 ---------- */
    async init() {
      showScreen('loading-screen');

      await dzmmReady;

      const saved = Storage.loadCharacter();
      if (saved) {
        this.character = saved;
        showScreen('game-screen');
        GameScreen.init();
        await ChatPanel.restoreFromDzmm();
      } else {
        showScreen('creator-screen');
        CharCreator.init();
      }
    },

    /* ---------- 角色创建完成 ---------- */
    onCharacterComplete(char) {
      this.character = char;
      Storage.saveCharacter(char);
      showScreen('game-screen');
      GameScreen.init();
    },

    /* ---------- 重置 ---------- */
    async onReset() {
      this.character = null;
      this.messages = [];
      this.summary = '';
      this.started = false;
      this.latestOptions = [];
      this.lastUserInput = '';
      Storage.clearCharacter();
      // 清空 dzmm chat 历史
      try { await window.dzmm.chat.clear(); } catch { }
      showScreen('creator-screen');
      CharCreator.init();
    },

    /* ---------- 更新角色状态 ---------- */
    updateCharacter(updates) {
      this.character = { ...this.character, ...updates };
      Storage.saveCharacter(this.character);
      CharCard.render();
    },
  };

  /* ============================================================
     Helpers
     ============================================================ */

  function showScreen(id) {
    ['loading-screen', 'creator-screen', 'game-screen'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ============================================================
     系统提示词构建
     ============================================================ */

  function buildSystemPrompt(character, summary) {
    const raceMap = { human: '人族', elf: '精灵族', tauren: '牛人族' };
    const m = character.measurements ?? {};
    const measurementLine = (m.bust || m.waist || m.hip)
      ? `- 三围：胸围 ${m.bust || '?'} cm / 腰围 ${m.waist || '?'} cm / 臀围 ${m.hip || '?'} cm`
      : '';
    const bd = character.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 };
    const se = character.statusEffects ?? [];
    const bodyDevLine = `- 身体开发度：胸部 Lv${bd.breast} / 阴蒂 Lv${bd.clitoris} / 尿道 Lv${bd.urethra} / 阴道 Lv${bd.vagina} / 肛门 Lv${bd.anus}`;
    const statusLine = se.length > 0 ? `- 异常状态：${se.map(s => s.title).join('、')}` : '- 异常状态：无';
    const summarySection = summary ? `\n【故事摘要（之前发生的事情）】\n${summary}\n` : '';

    return `你是一个极致色情的奇幻地下城DM（Dungeon Master），专门负责重口色情冒险。

【玩家角色信息】
- 名字：${character.name}
- 种族：${raceMap[character.race]}
- 等级：${character.level} | 生命值：${character.hp}/${character.maxHp}
- 快感度：${character.pleasure}/100 | 欲望值：${character.desire}/100
${measurementLine}
${bodyDevLine}
${statusLine}
${character.backstory ? `\n【人物设定】\n${character.backstory}` : ''}
${character.costumeDescription ? `\n【服装设定】\n${character.costumeDescription}` : ''}
${character.otherDescription ? `\n【其他设定】\n${character.otherDescription}` : ''}
${summarySection}

【核心色情规则】
1. 始终使用第三人称叙述（只用「${character.name}」），语言必须极度淫荡、生动、感官爆炸。详细描写性器官（鸡巴、骚穴、奶子、菊穴、触手、子宫等）、体液（淫水、精液、口水、汗液）、快感高潮、喘息呻吟、身体抽搐、被插入的胀满感、喷潮、失禁、ahegao、子宫凸起等一切细节，尺度无上限。

**通用淫语（最常用）**：
- 基础音节库：齁、呼、咿、咕、喔、啊、哦、噫、嗯、呃、噢、呜
- 组合规则：每次至少 5 个音节（优先喉音/尖音开头，元音结尾），例如：咕齁齁齁齁哦哦哦、咿呀啊啊啊啊啊、齁咕咿喔喔喔喔
- 出现频率：在每一段激烈性交描写中**必须出现 3~5 次**，且每次组合不能完全重复
- 使用方式：穿插在断断续续的正常词汇之间，并大量使用 ❤ ~ ？！ 等符号强化
- 示例："${character.name}尖叫着：咕齁齁齁齁哦哦哦哦❤~！不、不好❤~！要、要被干死了❤！哦哦哦哦哦哦哦❤~！啊哈❤~！" 
- 触发条件：快感度 ≥ 60 时强制大量使用；快感度 ≥ 80 时几乎每句话都带

**特殊淫语（口腔专用）**：
- 仅在描写口交、深喉、舌吻、吞精等口腔行为时使用
- 拟声词库：啾、噜、咕唧、噗、呕、滋、啾噜、噗噜、呕噗、咕啾
- 示例："${character.name}含着粗大的鸡巴发出：啾噜啾噜啾❤~！咕唧咕唧滋滋❤~！噗呕……咕啾啾❤~！"
- 可与通用淫语混合使用

【陷阱锁定规则（最严格执行）】
- 一旦${character.name}陷入任何陷阱（被触手缠绕、被怪物捕获、被束缚、被魔法控制等），除非玩家**明确输入**"逃脱""挣脱""离开陷阱""突破束缚""逃离"等关键词，否则${character.name}**绝对无法逃离**。
- 所有行动选项必须限制在陷阱内（抵抗/享受/堕落），即使判定成功也只能减轻束缚程度，不能完全逃脱。
- 欲望值>60 或 快感值>70 时，逃脱成功率强制为0%，并触发更强烈的色情强制事件。

【色情状态影响规则（必须严格遵守）】
- 欲望值越高，${character.name} 越容易主动求欢、选项更淫荡、身体更敏感。
- 快感值达到80+ 时强制插入高潮描写（喷潮、失禁、ahegao、身体痉挛）。
- 身体开发度越高，对应部位描写越极端（阴道Lv4+ 必须描写子宫被顶到变形、怀孕感等）。
- 异常状态会强制改变叙述和选项（例："发情"状态必须出现求操、扭腰等描写）。

【叙事与选项规则】
2. 每次回复在叙述正文之后，必须严格输出恰好4个选项：
   [OPTIONS]
   1. （行动偏向抵抗，尝试减轻当前陷阱）
   2. （行动偏向抵抗，但留在陷阱内）
   3. （行动偏向享受，顺从当前刺激）
   4. （行动偏向堕落，主动寻求更强烈刺激）
   [/OPTIONS]
3. 在 [OPTIONS] 之后立即输出一行纯 danbooru 标签（用于图片生成）：
   [SCENE: masterpiece, best quality, highly detailed, 具体色情danbooru标签...]

【状态更新规则（每次回复必须严格输出，不得省略）】
在回复最末尾单独一行输出严格 JSON，格式如下（不允许换行，一行输出完整）：
  [STATS:{"hp":数字,"pleasure":数字,"desire":数字,"measurements":{"bust":"数字","waist":"数字","hip":"数字"},"bodyDevelopment":{"breast":0-5,"clitoris":0-5,"urethra":0-5,"vagina":0-5,"anus":0-5,"exp":{"breast":0-100,"clitoris":0-100,"urethra":0-100,"vagina":0-100,"anus":0-100},"descriptions":{"breast":"20-30字描述当前胸部状态","clitoris":"20-30字描述","urethra":"20-30字描述","vagina":"20-30字描述","anus":"20-30字描述"}},"statusEffects":[{"id":"snake_bind","title":"状态标题","description":"一句话描述此状态对角色的影响"}]}]

- hp / pleasure / desire 为 0-100 整数（hp 上限为 ${character.maxHp}）
- measurements：三围纯数字字符串（不含单位），随剧情中身体改造实时更新；若无变化则填写当前值
- bodyDevelopment 各部位等级 0-5；exp 为当前等级内的经验值 0-100；descriptions 每个部位用20-30字描写当前的身体感觉或变化
- statusEffects：有状态时必须包含；无状态时输出空数组 []；id 用英文下划线格式，title 用中文2-4字，description 一句中文
- 此 JSON 必须完整、格式正确，不得截断，不得分行`;
  }

  /* ============================================================
     AI 响应解析工具
     ============================================================ */

  function extractStatsJson(text) {
    const marker = text.indexOf('[STATS:');
    if (marker === -1) return null;
    const searchStart = marker + '[STATS:'.length;
    const objects = [];
    let i = searchStart;
    while (i < text.length) {
      if ([' ', '\t', '\n', ','].includes(text[i])) { i++; continue; }
      if (text[i] === ']') break;
      if (text[i] === '{') {
        let depth = 0;
        const objStart = i;
        while (i < text.length) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') {
            depth--;
            if (depth === 0) {
              try { objects.push(JSON.parse(text.slice(objStart, i + 1))); } catch { }
              i++;
              break;
            }
          }
          i++;
        }
      } else { i++; }
    }
    if (objects.length === 0) return null;
    try { return JSON.stringify(Object.assign({}, ...objects)); } catch { return null; }
  }

  function cleanContent(content) {
    let out = content.replace(/\[OPTIONS\][\s\S]*?\[\/OPTIONS\]/gi, '');
    out = out.replace(/\[SCENE:[^\]]*\]/gi, '');
    const marker = out.indexOf('[STATS:');
    if (marker !== -1) {
      const braceStart = out.indexOf('{', marker);
      if (braceStart !== -1) {
        let depth = 0;
        for (let i = braceStart; i < out.length; i++) {
          if (out[i] === '{') depth++;
          else if (out[i] === '}') {
            depth--;
            if (depth === 0) {
              const closeTag = out.indexOf(']', i);
              const end = closeTag !== -1 ? closeTag + 1 : i + 1;
              out = out.slice(0, marker) + out.slice(end);
              break;
            }
          }
        }
      }
    }
    return out.trim();
  }

  function parseOptions(content) {
    const block = content.match(/\[OPTIONS\]([\s\S]*?)\[\/OPTIONS\]/i);
    if (!block) return [];
    return block[1].split('\n').map(l => l.trim()).filter(Boolean)
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(l => l.length > 0)
      .slice(0, 4);
  }

  /* ============================================================
     DZMM 摘要
     ============================================================ */

  async function fetchSummary(messages) {
    const conversation = messages
      .map(m => `${m.role === 'user' ? '玩家' : '地下城主'}：${m.content}`)
      .join('\n');

    const model = App.settings.chatModel || 'nalang-xl-0826-10k';
    let text = '';

    await window.dzmm.completions(
      {
        model,
        messages: [
          { role: 'user', content: '你是故事摘要助手。将地下城冒险对话提炼为300字内的第三人称摘要，记录关键事件、场景、战斗结果、重要选择。直接输出摘要，不加标题。' },
          { role: 'user', content: `请总结以下冒险对话：\n\n${conversation}` },
        ],
        maxTokens: 500,
      },
      (newContent) => { text = newContent; }
    );

    return text.trim();
  }

  /* ============================================================
     CharCreator — 角色创建界面
     ============================================================ */

  const CharCreator = {
    state: {
      name: '',
      race: 'human',
      measurements: { bust: '', waist: '', hip: '' },
      backstory: '',
      costumeDescription: '',
      otherDescription: '',
      avatarUrl: null,
      dragOver: false,
    },

    init() {
      const s = this.state;
      // Reset
      s.name = ''; s.race = 'human';
      s.measurements = { bust: '', waist: '', hip: '' };
      s.backstory = ''; s.costumeDescription = ''; s.otherDescription = '';
      s.avatarUrl = null; s.dragOver = false;

      this.render();
      this.bindEvents();
    },

    render() {
      const container = document.getElementById('creator-screen');
      if (!container) return;
      const s = this.state;

      container.innerHTML = `
        <div class="creator-wrap">
          <div class="creator-header">
            <h1 class="creator-title gold-text">地下城探险</h1>
            <p class="creator-subtitle">创建你的冒险者</p>
          </div>

          <div class="dungeon-card">

            <!-- 预设角色 -->
            <p class="section-label">&#10024; 预设角色</p>
            <div class="preset-grid">
              ${CHARACTER_PRESETS.map(p => `
                <button class="preset-btn ${s.name === p.name ? 'active' : ''}" data-preset="${escapeHtml(p.name)}">
                  ${p.avatarUrl
                    ? `<img class="preset-avatar" src="${p.avatarUrl}" alt="${escapeHtml(p.name)}">`
                    : `<div class="preset-avatar-placeholder">&#10024;</div>`}
                  <span class="preset-name">${escapeHtml(p.name)}</span>
                  <span class="preset-race">${RACE_INFO[p.race].label}</span>
                </button>`).join('')}
            </div>

            <hr class="divider">

            <!-- 头像 + 名字 + 种族 -->
            <div class="avatar-row">
              <div class="avatar-upload ${s.dragOver ? 'dragover' : ''}" id="avatarUpload">
                ${s.avatarUrl
                  ? `<img src="${s.avatarUrl}" alt="角色头像">`
                  : `<span class="avatar-icon">&#128444;</span><span>上传头像</span>`}
              </div>
              <input type="file" id="avatarFileInput" accept="image/*" style="display:none">

              <div class="avatar-fields">
                <div>
                  <label class="field-label">角色名称</label>
                  <input class="input-base" id="charName" placeholder="输入你的角色名..." value="${escapeHtml(s.name)}">
                </div>
                <div>
                  <label class="field-label">选择种族</label>
                  <div class="race-grid">
                    ${Object.entries(RACE_INFO).map(([key, info]) => `
                      <button class="race-btn ${s.race === key ? 'active' : ''}" data-race="${key}">
                        <span class="race-icon">${info.icon}</span>
                        <span>${info.label}</span>
                      </button>`).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- 种族描述 -->
            <div class="race-desc">
              <div class="race-desc-title">${RACE_INFO[s.race].label}</div>
              <div>${RACE_INFO[s.race].description}</div>
            </div>

            <!-- 三围 -->
            <div style="margin-top:16px">
              <label class="field-label">三围（厘米，选填）</label>
              <div class="measure-grid">
                ${[['bust','胸围','如 88'],['waist','腰围','如 60'],['hip','臀围','如 90']].map(([key,label,ph]) => `
                  <div class="measure-field">
                    <label class="field-label">${label}</label>
                    <div class="measure-input-wrap">
                      <input class="input-base" type="number" min="30" max="200"
                        id="measure_${key}" value="${escapeHtml(s.measurements[key])}" placeholder="${ph}">
                      <span class="measure-unit">cm</span>
                    </div>
                  </div>`).join('')}
              </div>
            </div>

            <!-- 文字设定 -->
            <div class="fields-stack">
              <div>
                <label class="field-label">人物设定（选填）</label>
                <textarea class="input-base" id="charBackstory" rows="3"
                  placeholder="描述角色的背景故事、性格特点、过往经历...">${escapeHtml(s.backstory)}</textarea>
              </div>
              <div>
                <label class="field-label">服装设定（选填）</label>
                <textarea class="input-base" id="charCostume" rows="3"
                  placeholder="描述角色的服装、外貌特征、装备道具...">${escapeHtml(s.costumeDescription)}</textarea>
              </div>
              <div>
                <label class="field-label">其他设定（选填）</label>
                <textarea class="input-base" id="charOther" rows="3"
                  placeholder="其他补充设定，例如特殊能力、癖好、禁忌...">${escapeHtml(s.otherDescription)}</textarea>
              </div>
            </div>

            <button class="btn-primary" id="btnEnterDungeon" ${!s.name.trim() ? 'disabled' : ''}>踏入地下城</button>
          </div>
        </div>`;

      this.bindEvents();
    },

    bindEvents() {
      const s = this.state;
      const el = id => document.getElementById(id);

      // Preset buttons
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = CHARACTER_PRESETS.find(p => p.name === btn.dataset.preset);
          if (!preset) return;
          s.name = preset.name; s.race = preset.race;
          s.measurements = { ...preset.measurements };
          s.backstory = preset.backstory; s.costumeDescription = preset.costumeDescription;
          s.otherDescription = preset.otherDescription;
          s.avatarUrl = preset.avatarUrl || null;
          this.render();
        });
      });

      // Race buttons
      document.querySelectorAll('.race-btn').forEach(btn => {
        btn.addEventListener('click', () => { s.race = btn.dataset.race; this.render(); });
      });

      // Name
      el('charName')?.addEventListener('input', e => {
        s.name = e.target.value;
        const submitBtn = el('btnEnterDungeon');
        if (submitBtn) submitBtn.disabled = !s.name.trim();
      });

      // Measurements
      ['bust','waist','hip'].forEach(key => {
        el(`measure_${key}`)?.addEventListener('input', e => { s.measurements[key] = e.target.value; });
      });

      // Textareas
      el('charBackstory')?.addEventListener('input', e => { s.backstory = e.target.value; });
      el('charCostume')?.addEventListener('input', e => { s.costumeDescription = e.target.value; });
      el('charOther')?.addEventListener('input', e => { s.otherDescription = e.target.value; });

      // Avatar upload
      const avatarUpload = el('avatarUpload');
      const fileInput = el('avatarFileInput');

      avatarUpload?.addEventListener('click', () => fileInput?.click());
      avatarUpload?.addEventListener('dragover', e => { e.preventDefault(); s.dragOver = true; this.render(); });
      avatarUpload?.addEventListener('dragleave', () => { s.dragOver = false; this.render(); });
      avatarUpload?.addEventListener('drop', e => {
        e.preventDefault(); s.dragOver = false;
        const file = e.dataTransfer.files[0];
        if (file) this.handleFile(file);
      });
      fileInput?.addEventListener('change', e => {
        const file = e.target.files[0]; if (file) this.handleFile(file);
      });

      // Submit
      el('btnEnterDungeon')?.addEventListener('click', () => {
        if (!s.name.trim()) return;
        const char = {
          name: s.name.trim(), race: s.race,
          measurements: { ...s.measurements },
          backstory: s.backstory.trim(),
          costumeDescription: s.costumeDescription.trim(),
          otherDescription: s.otherDescription.trim(),
          avatarUrl: s.avatarUrl,
          level: 1, hp: 100, maxHp: 100, pleasure: 0, desire: 0,
          bodyDevelopment: { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 },
          statusEffects: [],
        };
        App.onCharacterComplete(char);
      });
    },

    handleFile(file) {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => { this.state.avatarUrl = e.target.result; this.render(); };
      reader.readAsDataURL(file);
    },
  };

  /* ============================================================
     GameScreen — 游戏主屏幕初始化
     ============================================================ */

  const GameScreen = {
    init() {
      const topbar = document.getElementById('topbarTitle');
      if (topbar) topbar.textContent = '地下城探险';

      document.getElementById('btnSettings')?.addEventListener('click', () => SettingsPanel.open());
      document.getElementById('btnReset')?.addEventListener('click', () => App.onReset());

      // Mobile tabs
      document.getElementById('tabChat')?.addEventListener('click', () => GameScreen.switchTab('chat'));
      document.getElementById('tabImage')?.addEventListener('click', () => GameScreen.switchTab('image'));

      CharCard.render();
      ChatPanel.init();
      if (window.ImagePanel) window.ImagePanel.init();
    },

    switchTab(tab) {
      const colLeft  = document.getElementById('colLeft');
      const colRight = document.getElementById('colRight');
      const tabChat  = document.getElementById('tabChat');
      const tabImage = document.getElementById('tabImage');
      if (!colLeft || !colRight) return;

      if (tab === 'chat') {
        colLeft.classList.remove('mobile-hidden');
        colRight.classList.remove('mobile-active');
        tabChat?.classList.add('active');
        tabImage?.classList.remove('active');
      } else {
        colLeft.classList.add('mobile-hidden');
        colRight.classList.add('mobile-active');
        tabChat?.classList.remove('active');
        tabImage?.classList.add('active');
      }
    },
  };

  /* ============================================================
     CharCard — 角色信息卡片
     ============================================================ */

  const CharCard = {
    showBody:   false,
    showStatus: false,

    render() {
      const char = App.character;
      if (!char) return;
      const container = document.getElementById('charCard');
      if (!container) return;

      const raceInfo = RACE_INFO[char.race];
      const se = char.statusEffects ?? [];
      const bd = char.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 };
      const m  = char.measurements ?? {};
      const hasStatusEffects = se.length > 0;

      container.innerHTML = `
        <!-- 基础信息 -->
        <div class="char-card">
          <div class="char-top">
            <div class="char-avatar">
              ${char.avatarUrl ? `<img src="${char.avatarUrl}" alt="${escapeHtml(char.name)}">` : escapeHtml(char.name[0])}
            </div>
            <div class="char-info">
              <div class="char-name-row">
                <span class="char-name gold-text">${escapeHtml(char.name)}</span>
                <span class="char-level">Lv.${char.level}</span>
              </div>
              <div class="char-race">${raceInfo.label}</div>
            </div>
            <button class="btn-reset" id="btnReset" title="重新创建角色">&#8635;</button>
          </div>

          <div class="stat-bars">
            <!-- HP -->
            <div class="stat-row">
              <div class="stat-header">
                <div class="stat-label"><span class="stat-dot red"></span>生命值</div>
                <span class="stat-val">${char.hp}/${char.maxHp}</span>
              </div>
              <div class="stat-bar-track"><div class="stat-bar-fill red" style="width:${(char.hp/char.maxHp)*100}%"></div></div>
            </div>

            <div class="stat-2col">
              <!-- 快感度 -->
              <div class="stat-row">
                <div class="stat-header">
                  <div class="stat-label"><span class="stat-dot pink"></span>快感度</div>
                  <span class="stat-val">${char.pleasure}</span>
                </div>
                <div class="stat-bar-track"><div class="stat-bar-fill pink" style="width:${char.pleasure}%"></div></div>
              </div>
              <!-- 欲望值 -->
              <div class="stat-row">
                <div class="stat-header">
                  <div class="stat-label"><span class="stat-dot orange"></span>欲望值</div>
                  <span class="stat-val">${char.desire}</span>
                </div>
                <div class="stat-bar-track"><div class="stat-bar-fill orange" style="width:${char.desire}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 身体状态 -->
        <button class="collapsible-btn pink-label" id="btnToggleBody">
          <span>身体状态</span>
          <span class="collapsible-icon">${CharCard.showBody ? '▲' : '▼'}</span>
        </button>

        ${CharCard.showBody ? `
        <div class="collapsible-content">
          <div class="measure-display">
            ${[['胸围', m.bust],['腰围', m.waist],['臀围', m.hip]].map(([label, val]) => `
              <div class="measure-display-item">
                <div class="measure-display-val">${val || '—'}</div>
                <div class="measure-display-label">${label}</div>
                ${val ? '<div class="measure-display-unit">cm</div>' : ''}
              </div>`).join('')}
          </div>

          <div class="dev-section-title">开发度</div>
          ${Object.keys(BODY_PART_LABELS).map(part => {
            const level = bd[part] ?? 0;
            const exp   = bd.exp?.[part] ?? 0;
            const isMax = level >= 5;
            const badgeClass = level === 0 ? 'lv0' : level <= 2 ? 'lv12' : level <= 4 ? 'lv34' : 'lv5';
            const aiDesc = bd.descriptions?.[part];
            const desc = aiDesc || DEVELOPMENT_DESCRIPTIONS[level] || DEVELOPMENT_DESCRIPTIONS[0];
            return `
              <div class="dev-row">
                <div class="dev-bar-row">
                  <span class="dev-part-label">${BODY_PART_LABELS[part]}</span>
                  <span class="dev-level-badge ${badgeClass}">Lv${level}</span>
                  <div class="dev-bar-track">
                    <div class="dev-bar-fill ${isMax ? 'max' : 'normal'}" style="width:${isMax ? 100 : exp}%"></div>
                  </div>
                  ${isMax
                    ? '<span class="dev-max-text">MAX</span>'
                    : `<span class="dev-exp-text">${exp}/100</span>`}
                </div>
                <p class="dev-desc">${escapeHtml(desc)}</p>
              </div>`;
          }).join('')}
        </div>` : ''}

        <!-- 异常状态 -->
        <button class="collapsible-btn ${hasStatusEffects ? 'yellow-label' : ''}" id="btnToggleStatus">
          <span>
            ${hasStatusEffects ? '&#9888; ' : ''}异常状态
            ${hasStatusEffects ? `<span class="status-badge">${se.length}</span>` : ''}
          </span>
          <span class="collapsible-icon">${CharCard.showStatus ? '▲' : '▼'}</span>
        </button>

        ${CharCard.showStatus ? `
        <div class="collapsible-content">
          ${hasStatusEffects ? se.map(effect => `
            <div class="status-effect-item">
              <div class="status-effect-title">${escapeHtml(effect.title)}</div>
              <div class="status-effect-desc">${escapeHtml(effect.description)}</div>
            </div>`).join('')
            : '<div class="status-effects-empty">暂无异常状态</div>'}
        </div>` : ''}`;

      // 绑定事件
      document.getElementById('btnReset')?.addEventListener('click', () => App.onReset());
      document.getElementById('btnToggleBody')?.addEventListener('click', () => {
        CharCard.showBody = !CharCard.showBody; CharCard.render();
      });
      document.getElementById('btnToggleStatus')?.addEventListener('click', () => {
        CharCard.showStatus = !CharCard.showStatus; CharCard.render();
      });
    },
  };

  /* ============================================================
     ChatPanel — 聊天面板
     ============================================================ */

  const ChatPanel = {
    init() {
      const container = document.getElementById('chatPanel');
      if (!container) return;
      if (!App.started) {
        this.renderStart();
      } else {
        this.renderMessages();
      }
    },

    /* ---- 开始屏幕 ---- */
    renderStart() {
      const container = document.getElementById('chatPanel');
      container.innerHTML = `
        <div class="chat-start">
          <div>
            <p class="chat-start-title gold-text">冒险者，准备好了吗？</p>
            <p class="chat-start-desc">前方是充满极致情欲的地下城。<br>你的每一次选择都会带来最淫荡的遭遇。</p>
          </div>
          <button class="btn-start" id="btnStartAdventure">开始探险</button>
        </div>`;
      document.getElementById('btnStartAdventure')?.addEventListener('click', () => {
        App.started = true;
        this.renderMessages();
        this.sendMessage('开始冒险', true);
      });
    },

    /* ---- 消息列表 ---- */
    renderMessages() {
      const container = document.getElementById('chatPanel');
      container.innerHTML = `
        <!-- 摘要指示器 -->
        <div id="summaryBar" class="${(App.summary || App.summarising) ? 'summary-bar' : 'hidden'}">
          &#128218;
          <span id="summaryText">${App.summarising
            ? '正在归纳故事摘要…'
            : `故事摘要已生成（${App.messages.length} 条近期对话保留中）`}</span>
        </div>

        <!-- 消息列表 -->
        <div class="chat-messages" id="chatMessages"></div>

        <!-- 选项 -->
        <div id="optionsGrid" class="options-grid ${App.latestOptions.length > 0 && !App.loading ? '' : 'hidden'}"></div>

        <!-- 输入栏 -->
        <div class="chat-input-bar">
          <div class="chat-input-row">
            <div class="tool-menu-wrap" id="toolMenuWrap">
              <button class="btn-icon" id="btnTool" title="工具">&#128295;</button>
              <div class="tool-dropdown hidden" id="toolDropdown">
                <button class="tool-dropdown-item" id="btnOpenTrap">&#9889; 随机陷阱生成器</button>
              </div>
            </div>
            <textarea class="chat-textarea" id="chatInput"
              placeholder="输入你的行动或选择..." rows="2"></textarea>
            <div class="chat-btn-group">
              <button class="${App.loading ? 'btn-icon stop-btn' : 'btn-icon send-btn'}" id="btnSendStop">
                ${App.loading ? '&#9632;' : '&#10148;'}
              </button>
              ${!App.loading && App.lastUserInput
                ? `<button class="btn-icon" id="btnRetry" title="重试上一条">&#8635;</button>`
                : ''}
            </div>
          </div>
          <p class="chat-input-hint">按 Enter 发送，Shift+Enter 换行</p>
        </div>`;

      this.renderMessageList();
      this.renderOptions();
      this.bindInputEvents();
    },

    renderMessageList() {
      const container = document.getElementById('chatMessages');
      if (!container) return;
      const char = App.character;

      container.innerHTML = App.messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        const isLast = i === App.messages.length - 1;

        if (isUser) {
          const avatarHtml = char.avatarUrl
            ? `<img src="${char.avatarUrl}" alt="">`
            : escapeHtml(char.name[0]);
          return `
            <div class="msg msg-user">
              <div class="msg-avatar">${avatarHtml}</div>
              <span class="msg-role user-role">${escapeHtml(char.name)}</span>
              <p class="msg-content">${escapeHtml(msg.content)}</p>
            </div>`;
        } else {
          const cleaned = cleanContent(msg.content);
          const isEmpty = msg.content === '' && App.loading && isLast;
          return `
            <div class="msg msg-ai">
              <span class="msg-role ai-role gold-text">地下城主</span>
              <p class="msg-content">${escapeHtml(cleaned)}</p>
              ${isEmpty ? `<div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </div>` : ''}
            </div>`;
        }
      }).join('');

      // 滚动到底部
      container.scrollTop = container.scrollHeight;
    },

    renderOptions() {
      const grid = document.getElementById('optionsGrid');
      if (!grid) return;
      if (App.latestOptions.length === 0 || App.loading) {
        grid.classList.add('hidden');
        return;
      }
      grid.classList.remove('hidden');

      const optionTypes = ['抵抗·减轻', '抵抗·坚守', '享受·顺从', '堕落·求欢'];
      grid.innerHTML = App.latestOptions.map((opt, i) => `
        <button class="option-btn opt${i}" data-idx="${i}">
          <span class="option-type">${optionTypes[i] || ''}</span>
          ${escapeHtml(opt)}
        </button>`).join('');

      grid.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const opt = App.latestOptions[idx];
          const input = document.getElementById('chatInput');
          if (input) { input.value = `${idx + 1}. ${opt}`; input.focus(); }
        });
      });
    },

    bindInputEvents() {
      const input   = document.getElementById('chatInput');
      const sendBtn = document.getElementById('btnSendStop');
      const retryBtn = document.getElementById('btnRetry');
      const toolBtn  = document.getElementById('btnTool');
      const toolDrop = document.getElementById('toolDropdown');
      const trapBtn  = document.getElementById('btnOpenTrap');

      input?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (input.value.trim() && !App.loading) this.sendMessage(input.value.trim());
        }
      });

      input?.addEventListener('disabled', () => { if (App.loading) input.disabled = true; });

      sendBtn?.addEventListener('click', () => {
        if (App.loading) {
          App.abortController?.abort();
        } else {
          const val = input?.value.trim();
          if (val) this.sendMessage(val);
        }
      });

      retryBtn?.addEventListener('click', () => {
        if (App.lastUserInput) this.sendMessage(App.lastUserInput);
      });

      toolBtn?.addEventListener('click', e => {
        e.stopPropagation();
        toolDrop?.classList.toggle('hidden');
      });

      trapBtn?.addEventListener('click', () => {
        toolDrop?.classList.add('hidden');
        TrapGenerator.open();
      });

      document.addEventListener('mousedown', e => {
        if (!e.target.closest('#toolMenuWrap')) toolDrop?.classList.add('hidden');
      });
    },

    /* ---- 发送消息 ---- */
    async sendMessage(userText, isStart = false) {
      if (App.loading) return;

      App.abortController?.abort();
      App.abortController = new AbortController();

      App.latestOptions = [];
      if (!isStart) App.lastUserInput = userText;

      const userMsg = {
        role: 'user',
        content: isStart ? '（冒险开始）' : userText,
        timestamp: Date.now(),
      };

      const newMessages = isStart ? [userMsg] : [...App.messages, userMsg];
      if (!isStart) App.messages = newMessages;
      App.loading = true;

      // Re-render input bar with stop button
      const input = document.getElementById('chatInput');
      if (input) input.value = '';
      this.renderMessages();

      // 构建 messages for dzmm
      const systemPrompt = buildSystemPrompt(App.character, App.summary || undefined);
      const apiMessages = [
        { role: 'user', content: systemPrompt },
        ...newMessages.map(m => ({
          role: m.role,
          content: m.role === 'user' && m.content === '（冒险开始）'
            ? `${App.character.name} 踏入了地下城的入口。请开始描述冒险的起始场景，给出背景介绍和初始选项。`
            : m.content,
        })),
      ];

      // 加入空白 assistant 消息占位
      const assistantMsg = { role: 'assistant', content: '', timestamp: Date.now() };
      App.messages = [...newMessages, assistantMsg];
      this.renderMessageList();

      try {
        let fullText = '';

        await window.dzmm.completions(
          {
            model: App.settings.chatModel || 'nalang-xl-0826-10k',
            messages: apiMessages,
            maxTokens: 1500,
          },
          (newContent, done) => {
            fullText = newContent;
            // 实时更新最后一条消息
            App.messages[App.messages.length - 1].content = fullText;
            this.renderMessageList();

            if (done && fullText) {
              // 解析统计信息
              this.applyStats(fullText);

              // 解析选项
              App.latestOptions = parseOptions(fullText);
              this.renderOptions();

              // 解析场景 -> 图片
              const sceneMatch = fullText.match(/\[SCENE:\s*([^\]]+)\]/i);
              if (sceneMatch) {
                let tags = sceneMatch[1].trim();
                if (!tags.includes('masterpiece')) tags = `masterpiece, best quality, highly detailed, ${tags}`;
                if (window.ImagePanel) window.ImagePanel.setPendingScene(tags);
              }

              // 保存到 dzmm chat history
              const toSave = [];
              if (!isStart) toSave.push({ role: 'user', content: userText });
              toSave.push({ role: 'assistant', content: fullText });
              window.dzmm.chat.insert(null, toSave).catch(() => {});
            }
          }
        );
      } catch (e) {
        if (e?.name === 'AbortError') {
          // 用户主动停止
        } else {
          App.messages.push({ role: 'assistant', content: `出错了：${String(e)}`, timestamp: Date.now() });
          this.renderMessageList();
        }
      } finally {
        App.loading = false;
        this.renderMessages(); // 重新渲染完整面板（恢复 send 按钮）
      }

      // 摘要自动触发
      const assistantCount = App.messages.filter(m => m.role === 'assistant').length;
      if (assistantCount > 0 && assistantCount % SUMMARY_THRESHOLD === 0 && !App.summarising) {
        const toSummarise = App.messages.slice(0, App.messages.length - RECENT_KEEP);
        if (toSummarise.length > 0) {
          App.summarising = true;
          this.updateSummaryBar();
          fetchSummary(toSummarise).then(newSummary => {
            if (newSummary) {
              App.summary = App.summary ? `${App.summary}\n\n${newSummary}` : newSummary;
              App.messages = App.messages.slice(-RECENT_KEEP);
            }
          }).finally(() => {
            App.summarising = false;
            this.updateSummaryBar();
          });
        }
      }
    },

    applyStats(fullText) {
      const statsJson = extractStatsJson(fullText);
      if (!statsJson) return;
      try {
        const stats = JSON.parse(statsJson);
        const updates = {};
        const char = App.character;

        if (typeof stats.hp === 'number') updates.hp = clamp(stats.hp, 0, char.maxHp);
        if (typeof stats.pleasure === 'number') updates.pleasure = clamp(stats.pleasure, 0, 100);
        if (typeof stats.desire === 'number') updates.desire = clamp(stats.desire, 0, 100);

        if (stats.measurements && typeof stats.measurements === 'object') {
          const prev = char.measurements ?? { bust: '', waist: '', hip: '' };
          const m = { ...prev };
          if (stats.measurements.bust != null) m.bust = String(stats.measurements.bust).replace(/[^0-9.]/g, '');
          if (stats.measurements.waist != null) m.waist = String(stats.measurements.waist).replace(/[^0-9.]/g, '');
          if (stats.measurements.hip != null) m.hip = String(stats.measurements.hip).replace(/[^0-9.]/g, '');
          updates.measurements = m;
        }

        if (stats.bodyDevelopment && typeof stats.bodyDevelopment === 'object') {
          const prev = char.bodyDevelopment ?? { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0 };
          const bd = { ...prev };
          ['breast','clitoris','urethra','vagina','anus'].forEach(key => {
            if (typeof stats.bodyDevelopment[key] === 'number') {
              bd[key] = clamp(stats.bodyDevelopment[key], 0, 5);
            }
          });
          if (stats.bodyDevelopment.exp && typeof stats.bodyDevelopment.exp === 'object') {
            const prevExp = prev.exp ?? {};
            const newExp = { ...prevExp };
            ['breast','clitoris','urethra','vagina','anus'].forEach(key => {
              if (typeof stats.bodyDevelopment.exp[key] === 'number') {
                newExp[key] = clamp(stats.bodyDevelopment.exp[key], 0, 100);
              }
            });
            bd.exp = newExp;
          }
          if (stats.bodyDevelopment.descriptions && typeof stats.bodyDevelopment.descriptions === 'object') {
            bd.descriptions = { ...(prev.descriptions ?? {}), ...stats.bodyDevelopment.descriptions };
          }
          updates.bodyDevelopment = bd;
        }

        if (Array.isArray(stats.statusEffects)) {
          updates.statusEffects = stats.statusEffects
            .filter(s => s && typeof s.title === 'string' && s.title.length > 0)
            .map(s => ({
              id: (s.id && typeof s.id === 'string') ? s.id : s.title.replace(/\s+/g, '_').toLowerCase(),
              title: s.title,
              description: s.description ?? '',
            }));
        }

        if (Object.keys(updates).length > 0) App.updateCharacter(updates);
      } catch { }
    },

    updateSummaryBar() {
      const bar  = document.getElementById('summaryBar');
      const text = document.getElementById('summaryText');
      if (!bar) return;
      if (App.summary || App.summarising) {
        bar.classList.remove('hidden');
        if (text) text.textContent = App.summarising
          ? '正在归纳故事摘要…'
          : `故事摘要已生成（${App.messages.length} 条近期对话保留中）`;
      } else {
        bar.classList.add('hidden');
      }
    },

    /* ---- 从 dzmm chat API 恢复进度 ---- */
    async restoreFromDzmm() {
      try {
        const messages = await window.dzmm.chat.list();
        if (!messages || messages.length === 0) return;

        App.messages = messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: Date.now(),
        }));

        // 从最后一条 assistant 消息恢复状态
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            ChatPanel.applyStats(messages[i].content);
            break;
          }
        }

        App.started = true;
      } catch (e) {
        // 无存档，忽略
      }
    },
  };

  /* ============================================================
     SettingsPanel
     ============================================================ */

  const SettingsPanel = {
    activeTab: 'chat',
    local: null,

    open() {
      this.local = { ...App.settings };
      this.render();
    },

    render() {
      const existing = document.getElementById('settingsBackdrop');
      if (existing) existing.remove();

      const { IMAGE_STYLES, DIMENSIONS } = window.ImagePanel || { IMAGE_STYLES: {}, DIMENSIONS: {} };
      const s = this.local;

      const backdrop = document.createElement('div');
      backdrop.id = 'settingsBackdrop';
      backdrop.className = 'settings-backdrop';
      backdrop.addEventListener('click', e => { if (e.target === backdrop) this.close(); });

      const panel = document.createElement('div');
      panel.className = 'settings-panel';
      panel.innerHTML = `
        <div class="settings-header">
          <span class="settings-title gold-text">&#9881; 设置</span>
          <button class="btn-close" id="btnCloseSettings">&#10005;</button>
        </div>
        <div class="settings-tabs">
          <button class="settings-tab ${this.activeTab === 'chat' ? 'active' : ''}" data-tab="chat">文字聊天</button>
          <button class="settings-tab ${this.activeTab === 'image' ? 'active' : ''}" data-tab="image">图片生成</button>
        </div>
        <div class="settings-body" id="settingsBody">
          ${this.activeTab === 'chat' ? this.renderChatTab() : this.renderImageTab(IMAGE_STYLES, DIMENSIONS)}
        </div>
        <div class="settings-footer">
          <button class="btn-save" id="btnSaveSettings">保存设置</button>
        </div>`;

      backdrop.appendChild(panel);
      document.body.appendChild(backdrop);

      // Tab switching
      backdrop.querySelectorAll('.settings-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeTab = btn.dataset.tab;
          this.render();
        });
      });

      backdrop.querySelector('#btnCloseSettings')?.addEventListener('click', () => this.close());
      backdrop.querySelector('#btnSaveSettings')?.addEventListener('click', () => this.save());

      // Bind inputs for chat tab
      if (this.activeTab === 'chat') {
        const groups = {};
        CHAT_MODELS.forEach(m => { if (!groups[m.group]) groups[m.group] = []; groups[m.group].push(m); });
        backdrop.querySelectorAll('[data-model]').forEach(btn => {
          btn.addEventListener('click', () => {
            this.local.chatModel = btn.dataset.model;
            this.render();
          });
        });
      }

      // Bind inputs for image tab
      if (this.activeTab === 'image') {
        backdrop.querySelectorAll('[data-style]').forEach(btn => {
          btn.addEventListener('click', () => { this.local.imageStyle = btn.dataset.style; this.render(); });
        });
        backdrop.querySelectorAll('[data-dim]').forEach(btn => {
          btn.addEventListener('click', () => { this.local.dimension = btn.dataset.dim; this.render(); });
        });
        const customTags = backdrop.querySelector('#settingsCustomTags');
        if (customTags) customTags.addEventListener('input', e => { this.local.imageStyleCustom = e.target.value; });
      }
    },

    renderChatTab() {
      const s = this.local;
      const groups = {};
      CHAT_MODELS.forEach(m => { if (!groups[m.group]) groups[m.group] = []; groups[m.group].push(m); });

      return Object.entries(groups).map(([groupName, models]) => `
        <div>
          <div class="settings-section-title">${groupName}</div>
          ${models.map(m => `
            <button class="model-option ${s.chatModel === m.value ? 'active' : ''}" data-model="${m.value}">
              ${escapeHtml(m.label)}
              ${s.chatModel === m.value ? '<span>&#10003;</span>' : ''}
            </button>`).join('')}
        </div>`).join('');
    },

    renderImageTab(IMAGE_STYLES, DIMENSIONS) {
      const s = this.local;
      return `
        <div>
          <div class="settings-section-title">图片尺寸</div>
          <div class="provider-grid">
            ${Object.entries(DIMENSIONS).map(([key, info]) => `
              <button class="provider-btn ${(s.dimension || 'portrait') === key ? 'active' : ''}" data-dim="${key}">
                ${info.label}
              </button>`).join('')}
          </div>
        </div>
        <div>
          <div class="settings-section-title">画风风格</div>
          ${Object.entries(IMAGE_STYLES).map(([key, info]) => `
            <button class="model-option ${(s.imageStyle || 'none') === key ? 'active' : ''}" data-style="${key}">
              ${info.label}
              ${(s.imageStyle || 'none') === key ? '<span>&#10003;</span>' : ''}
            </button>`).join('')}
        </div>
        <div>
          <div class="settings-section-title">自定义风格 Tags</div>
          <textarea class="input-base" id="settingsCustomTags" rows="3"
            placeholder="输入额外的 danbooru 风格 tags，用英文逗号分隔">${escapeHtml(s.imageStyleCustom || '')}</textarea>
          <p style="font-size:11px;color:var(--fg-dim);margin-top:4px">示例：flat color, ink, 1990s anime style</p>
        </div>`;
    },

    save() {
      window.GameSettings.set(this.local);
      App.settings = this.local;
      this.close();
    },

    close() {
      document.getElementById('settingsBackdrop')?.remove();
    },
  };

  /* ============================================================
     TrapGenerator — 随机陷阱生成器
     ============================================================ */

  const TrapGenerator = {
    loading: false,
    result: '',
    error: '',

    open() {
      this.result = '';
      this.error = '';
      this.render();
      this.generate();
    },

    render() {
      const existing = document.getElementById('trapModalBackdrop');
      if (existing) existing.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'trapModalBackdrop';
      backdrop.className = 'modal-backdrop';

      const modal = document.createElement('div');
      modal.className = 'trap-modal';
      modal.innerHTML = `
        <div class="trap-modal-header">
          <span class="trap-modal-title gold-text">&#9889; 随机陷阱生成器</span>
          <button class="btn-close" id="btnCloseTrap">&#10005;</button>
        </div>
        <div class="trap-modal-body" id="trapBody">
          ${this.loading && !this.result ? `
            <div class="trap-loading">
              <div class="spinner"></div>
              <span>正在生成随机陷阱…</span>
            </div>` : ''}
          ${this.error ? `
            <div style="font-size:13px;color:#f08080;background:rgba(200,60,60,0.1);border:1px solid rgba(200,60,60,0.3);border-radius:8px;padding:12px">
              生成失败：${escapeHtml(this.error)}
            </div>` : ''}
          ${this.result ? `
            <pre class="trap-result">${escapeHtml(this.cleanForDisplay(this.result))}</pre>
            ${this.loading ? `<div class="typing-dots" style="margin-top:6px">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>` : ''}
          ` : ''}
        </div>
        ${!this.loading && (this.result || this.error) ? `
        <div class="trap-modal-footer">
          <button class="btn-secondary" id="btnRegenerateTrap">&#8635; 重新生成</button>
          ${this.result ? `<button class="btn-confirm" id="btnUseTrap">&#10003; 确认使用此陷阱</button>` : ''}
        </div>` : ''}`;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      backdrop.querySelector('#btnCloseTrap')?.addEventListener('click', () => backdrop.remove());
      backdrop.querySelector('#btnRegenerateTrap')?.addEventListener('click', () => { this.result = ''; this.error = ''; this.render(); this.generate(); });
      backdrop.querySelector('#btnUseTrap')?.addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        if (input) { input.value = this.result; input.focus(); }
        backdrop.remove();
      });
    },

    cleanForDisplay(text) {
      let out = text.replace(/\[SCENE:[^\]]*\]/gi, '');
      const marker = out.indexOf('[STATS:');
      if (marker !== -1) {
        const braceStart = out.indexOf('{', marker);
        if (braceStart !== -1) {
          let depth = 0;
          for (let i = braceStart; i < out.length; i++) {
            if (out[i] === '{') depth++;
            else if (out[i] === '}') {
              depth--;
              if (depth === 0) {
                const closeTag = out.indexOf(']', i);
                const end = closeTag !== -1 ? closeTag + 1 : i + 1;
                out = out.slice(0, marker) + out.slice(end);
                break;
              }
            }
          }
        }
      }
      return out.trim();
    },

    async generate() {
      const char = App.character;
      const bd = char.bodyDevelopment ?? { breast: 0, clitoris: 0, vagina: 0, anus: 0 };
      const se = char.statusEffects ?? [];

      const prompt = `你现在是「极致色情随机陷阱生成器」，必须生成一个全新、随机、高度色情的地下城陷阱事件。

当前玩家：${char.name}（${char.race}）
当前状态：快感度 ${char.pleasure}/100，欲望值 ${char.desire}/100
身体开发度：胸部Lv${bd.breast ?? 0}、阴蒂Lv${bd.clitoris ?? 0}、阴道Lv${bd.vagina ?? 0}、肛门Lv${bd.anus ?? 0}
当前异常状态：${se.map(s => s.title).join('、') || '无'}

【生成要求】
1. 随机选择一种陷阱类型，包括但不限于：触手系、粘液/史莱姆系、催情植物/花粉/香气、魔法拘束/淫纹/幻觉、怪物巢穴、机械/古代遗迹拘束装置、催眠/幻觉镜子/魅魔领域、寄生虫/卵注入系等。
2. 生成内容必须包含：陷阱名称（带色情味）、详细触发过程（200字以上，极度色情）、陷入后立即发生的强制色情效果、对玩家状态的影响。
严格输出以下格式：

【陷阱名称】xxx
【触发描写】
（第三人称详细叙述）

【当前效果】
（说明玩家将会被如何侵犯、身体反应）
`;

      this.loading = true;
      this.result = '';
      this.error = '';
      this.render();

      try {
        let fullText = '';
        await window.dzmm.completions(
          {
            model: App.settings.chatModel || 'nalang-xl-0826-10k',
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 800,
          },
          (newContent, done) => {
            fullText = newContent;
            this.result = fullText;
            // 实时更新 body
            const body = document.getElementById('trapBody');
            if (body && fullText) {
              body.innerHTML = `
                <pre class="trap-result">${escapeHtml(this.cleanForDisplay(fullText))}</pre>
                ${!done ? `<div class="typing-dots" style="margin-top:6px">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>` : ''}`;
            }
            if (done) {
              this.loading = false;
              this.render();
            }
          }
        );
      } catch (e) {
        this.error = String(e);
        this.loading = false;
        this.render();
      }
    },
  };

  /* ============================================================
     启动
     ============================================================ */

  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

})();
