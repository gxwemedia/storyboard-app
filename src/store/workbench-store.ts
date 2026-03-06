import { create } from 'zustand'

import { buildServerStates, conceptReferences, initialBible, initialLogs, initialScript, initialShotSpecs, outputFrames, workflowStages } from '@/data'
import type { AiStatus, ConceptReference, LogEntry, ProjectBible, ShotSpec, StageId } from '@/types'
import { orchestrateStage1, orchestrateStage3 } from '@/services/orchestrator'

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface WorkbenchState {
  // Workflow
  workflowStageId: StageId
  focusedStageId: StageId
  archiveReady: boolean

  // Data
  projectBible: ProjectBible
  expandedScript: string
  conceptReferences: ConceptReference[]
  selectedConceptId: string
  shotSpecs: ShotSpec[]
  finalNotes: string
  logs: LogEntry[]
  outputs: typeof outputFrames

  // AI 异步状态
  aiStatus: AiStatus
  aiError: string | null

  // Actions — 工作流
  setFocusedStage: (stageId: StageId) => void
  approveCurrentStage: () => Promise<{ from: StageId; to: StageId; archived: boolean }>
  rejectCurrentStage: () => { from: StageId; to: StageId }

  // Actions — 数据编辑
  updateBible: (field: keyof ProjectBible, value: string) => void
  updateExpandedScript: (value: string) => void
  selectConcept: (id: string) => void
  updateShot: (id: string, field: keyof Pick<ShotSpec, 'description' | 'lens' | 'composition' | 'emotion'>, value: string) => void
  updateFinalNotes: (value: string) => void

  // Actions — AI
  runStageAI: (stageId: StageId) => Promise<void>
  clearAiError: () => void

  // Actions — 日志
  appendLog: (kind: LogEntry['kind'], message: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  // ---- Initial state ----
  workflowStageId: 0,
  focusedStageId: 0,
  archiveReady: false,
  projectBible: initialBible,
  expandedScript: initialScript,
  conceptReferences,
  selectedConceptId: conceptReferences[0].id,
  shotSpecs: initialShotSpecs,
  finalNotes: '终版通过，可归档并导出 ShotSpec JSON、PDF 剧本集与交付资产包。',
  logs: initialLogs,
  outputs: outputFrames,
  aiStatus: 'idle',
  aiError: null,

  // ---- Workflow actions ----

  setFocusedStage: (stageId) => {
    if (stageId > get().workflowStageId) return
    set({ focusedStageId: stageId })
  },

  approveCurrentStage: async () => {
    const current = get().workflowStageId

    // Stage 5 特殊处理：终版签发
    if (current === 5) {
      get().appendLog('success', '终版签发完成，归档包已准备导出。')
      set({ archiveReady: true, focusedStageId: 5 })
      return { from: 5 as StageId, to: 5 as StageId, archived: true }
    }

    const next = (current + 1) as StageId
    const nextStage = workflowStages.find((stage) => stage.id === next)
    get().appendLog('success', `Stage ${current} 已签发，推进至 Stage ${next}：${nextStage?.label ?? ''}`)

    set((state) => ({
      workflowStageId: next,
      focusedStageId: next,
      outputs: state.outputs.map((item, index) => {
        if (next >= 5 && index === 2) {
          return { ...item, status: 'ready' as const, caption: '终版签发后自动生成导出资产包与元数据摘要。', grade: '可导出' }
        }
        return item
      }),
    }))

    // 签发后自动触发下一阶段的 AI 生成
    await get().runStageAI(next)

    return { from: current, to: next, archived: false }
  },

  rejectCurrentStage: () => {
    const current = get().workflowStageId
    const previous = Math.max(0, current - 1) as StageId
    get().appendLog('error', `Stage ${current} 被驳回，系统回退到 Stage ${previous} 重新修订。`)
    set({ workflowStageId: previous, focusedStageId: previous, archiveReady: false })
    return { from: current, to: previous }
  },

  // ---- Data edit actions ----

  updateBible: (field, value) =>
    set((state) => ({ projectBible: { ...state.projectBible, [field]: value } })),

  updateExpandedScript: (value) => set({ expandedScript: value }),

  selectConcept: (id) => set({ selectedConceptId: id }),

  updateShot: (id, field, value) =>
    set((state) => ({
      shotSpecs: state.shotSpecs.map((shot) =>
        shot.id === id ? { ...shot, [field]: value } : shot,
      ),
    })),

  updateFinalNotes: (value) => set({ finalNotes: value }),

  // ---- AI actions ----

  runStageAI: async (stageId: StageId) => {
    const state = get()

    // Stage 0 / 2 / 4 / 5 暂不做 AI 调用
    if (stageId === 0 || stageId === 2 || stageId === 4 || stageId === 5) {
      return
    }

    set({ aiStatus: 'generating', aiError: null })
    get().appendLog('info', `Orchestrator 正在调用 GPT-5.4 执行 Stage ${stageId} 任务…`)

    try {
      if (stageId === 1) {
        // Stage 1: 剧本扩写
        const result = await orchestrateStage1(state.projectBible, state.expandedScript)
        set({ expandedScript: result.expandedScript, aiStatus: 'idle' })
        get().appendLog('success', `Stage 1 AI 扩写完成（${result.expandedScript.length} 字）。`)
      } else if (stageId === 3) {
        // Stage 3: ShotSpec 结构化生成
        const selectedConcept = state.conceptReferences.find((c) => c.id === state.selectedConceptId)
        const result = await orchestrateStage3(
          state.projectBible,
          state.expandedScript,
          selectedConcept?.title ?? '未锁定',
        )
        set({ shotSpecs: result.shotSpecs, aiStatus: 'idle' })
        get().appendLog('success', `Stage 3 AI 分镜生成完成（共 ${result.shotSpecs.length} 个镜头）。`)
      }
    } catch (err) {
      const message = (err as Error).message || '未知错误'
      set({ aiStatus: 'error', aiError: message })
      get().appendLog('error', `AI 调用失败：${message}`)
    }
  },

  clearAiError: () => set({ aiStatus: 'idle', aiError: null }),

  // ---- Log action ----

  appendLog: (kind, message) =>
    set((state) => ({
      logs: [
        { id: crypto.randomUUID(), kind, message, timestamp: now() },
        ...state.logs,
      ].slice(0, 20),
    })),
}))

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

export const getStageStatus = (stageId: StageId, workflowStageId: StageId, archiveReady: boolean) => {
  if (stageId < workflowStageId) return 'completed' as const
  if (stageId === workflowStageId) return archiveReady && stageId === 5 ? 'completed' as const : 'active' as const
  return 'pending' as const
}

export const useServerStates = () => {
  const stageId = useWorkbenchStore((state) => state.workflowStageId)
  const aiStatus = useWorkbenchStore((state) => state.aiStatus)
  return buildServerStates(stageId, aiStatus)
}
