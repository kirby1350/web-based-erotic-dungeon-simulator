// Static data: races, floor themes, presets, status effects, constants.
// Safe dark-fantasy rewrite of the original simulator (no explicit content).
window.Dungeon = window.Dungeon || {};
(function (D) {
  'use strict';

  var TARGET_FLOOR = 10;

  // description: shown to the player; trait: injected into the DM prompt.
  var RACE_INFO = {
    human: {
      label: '人族',
      icon: '⚔', // sword
      description: '均衡而坚韧——意志顽强，面对恐惧与诅咒时崩溃得最慢。',
      trait: '均衡耐受、意志顽强：HP 与心智上限正常，诅咒与精神侵蚀生效更慢；但一旦意志被击穿，崩坏来得格外彻底。',
    },
    elf: {
      label: '精灵族',
      icon: '✨', // sparkles
      description: '魔法亲和、感知敏锐——能察觉隐秘机关，却更易被幻术与诅咒侵蚀。',
      trait: '魔法亲和、感官敏锐：易识破隐藏陷阱与暗道，魔法/精神系威胁（幻术、催眠、淫纹诅咒以外的腐蚀魔法）对其侵蚀加倍，腐蚀值上涨更快。',
    },
    tauren: {
      label: '牛人族',
      icon: '⛩', // shrine
      description: '体魄强健、血脉旺盛——寻常束缚难以困住，却容易因莽撞而陷入险境。',
      trait: '体魄强健：HP 上限高、物理耐受强，束缚类陷阱更易挣脱；但生性莽撞，容易触发埋伏与机关。',
    },
  };

  // Floor 1-9 biome pool (shuffled at game start). Floor 10 is the fixed boss.
  var FLOOR_THEMES = [
    { name: '潮湿苔窟', ambience: '幽暗滴水的苔藓洞窟，地面湿滑、空气阴冷，墙缝里有不明之物蠕动', scene: 'cave, moss, wet, dripping water, dim lighting, underground, dark fantasy' },
    { name: '影藤巢穴', ambience: '布满黑色藤蔓的巢穴，藤须从穹顶与裂缝垂落，伺机缠绕闯入者的脚踝', scene: 'dark vines, cave, thorns, shadow, pulsating, underground, dark fantasy' },
    { name: '孢子花园', ambience: '盛开着巨大食人花的地下花园，浓密孢子令人头晕目眩、神志迷乱', scene: 'giant carnivorous plant, spores, vines, fungus, eerie glow, dark fantasy' },
    { name: '泥沼洞穴', ambience: '半凝的泥沼铺满洞穴，淤泥没膝、每一步都被向下拖拽', scene: 'swamp, mud, bog, bubbles, underground, gloomy, dark fantasy' },
    { name: '镜影回廊', ambience: '镶满古镜的回廊，镜中浮现幻象与低语，诱人迷失方向', scene: 'mirror, corridor, illusion, candles, reflection, eerie, dark fantasy' },
    { name: '虫巢甬道', ambience: '虫卵密布的甬道，蠕虫钻动、潮热腥臭，令人毛骨悚然', scene: 'insect nest, eggs, tunnel, organic, swarm, horror, dark fantasy' },
    { name: '刑械遗迹', ambience: '锈蚀机械与拘束装置的遗迹，金属机关会自动启动、强行困住猎物', scene: 'ancient ruins, machinery, traps, metal, gears, stone, dark fantasy' },
    { name: '血肉迷宫', ambience: '由活体血肉构成的迷宫，墙壁起伏蠕动、淌着黏液与暖意', scene: 'flesh walls, organic, veins, pulsating, red, body horror, dark fantasy' },
    { name: '符文祭坛', ambience: '刻满发烫符文的祭坛，腐蚀魔力在空气中弥漫，啃噬意志', scene: 'altar, glowing runes, magic circle, ritual, purple glow, dark fantasy' },
    { name: '雾泉温窟', ambience: '雾气蒸腾的地底温泉，看似安宁，泉水中却潜藏着东西', scene: 'hot spring, steam, water, cave, mist, eerie calm, dark fantasy' },
    { name: '蛛网囚牢', ambience: '巨蛛盘踞的丝网囚牢，黏丝层层交织，困住一切落入其中之物', scene: 'spider web, giant spider, silk, cocoon, dark, dark fantasy' },
    { name: '梦魇卧房', ambience: '诡异奢靡的废弃卧房，残留的香氛令人分不清现实与噩梦', scene: 'abandoned bedroom, canopy bed, incense, nightmare, dim, dark fantasy' },
  ];

  var BOSS_FLOOR_THEME = {
    name: '魔王核心·王座厅',
    ambience: '地下城最深处的核心，魔王盘踞于黑曜王座之上，这里是冒险的终点与最终对决',
    scene: 'demon lord, throne, dark fantasy, ominous, magic, boss, grand hall',
  };

  function rollFloorThemes() {
    var pool = FLOOR_THEMES.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    var names = [];
    for (var f = 1; f <= TARGET_FLOOR; f++) {
      names.push(f >= TARGET_FLOOR ? BOSS_FLOOR_THEME.name : pool[(f - 1) % pool.length].name);
    }
    return names;
  }

  function getFloorTheme(floorThemes, floor) {
    if (floor >= TARGET_FLOOR) return BOSS_FLOOR_THEME;
    var name = floorThemes && floorThemes[floor - 1];
    var found = null;
    for (var i = 0; i < FLOOR_THEMES.length; i++) {
      if (FLOOR_THEMES[i].name === name) { found = FLOOR_THEMES[i]; break; }
    }
    return found || FLOOR_THEMES[(Math.max(1, floor) - 1) % FLOOR_THEMES.length];
  }

  // Manually appliable status effects (safe dark-fantasy afflictions).
  var PRESET_STATUS_EFFECTS = [
    { id: 'cursed', title: '诅咒', description: '行动前会感到短暂眩晕，判定略有不利' },
    { id: 'poisoned', title: '中毒', description: '伤口渗出黑血，每回合缓慢流失生命' },
    { id: 'bound', title: '拘束', description: '四肢被缠缚，难以自由行动' },
    { id: 'fear', title: '恐惧', description: '心神被恐惧攫住，意志持续受到侵蚀' },
    { id: 'confusion', title: '迷乱', description: '神志混沌，难以分辨幻象与现实' },
    { id: 'bleeding', title: '流血', description: '伤口无法止住，体力不断流失' },
    { id: 'weakened', title: '虚弱', description: '气力被抽空，攻击与挣脱都更加吃力' },
    { id: 'corroded', title: '腐蚀', description: '腐蚀魔力侵入体内，腐蚀值上涨加速' },
  ];

  // Safe adventurer presets (no avatar files; emoji placeholder shown).
  var CHARACTER_PRESETS = [
    {
      name: '薇拉',
      race: 'human',
      icon: '⚔',
      measurements: { bust: '', waist: '', hip: '' },
      danbooruTags: '1girl, knight, silver hair, braid, plate armor, sword, serious, dark fantasy',
      backstory: '出身没落骑士世家的女剑士，二十四岁，为洗刷家族污名而独自踏入这座吞噬了无数冒险者的地下城。她寡言冷峻、剑术凌厉，唯一的弱点是过于固执——明知是陷阱也要正面突破。',
      costumeDescription: '磨损的银色板甲外罩着褪色的家徽斗篷，腰间是一柄祖传长剑，左臂护腕上刻着誓言。',
      otherDescription: '信奉「骑士绝不后退」，越是危险越冷静，但莽撞的荣誉心常令她陷入本可避开的险境。',
    },
    {
      name: '莉丝',
      race: 'elf',
      icon: '✨',
      measurements: { bust: '', waist: '', hip: '' },
      danbooruTags: '1girl, elf, pointy ears, long green hair, robe, staff, glowing eyes, dark fantasy',
      backstory: '流浪的精灵法师，因追查一卷流入地城的禁忌古籍而深入其中。她博学敏锐，能读懂墙上的古老符文，却也因此更容易被符文中的腐蚀魔力反噬。',
      costumeDescription: '深绿色法袍缀着银线符文，手持一根顶端镶着浑浊水晶的法杖，颈间挂着抵御幻术的护符。',
      otherDescription: '好奇心极重，见到未知的魔法装置便忍不住研究，往往因此触发隐藏的诅咒。',
    },
    {
      name: '高娜',
      race: 'tauren',
      icon: '⛩',
      measurements: { bust: '', waist: '', hip: '' },
      danbooruTags: '1girl, horns, dark skin, muscular, tribal armor, greataxe, fierce, dark fantasy',
      backstory: '被部族放逐的牛人战士，为证明自己而挑战地下城的传说。她体魄惊人、力大无穷，寻常的锁链与机关都困不住她，却总因急躁而一头撞进埋伏。',
      costumeDescription: '兽骨与皮革拼缀的战甲半裸着结实的臂膀，背负一柄比人还高的巨斧，犄角上系着部族的图腾绳结。',
      otherDescription: '崇尚力量、厌恶迂回，遇到障碍第一反应是砸碎它——这让她强大，也让她屡屡踩中陷阱。',
    },
  ];

  D.data = {
    TARGET_FLOOR: TARGET_FLOOR,
    RACE_INFO: RACE_INFO,
    FLOOR_THEMES: FLOOR_THEMES,
    BOSS_FLOOR_THEME: BOSS_FLOOR_THEME,
    rollFloorThemes: rollFloorThemes,
    getFloorTheme: getFloorTheme,
    PRESET_STATUS_EFFECTS: PRESET_STATUS_EFFECTS,
    CHARACTER_PRESETS: CHARACTER_PRESETS,
  };
})(window.Dungeon);
