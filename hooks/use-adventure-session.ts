'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, Character, GameSession } from '@/lib/types'
import { getSession, saveGame } from '@/lib/storage'
import { chatStream } from '@/lib/dzmm'
import { buildSystemPrompt, withQualityPrefix } from '@/lib/prompts'
import { buildProgramResultContext, buildTurnContext, REPLY_PROTOCOL_PROMPT, resolveTurnCharacter, type ProgramTurnResult } from '@/lib/adventure-context'
import { buildMemoryInput, emptyMemory, mergeMemoryResponse, MEMORY_SUMMARY_PROMPT } from '@/lib/adventure-memory'
import { inspectReply, parseOptions, replaceStateMetadata } from '@/lib/chat-protocol'
import { completeTurn, pendingMessages, PROMPT_VERSION, type PendingTurn } from '@/lib/turn-engine'

interface SessionOptions {
  character: Character
  settings: AppSettings
  onTurnCommit: (character: Character) => void
  onRequestImage: (scene: string) => void
  onBusyChange: (busy: boolean) => void
}

export function useAdventureSession({ character, settings, onTurnCommit, onRequestImage, onBusyChange }: SessionOptions) {
  const [session, setSession] = useState<GameSession>(() => getSession() ?? { messages: [], summary: '', memory: emptyMemory() })
  const sessionRef = useRef(session)
  const characterRef = useRef(character)
  characterRef.current = character
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [summarising, setSummarising] = useState(false)
  const [statsError, setStatsError] = useState('')
  const runningRef = useRef(false)
  const summaryRunningRef = useRef(false)
  const summaryAttemptRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const publish = useCallback((next: GameSession) => {
    saveGame(characterRef.current, next)
    sessionRef.current = next
    if (mountedRef.current) setSession(next)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; abortRef.current?.abort() }
  }, [])
  useEffect(() => { onBusyChange(loading || summarising || !!session.pendingTurn) }, [loading, summarising, session.pendingTurn, onBusyChange])

  const runTurn = useCallback(async (pending: PendingTurn) => {
    if (runningRef.current || summaryRunningRef.current) return
    runningRef.current = true
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setStatsError('')
    let content = pending.phase === 'generating' ? '' : pending.draft
    let currentPending = pending
    let committed = false
    setDraft(content)
    const checkpoint = (phase: PendingTurn['phase'], value: string, repaired = currentPending.repaired) => {
      currentPending = { ...currentPending, phase, draft: value, repaired,
        originalReply: phase === 'generating' ? value : currentPending.originalReply ?? value }
      if (sessionRef.current.pendingTurn?.id !== pending.id) throw new Error('待完成回合已改变')
      publish({ ...sessionRef.current, pendingTurn: currentPending })
    }
    const assertActive = () => { if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError') }
    try {
      if (pending.phase === 'generating') {
        await chatStream({ messages: pending.requestMessages, model: pending.model, grokApiKey: settings.grokApiKey, signal: controller.signal }, (delta) => {
          if (controller.signal.aborted) return
          content += delta
          if (mountedRef.current) setDraft(content)
        })
        assertActive()
        checkpoint('generating', content)
      }
      const current = resolveTurnCharacter(pending.before, pending.result)
      let inspection = inspectReply(content, current, pending.result)
      if (inspection.errors.length) throw new Error(inspection.errors.join('；'))
      let repaired = !!pending.repaired || pending.phase === 'repair'
      if (inspection.metadataErrors.length) {
        checkpoint('repair', content)
        let metadata = ''
        await chatStream({ model: pending.model, grokApiKey: settings.grokApiKey, signal: controller.signal, messages: [
          { role: 'system', content: [REPLY_PROTOCOL_PROMPT, buildTurnContext(current), buildProgramResultContext(pending.result),
            '本请求只修复状态数据。仅输出 [STATS:完整JSON] 和 [DESC:完整JSON]，不要生成或修改剧情、选项、图片标签。根据已发生事实结算；没有依据的字段沿用快照。'].join('\n\n') },
          { role: 'user', content: JSON.stringify({ narrative: inspection.narrative, errors: inspection.metadataErrors }) },
        ] }, (delta) => { if (!controller.signal.aborted) metadata += delta })
        assertActive()
        content = replaceStateMetadata(content, metadata)
        inspection = inspectReply(content, current, pending.result)
        repaired = true
        if (inspection.metadataErrors.length || inspection.errors.length) throw new Error('状态数据修复未通过校验，可重试修复')
      }
      assertActive()
      // A validated response can be saved again after storage recovery without another model call.
      checkpoint('ready', content, repaired)
      const completed = completeTurn(sessionRef.current, pending, content, repaired)
      // This single write commits story, character, audit record and removal of pending work.
      saveGame(completed.character, completed.session)
      committed = true
      characterRef.current = completed.character
      sessionRef.current = completed.session
      if (mountedRef.current) {
        setSession(completed.session)
        setDraft('')
        setStatsError(completed.warnings.join('；'))
        onTurnCommit(completed.character)
        try { onRequestImage(withQualityPrefix(inspection.scene)) } catch { setStatsError('回合已保存，插图请求失败') }
      }
    } catch (error) {
      if (!committed) {
        try { checkpoint(currentPending.phase, currentPending.phase === 'generating' ? content : currentPending.draft) } catch { /* the original pending request remains durable */ }
        if (mountedRef.current) setStatsError(controller.signal.aborted
          ? '生成已停止，本回合尚未结算。可以继续或放弃。'
          : `本回合未结算：${error instanceof Error ? error.message : '请求或存档失败'}。可重试或放弃。`)
      }
    } finally {
      runningRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [settings.grokApiKey, onTurnCommit, onRequestImage, publish])

  const beginTurn = useCallback((input: string, result: ProgramTurnResult | null = null) => {
    if (runningRef.current || summaryRunningRef.current || sessionRef.current.pendingTurn) return
    const before = structuredClone(characterRef.current)
    const current = resolveTurnCharacter(before, result)
    const saved = sessionRef.current
    const pending: PendingTurn = { id: crypto.randomUUID(), input, startedAt: Date.now(), before,
      result: structuredClone(result), model: settings.chatModel, promptVersion: PROMPT_VERSION, phase: 'generating', draft: '',
      requestMessages: [
        { role: 'system', content: buildSystemPrompt(current, saved.summary, settings.proseStyle, result, saved.memory ?? emptyMemory()) },
        ...saved.messages.map((message) => ({ role: message.role, content: message.content })),
        { role: 'user', content: input },
      ],
    }
    try {
      publish({ ...saved, pendingTurn: pending })
      void runTurn(pending)
    } catch { setStatsError('无法保存待完成回合，请导出存档并检查浏览器存储空间；未发送请求') }
  }, [settings.chatModel, settings.proseStyle, publish, runTurn])

  const retryPending = useCallback(() => {
    if (sessionRef.current.pendingTurn) void runTurn(sessionRef.current.pendingTurn)
  }, [runTurn])
  const discardPending = useCallback(() => {
    if (runningRef.current || summaryRunningRef.current) return
    try { publish({ ...sessionRef.current, pendingTurn: null }); setDraft(''); setStatsError('') }
    catch { setStatsError('未能保存放弃操作，请检查浏览器存储空间') }
  }, [publish])

  useEffect(() => {
    const saved = sessionRef.current
    if (runningRef.current || summaryRunningRef.current || saved.pendingTurn || saved.messages.filter((message) => message.role === 'assistant').length < 10) return
    const key = saved.messages.at(-1)?.turnId ?? ''
    if (summaryAttemptRef.current === key) return
    summaryAttemptRef.current = key
    summaryRunningRef.current = true
    setSummarising(true)
    const controller = new AbortController()
    abortRef.current = controller
    const source = saved.messages.slice(0, -4)
    let output = ''
    let timedOut = false
    const finish = () => {
      clearTimeout(timeout)
      controller.signal.removeEventListener('abort', onAbort)
      if (abortRef.current !== controller) return
      abortRef.current = null
      summaryRunningRef.current = false
      if (mountedRef.current) setSummarising(false)
    }
    const onAbort = () => {
      if (mountedRef.current) setStatsError(timedOut
        ? '摘要整理超时，已保留原始对话，可以继续游戏'
        : '已跳过摘要，原始对话已保留，可以继续游戏')
      finish()
    }
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 60_000)
    controller.signal.addEventListener('abort', onAbort, { once: true })
    void chatStream({ model: settings.chatModel, grokApiKey: settings.grokApiKey, signal: controller.signal, messages: [
      { role: 'system', content: MEMORY_SUMMARY_PROMPT },
      { role: 'user', content: buildMemoryInput(saved.summary, saved.memory ?? emptyMemory(), source) },
    ] }, (delta) => { if (!controller.signal.aborted) output += delta }).then(() => {
      if (controller.signal.aborted || !mountedRef.current) return
      const result = mergeMemoryResponse(output, saved.memory ?? emptyMemory(), source)
      if (!result) { setStatsError('记忆整理未通过校验，已保留原始对话'); return }
      publish({ ...saved, ...result, messages: saved.messages.slice(source.length) })
    }).catch(() => { if (mountedRef.current && !controller.signal.aborted) setStatsError('记忆整理失败，已保留原始对话') }).finally(finish)
    return () => {
      if (summaryAttemptRef.current === key) summaryAttemptRef.current = ''
      controller.signal.removeEventListener('abort', onAbort)
      controller.abort()
      finish()
    }
  }, [session, settings.chatModel, settings.grokApiKey, publish])

  const displayed = session.pendingTurn && loading ? { ...session, pendingTurn: { ...session.pendingTurn, draft } } : session
  const lastReply = [...session.messages].reverse().find((message) => message.role === 'assistant')
  return { messages: pendingMessages(displayed), summary: session.summary, memory: session.memory ?? emptyMemory(),
    loading, summarising, statsError, setStatsError, pending: session.pendingTurn, started: !!session.pendingTurn || session.messages.length > 0,
    latestOptions: session.pendingTurn ? [] : lastReply ? parseOptions(lastReply.content) : [],
    beginTurn, retryPending, discardPending, stop: () => abortRef.current?.abort() }
}
