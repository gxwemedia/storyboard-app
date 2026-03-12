/**
 * 工作流执行器
 *
 * 按步骤序列执行技能的工作流，支持：
 * - 变量传递（步骤间通过 context.variables 共享数据）
 * - 条件分支（step.when 表达式）
 * - 错误处理（skip/retry/abort）
 * - 进度回调
 * - 超时控制
 */

import type {
  Skill,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  StepResult,
  StepAction,
  StepHandler,
  StepHandlerRegistry,
} from './schema'

// ---------------------------------------------------------------------------
// 默认步骤处理器
// ---------------------------------------------------------------------------

/** 创建默认处理器（仅记录日志，实际逻辑由外部注册） */
function createDefaultHandler(action: StepAction): StepHandler {
  return async (step, context) => {
    console.log(`[Workflow] 执行步骤 "${step.name}" (${action})`)
    return {
      stepId: step.id,
      success: true,
      output: step.params,
      duration: 0,
    }
  }
}

// ---------------------------------------------------------------------------
// 工作流执行器
// ---------------------------------------------------------------------------

export class WorkflowExecutor {
  private handlers: StepHandlerRegistry = new Map()

  constructor() {
    // 注册默认处理器
    const actions: StepAction[] = [
      'prompt', 'generate_image', 'upload', 'validate',
      'transform', 'store', 'notify', 'condition', 'loop',
    ]
    for (const action of actions) {
      this.handlers.set(action, createDefaultHandler(action))
    }
  }

  /**
   * 注册自定义步骤处理器（覆盖默认）
   */
  registerHandler(action: StepAction, handler: StepHandler): void {
    this.handlers.set(action, handler)
  }

  /**
   * 执行技能工作流
   */
  async execute(
    skill: Skill,
    initialVariables?: Record<string, unknown>,
    onProgress?: (stepIndex: number, total: number, stepName: string) => void,
  ): Promise<WorkflowResult> {
    const startTime = Date.now()

    // 初始化执行上下文
    const context: WorkflowContext = {
      skill,
      variables: new Map(Object.entries(initialVariables || {})),
      history: [],
      cancelled: false,
    }

    const results: StepResult[] = []

    for (let i = 0; i < skill.steps.length; i++) {
      if (context.cancelled) break

      const step = skill.steps[i]

      // 条件检查
      if (step.when && !this.evaluateCondition(step.when, context)) {
        results.push({
          stepId: step.id,
          success: true,
          output: 'skipped (condition not met)',
          duration: 0,
        })
        continue
      }

      onProgress?.(i, skill.steps.length, step.name)

      // 执行步骤（含重试）
      const result = await this.executeStep(step, context)
      results.push(result)
      context.history.push(result)

      // 存储输出到变量
      if (result.success && result.output !== undefined) {
        context.variables.set(step.id, result.output)
        context.variables.set(`${step.id}.output`, result.output)
      }

      // 错误处理
      if (!result.success) {
        const errorAction = step.onError || 'abort'
        if (errorAction === 'abort') {
          break
        }
        // skip: 继续 / retry: 已在 executeStep 中处理
      }
    }

    return {
      skillId: skill.id,
      success: results.every((r) => r.success),
      steps: results,
      totalDuration: Date.now() - startTime,
      output: context.variables.get('final_output'),
    }
  }

  /**
   * 取消执行
   */
  cancel(context: WorkflowContext): void {
    context.cancelled = true
  }

  // ---- 内部方法 ----

  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
  ): Promise<StepResult> {
    const handler = this.handlers.get(step.action)
    if (!handler) {
      return {
        stepId: step.id,
        success: false,
        error: `未注册的处理器: ${step.action}`,
        duration: 0,
      }
    }

    const maxRetries = step.retryCount || 0
    let lastError: string | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now()

        // 超时控制
        const result = step.timeoutMs
          ? await this.withTimeout(handler(step, context), step.timeoutMs)
          : await handler(step, context)

        result.duration = Date.now() - startTime
        return result
      } catch (err) {
        lastError = (err as Error).message
        if (attempt < maxRetries) {
          console.warn(`[Workflow] 步骤 "${step.name}" 重试 ${attempt + 1}/${maxRetries}`)
        }
      }
    }

    return {
      stepId: step.id,
      success: false,
      error: lastError || '未知错误',
      duration: 0,
    }
  }

  private evaluateCondition(expr: string, context: WorkflowContext): boolean {
    try {
      // 简单变量替换检查
      if (expr.startsWith('has:')) {
        return context.variables.has(expr.slice(4).trim())
      }
      if (expr.startsWith('!has:')) {
        return !context.variables.has(expr.slice(5).trim())
      }
      if (expr === 'true') return true
      if (expr === 'false') return false

      // 检查变量值
      const [varName, expected] = expr.split('===').map((s) => s.trim())
      if (varName && expected) {
        return String(context.variables.get(varName)) === expected
      }

      return true
    } catch {
      return true
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`步骤超时 (${ms}ms)`)), ms)
      promise
        .then((v) => { clearTimeout(timer); resolve(v) })
        .catch((e) => { clearTimeout(timer); reject(e) })
    })
  }
}

// ---------------------------------------------------------------------------
// 单例导出
// ---------------------------------------------------------------------------

export const workflowExecutor = new WorkflowExecutor()
