'use client'

import { useEffect, useState } from 'react'
import { Bot, ImageIcon, Server, ExternalLink } from 'lucide-react'
import { SettingsPanel } from '@/components/settings-panel'
import { getSettings } from '@/lib/storage'
import { AppSettings, CHAT_MODELS, IMAGE_MODELS, TENSORART_MODELS } from '@/lib/types'

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  if (!settings) return null

  const chatModel = CHAT_MODELS.find((m) => m.value === settings.chatModel)
  const provider = settings.imageProvider ?? 'pixai'
  const imageModelLabel =
    provider === 'pixai'
      ? IMAGE_MODELS[settings.imageModel]?.label
      : TENSORART_MODELS[settings.tensorartModel]?.label

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight">API 配置中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理文字模型与图片生成模型的 API 密钥和预设参数
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <SettingsPanel settings={settings} onSettingsChange={setSettings} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Current config summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                当前配置
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">文字模型</div>
                    <div className="text-xs font-medium truncate">
                      {chatModel?.label ?? settings.chatModel}
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {chatModel?.group}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ImageIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">图片模型</div>
                    <div className="text-xs font-medium">{imageModelLabel}</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5 uppercase">
                      {provider}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Server className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="text-[11px] text-muted-foreground mb-1.5">API Keys 状态</div>
                    <div className="space-y-1">
                      {[
                        { label: 'Chat', set: !!settings.chatApiKey },
                        { label: 'Grok', set: !!settings.grokApiKey },
                        { label: 'PixAI', set: !!settings.pixaiApiKey },
                        { label: 'TensorArt', set: !!settings.tensorartApiKey },
                      ].map(({ label, set }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{label}</span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              set
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-muted text-muted-foreground/40'
                            }`}
                          >
                            {set ? '已配置' : '环境变量'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Routes */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                API 路由
              </h2>
              <div className="space-y-2.5">
                {[
                  { path: '/api/chat', desc: '文字对话（流式）' },
                  { path: '/api/image/generate', desc: 'PixAI 图片生成' },
                  { path: '/api/image/task/[id]', desc: 'PixAI 任务查询' },
                  { path: '/api/image/tensorart', desc: 'TensorArt 提交' },
                  { path: '/api/image/tensorart/[id]', desc: 'TensorArt 查询' },
                ].map(({ path, desc }) => (
                  <div key={path} className="flex items-center justify-between gap-2">
                    <code className="text-[10px] text-primary font-mono">{path}</code>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Env vars */}
            <div className="bg-muted/30 border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  服务器环境变量
                </h2>
              </div>
              <div className="space-y-1">
                {['CHAT_API_KEY', 'GROK_API_KEY', 'PIXAI_API_KEY', 'TENSORART_API_KEY'].map(
                  (v) => (
                    <code key={v} className="block text-[11px] text-muted-foreground font-mono">
                      {v}
                    </code>
                  )
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/50 mt-3 leading-relaxed">
                在 Vercel 项目设置中配置。客户端填写的 Key 优先级更高。
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
