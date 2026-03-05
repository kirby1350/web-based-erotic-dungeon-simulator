'use client'

import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateImage } from '@/lib/image-service'
import { AppSettings } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ImageDisplayProps {
  tags: string
  settings: AppSettings
  cachedUrl?: string
  onUrlCached?: (url: string) => void
  alt?: string
  className?: string
  autoGenerate?: boolean
}

export function ImageDisplay({
  tags,
  settings,
  cachedUrl,
  onUrlCached,
  alt = '角色图片',
  className,
  autoGenerate = false,
}: ImageDisplayProps) {
  const [url, setUrl] = useState<string>(cachedUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const hasApiKey =
    settings.imageProvider === 'pixai' ? !!settings.pixaiApiKey : !!settings.tensorartApiKey

  const generate = useCallback(async () => {
    if (!tags || !hasApiKey) return
    setLoading(true)
    setError('')
    const result = await generateImage(tags, settings)
    setLoading(false)
    if (result.url) {
      setUrl(result.url)
      onUrlCached?.(result.url)
    } else {
      setError(result.error ?? '生成失败')
    }
  }, [tags, settings, hasApiKey, onUrlCached])

  useEffect(() => {
    if (cachedUrl) setUrl(cachedUrl)
  }, [cachedUrl])

  useEffect(() => {
    if (autoGenerate && !url && hasApiKey && tags) {
      generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate])

  if (!hasApiKey) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 aspect-[3/4]',
          className
        )}
      >
        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-[10px] text-muted-foreground/40 text-center px-4">
          在设置中配置 API Key 后启用生图
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 aspect-[3/4]',
          className
        )}
      >
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">生成中…</p>
      </div>
    )
  }

  if (url) {
    return (
      <div className={cn('relative group rounded-lg overflow-hidden', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8"
            onClick={generate}
            title="重新生成"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border border-dashed bg-muted/10 aspect-[3/4] cursor-pointer hover:bg-muted/20 transition-colors',
        className
      )}
      onClick={generate}
    >
      {error ? (
        <>
          <ImageIcon className="w-8 h-8 text-destructive/50" />
          <p className="text-[10px] text-destructive/70 text-center px-3">{error}</p>
          <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={generate}>
            重试
          </Button>
        </>
      ) : (
        <>
          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/50">点击生成图片</p>
        </>
      )}
    </div>
  )
}
