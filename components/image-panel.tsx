'use client'

import { useState, useCallback } from 'react'
import { Image as ImageIcon, Loader2, RefreshCw, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { AppSettings, IMAGE_MODELS, IMAGE_STYLES, Character } from '@/lib/types'

interface ImagePanelProps {
  settings: AppSettings
  character: Character
  pendingScene?: string
  onSceneHandled: () => void
}

interface GeneratedImage {
  url: string
  prompt: string
}

function buildImagePrompt(scene: string, character: Character, style: string): string {
  const racePrompts: Record<string, string> = {
    human: 'human adventurer',
    elf: 'elf adventurer, pointed ears',
    tauren: 'tauren warrior, bull horns, massive build',
  }
  const raceTag = racePrompts[character.race] || 'adventurer'
  const base = `${scene}, ${raceTag}, dungeon, fantasy, dramatic lighting, highly detailed, masterpiece, best quality`
  if (style && style !== 'none') {
    return `${base}, ${style} style`
  }
  return base
}

export function ImagePanel({ settings, character, pendingScene, onSceneHandled }: ImagePanelProps) {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showPromptBox, setShowPromptBox] = useState(false)
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const pollTask = useCallback(async (taskId: string): Promise<string | null> => {
    const key = settings.pixaiApiKey || ''
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const res = await fetch(`/api/image/task/${taskId}`, {
          headers: key ? { 'x-pixai-key': key } : {},
        })
        const data = await res.json()
        const status = data?.status || data?.task?.status
        const outputs = data?.outputs || data?.task?.outputs
        if (status === 'succeeded' && outputs) {
          const urls = Object.values(outputs).flat() as string[]
          if (urls[0]) return urls[0]
        }
        if (status === 'failed') {
          throw new Error('图片生成失败')
        }
      } catch (e) {
        throw e
      }
    }
    throw new Error('图片生成超时')
  }, [settings.pixaiApiKey])

  const generateImage = useCallback(async (prompt: string) => {
    setLoading(true)
    setError(null)
    try {
      const modelId = IMAGE_MODELS[settings.imageModel].modelId
      const styleLora = settings.imageStyle !== 'none' ? settings.imageStyle : undefined
      const finalPrompt = styleLora
        ? `${prompt}, ${styleLora}`
        : prompt

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: finalPrompt,
          modelId,
          width: 768,
          height: 1024,
          batchSize: 1,
          apiKey: settings.pixaiApiKey,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '请求失败')
      }

      const data = await res.json()
      const taskId = data?.id || data?.task?.id
      if (!taskId) throw new Error('未获取到任务ID')

      const imageUrl = await pollTask(taskId)
      if (imageUrl) {
        setImages((prev) => [{ url: imageUrl, prompt }, ...prev.slice(0, 9)])
        setActiveImage(imageUrl)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [settings, pollTask])

  const handleAutoGenerate = useCallback(async () => {
    if (!pendingScene) return
    const prompt = buildImagePrompt(pendingScene, character, settings.imageStyle)
    onSceneHandled()
    await generateImage(prompt)
  }, [pendingScene, character, settings.imageStyle, onSceneHandled, generateImage])

  const handleCustomGenerate = async () => {
    const prompt = customPrompt.trim()
      ? buildImagePrompt(customPrompt, character, settings.imageStyle)
      : buildImagePrompt('dungeon entrance, mysterious', character, settings.imageStyle)
    await generateImage(prompt)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main image display */}
      <div className="flex-1 relative overflow-hidden bg-dungeon-panel rounded-none">
        {activeImage ? (
          <img
            src={activeImage}
            alt="场景插图"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-4">
            <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">场景插图将在这里显示</p>
            <p className="text-muted-foreground/60 text-xs">AI 将根据冒险剧情自动生成插图</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">正在绘制场景...</p>
          </div>
        )}

        {/* Auto generate prompt */}
        {pendingScene && !loading && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-card/95 dungeon-border rounded-lg p-3 flex items-center gap-3">
              <Wand2 className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground flex-1 truncate">新场景：{pendingScene}</p>
              <button
                onClick={handleAutoGenerate}
                className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded glow-btn flex-shrink-0"
              >
                生成插图
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/20 border-t border-destructive/40">
          <p className="text-xs text-destructive-foreground">{error}</p>
        </div>
      )}

      {/* Custom prompt */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowPromptBox((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5" />
            手动生成图片
          </span>
          {showPromptBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showPromptBox && (
          <div className="px-3 pb-3 space-y-2">
            <input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="描述要生成的场景（英文更佳）..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleCustomGenerate}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-primary/80 hover:bg-primary text-primary-foreground text-xs font-semibold glow-btn transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              生成场景
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="border-t border-border p-2 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(img.url)}
              className={`w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                activeImage === img.url ? 'border-primary' : 'border-border hover:border-primary/50'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
