/**
 * workbench-store 单元测试
 *
 * 测试核心状态管理逻辑：阶段推进、签发/驳回、数据编辑、日志、 selector 函数。
 * AI 相关 action 因为依赖外部 API 调用，在本文件中不做集成测试。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkbenchStore } from '@/store/workbench-store'
import { getStageStatus } from '@/store/workbench-store'
import type { StageId } from '@/types'

// ---------------------------------------------------------------------------
// 辅助工具
// ---------------------------------------------------------------------------

/** 重置 store 到初始状态 */
function resetStore() {
  useWorkbenchStore.setState({
    workflowStageId: 0,
    focusedStageId: 0,
    archiveReady: false,
    expandedScript: '',
    aiStatus: 'idle',
    aiError: null,
    grayModels: {},
    grayModelGenerating: false,
  })
}

// ---------------------------------------------------------------------------
// 基础状态
// ---------------------------------------------------------------------------

describe('workbench-store 初始状态', () => {
  beforeEach(() => resetStore())

  it('初始阶段为 Stage 0', () => {
    const state = useWorkbenchStore.getState()
    expect(state.workflowStageId).toBe(0)
    expect(state.focusedStageId).toBe(0)
  })

  it('archiveReady 初始为 false', () => {
    expect(useWorkbenchStore.getState().archiveReady).toBe(false)
  })

  it('aiStatus 初始为 idle', () => {
    expect(useWorkbenchStore.getState().aiStatus).toBe('idle')
  })

  it('projectBible 含有三个必需字段', () => {
    const bible = useWorkbenchStore.getState().projectBible
    expect(bible).toHaveProperty('style')
    expect(bible).toHaveProperty('colorScript')
    expect(bible).toHaveProperty('forbidden')
    expect(bible.style.length).toBeGreaterThan(0)
  })

  it('initialShotSpecs 非空', () => {
    const specs = useWorkbenchStore.getState().shotSpecs
    expect(specs.length).toBeGreaterThan(0)
    expect(specs[0]).toHaveProperty('id')
    expect(specs[0]).toHaveProperty('shotCode')
    expect(specs[0]).toHaveProperty('description')
  })
})

// ---------------------------------------------------------------------------
// 工作流推进
// ---------------------------------------------------------------------------

describe('工作流推进与回退', () => {
  beforeEach(() => resetStore())

  it('setFocusedStage 不能跳到比当前阶段更高的阶段', () => {
    useWorkbenchStore.getState().setFocusedStage(3)
    // workflowStageId 仍然是 0，所以不应跳到 3
    expect(useWorkbenchStore.getState().focusedStageId).toBe(0)
  })

  it('setFocusedStage 可以切换到已完成的阶段', () => {
    // 模拟已推进到 Stage 3
    useWorkbenchStore.setState({ workflowStageId: 3, focusedStageId: 3 })
    useWorkbenchStore.getState().setFocusedStage(1)
    expect(useWorkbenchStore.getState().focusedStageId).toBe(1)
  })

  it('rejectCurrentStage 从 Stage 0 回退仍为 Stage 0', () => {
    const result = useWorkbenchStore.getState().rejectCurrentStage()
    expect(result).toEqual({ from: 0, to: 0 })
    expect(useWorkbenchStore.getState().workflowStageId).toBe(0)
  })

  it('rejectCurrentStage 从 Stage 3 回退到 Stage 2', () => {
    useWorkbenchStore.setState({ workflowStageId: 3, focusedStageId: 3 })
    const result = useWorkbenchStore.getState().rejectCurrentStage()
    expect(result).toEqual({ from: 3, to: 2 })
    expect(useWorkbenchStore.getState().workflowStageId).toBe(2)
    expect(useWorkbenchStore.getState().focusedStageId).toBe(2)
  })

  it('rejectCurrentStage 会清除 archiveReady', () => {
    useWorkbenchStore.setState({ workflowStageId: 4 as StageId, archiveReady: true })
    useWorkbenchStore.getState().rejectCurrentStage()
    expect(useWorkbenchStore.getState().archiveReady).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 数据编辑
// ---------------------------------------------------------------------------

describe('数据编辑 actions', () => {
  beforeEach(() => resetStore())

  it('updateBible 更新 style 字段', () => {
    useWorkbenchStore.getState().updateBible('style', '赛博朋克 · 高反差霓虹')
    expect(useWorkbenchStore.getState().projectBible.style).toBe('赛博朋克 · 高反差霓虹')
  })

  it('updateBible 更新 forbidden 字段', () => {
    useWorkbenchStore.getState().updateBible('forbidden', '禁止粉色')
    expect(useWorkbenchStore.getState().projectBible.forbidden).toBe('禁止粉色')
  })

  it('updateRawScript 更新原始剧本', () => {
    useWorkbenchStore.getState().updateRawScript('新的剧本大纲')
    expect(useWorkbenchStore.getState().rawScript).toBe('新的剧本大纲')
  })

  it('updateExpandedScript 更新扩写剧本', () => {
    useWorkbenchStore.getState().updateExpandedScript('扩写后的详细剧本')
    expect(useWorkbenchStore.getState().expandedScript).toBe('扩写后的详细剧本')
  })

  it('updateShot 更新镜头描述', () => {
    const shotId = useWorkbenchStore.getState().shotSpecs[0].id
    useWorkbenchStore.getState().updateShot(shotId, 'description', '新的镜头描述')
    expect(useWorkbenchStore.getState().shotSpecs[0].description).toBe('新的镜头描述')
  })

  it('updateShot 不影响其他镜头', () => {
    const specs = useWorkbenchStore.getState().shotSpecs
    if (specs.length >= 2) {
      const originalDesc = specs[1].description
      useWorkbenchStore.getState().updateShot(specs[0].id, 'description', '改掉第一个')
      expect(useWorkbenchStore.getState().shotSpecs[1].description).toBe(originalDesc)
    }
  })

  it('updateFinalNotes 更新终版批注', () => {
    useWorkbenchStore.getState().updateFinalNotes('这是最终审核意见')
    expect(useWorkbenchStore.getState().finalNotes).toBe('这是最终审核意见')
  })
})

// ---------------------------------------------------------------------------
// 角色管理
// ---------------------------------------------------------------------------

describe('角色管理', () => {
  beforeEach(() => resetStore())

  it('addCharacter 添加新角色', () => {
    const before = useWorkbenchStore.getState().characters.length
    useWorkbenchStore.getState().addCharacter()
    const after = useWorkbenchStore.getState().characters.length
    expect(after).toBe(before + 1)
  })

  it('新添加的角色默认未锁定', () => {
    useWorkbenchStore.getState().addCharacter()
    const chars = useWorkbenchStore.getState().characters
    const last = chars[chars.length - 1]
    expect(last.locked).toBe(false)
    expect(last.name).toBe('新角色')
  })

  it('removeCharacter 删除角色', () => {
    const before = useWorkbenchStore.getState().characters.length
    const idToRemove = useWorkbenchStore.getState().characters[0].id
    useWorkbenchStore.getState().removeCharacter(idToRemove)
    expect(useWorkbenchStore.getState().characters.length).toBe(before - 1)
    expect(useWorkbenchStore.getState().characters.find((c) => c.id === idToRemove)).toBeUndefined()
  })

  it('toggleCharacterLock 切换锁定状态', () => {
    const charId = useWorkbenchStore.getState().characters[0].id
    expect(useWorkbenchStore.getState().characters[0].locked).toBe(false)
    useWorkbenchStore.getState().toggleCharacterLock(charId)
    expect(useWorkbenchStore.getState().characters[0].locked).toBe(true)
    useWorkbenchStore.getState().toggleCharacterLock(charId)
    expect(useWorkbenchStore.getState().characters[0].locked).toBe(false)
  })

  it('updateCharacterField 更新角色名称', () => {
    const charId = useWorkbenchStore.getState().characters[0].id
    useWorkbenchStore.getState().updateCharacterField(charId, 'name', '新名字')
    expect(useWorkbenchStore.getState().characters[0].name).toBe('新名字')
  })
})

// ---------------------------------------------------------------------------
// 场景管理
// ---------------------------------------------------------------------------

describe('场景管理', () => {
  beforeEach(() => resetStore())

  it('addScene 添加新场景', () => {
    const before = useWorkbenchStore.getState().scenes.length
    useWorkbenchStore.getState().addScene()
    expect(useWorkbenchStore.getState().scenes.length).toBe(before + 1)
  })

  it('removeScene 删除场景', () => {
    const sceneId = useWorkbenchStore.getState().scenes[0].id
    useWorkbenchStore.getState().removeScene(sceneId)
    expect(useWorkbenchStore.getState().scenes.find((s) => s.id === sceneId)).toBeUndefined()
  })

  it('toggleSceneLock 切换锁定状态', () => {
    const sceneId = useWorkbenchStore.getState().scenes[0].id
    useWorkbenchStore.getState().toggleSceneLock(sceneId)
    expect(useWorkbenchStore.getState().scenes[0].locked).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 日志
// ---------------------------------------------------------------------------

describe('日志系统', () => {
  beforeEach(() => resetStore())

  it('appendLog 添加日志条目', () => {
    const before = useWorkbenchStore.getState().logs.length
    useWorkbenchStore.getState().appendLog('info', '测试日志消息')
    const logs = useWorkbenchStore.getState().logs
    expect(logs.length).toBe(before + 1)
    expect(logs[0].message).toBe('测试日志消息')
    expect(logs[0].kind).toBe('info')
  })

  it('appendLog 新日志在列表最前', () => {
    useWorkbenchStore.getState().appendLog('info', '第一条')
    useWorkbenchStore.getState().appendLog('error', '第二条')
    const logs = useWorkbenchStore.getState().logs
    expect(logs[0].message).toBe('第二条')
    expect(logs[1].message).toBe('第一条')
  })

  it('日志数量上限为 20', () => {
    for (let i = 0; i < 25; i++) {
      useWorkbenchStore.getState().appendLog('info', `日志 ${i}`)
    }
    expect(useWorkbenchStore.getState().logs.length).toBeLessThanOrEqual(20)
  })
})

// ---------------------------------------------------------------------------
// AI 状态
// ---------------------------------------------------------------------------

describe('AI 状态管理', () => {
  beforeEach(() => resetStore())

  it('clearAiError 重置 AI 状态', () => {
    useWorkbenchStore.setState({ aiStatus: 'error', aiError: '出错了' })
    useWorkbenchStore.getState().clearAiError()
    expect(useWorkbenchStore.getState().aiStatus).toBe('idle')
    expect(useWorkbenchStore.getState().aiError).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getStageStatus selector
// ---------------------------------------------------------------------------

describe('getStageStatus selector', () => {
  it('当前阶段返回 active', () => {
    expect(getStageStatus(2 as StageId, 2 as StageId, false)).toBe('active')
  })

  it('已完成阶段返回 completed', () => {
    expect(getStageStatus(1 as StageId, 3 as StageId, false)).toBe('completed')
  })

  it('未到达阶段返回 pending', () => {
    expect(getStageStatus(4 as StageId, 2 as StageId, false)).toBe('pending')
  })

  it('Stage 4 归档后返回 completed', () => {
    expect(getStageStatus(4 as StageId, 4 as StageId, true)).toBe('completed')
  })

  it('Stage 4 未归档返回 active', () => {
    expect(getStageStatus(4 as StageId, 4 as StageId, false)).toBe('active')
  })
})
