import { create } from 'zustand'

import { buildServerStates, initialBible, initialLogs, initialScript, initialShotSpecs, outputFrames, workflowStages } from '@/data'
import type { AiStatus, CharacterDesign, ImageAspectRatio, ImageSize, LogEntry, ProjectBible, SceneDesign, ShotSpec, StageId } from '@/types'
import { orchestrateStage1, orchestrateStage2Consistency, orchestrateStage3, generateDesignImage, orchestrateStage4 } from '@/services/orchestrator'
import type { GrayModelStyle } from '@/services/sdxl-client'
import { useLineageStore, trackAssetGeneration, linkAssetDependency } from '@/store/lineage-store'

// ---------------------------------------------------------------------------
// Initial character / scene data (extracted from the user's script)
// ---------------------------------------------------------------------------

const DEFAULT_CHARACTER_IMAGE_SETTINGS = {
  imageAspectRatio: '9:16' as const,
  imageSize: '1K' as const,
}

const DEFAULT_SCENE_IMAGE_SETTINGS = {
  imageAspectRatio: '16:9' as const,
  imageSize: '1K' as const,
}

const initialCharacters: CharacterDesign[] = [
  { id: 'char-qinmu', name: '秦牧', description: '主角，年轻猎魔人/牧童，机敏沉稳，随身携带饕餮袋', locked: false, ...DEFAULT_CHARACTER_IMAGE_SETTINGS },
  { id: 'char-longqilin', name: '龙麒麟', description: '秦牧的坐骑，外形如麒麟，能日行千里但贪吃，性格憨厚', locked: false, ...DEFAULT_CHARACTER_IMAGE_SETTINGS },
  { id: 'char-siyouyou', name: '司幼幽（婆婆）', description: '秦牧的养祖母，美丽女子外貌，体内镇压着厉教主，白天由她主导', locked: false, ...DEFAULT_CHARACTER_IMAGE_SETTINGS },
]

const initialScenes: SceneDesign[] = [
  { id: 'scene-manor', name: '司婆婆宅院外', description: '新建的宅院，位于山林深处，清晨阴云笼罩，周围是延康的山林', locked: false, ...DEFAULT_SCENE_IMAGE_SETTINGS },
  { id: 'scene-road', name: '赶路途中（日夜交替）', description: '龙麒麟疾驰穿越旷野与山林，日落月升快速交替，距霸州一千里', locked: false, ...DEFAULT_SCENE_IMAGE_SETTINGS },
]

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
  rawScript: string
  expandedScript: string
  characters: CharacterDesign[]
  scenes: SceneDesign[]
  shotSpecs: ShotSpec[]
  finalNotes: string
  logs: LogEntry[]
  outputs: typeof outputFrames

  // Stage 3: 灰模预演
  grayModels: Record<string, string>  // shotId -> imageUrl
  grayModelStyle: GrayModelStyle
  grayModelGenerating: boolean

  // AI 异步状态
  aiStatus: AiStatus
  aiError: string | null

  // Actions — 工作流
  setFocusedStage: (stageId: StageId) => void
  approveCurrentStage: () => Promise<{ from: StageId; to: StageId; archived: boolean }>
  rejectCurrentStage: () => { from: StageId; to: StageId }

  // Actions — 数据编辑
  updateBible: (field: keyof ProjectBible, value: string) => void
  updateRawScript: (value: string) => void
  updateExpandedScript: (value: string) => void
  // 角色
  updateCharacterField: (id: string, field: 'name' | 'description', value: string) => void
  updateCharacterImage: (id: string, imageUrl: string) => void
  updateCharacterImageSetting: (id: string, field: 'imageAspectRatio' | 'imageSize', value: ImageAspectRatio | ImageSize) => void
  toggleCharacterLock: (id: string) => void
  addCharacter: () => void
  removeCharacter: (id: string) => void
  // 场景
  updateSceneField: (id: string, field: 'name' | 'description', value: string) => void
  updateSceneImage: (id: string, imageUrl: string) => void
  updateSceneImageSetting: (id: string, field: 'imageAspectRatio' | 'imageSize', value: ImageAspectRatio | ImageSize) => void
  toggleSceneLock: (id: string) => void
  addScene: () => void
  removeScene: (id: string) => void
  // ShotSpec
  updateShot: (id: string, field: keyof Pick<ShotSpec, 'description' | 'lens' | 'composition' | 'emotion' | 'scale' | 'focalLength' | 'keyLight' | 'axisAnchor' | 'continuityLock'>, value: string) => void
  updateFinalNotes: (value: string) => void

  // Actions — AI
  runStageAI: (stageId: StageId) => Promise<void>
  runConsistencyAI: (type: 'character' | 'scene', id: string) => Promise<void>
  runImageGenAI: (type: 'character' | 'scene', id: string) => Promise<void>
  clearAiError: () => void

  // Actions — Stage 3 灰模
  setGrayModelStyle: (style: GrayModelStyle) => void
  runGrayModelGen: (shotId?: string) => Promise<void>
  updateGrayModel: (shotId: string, imageUrl: string) => void

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
  rawScript: initialScript,
  expandedScript: '',
  characters: initialCharacters,
  scenes: initialScenes,
  shotSpecs: initialShotSpecs,
  finalNotes: '终版通过，可归档并导出 ShotSpec JSON、PDF 剧本集与交付资产包。',
  logs: initialLogs,
  outputs: outputFrames,
  grayModels: {},
  grayModelStyle: 'grayscale',
  grayModelGenerating: false,
  aiStatus: 'idle',
  aiError: null,

  // ---- Workflow actions ----

  setFocusedStage: (stageId) => {
    if (stageId > get().workflowStageId) return
    set({ focusedStageId: stageId })
  },

  approveCurrentStage: async () => {
    const current = get().workflowStageId

    if (current === 4) {
      get().appendLog('success', '终版签发完成，归档包已准备导出。')
      set({ archiveReady: true, focusedStageId: 4 })
      return { from: 4 as StageId, to: 4 as StageId, archived: true }
    }

    const next = (current + 1) as StageId
    const nextStage = workflowStages.find((stage) => stage.id === next)
    get().appendLog('success', `Stage ${current} 已签发，推进至 Stage ${next}：${nextStage?.label ?? ''}`)

    set((state) => ({
      workflowStageId: next,
      focusedStageId: next,
      outputs: state.outputs.map((item, index) => {
        if (next >= 4 && index === 2) {
          return { ...item, status: 'ready' as const, caption: '终版签发后自动生成导出资产包与元数据摘要。', grade: '可导出' }
        }
        return item
      }),
    }))

    // 不再自动调用 AI，用户在新 Stage 页面手动触发
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

  updateRawScript: (value) => set({ rawScript: value }),
  updateExpandedScript: (value) => set({ expandedScript: value }),

  // 角色管理
  updateCharacterField: (id, field, value) =>
    set((s) => ({ characters: s.characters.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })),

  updateCharacterImage: (id, imageUrl) =>
    set((s) => ({ characters: s.characters.map((c) => (c.id === id ? { ...c, imageUrl } : c)) })),

  updateCharacterImageSetting: (id, field, value) =>
    set((s) => ({ characters: s.characters.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })),

  toggleCharacterLock: (id) =>
    set((s) => ({ characters: s.characters.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c)) })),

  addCharacter: () =>
    set((s) => ({
      characters: [...s.characters, {
        id: `char-${crypto.randomUUID().slice(0, 8)}`,
        name: '新角色',
        description: '请填写角色描述',
        locked: false,
        ...DEFAULT_CHARACTER_IMAGE_SETTINGS,
      }],
    })),

  removeCharacter: (id) =>
    set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),

  // 场景管理
  updateSceneField: (id, field, value) =>
    set((s) => ({ scenes: s.scenes.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })),

  updateSceneImage: (id, imageUrl) =>
    set((s) => ({ scenes: s.scenes.map((c) => (c.id === id ? { ...c, imageUrl } : c)) })),

  updateSceneImageSetting: (id, field, value) =>
    set((s) => ({ scenes: s.scenes.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })),

  toggleSceneLock: (id) =>
    set((s) => ({ scenes: s.scenes.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c)) })),

  addScene: () =>
    set((s) => ({
      scenes: [...s.scenes, {
        id: `scene-${crypto.randomUUID().slice(0, 8)}`,
        name: '新场景',
        description: '请填写场景描述',
        locked: false,
        ...DEFAULT_SCENE_IMAGE_SETTINGS,
      }],
    })),

  removeScene: (id) =>
    set((s) => ({ scenes: s.scenes.filter((c) => c.id !== id) })),

  // ShotSpec
  updateShot: (id, field, value) =>
    set((state) => ({
      shotSpecs: state.shotSpecs.map((shot) => (shot.id === id ? { ...shot, [field]: value } : shot)),
    })),

  updateFinalNotes: (value) => set({ finalNotes: value }),

  // ---- AI actions ----

  runStageAI: async (stageId: StageId) => {
    const state = get()

    // Stage 1 (概念设定) / Stage 4 (终版) 无全阶段 AI 调用
    if (stageId === 1 || stageId === 4) {
      console.log(`Stage ${stageId} 不需要AI调用`)
      return
    }

    // Stage 3: 灰模预演
    if (stageId === 3) {
      await get().runGrayModelGen()
      return
    }

    set({ aiStatus: 'generating', aiError: null })
    get().appendLog('info', `Orchestrator 正在调用 GPT-5.4 执行 Stage ${stageId} 任务…`)

    try {
      if (stageId === 0) {
        // Stage 0: 剧本扩写
        const result = await orchestrateStage1(state.projectBible, state.rawScript)
        set({ expandedScript: result.expandedScript, aiStatus: 'idle' })
        get().appendLog('success', `Stage 0 AI 扩写完成（${result.expandedScript.length} 字）。`)
      } else if (stageId === 2) {
        // Stage 2: 分镜生成
        const charContext = state.characters
          .filter((c) => c.locked && c.consistencyPrompt)
          .map((c) => `[角色: ${c.name}] ${c.consistencyPrompt}`)
          .join('\n')
        const sceneContext = state.scenes
          .filter((s) => s.locked && s.consistencyPrompt)
          .map((s) => `[场景: ${s.name}] ${s.consistencyPrompt}`)
          .join('\n')

        const result = await orchestrateStage3(
          state.projectBible,
          state.expandedScript,
          [charContext, sceneContext].filter(Boolean).join('\n') || '未锁定',
        )
        set({ shotSpecs: result.shotSpecs, aiStatus: 'idle' })
        get().appendLog('success', `Stage 2 AI 分镜生成完成（共 ${result.shotSpecs.length} 个镜头）。`)
      }
    } catch (err) {
      const message = (err as Error).message || '未知错误'
      console.error('runStageAI error:', err)
      set({ aiStatus: 'error', aiError: message })
      get().appendLog('error', `AI 调用失败：${message}`)
      throw err
    }
  },

  /** 对单个角色/场景触发 AI 反推一致性描述 */
  runConsistencyAI: async (type, id) => {
    const state = get()
    const item = type === 'character'
      ? state.characters.find((c) => c.id === id)
      : state.scenes.find((s) => s.id === id)

    if (!item) return

    set({ aiStatus: 'generating', aiError: null })
    get().appendLog('info', `正在为${type === 'character' ? '角色' : '场景'}「${item.name}」生成一致性描述…`)

    try {
      const result = await orchestrateStage2Consistency(
        state.projectBible,
        type,
        item.name,
        item.description,
      )

      // 查找或创建一致性描述的资产节点
      const lineageStore = useLineageStore.getState()
      const existingNodes = lineageStore.getNodesByReference(id)
      let consistencyNodeId: string | undefined
      
      // 如果已经存在概念图节点，建立关联
      const existingImageNode = existingNodes.find(n => 
        (type === 'character' && n.type === 'character_image') ||
        (type === 'scene' && n.type === 'scene_image')
      )
      
      if (existingImageNode) {
        // 已有概念图，建立一致性描述与概念图的依赖关系
        // 一致性描述节点作为源，概念图作为目标
        consistencyNodeId = existingImageNode.id
      }

      if (type === 'character') {
        set((s) => ({
          aiStatus: 'idle',
          characters: s.characters.map((c) =>
            c.id === id ? { ...c, consistencyPrompt: result.consistencyPrompt } : c,
          ),
        }))
      } else {
        set((s) => ({
          aiStatus: 'idle',
          scenes: s.scenes.map((sc) =>
            sc.id === id ? { ...sc, consistencyPrompt: result.consistencyPrompt } : sc,
          ),
        }))
      }
      get().appendLog('success', `「${item.name}」一致性描述已生成。`)
      
      // 如果有概念图，建立血缘关系
      if (existingImageNode && consistencyNodeId) {
        linkAssetDependency(
          id,  // 一致性描述以角色/场景ID为标识
          consistencyNodeId,
          'consistency_locked',
          `一致性描述锁定${type === 'character' ? '角色' : '场景'}外观`
        )
      }
    } catch (err) {
      const message = (err as Error).message || '未知错误'
      set({ aiStatus: 'error', aiError: message })
      get().appendLog('error', `一致性描述生成失败：${message}`)
    }
  },

  /** 对单个角色/场景触发 AI 概念图生成 */
  runImageGenAI: async (type, id) => {
    const state = get()
    const item = type === 'character'
      ? state.characters.find((c) => c.id === id)
      : state.scenes.find((s) => s.id === id)

    if (!item) return

    set({ aiStatus: 'generating', aiError: null })
    get().appendLog('info', `正在为${type === 'character' ? '角色' : '场景'}「${item.name}」生成概念图…`)

    try {
      const result = await generateDesignImage(
        state.projectBible,
        type,
        item.name,
        item.description,
        item.consistencyPrompt,
        { aspectRatio: item.imageAspectRatio, imageSize: item.imageSize },
      )

      // 构建Prompt用于追踪
      const prompt = [
        `${type === 'character' ? '角色' : '场景'}名称：${item.name}`,
        `${type === 'character' ? '角色' : '场景'}描述：${item.description}`,
        `风格要求：${state.projectBible.style}`,
        `色彩基调：${state.projectBible.colorScript}`,
      ].join('\n')

      // 追踪资产生成
      const assetId = trackAssetGeneration(
        type === 'character' ? 'character_image' : 'scene_image',
        id,  // 引用ID
        1,   // Stage 1: 概念设定
        result.imageUrl,
        {
          prompt,
          model: 'gemini-3.1-flash',
          aspectRatio: item.imageAspectRatio,
          imageSize: item.imageSize,
        }
      )

      // 如果有一致性描述，建立血缘关系
      if (item.consistencyPrompt) {
        linkAssetDependency(
          id,  // 角色/场景ID作为一致性描述的引用
          assetId,
          'consistency_locked',
          `概念图锁定于${type === 'character' ? '角色' : '场景'}一致性描述`
        )
      }

      if (type === 'character') {
        set((s) => ({
          aiStatus: 'idle',
          characters: s.characters.map((c) =>
            c.id === id ? { ...c, imageUrl: result.imageUrl } : c,
          ),
        }))
      } else {
        set((s) => ({
          aiStatus: 'idle',
          scenes: s.scenes.map((sc) =>
            sc.id === id ? { ...sc, imageUrl: result.imageUrl } : sc,
          ),
        }))
      }
      get().appendLog('success', `「${item.name}」概念图已生成。`)
      get().appendLog('system', `资产已追踪: ${assetId}`)
    } catch (err) {
      const message = (err as Error).message || '未知错误'
      set({ aiStatus: 'error', aiError: message })
      get().appendLog('error', `概念图生成失败：${message}`)
    }
  },

  clearAiError: () => set({ aiStatus: 'idle', aiError: null }),

  // ---- Stage 3 灰模 actions ----

  setGrayModelStyle: (style) => set({ grayModelStyle: style }),

  runGrayModelGen: async (shotId?: string) => {
    const state = get()
    
    // 检查是否已配置SDXL（通过环境变量判断）
    const hasSDXLConfig = !!(import.meta.env.VITE_SDXL_API_KEY || import.meta.env.DEV)
    const useMock = !hasSDXLConfig

    // 获取要生成的shot列表
    const targetShots = shotId 
      ? state.shotSpecs.filter(s => s.id === shotId)
      : state.shotSpecs

    if (targetShots.length === 0) {
      get().appendLog('warning', '没有可生成灰模的镜头')
      return
    }

    set({ grayModelGenerating: true, aiStatus: 'generating', aiError: null })
    get().appendLog('info', `正在生成灰模预演（${useMock ? '模拟模式' : 'SDXL-Turbo'}）…`)

    try {
      const result = await orchestrateStage4(
        state.projectBible,
        targetShots,
        state.grayModelStyle,
        useMock
      )

      // 更新灰模状态并追踪血缘
      const newGrayModels = { ...state.grayModels }
      
      for (const shotSpec of targetShots) {
        const grayModel = result.grayModels[shotSpec.id]
        if (grayModel) {
          newGrayModels[shotSpec.id] = grayModel.imageUrl
          
          // 追踪资产生成
          const assetId = trackAssetGeneration(
            'gray_model',
            shotSpec.id,
            3,  // Stage 3
            grayModel.imageUrl,
            {
              prompt: shotSpec.description,
              model: useMock ? 'mock-sdxl' : 'sdxl-turbo',
              aspectRatio: '16:9',
              imageSize: '1K',
              seed: grayModel.seed,
            }
          )

          // 建立与ShotSpec的依赖关系
          linkAssetDependency(
            shotSpec.id,
            assetId,
            'derived_from',
            `灰模衍生自ShotSpec`
          )
        }
      }

      set({ grayModels: newGrayModels, grayModelGenerating: false, aiStatus: 'idle' })
      get().appendLog('success', `灰模预演生成完成（共${Object.keys(result.grayModels).length}个）`)
    } catch (err) {
      const message = (err as Error).message || '未知错误'
      set({ grayModelGenerating: false, aiStatus: 'error', aiError: message })
      get().appendLog('error', `灰模生成失败：${message}`)
    }
  },

  updateGrayModel: (shotId, imageUrl) => {
    set((state) => ({
      grayModels: { ...state.grayModels, [shotId]: imageUrl },
    }))
  },

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
  if (stageId === workflowStageId) return archiveReady && stageId === 4 ? 'completed' as const : 'active' as const
  return 'pending' as const
}

export const useServerStates = () => {
  const stageId = useWorkbenchStore((state) => state.workflowStageId)
  const aiStatus = useWorkbenchStore((state) => state.aiStatus)
  return buildServerStates(stageId, aiStatus)
}
