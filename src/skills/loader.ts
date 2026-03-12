/**
 * 技能包加载器（CLI 工作流版）
 *
 * 管理基于 Markdown 的技能文件：解析、注册、匹配、加载。
 */

import type { Skill, StepAction, StepHandler } from './schema'
import { parseSkillMarkdown } from './parser'
import { workflowExecutor } from './executor'

// 内置 Markdown 技能（作为字符串直接 import）
import suspenseWorkflowRaw from './packs/suspense-workflow.md?raw'
import defaultWorkflowRaw from './packs/default-workflow.md?raw'

// ---------------------------------------------------------------------------
// 技能注册表
// ---------------------------------------------------------------------------

class SkillRegistry {
  private skills = new Map<string, Skill>()
  private activeSkillId: string | null = null

  constructor() {
    // 注册内置技能
    this.registerRaw('suspense-workflow', suspenseWorkflowRaw, 'builtin')
    this.registerRaw('default-workflow', defaultWorkflowRaw, 'builtin')
  }

  /** 从原始 Markdown 注册 */
  registerRaw(id: string, markdown: string, source: 'builtin' | 'user' = 'user'): void {
    const skill = parseSkillMarkdown(markdown, id, source)
    this.skills.set(id, skill)
  }

  /** 注册已解析的技能 */
  register(skill: Skill): void {
    this.skills.set(skill.id, skill)
  }

  /** 移除技能 */
  unregister(id: string): boolean {
    if (this.activeSkillId === id) this.activeSkillId = null
    return this.skills.delete(id)
  }

  /** 获取所有技能 */
  getAll(): Skill[] {
    return Array.from(this.skills.values())
  }

  /** 列表（简化） */
  list(): Array<{ id: string; name: string; description: string; tags: string[]; steps: number }> {
    return this.getAll().map((s) => ({
      id: s.id,
      name: s.meta.name,
      description: s.meta.description,
      tags: s.meta.tags || [],
      steps: s.steps.length,
    }))
  }

  /** 根据 ID 获取 */
  get(id: string): Skill | undefined {
    return this.skills.get(id)
  }

  /** 激活技能 */
  setActive(id: string): boolean {
    if (!this.skills.has(id)) return false
    this.activeSkillId = id
    return true
  }

  /** 获取当前激活技能 */
  getActive(): Skill | undefined {
    if (!this.activeSkillId) return undefined
    return this.skills.get(this.activeSkillId)
  }

  getActiveId(): string | null {
    return this.activeSkillId
  }

  clearActive(): void {
    this.activeSkillId = null
  }

  // --------
  // 匹配
  // --------

  /** 根据标签匹配技能 */
  matchByTags(tags: string[]): Array<{ skill: Skill; score: number; matched: string[] }> {
    const normalizedTags = tags.map((t) => t.toLowerCase().trim())
    const results: Array<{ skill: Skill; score: number; matched: string[] }> = []

    for (const skill of this.skills.values()) {
      const skillTags = (skill.meta.tags || []).map((t) => t.toLowerCase().trim())
      const matched: string[] = []

      for (const tag of normalizedTags) {
        if (skillTags.some((st) => st.includes(tag) || tag.includes(st))) {
          matched.push(tag)
        }
      }

      if (matched.length > 0) {
        const score = matched.length / Math.max(normalizedTags.length, 1)
        results.push({ skill, score, matched })
      }
    }

    // 优先级 + 匹配度排序
    return results.sort((a, b) => {
      const priDiff = (b.skill.meta.priority || 0) - (a.skill.meta.priority || 0)
      return priDiff !== 0 ? priDiff : b.score - a.score
    })
  }

  /** 自动匹配并激活 */
  autoMatch(tags: string[]): Skill | undefined {
    const results = this.matchByTags(tags)
    if (results.length > 0) {
      this.setActive(results[0].skill.id)
      return results[0].skill
    }
    return undefined
  }

  /** 按阶段过滤可用技能 */
  getSkillsForStage(stageId: number): Skill[] {
    return this.getAll().filter(
      (s) => !s.meta.stages?.length || s.meta.stages.includes(stageId),
    )
  }

  // --------
  // 执行
  // --------

  /** 执行当前激活的技能 */
  async executeActive(
    variables?: Record<string, unknown>,
    onProgress?: (step: number, total: number, name: string) => void,
  ) {
    const skill = this.getActive()
    if (!skill) throw new Error('没有激活的技能')
    return workflowExecutor.execute(skill, variables, onProgress)
  }

  /** 执行指定技能 */
  async executeSkill(
    id: string,
    variables?: Record<string, unknown>,
    onProgress?: (step: number, total: number, name: string) => void,
  ) {
    const skill = this.get(id)
    if (!skill) throw new Error(`技能不存在: ${id}`)
    return workflowExecutor.execute(skill, variables, onProgress)
  }

  /** 注册步骤处理器（代理到 executor） */
  registerHandler(action: StepAction, handler: StepHandler): void {
    workflowExecutor.registerHandler(action, handler)
  }
}

// ---------------------------------------------------------------------------
// 单例导出
// ---------------------------------------------------------------------------

export const skillRegistry = new SkillRegistry()

// 兼容旧 API：保留 skillPackRegistry 别名
export const skillPackRegistry = {
  /** 获取激活技能的 Prompt 覆盖（兼容旧 orchestrator） */
  resolveStageSkill(
    _stageKey: string,
    defaultPrompt: string,
    defaultTemperature: number,
  ) {
    return { systemPrompt: defaultPrompt, temperature: defaultTemperature, fewShots: [] as Array<{ input: string; output: string }> }
  },
  resolveStage3Skill(
    defaultPrompt: string,
    defaultTemperature: number,
  ) {
    return {
      systemPrompt: defaultPrompt,
      temperature: defaultTemperature,
      fewShots: [] as Array<{ input: string; output: string }>,
      preferredScales: undefined as string[] | undefined,
      preferredLighting: undefined as string[] | undefined,
      shotCountHint: undefined as [number, number] | undefined,
    }
  },
}
