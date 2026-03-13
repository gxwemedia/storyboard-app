/**
 * data.ts 单元测试
 *
 * 测试初始化数据和 buildServerStates 辅助函数。
 */

import { describe, it, expect } from 'vitest'
import {
  workflowStages,
  initialBible,
  initialShotSpecs,
  buildServerStates,
} from '@/data'
import type { StageId } from '@/types'

// ---------------------------------------------------------------------------
// 初始化数据
// ---------------------------------------------------------------------------

describe('初始化数据完整性', () => {
  it('workflowStages 包含 5 个阶段 (0-4)', () => {
    expect(workflowStages).toHaveLength(5)
    for (let i = 0; i <= 4; i++) {
      const stage = workflowStages.find((s) => s.id === i)
      expect(stage).toBeDefined()
      expect(stage!.label.length).toBeGreaterThan(0)
    }
  })

  it('initialBible 三个字段非空', () => {
    expect(initialBible.style.length).toBeGreaterThan(0)
    expect(initialBible.colorScript.length).toBeGreaterThan(0)
    expect(initialBible.forbidden.length).toBeGreaterThan(0)
  })

  it('initialShotSpecs 每个镜头含必要字段', () => {
    expect(initialShotSpecs.length).toBeGreaterThan(0)
    for (const spec of initialShotSpecs) {
      expect(spec.id).toBeTruthy()
      expect(spec.shotCode).toBeTruthy()
      expect(spec.description.length).toBeGreaterThan(0)
      expect(spec.lens.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// buildServerStates
// ---------------------------------------------------------------------------

describe('buildServerStates', () => {
  it('始终返回 4 个 server 状态', () => {
    for (let i = 0; i <= 4; i++) {
      const states = buildServerStates(i as StageId)
      expect(states).toHaveLength(4)
      expect(states.map((s) => s.key)).toEqual(['memory', 'prompt', 'render', 'vision'])
    }
  })

  it('Stage 0 memory 和 prompt 为 active', () => {
    const states = buildServerStates(0)
    expect(states.find((s) => s.key === 'memory')!.tone).toBe('active')
    expect(states.find((s) => s.key === 'prompt')!.tone).toBe('active')
    expect(states.find((s) => s.key === 'vision')!.tone).toBe('idle')
  })

  it('Stage 3 render 和 vision 为 active', () => {
    const states = buildServerStates(3)
    expect(states.find((s) => s.key === 'render')!.tone).toBe('active')
    expect(states.find((s) => s.key === 'vision')!.tone).toBe('active')
  })

  it('AI generating 状态下 prompt 显示 busy', () => {
    // Stage 0 现在是圣经+剧本，prompt busy 在 stageId 0 或 2
    const states = buildServerStates(0, 'generating')
    const prompt = states.find((s) => s.key === 'prompt')!
    expect(prompt.tone).toBe('active')
    expect(prompt.status).toContain('Generating')
  })

  it('AI error 状态下 prompt 显示 warning', () => {
    const states = buildServerStates(0, 'error')
    const prompt = states.find((s) => s.key === 'prompt')!
    expect(prompt.tone).toBe('warning')
    expect(prompt.status).toBe('Error')
  })
})
