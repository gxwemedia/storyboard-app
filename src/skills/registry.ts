/**
 * Skills 注册表 — 发现、匹配、加载
 *
 * 对齐 Claude 官方 `SKILL.md` 范式：
 * - 从 SKILL.md 文件中解析 YAML frontmatter 获取元数据
 * - 支持 5 分类（bible/script/concept/shotspec/rendering）多激活
 * - 每个 category 独立激活一个技能，最终组合注入 system prompt
 */

import type { Skill, SkillMeta, SkillCategory, BiblePreset } from './types'

// ---------------------------------------------------------------------------
// 内置 SKILL.md（通过 Vite ?raw import）
// ---------------------------------------------------------------------------

// bible 分类
import darkGothicSkill from './packs/bible/dark-gothic/SKILL.md?raw'
import brightFairyTaleSkill from './packs/bible/bright-fairy-tale/SKILL.md?raw'
// script 分类
import suspenseScriptSkill from './packs/script/suspense-script/SKILL.md?raw'
import epicFantasyScriptSkill from './packs/script/epic-fantasy-script/SKILL.md?raw'
// concept 分类
import suspenseSkill from './packs/concept/suspense-cinematography/SKILL.md?raw'
import realisticSkill from './packs/concept/realistic-drama/SKILL.md?raw'
// shotspec 分类
import shotSpecSkill from './packs/shotspec/shot-spec-expert/SKILL.md?raw'
import fantasySkill from './packs/shotspec/epic-fantasy-visual/SKILL.md?raw'
import scifiSkill from './packs/shotspec/scifi-worldbuilding/SKILL.md?raw'
// rendering 分类
import defaultRenderSkill from './packs/rendering/default-render/SKILL.md?raw'

// ---------------------------------------------------------------------------
// SKILL.md 解析
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/

/** 解析 SKILL.md → Skill */
export function parseSkillMd(raw: string, id: string, source: 'builtin' | 'user' = 'builtin'): Skill {
  const match = raw.match(FRONTMATTER_RE)
  let meta: SkillMeta = { name: id, description: '', category: 'shotspec' }
  let instructions = raw
  let preset: BiblePreset | undefined

  if (match) {
    // 简易 YAML 解析
    const yamlBlock = match[1]
    const parsed: Record<string, string> = {}
    for (const line of yamlBlock.split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim()
      // 处理带引号的值
      let val = line.slice(colonIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      parsed[key] = val
    }
    meta = {
      name: parsed.name || id,
      description: parsed.description || '',
      category: (parsed.category as SkillCategory) || 'shotspec',
    }
    instructions = raw.slice(match[0].length).trim()

    // 解析 bible 预设
    if (parsed.preset_style) {
      preset = {
        style: parsed.preset_style,
        colorScript: parsed.preset_colorScript || '',
        forbidden: parsed.preset_forbidden || '',
      }
    }
  }

  return { id, meta, instructions, source, preset }
}

// ---------------------------------------------------------------------------
// 注册表
// ---------------------------------------------------------------------------

class SkillRegistry {
  private skills = new Map<string, Skill>()
  /** 每个 category 独立激活一个技能 */
  private activeByCat = new Map<SkillCategory, string | null>()
  /** 向后兼容：单激活 ID */
  private activeId: string | null = null

  constructor() {
    // 注册内置技能 —— bible
    this.register(parseSkillMd(darkGothicSkill, 'dark-gothic'))
    this.register(parseSkillMd(brightFairyTaleSkill, 'bright-fairy-tale'))
    // script
    this.register(parseSkillMd(suspenseScriptSkill, 'suspense-script'))
    this.register(parseSkillMd(epicFantasyScriptSkill, 'epic-fantasy-script'))
    // concept
    this.register(parseSkillMd(suspenseSkill, 'suspense-cinematography'))
    this.register(parseSkillMd(realisticSkill, 'realistic-drama'))
    // shotspec
    this.register(parseSkillMd(shotSpecSkill, 'shot-spec-expert'))
    this.register(parseSkillMd(fantasySkill, 'epic-fantasy-visual'))
    this.register(parseSkillMd(scifiSkill, 'scifi-worldbuilding'))
    // rendering
    this.register(parseSkillMd(defaultRenderSkill, 'default-render'))
  }

  // ========== 基础操作 ==========

  /** 注册技能 */
  register(skill: Skill): void {
    this.skills.set(skill.id, skill)
  }

  /** 注册 raw SKILL.md */
  registerRaw(id: string, markdown: string, source: 'builtin' | 'user' = 'user'): void {
    this.register(parseSkillMd(markdown, id, source))
  }

  /** 移除技能 */
  unregister(id: string): boolean {
    const skill = this.skills.get(id)
    if (skill) {
      // 清理分类激活状态
      const catActive = this.activeByCat.get(skill.meta.category)
      if (catActive === id) this.activeByCat.delete(skill.meta.category)
    }
    if (this.activeId === id) this.activeId = null
    return this.skills.delete(id)
  }

  /** L1: 列出所有技能（仅元数据，节省 token） */
  list(): Array<{ id: string; name: string; description: string; category: SkillCategory }> {
    return Array.from(this.skills.values()).map((s) => ({
      id: s.id,
      name: s.meta.name,
      description: s.meta.description,
      category: s.meta.category,
    }))
  }

  /** 获取完整技能 */
  get(id: string): Skill | undefined {
    return this.skills.get(id)
  }

  // ========== 分类查询 ==========

  /** 获取某分类下所有技能 */
  getByCategory(category: SkillCategory): Skill[] {
    return Array.from(this.skills.values()).filter((s) => s.meta.category === category)
  }

  /** 获取 bible 技能包的表单预设值 */
  getBiblePreset(skillId: string): BiblePreset | undefined {
    const skill = this.skills.get(skillId)
    return skill?.preset
  }

  // ========== 分类激活（多激活模式） ==========

  /** 按分类激活技能（每个分类可独立激活一个） */
  setActiveForCategory(category: SkillCategory, skillId: string | null): boolean {
    if (skillId === null) {
      this.activeByCat.set(category, null)
      return true
    }
    const skill = this.skills.get(skillId)
    if (!skill || skill.meta.category !== category) return false
    this.activeByCat.set(category, skillId)
    return true
  }

  /** 获取某分类激活的技能 */
  getActiveForCategory(category: SkillCategory): Skill | undefined {
    const id = this.activeByCat.get(category)
    if (!id) return undefined
    return this.skills.get(id)
  }

  /** 获取所有分类的激活状态 Map */
  getActiveCategoryMap(): Map<SkillCategory, string | null> {
    return new Map(this.activeByCat)
  }

  /** 聚合所有分类激活技能的指令（用于 system prompt） */
  getAllActiveInstructions(): string | null {
    const parts: string[] = []
    for (const [, skillId] of this.activeByCat) {
      if (!skillId) continue
      const skill = this.skills.get(skillId)
      if (skill) parts.push(skill.instructions)
    }
    return parts.length > 0 ? parts.join('\n\n---\n\n') : null
  }

  /** 清空所有分类激活状态 */
  clearAllActive(): void {
    this.activeByCat.clear()
    this.activeId = null
  }

  // ========== 向后兼容：单激活 API ==========

  /** 激活技能（兼容旧 API） */
  setActive(id: string): boolean {
    if (!this.skills.has(id)) return false
    this.activeId = id
    // 同步到分类激活
    const skill = this.skills.get(id)!
    this.activeByCat.set(skill.meta.category, id)
    return true
  }

  /** 获取当前激活的技能（兼容旧 API：优先返回 activeId） */
  getActive(): Skill | undefined {
    if (!this.activeId) return undefined
    return this.skills.get(this.activeId)
  }

  getActiveId(): string | null {
    return this.activeId
  }

  clearActive(): void {
    this.activeId = null
  }

  /** L2: 获取激活技能的指令（兼容旧 API） */
  getActiveInstructions(): string | null {
    // 优先返回聚合指令，fallback 到单激活
    const all = this.getAllActiveInstructions()
    if (all) return all
    const skill = this.getActive()
    return skill ? skill.instructions : null
  }

  // ========== 匹配 ==========

  /** 根据关键词匹配技能（简单子串匹配） */
  match(query: string): Array<{ skill: Skill; score: number }> {
    const q = query.toLowerCase()
    const results: Array<{ skill: Skill; score: number }> = []

    for (const skill of this.skills.values()) {
      const haystack = `${skill.meta.name} ${skill.meta.description}`.toLowerCase()
      const words = q.split(/\s+/).filter(Boolean)
      const hits = words.filter((w) => haystack.includes(w))
      if (hits.length > 0) {
        results.push({
          skill,
          score: hits.length / words.length,
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /** 自动匹配并激活最佳技能（兼容旧 API） */
  autoMatch(query: string): Skill | undefined {
    const results = this.match(query)
    if (results.length > 0 && results[0].score > 0) {
      this.setActive(results[0].skill.id)
      return results[0].skill
    }
    return undefined
  }

  /** 按分类自动匹配：在指定分类内查找最佳技能并激活 */
  autoMatchByCategory(category: SkillCategory, query: string): Skill | undefined {
    const catSkills = this.getByCategory(category)
    if (catSkills.length === 0) return undefined

    const q = query.toLowerCase()
    let best: { skill: Skill; score: number } | undefined

    for (const skill of catSkills) {
      const haystack = `${skill.meta.name} ${skill.meta.description}`.toLowerCase()
      const words = q.split(/\s+/).filter(Boolean)
      const hits = words.filter((w) => haystack.includes(w))
      const score = words.length > 0 ? hits.length / words.length : 0
      if (score > 0 && (!best || score > best.score)) {
        best = { skill, score }
      }
    }

    if (best) {
      this.setActiveForCategory(category, best.skill.id)
      return best.skill
    }
    return undefined
  }
}

// ---------------------------------------------------------------------------
// 单例导出
// ---------------------------------------------------------------------------

export const skillRegistry = new SkillRegistry()

// 兼容旧 orchestrator API
export const skillPackRegistry = {
  resolveStageSkill(
    _stageKey: string,
    defaultPrompt: string,
    defaultTemperature: number,
  ) {
    const instructions = skillRegistry.getActiveInstructions()
    return {
      systemPrompt: instructions ? `${defaultPrompt}\n\n${instructions}` : defaultPrompt,
      temperature: defaultTemperature,
      fewShots: [] as Array<{ input: string; output: string }>,
    }
  },
  resolveStage3Skill(defaultPrompt: string, defaultTemperature: number) {
    const instructions = skillRegistry.getActiveInstructions()
    return {
      systemPrompt: instructions ? `${defaultPrompt}\n\n${instructions}` : defaultPrompt,
      temperature: defaultTemperature,
      fewShots: [] as Array<{ input: string; output: string }>,
      preferredScales: undefined as string[] | undefined,
      preferredLighting: undefined as string[] | undefined,
      shotCountHint: undefined as [number, number] | undefined,
    }
  },
}
