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
cp .env.example .env.local   # 填入需要的 API Key（也可留空，改在应用内设置里填）
pnpm dev
```

打开 http://localhost:3000 。

> 需要 **Node.js >= 20.9.0**（Next.js 16 要求）。

## 环境变量

见 [`.env.example`](./.env.example)。所有 Key 均为可选的服务端兜底值，用户可在应用内「设置」中填入自己的 Key 覆盖：

| 变量 | 用途 |
| --- | --- |
| `CHAT_API_KEY` | 对话模型（DZMM / gpt4novel） |
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

## 部署须知（安全）

API Key 存储在浏览器 localStorage，并随每次请求经由本项目的 `/api/*` 代理转发，密钥不暴露给第三方前端。但请注意：

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
