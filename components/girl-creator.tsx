'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MonstGirl, AppSettings } from '@/lib/types'
import { GIRL_TEMPLATES } from '@/lib/game-data'
import { GirlTemplates } from '@/components/girl-templates'
import { ImageDisplay } from '@/components/image-display'
import { buildTagGenerationPrompt } from '@/lib/prompt-builder'
import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'

interface GirlCreatorProps {
  settings: AppSettings
  onComplete: (girl: MonstGirl) => void
}

type Step = 'template' | 'customize'

export function GirlCreator({ settings, onComplete }: GirlCreatorProps) {
  const [step, setStep] = useState<Step>('template')
  const [draft, setDraft] = useState<Omit<MonstGirl, 'id' | 'imageUrl'> | null>(null)
  const [generatingTags, setGeneratingTags] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()

  const handleTemplateSelect = (tmpl: Omit<MonstGirl, 'id' | 'imageUrl'>) => {
    setDraft(tmpl)
    setPreviewUrl(undefined)
  }

  const handleContinueToCustomize = () => {
    if (draft) setStep('customize')
  }

  const updateDraft = (partial: Partial<Omit<MonstGirl, 'id' | 'imageUrl'>>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : null))
  }

  const generateTags = async () => {
    if (!draft) return
    setGeneratingTags(true)
    try {
      const prompt = buildTagGenerationPrompt({
        name: draft.name,
        race: draft.race,
        bodyDesc: draft.bodyDesc,
        personality: draft.personality,
        outfit: draft.outfit,
        otherDesc: draft.otherDesc,
      })
      const provider = settings.chatModel.startsWith('grok') ? 'grok' : 'default'
      const apiKey = provider === 'grok' ? settings.grokApiKey : settings.chatApiKey
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: settings.chatModel,
          apiKey,
          stream: false,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const tags: string = data.content ?? data.text ?? ''
        updateDraft({ imageTags: tags.trim() })
      }
    } finally {
      setGeneratingTags(false)
    }
  }

  const handleFinish = () => {
    if (!draft) return
    const girl: MonstGirl = {
      ...draft,
      id: nanoid(),
      imageUrl: previewUrl,
    }
    onComplete(girl)
  }

  if (step === 'template') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground/80">选择初始魔物娘模板</h3>
          <p className="text-xs text-muted-foreground mt-0.5">下一步可以自定义她的详细设定</p>
        </div>
        <GirlTemplates onSelect={handleTemplateSelect} />
        <Button
          className="w-full h-11 glow-btn"
          disabled={!draft}
          onClick={handleContinueToCustomize}
        >
          自定义设定
        </Button>
      </div>
    )
  }

  if (!draft) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          onClick={() => setStep('template')}
        >
          重新选择模板
        </button>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-xs text-foreground/60">
          当前：{draft.name}（{draft.race}）
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左列：基本信息 */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">名字</Label>
              <Input
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                className="bg-input h-9 text-sm"
                maxLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">年龄</Label>
              <Input
                value={draft.age}
                onChange={(e) => updateDraft({ age: e.target.value })}
                className="bg-input h-9 text-sm"
                maxLength={5}
              />
            </div>
          </div>

          {/* BWH */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">三围（cm）</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: 'B 胸围', key: 'bust' as const },
                { label: 'W 腰围', key: 'waist' as const },
                { label: 'H 臀围', key: 'hip' as const },
              ] as { label: string; key: 'bust' | 'waist' | 'hip' }[]).map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    min={40}
                    max={130}
                    value={draft[key] ?? ''}
                    onChange={(e) => updateDraft({ [key]: Number(e.target.value) })}
                    className="bg-input h-8 text-sm text-center"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">身材外貌</Label>
            <Textarea
              value={draft.bodyDesc}
              onChange={(e) => updateDraft({ bodyDesc: e.target.value })}
              className="bg-input text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">性格设定</Label>
            <Textarea
              value={draft.personality}
              onChange={(e) => updateDraft({ personality: e.target.value })}
              className="bg-input text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">服装</Label>
            <Textarea
              value={draft.outfit}
              onChange={(e) => updateDraft({ outfit: e.target.value })}
              className="bg-input text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">其他设定（背景故事等）</Label>
            <Textarea
              value={draft.otherDesc}
              onChange={(e) => updateDraft({ otherDesc: e.target.value })}
              className="bg-input text-sm resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* 右列：数值 + 图片 */}
        <div className="space-y-4">
          {/* Sliders */}
          <div className="space-y-4 bg-secondary/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">初始属性</p>
            {[
              { label: '好感度', key: 'affection' as const, color: 'text-pink-400' },
              { label: '服从度', key: 'obedience' as const, color: 'text-sky-400' },
              { label: '淫乱度', key: 'lewdness' as const, color: 'text-rose-400' },
            ].map(({ label, key, color }) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={color}>{draft[key]}</span>
                </div>
                <Slider
                  value={[draft[key]]}
                  onValueChange={([v]) => updateDraft({ [key]: v })}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Image tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">生图 TAG</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-primary/70 hover:text-primary px-2"
                disabled={generatingTags || !settings.chatApiKey}
                onClick={generateTags}
              >
                {generatingTags ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                AI 生成
              </Button>
            </div>
            <Textarea
              value={draft.imageTags}
              onChange={(e) => updateDraft({ imageTags: e.target.value })}
              className="bg-input text-xs font-mono resize-none"
              rows={3}
              placeholder="英文生图 tag，逗号分隔"
            />
          </div>

          {/* Image preview */}
          <ImageDisplay
            tags={draft.imageTags}
            settings={settings}
            cachedUrl={previewUrl}
            onUrlCached={setPreviewUrl}
            alt={draft.name}
            className="w-full"
          />
        </div>
      </div>

      <Button className="w-full h-11 glow-btn" onClick={handleFinish}>
        开始游戏
      </Button>
    </div>
  )
}
