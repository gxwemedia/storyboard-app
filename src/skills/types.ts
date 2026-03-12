/**
 * Skills 类型定义 — 对齐 Claude 官方 SKILL.md 范式
 *
 * 极简设计：每个 Skill = SKILL.md (YAML frontmatter + Markdown 指令)
 */

/** L1: 元数据（始终加载，~100 tokens） */
export interface SkillMeta {
  name: string
  description: string
}

/** L1 + L2: 完整技能 */
export interface Skill {
  /** 技能 ID（= 目录名） */
  id: string
  /** 元数据 */
  meta: SkillMeta
  /** L2: 指令正文（SKILL.md 的 Markdown body） */
  instructions: string
  /** 来源 */
  source: 'builtin' | 'user'
}
