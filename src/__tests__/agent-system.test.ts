/**
 * Agent 编排层单元测试
 *
 * 测试：Agent 注册/查询/路由、AgentContext 构建、各 Agent 基本行为。
 * AI API 调用由 orchestrator 层负责，此处仅测试框架本身。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerAgent,
  getAgent,
  getAllAgents,
  buildAgentContext,
  routeAndExecute,
  bibleScriptAgent,
  conceptAgent,
  shotSpecAgent,
  previzAgent,
  finalAgent,
} from '@/agents'
import type { StageAgent, AgentContext, AgentResult, GroundTruth } from '@/agents'
import type { StageId } from '@/types'
import { initialBible, initialShotSpecs } from '@/data'

// ---------------------------------------------------------------------------
// 测试用 GroundTruth
// ---------------------------------------------------------------------------

const mockGroundTruth: GroundTruth = {
  bible: initialBible,
  rawScript: '亚瑟握着猎魔银剑走入岩洞深处。',
  expandedScript: '亚瑟握着猎魔银剑走入岩洞深处，火把的光切开潮湿空气...',
  characters: [
    { name: '亚瑟', description: '冷峻猎魔人', consistencyPrompt: '银甲、旧伤', locked: true },
  ],
  scenes: [
    { name: '龙巢', description: '熔岩残照洞穴', consistencyPrompt: '红鳞、硫磺雾', locked: true },
  ],
  shotSpecs: initialShotSpecs,
}

// ---------------------------------------------------------------------------
// 注册表
// ---------------------------------------------------------------------------

describe('Agent 注册表', () => {
  it('自动注册了 5 个内置 Agent', () => {
    const agents = getAllAgents()
    expect(agents.length).toBe(5)
  })

  it('按 StageId 查询 Agent', () => {
    expect(getAgent(0)).toBe(bibleScriptAgent)
    expect(getAgent(1)).toBe(conceptAgent)
    expect(getAgent(2)).toBe(shotSpecAgent)
    expect(getAgent(3)).toBe(previzAgent)
    expect(getAgent(4)).toBe(finalAgent)
  })

  it('查询不存在的 StageId 返回 undefined', () => {
    expect(getAgent(99 as StageId)).toBeUndefined()
  })

  it('每个 Agent 有正确的 stageId', () => {
    const agents = getAllAgents()
    const ids = agents.map(a => a.stageId).sort()
    expect(ids).toEqual([0, 1, 2, 3, 4])
  })

  it('每个 Agent 有名称和描述', () => {
    for (const agent of getAllAgents()) {
      expect(agent.name.length).toBeGreaterThan(0)
      expect(agent.description.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// AgentContext 构建
// ---------------------------------------------------------------------------

describe('AgentContext 构建', () => {
  it('包含正确的 stageId', () => {
    const ctx = buildAgentContext(2 as StageId, mockGroundTruth)
    expect(ctx.stageId).toBe(2)
  })

  it('groundTruth 为冻结对象', () => {
    const ctx = buildAgentContext(0, mockGroundTruth)
    expect(Object.isFrozen(ctx.groundTruth)).toBe(true)
  })

  it('额外变量正确传入', () => {
    const ctx = buildAgentContext(1 as StageId, mockGroundTruth, { action: 'image', subType: 'character' })
    expect(ctx.variables.action).toBe('image')
    expect(ctx.variables.subType).toBe('character')
  })

  it('skillInstructions 为字符串', () => {
    const ctx = buildAgentContext(0, mockGroundTruth)
    expect(typeof ctx.skillInstructions).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Agent 行为（不涉及实际 API 调用）
// ---------------------------------------------------------------------------

describe('Agent 行为', () => {
  it('bibleScriptAgent 空剧本返回失败', async () => {
    const gt = { ...mockGroundTruth, rawScript: '' }
    const result = await routeAndExecute(0, gt)
    expect(result.success).toBe(false)
    expect(result.logs.some(l => l.message.includes('为空'))).toBe(true)
  })

  it('finalAgent 检查完整性', async () => {
    const result = await routeAndExecute(4 as StageId, mockGroundTruth)
    expect(result.success).toBe(true)
    expect(result.output.summary).toBeDefined()
    const summary = result.output.summary as Record<string, unknown>
    expect(summary.shotCount).toBe(initialShotSpecs.length)
    expect(summary.readyForExport).toBe(true)
  })

  it('finalAgent 空剧本给出警告', async () => {
    const gt = { ...mockGroundTruth, expandedScript: '' }
    const result = await routeAndExecute(4 as StageId, gt)
    expect(result.logs.some(l => l.level === 'warning' && l.message.includes('扩写剧本为空'))).toBe(true)
  })

  it('finalAgent 空 ShotSpec 给出警告', async () => {
    const gt = { ...mockGroundTruth, shotSpecs: [] }
    const result = await routeAndExecute(4 as StageId, gt)
    expect(result.logs.some(l => l.level === 'warning' && l.message.includes('ShotSpec 为空'))).toBe(true)
  })

  it('路由不存在的 Agent 返回失败', async () => {
    const result = await routeAndExecute(99 as StageId, mockGroundTruth)
    expect(result.success).toBe(false)
    expect(result.logs[0].message).toContain('未注册')
  })

  it('buildSystemPrompt 注入技能指令', () => {
    const ctx: AgentContext = {
      stageId: 0,
      groundTruth: mockGroundTruth,
      activeSkills: [],
      skillInstructions: '【悬疑类风格强化】强调暗角和阴影',
      variables: {},
    }
    const prompt = bibleScriptAgent.buildSystemPrompt(ctx)
    expect(prompt).toContain('悬疑类风格强化')
    expect(prompt).toContain('强调暗角和阴影')
  })
})
