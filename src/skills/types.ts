/**
 * Skills 类型定义 — 对齐 Claude 官方 SKILL.md 范式
 *
 * 极简设计：每个 Skill = SKILL.md (YAML frontmatter + Markdown 指令)
 * 5 分类：bible / script / concept / shotspec / rendering
 */

/** 5 分类枚举 */
export type SkillCategory = 'bible' | 'script' | 'concept' | 'shotspec' | 'rendering'

/** 分类元信息 */
export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; stage: number; description: string }> = {
  bible:     { label: '项目圣经', stage: 0, description: '世界观、基调与禁忌规则' },
  script:    { label: '剧本扩写', stage: 1, description: '按类型定制扩写策略' },
  concept:   { label: '概念设定', stage: 2, description: '角色/场景一致性描述风格' },
  shotspec:  { label: '分镜设计', stage: 3, description: '景别/光位/构图偏好' },
  rendering: { label: '渲染出图', stage: 4, description: '灰模/渲染工作流参数' },
}

/** L1: 元数据（始终加载，~100 tokens） */
export interface SkillMeta {
  name: string
  description: string
  /** 所属分类 */
  category: SkillCategory
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
