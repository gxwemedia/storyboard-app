/**
 * 工作流技能系统 — 类型定义
 *
 * 对齐 Claude/Codex CLI Skills 范式：
 * - 技能 = Markdown 文件（YAML frontmatter + 指令步骤）
 * - 每个技能描述 **如何完成一类任务**（操作序列，不只是 Prompt 模板）
 * - Agent 根据用户意图自动匹配并执行
 */

// ---------------------------------------------------------------------------
// 技能定义
// ---------------------------------------------------------------------------

/** 技能 YAML Frontmatter */
export interface SkillFrontmatter {
  /** 技能名称 */
  name: string
  /** 简短描述（一句话） */
  description: string
  /** 触发标签（用于匹配） */
  tags?: string[]
  /** 优先级（高优先级技能在多匹配时优先） */
  priority?: number
  /** 适用阶段（限制在哪些 Stage 可用） */
  stages?: number[]
}

/** 工作流步骤类型 */
export type StepAction =
  | 'prompt'          // 发送 AI Prompt
  | 'generate_image'  // 调用图片生成
  | 'upload'          // 上传文件到 RunningHub
  | 'validate'        // 校验结果（视觉一致性检查等）
  | 'transform'       // 数据变换（ShotSpec → ComfyUI nodeInfoList）
  | 'store'           // 持久化数据
  | 'notify'          // 通知用户
  | 'condition'       // 条件分支
  | 'loop'            // 循环

/** 单个工作流步骤 */
export interface WorkflowStep {
  /** 步骤 ID（自动生成或手动指定） */
  id: string
  /** 步骤名称 */
  name: string
  /** 操作类型 */
  action: StepAction
  /** 操作参数（action-specific） */
  params: Record<string, unknown>
  /** 超时时间（ms） */
  timeoutMs?: number
  /** 失败策略 */
  onError?: 'skip' | 'retry' | 'abort'
  /** 重试次数 */
  retryCount?: number
  /** 条件表达式（为 true 时执行） */
  when?: string
}

/** 完整技能定义 */
export interface Skill {
  /** 唯一标识 */
  id: string
  /** YAML Frontmatter 元数据 */
  meta: SkillFrontmatter
  /** 原始 Markdown 内容 */
  rawContent: string
  /** 解析后的工作流步骤 */
  steps: WorkflowStep[]
  /** 来源 */
  source: 'builtin' | 'user'
  /** 加载时间 */
  loadedAt: Date
}

// ---------------------------------------------------------------------------
// 执行上下文
// ---------------------------------------------------------------------------

/** 步骤执行结果 */
export interface StepResult {
  stepId: string
  success: boolean
  output?: unknown
  error?: string
  duration: number
}

/** 工作流执行上下文 */
export interface WorkflowContext {
  /** 当前技能 */
  skill: Skill
  /** 步骤变量（步骤间数据传递） */
  variables: Map<string, unknown>
  /** 执行历史 */
  history: StepResult[]
  /** 是否已取消 */
  cancelled: boolean
}

/** 工作流执行结果 */
export interface WorkflowResult {
  skillId: string
  success: boolean
  steps: StepResult[]
  totalDuration: number
  output?: unknown
}

// ---------------------------------------------------------------------------
// 步骤处理器
// ---------------------------------------------------------------------------

/** 步骤处理器函数签名 */
export type StepHandler = (
  step: WorkflowStep,
  context: WorkflowContext,
) => Promise<StepResult>

/** 步骤处理器注册表 */
export type StepHandlerRegistry = Map<StepAction, StepHandler>
