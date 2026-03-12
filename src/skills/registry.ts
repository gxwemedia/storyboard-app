/**
 * Skills 注册表 — 发现、匹配、加载
 *
 * 对齐 Claude 官方 `SKILL.md` 范式：
 * - 从 SKILL.md 文件中解析 YAML frontmatter 获取元数据
 * - 通过 description 关键词匹配激活技能
 * - 技能指令追加到 orchestrator 的 system prompt
 */

import type { Skill, SkillMeta } from './types'

// 内置 SKILL.md（通过 Vite ?raw import）
import suspenseSkill from './packs/suspense-cinematography/SKILL.md?raw'
import scifiSkill from './packs/scifi-worldbuilding/SKILL.md?raw'
import fantasySkill from './packs/epic-fantasy-visual/SKILL.md?raw'
import realisticSkill from './packs/realistic-drama/SKILL.md?raw'
import shotSpecSkill from './packs/shot-spec-expert/SKILL.md?raw'

// ---------------------------------------------------------------------------
// SKILL.md 解析
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/

/** 解析 SKILL.md → Skill */
export function parseSkillMd(raw: string, id: string, source: 'builtin' | 'user' = 'builtin'): Skill {
  const match = raw.match(FRONTMATTER_RE)
  let meta: SkillMeta = { name: id, description: '' }
  let instructions = raw

  if (match) {
    // 简易 YAML 解析
    const yamlBlock = match[1]
    const parsed: Record<string, string> = {}
    for (const line of yamlBlock.split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      parsed[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
    }
    meta = {
      name: parsed.name || id,
      description: parsed.description || '',
    }
    instructions = raw.slice(match[0].length).trim()
  }

  return { id, meta, instructions, source }
}

// ---------------------------------------------------------------------------
// 注册表
// ---------------------------------------------------------------------------

class SkillRegistry {
  private skills = new Map<string, Skill>()
  private activeId: string | null = null

  constructor() {
    // 注册内置技能
    this.register(parseSkillMd(suspenseSkill, 'suspense-cinematography'))
    this.register(parseSkillMd(scifiSkill, 'scifi-worldbuilding'))
    this.register(parseSkillMd(fantasySkill, 'epic-fantasy-visual'))
    this.register(parseSkillMd(realisticSkill, 'realistic-drama'))
    this.register(parseSkillMd(shotSpecSkill, 'shot-spec-expert'))
  }

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
    if (this.activeId === id) this.activeId = null
    return this.skills.delete(id)
  }

  /** L1: 列出所有技能（仅元数据，节省 token） */
  list(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.skills.values()).map((s) => ({
      id: s.id,
      name: s.meta.name,
      description: s.meta.description,
    }))
  }

  /** 获取完整技能 */
  get(id: string): Skill | undefined {
    return this.skills.get(id)
  }

  /** 激活技能 */
  setActive(id: string): boolean {
    if (!this.skills.has(id)) return false
    this.activeId = id
    return true
  }

  /** 获取当前激活的技能 */
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

  /** L2: 获取激活技能的指令（用于追加到 system prompt） */
  getActiveInstructions(): string | null {
    const skill = this.getActive()
    return skill ? skill.instructions : null
  }

  // --------
  // 匹配
  // --------

  /** 根据关键词匹配技能（简单子串匹配） */
  match(query: string): Array<{ skill: Skill; score: number }> {
    const q = query.toLowerCase()
    const results: Array<{ skill: Skill; score: number }> = []

    for (const skill of this.skills.values()) {
      const haystack = `${skill.meta.name} ${skill.meta.description}`.toLowerCase()
      // 计算关键词命中数
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

  /** 自动匹配并激活最佳技能 */
  autoMatch(query: string): Skill | undefined {
    const results = this.match(query)
    if (results.length > 0 && results[0].score > 0) {
      this.setActive(results[0].skill.id)
      return results[0].skill
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
