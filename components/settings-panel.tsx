'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Key, Bot, Palette } from 'lucide-react'
import { AppSettings, CHAT_MODELS, IMAGE_MODELS, IMAGE_STYLES, TENSORART_MODELS, ImageStyle, ImageModel, TensorArtModel, ImageProvider } from '@/lib/types'
import { saveSettings } from '@/lib/storage'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const [local, setLocal] = useState<AppSettings>({ ...settings })
  const [activeTab, setActiveTab] = useState<'chat' | 'image'>('chat')

  const update = (patch: Partial<AppSettings>) => {
    setLocal((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = () => {
    saveSettings(local)
    onSettingsChange(local)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm h-full bg-card dungeon-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 gold-text" />
            <span className="font-bold tracking-wider text-sm gold-text">设置</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { key: 'chat', label: '文字聊天', icon: Bot },
            { key: 'image', label: '图片生成', icon: Palette },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'chat' | 'image')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors',
                activeTab === key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeTab === 'chat' ? (
            <>
              {/* Chat API Key */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Chat API Key
                </label>
                <input
                  type="password"
                  value={local.chatApiKey}
                  onChange={(e) => update({ chatApiKey: e.target.value })}
                  placeholder="留空则使用环境变量中的 Key"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground/60 mt-1">可在此覆盖服务器端 API Key</p>
              </div>

              {/* Grok API Key */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Grok API Key
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/30">xAI</span>
                </label>
                <input
                  type="password"
                  value={local.grokApiKey ?? ''}
                  onChange={(e) => update({ grokApiKey: e.target.value })}
                  placeholder="选择 Grok 模型时需要此 Key"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground/60 mt-1">仅在选择 Grok 系列模型时使用</p>
              </div>

              {/* Chat Model */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  对话模型
                </label>
                <div className="space-y-3">
                  {(() => {
                    const groups: Record<string, typeof CHAT_MODELS> = {}
                    CHAT_MODELS.forEach((m) => {
                      if (!groups[m.group]) groups[m.group] = []
                      groups[m.group].push(m)
                    })
                    return Object.entries(groups).map(([groupName, models]) => (
                      <div key={groupName}>
                        <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 px-1">{groupName}</div>
                        <div className="space-y-1">
                          {models.map((m) => (
                            <button
                              key={m.value}
                              onClick={() => update({ chatModel: m.value })}
                              className={cn(
                                'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all',
                                local.chatModel === m.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span>{m.label}</span>
                                {local.chatModel === m.value && <span className="text-primary text-xs">✓</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Image Provider Toggle */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">图片生成服务</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'pixai', label: 'PixAI' },
                    { key: 'tensorart', label: 'TensorArt' },
                  ] as { key: ImageProvider; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => update({ imageProvider: key })}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
                        (local.imageProvider ?? 'pixai') === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {(local.imageProvider ?? 'pixai') === 'pixai' ? (
                <>
                  {/* PixAI API Key */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      PixAI API Key
                    </label>
                    <input
                      type="password"
                      value={local.pixaiApiKey}
                      onChange={(e) => update({ pixaiApiKey: e.target.value })}
                      placeholder="留空则使用环境变量中的 Key"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* PixAI Model */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">PixAI 模型</label>
                    <div className="space-y-2">
                      {(Object.keys(IMAGE_MODELS) as ImageModel[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => update({ imageModel: key })}
                          className={cn(
                            'w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all',
                            local.imageModel === key
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div>{IMAGE_MODELS[key].label}</div>
                              <div className="text-muted-foreground/60 text-[10px] mt-0.5">ID: {IMAGE_MODELS[key].modelId}</div>
                            </div>
                            {local.imageModel === key && <span className="text-primary">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* TensorArt API Key */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      TensorArt API Key
                    </label>
                    <input
                      type="password"
                      value={local.tensorartApiKey ?? ''}
                      onChange={(e) => update({ tensorartApiKey: e.target.value })}
                      placeholder="留空则使用环境变量中的 Key"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* TensorArt Model */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">TensorArt 模型</label>
                    <div className="space-y-2">
                      {(Object.keys(TENSORART_MODELS) as TensorArtModel[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => update({ tensorartModel: key })}
                          className={cn(
                            'w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all',
                            (local.tensorartModel ?? 'wai_nsfw_v16') === key
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div>{TENSORART_MODELS[key].label}</div>
                              <div className="text-muted-foreground/60 text-[10px] mt-0.5">ID: {TENSORART_MODELS[key].modelId}</div>
                            </div>
                            {(local.tensorartModel ?? 'wai_nsfw_v16') === key && <span className="text-primary">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Image Style */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  画风风格
                </label>
                <div className="space-y-2">
                  {(Object.keys(IMAGE_STYLES) as ImageStyle[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => update({ imageStyle: key })}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all',
                        local.imageStyle === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{IMAGE_STYLES[key].label}</span>
                        {local.imageStyle === key && <span className="text-primary">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Style Tags */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  自定义风格 Tags
                </label>
                <textarea
                  value={local.imageStyleCustom ?? ''}
                  onChange={(e) => update({ imageStyleCustom: e.target.value })}
                  placeholder="输入额外的 danbooru 风格 tags，用英文逗号分隔（会追加到所选画风之后）"
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors resize-none"
                />
                <p className="text-xs text-muted-foreground/60 mt-1">
                  示例：flat color, ink, 1990s anime style
                </p>
              </div>
            </>
          )}
        </div>

        {/* Save */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold tracking-wider glow-btn"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
