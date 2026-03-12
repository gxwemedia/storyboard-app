/**
 * 技能包加载器
 *
 * 管理技能包的注册、加载和获取。
 * 内置 4 个默认技能包，支持用户自定义扩展。
 */

import type { SkillPack, SkillPackEntry, StageSkill, Stage3Skill } from './schema'

// 内置技能包
import suspensePack from './packs/suspense.json'
import scifiPack from './packs/scifi.json'
import epicFantasyPack from './packs/epic-fantasy.json'
import realisticPack from './packs/realistic.json'

// ---------------------------------------------------------------------------
// 技能包注册表
// ---------------------------------------------------------------------------

class SkillPackRegistry {
  private packs = new Map<string, SkillPackEntry>()
  private activePackId: string | null = null

  constructor() {
    // 注册内置技能包
    this.registerBuiltin(suspensePack as unknown as SkillPack)
    this.registerBuiltin(scifiPack as unknown as SkillPack)
    this.registerBuiltin(epicFantasyPack as unknown as SkillPack)
    this.registerBuiltin(realisticPack as unknown as SkillPack)
  }

  private registerBuiltin(pack: SkillPack): void {
    this.packs.set(pack.id, {
      pack,
      source: 'builtin',
      loadedAt: new Date(),
    })
  }

  /** 注册用户自定义技能包 */
  register(pack: SkillPack, source: 'user' | 'remote' = 'user'): void {
    this.packs.set(pack.id, {
      pack,
      source,
      loadedAt: new Date(),
    })
  }

  /** 移除技能包 */
  unregister(id: string): boolean {
    if (this.activePackId === id) this.activePackId = null
    return this.packs.delete(id)
  }

  /** 获取所有已注册的技能包 */
  getAll(): SkillPackEntry[] {
    return Array.from(this.packs.values())
  }

  /** 获取技能包列表（简化） */
  list(): Array<{ id: string; name: string; tags: string[]; source: string }> {
    return this.getAll().map((e) => ({
      id: e.pack.id,
      name: e.pack.name,
      tags: e.pack.tags,
      source: e.source,
    }))
  }

  /** 根据 ID 获取技能包 */
  get(id: string): SkillPack | undefined {
    return this.packs.get(id)?.pack
  }

  /** 设置当前激活的技能包 */
  setActive(id: string): boolean {
    if (!this.packs.has(id)) return false
    this.activePackId = id
    return true
  }

  /** 获取当前激活的技能包（无激活则返回 undefined） */
  getActive(): SkillPack | undefined {
    if (!this.activePackId) return undefined
    return this.packs.get(this.activePackId)?.pack
  }

  /** 获取当前激活的技能包 ID */
  getActiveId(): string | null {
    return this.activePackId
  }

  /** 清除激活状态 */
  clearActive(): void {
    this.activePackId = null
  }

  // --------
  // 技能解析：合并默认 Prompt + 技能包覆盖
  // --------

  /** 获取指定阶段的合并后技能配置 */
  resolveStageSkill(
    stageKey: 'stage1' | 'stage2Character' | 'stage2Scene' | 'stage3',
    defaultPrompt: string,
    defaultTemperature: number,
  ): { systemPrompt: string; temperature: number; fewShots: Array<{ input: string; output: string }> } {
    const active = this.getActive()
    const skill = active?.stages[stageKey]

    if (!skill) {
      return { systemPrompt: defaultPrompt, temperature: defaultTemperature, fewShots: [] }
    }

    // Prompt 合并策略：覆盖 > 追加 > 默认
    let systemPrompt = defaultPrompt
    if (skill.systemPrompt) {
      systemPrompt = skill.systemPrompt
    } else if (skill.systemPromptAppend) {
      systemPrompt = `${defaultPrompt}\n\n${skill.systemPromptAppend}`
    }

    return {
      systemPrompt,
      temperature: skill.temperature ?? defaultTemperature,
      fewShots: skill.fewShots || [],
    }
  }

  /** 获取 Stage 3 专用配置（含景别/光位偏好） */
  resolveStage3Skill(
    defaultPrompt: string,
    defaultTemperature: number,
  ): {
    systemPrompt: string
    temperature: number
    fewShots: Array<{ input: string; output: string }>
    preferredScales?: string[]
    preferredLighting?: string[]
    shotCountHint?: [number, number]
  } {
    const base = this.resolveStageSkill('stage3', defaultPrompt, defaultTemperature)
    const active = this.getActive()
    const stage3 = active?.stages.stage3 as Stage3Skill | undefined

    return {
      ...base,
      preferredScales: stage3?.preferredScales,
      preferredLighting: stage3?.preferredLighting,
      shotCountHint: stage3?.shotCountHint,
    }
  }
}

// ---------------------------------------------------------------------------
// 单例导出
// ---------------------------------------------------------------------------

export const skillPackRegistry = new SkillPackRegistry()
