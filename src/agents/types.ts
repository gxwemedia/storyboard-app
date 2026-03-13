/**
 * 多智能体编排 — 类型定义
 *
 * 定义 StageAgent 接口及上下文/结果类型，
 * 零外部依赖的轻量编排抽象。
 */

import type { ProjectBible, ShotSpec, StageId } from '@/types'
import type { Skill } from '@/skills/types'

// ---------------------------------------------------------------------------
// Agent 上下文：Stage 间传递的结构化数据
// ---------------------------------------------------------------------------

/** 上游各阶段已产出的 Ground Truth */
export interface GroundTruth {
  bible: ProjectBible
  rawScript: string
  expandedScript: string
  characters: Array<{ name: string; description: string; consistencyPrompt: string; locked: boolean }>
  scenes: Array<{ name: string; description: string; consistencyPrompt: string; locked: boolean }>
  shotSpecs: ShotSpec[]
}

/** 传递给每个 Agent 的执行上下文 */
export interface AgentContext {
  /** 当前 Stage 编号 */
  stageId: StageId
  /** 上游 Ground Truth（只读快照） */
  groundTruth: Readonly<GroundTruth>
  /** 当前 Stage 激活的技能包 */
  activeSkills: Skill[]
  /** 聚合后的技能指令（已由 SkillRegistry 拼接） */
  skillInstructions: string
  /** 额外变量（Agent 间自定义传递） */
  variables: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Agent 结果
// ---------------------------------------------------------------------------

export interface AgentResult {
  /** 是否执行成功 */
  success: boolean
  /** 产出数据（结构由各 Agent 自定义） */
  output: Record<string, unknown>
  /** 日志消息 */
  logs: Array<{ level: 'info' | 'success' | 'warning' | 'error'; message: string }>
  /** 执行耗时（ms） */
  durationMs: number
}

// ---------------------------------------------------------------------------
// Agent 工具
// ---------------------------------------------------------------------------

/** Agent 可声明的工具 */
export interface AgentTool {
  name: string
  description: string
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

// ---------------------------------------------------------------------------
// StageAgent 接口
// ---------------------------------------------------------------------------

export interface StageAgent {
  /** Agent 名称 */
  name: string
  /** 对应的 Stage 编号 */
  stageId: StageId
  /** Agent 职责描述 */
  description: string
  /** 该 Agent 声明可用的工具 */
  tools: AgentTool[]
  /**
   * 构建 system prompt
   * 基础 prompt + 技能指令注入
   */
  buildSystemPrompt(ctx: AgentContext): string
  /**
   * 执行 Agent 核心逻辑
   * 由路由器调用
   */
  execute(ctx: AgentContext): Promise<AgentResult>
}
