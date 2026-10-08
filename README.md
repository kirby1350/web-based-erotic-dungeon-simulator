# 地下城探险模拟器

一款基于 AI 的文字地下城角色扮演冒险游戏，由地下城主（DM）实时生成剧情、行动选项与场景插图。使用 Next.js 16 + React 19 + Tailwind CSS 构建。

## 功能

- **AI 文字冒险**：流式生成剧情，每回合提供 4 个倾向不同的行动选项。
- **角色状态系统**：生命值 / 快感度 / 欲望值、三围、身体开发度、异常状态，均由剧情实时驱动并持久化。
- **场景插图**：根据剧情自动生成 danbooru 标签，调用 PixAI / TensorArt 出图。
- **工具**：随机陷阱生成器（含预设类型）、手动施加预设异常状态。
- **存档**：角色与对话进度自动保存在浏览器 localStorage；支持在「设置」中导出 / 导入存档 JSON。
- **多模型**：对话模型实时从 DZMM `v2/models` 接口拉取，另支持 Grok（xAI）。

## 快速开始

```bash
pnpm install
cp .env.example .env.local   # 填入需要的 API Key（DZMM 令牌仅在服务端配置）
pnpm dev
```

打开 http://localhost:3000 。

> 需要 **Node.js >= 20.9.0**（Next.js 16 要求）。

## 环境变量

见 [`.env.example`](./.env.example)。DZMM 令牌仅从服务端读取；其他服务仍支持在应用设置中配置 Key：

| 变量 | 用途 |
| --- | --- |
| `DZMM_API_TOKEN` | DZMM Card-Chat API v2 令牌（服务端） |
| `CHAT_API_KEY` | 兼容旧变量名，优先使用 `DZMM_API_TOKEN` |
| `GROK_API_KEY` | Grok / xAI 模型 |
| `PIXAI_API_KEY` | PixAI 图片生成 |
| `TENSORART_API_KEY` | TensorArt 图片生成 |

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 本地开发 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 运行生产构建 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test:adventure` | 状态校验、回合提交、存档、记忆与流式取消回归 |
| `pnpm test:e2e` | 隔离 Chrome 浏览器测试（全部模型/图片接口被模拟） |
| `pnpm eval:prompts` | 固定场景离线评估 |

存档导出不包含 API Key；导入存档时保留本机密钥。生产构建会执行类型检查，类型错误会阻止构建。

## 回合、恢复与记忆

行动和程序判定先保存为待完成回合，角色数值暂不改变。生成和校验成功后，角色、剧情和回合记录以一次 localStorage 写入一起提交。断网、停止或刷新后可继续相同回合，也可放弃；重试不会重掷判定或重复增加探索进度。提交前存储写入失败时不会显示为成功。

状态 JSON 必须完整并通过字段、整数范围和唯一 ID 校验。状态无效时，每次尝试最多自动请求一次仅状态修复；修复失败可继续修复，不重新生成已经完成的正文。已验证回复若在提交时遇到存储失败，可「重试保存」，不再次调用模型。旧状态在回合提交前保持不变。可选状态描述无效时沿用已有描述。

每积累10个近期已完成回合，系统尝试整理历史并保留最近4条消息。任务、人物关系、承诺和线索独立存储；记忆更新必须引用已提交回合正文，未提及的旧记录不会删除。可以在「冒险记忆」展开查看依据与来源回合。整理失败时保留原始对话。

新版存档使用 `dungeon_game_v2`，自动读取旧角色及会话数据，首次保存时迁移。设置中的导出/导入包含待完成回合、记忆和最近20个回合记录；待完成回合存在时仍可导出，导入需先完成或放弃该回合。字体随依赖本地打包，构建不再请求 Google Fonts。

## 回归与版本比较

`pnpm test:e2e` 需要本机 Chrome；测试使用全新的浏览器上下文，不接触日常浏览器存档，也不调用真实模型。会自动启动本地服务，或复用3000端口上的服务。

```bash
pnpm test:adventure
pnpm test:e2e
pnpm eval:prompts --output artifacts/prompt-eval-v3.json
pnpm eval:prompts --input exported-save.json --label model-v3 --output artifacts/model-v3.json
pnpm eval:prompts --input newer-save.json --label model-v4 --compare artifacts/model-v3.json
```

无 `--input` 时运行的是刻意包含截断、状态矛盾及重复正文的人工样本，报告比例用于验证检测器，不代表模型实际质量。输入也可采用 `EvaluationCase[]` JSON（见 `lib/adventure-eval.ts`），用相同场景的不同版本模型响应进行比较。导出存档评估范围是最近已提交的20个回合，不能代表全部请求的成功率。

报告包含格式成功率、程序判定矛盾率和相邻正文重复率。重复率采用三字片段相似度，属于提示信号，需要人工判断剧情质量；不同输入样本的报告不应直接视为版本优劣。报告只输出指标与回合 ID，不复制剧情正文。提示词版本随回合记录保存。

## 部署须知（安全）

DZMM 令牌保留在服务端；其他服务的用户自填 API Key 存储在浏览器 localStorage，并随请求经由本项目的 `/api/*` 代理转发。请注意：

- 本应用面向**单人自部署**场景。`/api/chat`、`/api/image/*` 等接口**没有鉴权与速率限制**。
- 若部署到公网，他人可直接调用这些接口，消耗你配置在环境变量里的 Key。建议加访问控制（如 Vercel 的密码保护 / 中间件鉴权 / 仅本地运行）。

## 目录结构

```
app/            页面与 API 路由（chat / image / models）
components/     UI 组件（game-screen / chat-panel / image-panel / settings 等）
lib/            类型、localStorage 存档、SSE 流解析、工具函数
hooks/          自定义 hooks
```

## 玩法说明

游戏内容为成人向虚构创作，仅供成年人在合法合规前提下娱乐使用。

### DZMM v2 接入

自部署通过服务端代理访问 `https://api.sillytraven.dev/api/ai/v2/models` 和 `/v2/chat/completions`。默认模型为 `x-apex-surge-0505-16k`。现有系统提示映射到角色卡的 `system_prompt`，普通对话放入 `messages`，响应继续使用 SSE 流式输出。配置 `.env.local` 中的 `DZMM_API_TOKEN` 后重启服务。平台 iframe 仍使用宿主注入的 SDK。
