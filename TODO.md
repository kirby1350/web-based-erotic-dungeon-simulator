# TODO

## 通关 / 失败(胜负结局)机制 — 设计建议(未实现)

**现状:** 目前完全没有胜负判定。HP 能 clamp 到 0 但无任何后果;第 10 层 Boss「魔王核心·淫狱王座」只写在 `lib/prompts.ts` 提示词里,代码从不检测"到达 / 击败"。所有数值变化汇集到 `chat-panel.tsx` 的 `onCharacterUpdate(updates)`——这是挂胜负判定的天然入口。

**建议方案:双结局 + DM 标记信号,代码兜底**

新增结局标记,与现有 marker 协议一致:

```
[ENDING:{"type":"victory"|"defeat","cause":"boss_defeated"|"broken"|"hp_zero","title":"…","epilogue":"…"}]
```

- **失败 — 理智崩坏(主结局):** DM 判定角色彻底沦陷时发 `defeat/broken`。比"HP 归零"更贴本作主题,也让现有"被玩坏丢掉"按钮真正有终点。
- **失败 — HP 归零(代码兜底):** `onCharacterUpdate` 后硬判定 `hp===0` 且 DM 未发 ENDING 时,强制 `defeat/hp_zero`。防止模型忘记结算。
- **通关(victory):** 只能由 DM 发,且必须 `floor===TARGET_FLOOR`(击败主宰是纯剧情事件,代码测不出),提示词要求击败 Boss 那回合追加 ENDING 标记。

**需要动的四处:**

1. `lib/prompts.ts` `buildSystemPrompt` — 新增结局规则段(何时发 ENDING、victory 前置、defeat 判定、epilogue 写作要求)。
2. `chat-panel.tsx` — 加 `parseEnding`(照抄现有防御式解析:全角标点、截断修复),在 `onCharacterUpdate` 之后判定并 setState。
3. 新的游戏状态字段 + 结局屏组件(可复用 `!started` 早返回布局),锁输入,留"重新开始 / 导出存档"。
4. `lib/storage.ts` — 结局状态随 session 持久化,`reset` 时清除。

**关键取舍:**

- 让 DM 发标记而非纯代码阈值 → 崩坏发生在剧情恰当处、不误触发;但 DM 常违反格式,故 HP=0 必须代码兜底,victory 只能信任 DM。
- 结局状态放 session 不放 `Character` → Reset 即清,不污染角色导出。

**触发方式:待定(TODO)** — DM 标记为主+代码兜底 / 纯代码阈值 / 只做失败先上线,尚未拍板。

**建议落地顺序:** 先做失败线(HP 兜底 + 崩坏结局)——范围最小、最贴主题;通关线随后加。
