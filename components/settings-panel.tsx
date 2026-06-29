'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Settings, Key, Bot, Palette, RefreshCw, Loader2, Download, Upload } from 'lucide-react'
import { AppSettings, CHAT_MODELS, ChatModelInfo, DzmmModel, IMAGE_MODELS, IMAGE_STYLES, IMAGE_TAG_PRESETS, PROSE_STYLE_LABELS, TENSORART_MODELS, ImageStyle, ImageModel, ImageTagPreset, ProseStyle, TensorArtModel, ImageProvider } from '@/lib/types'
import { saveSettings, exportAll, importAll } from '@/lib/storage'
import { cn } from '@/lib/utils'

const DZMM_GROUP = 'DZMM 模型（实时获取）'
const GROK_MODELS = CHAT_MODELS.filter((m) => m.provider === 'grok')
const STATIC_DEFAULT_MODELS = CHAT_MODELS.filter((m) => m.provider === 'default')

interface SettingsPanelProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const [local, setLocal] = useState<AppSettings>({ ...settings })
  const [activeTab, setActiveTab] = useState<'chat' | 'image'>('chat')
  const [dzmmModels, setDzmmModels] = useState<DzmmModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<AppSettings>) => {
    setLocal((prev) => ({ ...prev, ...patch }))
  }

  const handleExport = () => {
    try {
      const blob = new Blob([exportAll()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dungeon-save-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('export failed:', e)
      alert('导出失败：' + String(e))
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      importAll(text)
      alert('导入成功，将重新载入存档。')
      window.location.reload()
    } catch (e) {
      console.error('import failed:', e)
      alert('导入失败：文件无效或格式不正确。')
    }
  }

  const fetchModels = useCallback(async (apiKey: string) => {
    setModelsLoading(true)
    setModelsError('')
    try {
      const res = await fetch('/api/models', {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '获取失败')
      const list: DzmmModel[] = Array.isArray(data?.data) ? data.data : []
      setDzmmModels(list)
    } catch (e) {
      setModelsError(String(e instanceof Error ? e.message : e))
    } finally {
      setModelsLoading(false)
    }
  }, [])

  // Load the live DZMM model list once when the panel opens
  useEffect(() => {
    fetchModels(local.chatApiKey || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If the saved model isn't offered by the live list, fall back to the first one
  useEffect(() => {
    if (dzmmModels.length === 0) return
    const validIds = new Set([...dzmmModels.map((m) => m.id), ...GROK_MODELS.map((m) => m.value)])
    if (!validIds.has(local.chatModel)) {
      setLocal((prev) => ({ ...prev, chatModel: dzmmModels[0].id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dzmmModels])

  // Live DZMM models (fallback to the static list if the fetch failed), plus Grok
  const chatModels: ChatModelInfo[] = [
    ...(dzmmModels.length > 0
      ? dzmmModels.map((m) => ({
          value: m.id,
          label: m.context_window ? `${m.name} · ${Math.round(m.context_window / 1000)}K` : m.name,
          group: DZMM_GROUP,
          provider: 'default' as const,
        }))
      : STATIC_DEFAULT_MODELS),
    ...GROK_MODELS,
  ]

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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    对话模型
                  </label>
                  <button
                    onClick={() => fetchModels(local.chatApiKey || '')}
                    disabled={modelsLoading}
                    title="刷新模型列表"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors"
                  >
                    {modelsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    刷新
                  </button>
                </div>
                {modelsError && (
                  <p className="text-[10px] text-destructive-foreground/80 mb-2">
                    模型列表获取失败（已回退到内置列表）：{modelsError}
                  </p>
                )}
                <div className="space-y-3">
                  {(() => {
                    const groups: Record<string, ChatModelInfo[]> = {}
                    chatModels.forEach((m) => {
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

              {/* Prose style */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  叙事文风
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROSE_STYLE_LABELS) as ProseStyle[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => update({ proseStyle: key })}
                      title={PROSE_STYLE_LABELS[key].hint}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
                        (local.proseStyle ?? 'standard') === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {PROSE_STYLE_LABELS[key].label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {PROSE_STYLE_LABELS[local.proseStyle ?? 'standard'].hint}；去油约束始终生效
                </p>
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

              {/* Tag Preset Group */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  预设标签组
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(IMAGE_TAG_PRESETS) as ImageTagPreset[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => update({ imageTagPreset: key })}
                      title={IMAGE_TAG_PRESETS[key].tags}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
                        (local.imageTagPreset ?? 'none') === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {IMAGE_TAG_PRESETS[key].label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">附加到每次生图的额外标签组</p>
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

        {/* Save + backup */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-secondary text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              导出存档
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-secondary text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              导入存档
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
                e.target.value = ''
              }}
            />
          </div>
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
