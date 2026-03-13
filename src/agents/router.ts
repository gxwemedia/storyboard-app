/**
 * Agent 路由器 — 按 StageId 分发到对应 Agent
 *
 * 职责：
 * 1. 管理所有 StageAgent 实例
 * 2. 从 workbench-store 采集 GroundTruth 快照
 * 3. 从 SkillRegistry 采集激活技能
 * 4. 组装 AgentContext 并分发执行
 */

import type { StageId } from '@/types'
import type { StageAgent, AgentContext, AgentResult, GroundTruth } from './types'
import { skillRegistry } from '@/skills'

// ---------------------------------------------------------------------------
// Agent 注册表
// ---------------------------------------------------------------------------

const agentMap = new Map<StageId, StageAgent>()

/** 注册一个 StageAgent */
export function registerAgent(agent: StageAgent): void {
  agentMap.set(agent.stageId, agent)
}

/** 获取指定 Stage 的 Agent */
export function getAgent(stageId: StageId): StageAgent | undefined {
  return agentMap.get(stageId)
}

/** 获取所有已注册的 Agent */
export function getAllAgents(): StageAgent[] {
  return Array.from(agentMap.values())
}

// ---------------------------------------------------------------------------
// 上下文构建
// ---------------------------------------------------------------------------

/**
 * 从外部状态构建 AgentContext
 * 调用方（workbench-store）负责传入 GroundTruth 快照
 */
export function buildAgentContext(
  stageId: StageId,
  groundTruth: GroundTruth,
  extraVars: Record<string, unknown> = {},
): AgentContext {
  // 从 SkillRegistry 采集当前激活的技能（使用现有 API）
  const activeSkills: AgentContext['activeSkills'] = []
  const skillInstructions = skillRegistry.getAllActiveInstructions() || ''

  return {
    stageId,
    groundTruth: Object.freeze({ ...groundTruth }),
    activeSkills,
    skillInstructions,
    variables: { ...extraVars },
  }
}

// ---------------------------------------------------------------------------
// 路由执行
// ---------------------------------------------------------------------------

/**
 * 路由到对应 Stage 的 Agent 并执行
 *
 * @returns AgentResult 或抛出错误
 */
export async function routeAndExecute(
  stageId: StageId,
  groundTruth: GroundTruth,
  extraVars?: Record<string, unknown>,
): Promise<AgentResult> {
  const agent = agentMap.get(stageId)
  if (!agent) {
    return {
      success: false,
      output: {},
      logs: [{ level: 'error', message: `Stage ${stageId} 未注册 Agent` }],
      durationMs: 0,
    }
  }

  const ctx = buildAgentContext(stageId, groundTruth, extraVars)
  const startTime = performance.now()

  try {
    const result = await agent.execute(ctx)
    // 补充耗时
    result.durationMs = Math.round(performance.now() - startTime)
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      output: {},
      logs: [{ level: 'error', message: `Agent [${agent.name}] 执行失败: ${message}` }],
      durationMs: Math.round(performance.now() - startTime),
    }
  }
}
