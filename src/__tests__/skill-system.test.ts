/**
 * Skills 系统单元测试 — 5 分类 SKILL.md 范式
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { skillRegistry, parseSkillMd, skillPackRegistry } from '@/skills/registry'
import type { SkillCategory } from '@/skills/types'

// ---------------------------------------------------------------------------
// SKILL.md 解析
// ---------------------------------------------------------------------------

describe('SKILL.md 解析', () => {
  it('解析 YAML frontmatter（含 category）', () => {
    const skill = parseSkillMd(`---
name: test-skill
description: 这是一个测试技能
category: bible
---

# 测试技能

这里是指令内容。
`, 'test')

    expect(skill.meta.name).toBe('test-skill')
    expect(skill.meta.description).toBe('这是一个测试技能')
    expect(skill.meta.category).toBe('bible')
    expect(skill.instructions).toContain('# 测试技能')
    expect(skill.instructions).toContain('这里是指令内容')
  })

  it('无 frontmatter 时使用默认值', () => {
    const skill = parseSkillMd('# 纯内容\n\n无元数据', 'fallback-id')
    expect(skill.meta.name).toBe('fallback-id')
    expect(skill.meta.category).toBe('shotspec') // 默认 category
    expect(skill.instructions).toContain('# 纯内容')
  })
})

// ---------------------------------------------------------------------------
// 技能注册表
// ---------------------------------------------------------------------------

describe('技能注册表', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
    skillRegistry.clearAllActive()
  })

  it('有 10 个内置技能', () => {
    const list = skillRegistry.list()
    expect(list).toHaveLength(10)
  })

  it('每个分类至少有 1 个技能', () => {
    const categories: SkillCategory[] = ['bible', 'script', 'concept', 'shotspec', 'rendering']
    for (const cat of categories) {
      const skills = skillRegistry.getByCategory(cat)
      expect(skills.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('按分类查询返回正确数量', () => {
    expect(skillRegistry.getByCategory('bible')).toHaveLength(2)
    expect(skillRegistry.getByCategory('script')).toHaveLength(2)
    expect(skillRegistry.getByCategory('concept')).toHaveLength(2)
    expect(skillRegistry.getByCategory('shotspec')).toHaveLength(3)
    expect(skillRegistry.getByCategory('rendering')).toHaveLength(1)
  })

  it('列表包含 category 字段', () => {
    const list = skillRegistry.list()
    const item = list[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('name')
    expect(item).toHaveProperty('description')
    expect(item).toHaveProperty('category')
    // 不应包含 instructions
    expect(item).not.toHaveProperty('instructions')
  })

  it('获取完整技能包含 L2 instructions', () => {
    const skill = skillRegistry.get('suspense-cinematography')
    expect(skill).toBeDefined()
    expect(skill!.instructions).toContain('悬疑')
    expect(skill!.instructions.length).toBeGreaterThan(100)
  })

  it('注册和移除自定义技能', () => {
    skillRegistry.registerRaw('custom', `---
name: custom-skill
description: 自定义技能
category: bible
---
# Custom
自定义指令
`, 'user')

    expect(skillRegistry.get('custom')).toBeDefined()
    expect(skillRegistry.get('custom')!.source).toBe('user')
    expect(skillRegistry.get('custom')!.meta.category).toBe('bible')

    skillRegistry.unregister('custom')
    expect(skillRegistry.get('custom')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 分类激活（多激活模式）
// ---------------------------------------------------------------------------

describe('分类多激活', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
    skillRegistry.clearAllActive()
  })

  it('按分类独立激活', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('shotspec', 'scifi-worldbuilding')

    expect(skillRegistry.getActiveForCategory('bible')?.id).toBe('dark-gothic')
    expect(skillRegistry.getActiveForCategory('shotspec')?.id).toBe('scifi-worldbuilding')
    expect(skillRegistry.getActiveForCategory('concept')).toBeUndefined()
  })

  it('setActiveForCategory 拒绝跨分类激活', () => {
    const result = skillRegistry.setActiveForCategory('bible', 'shot-spec-expert')
    expect(result).toBe(false)
  })

  it('setActiveForCategory 允许清空（null）', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('bible', null)
    expect(skillRegistry.getActiveForCategory('bible')).toBeUndefined()
  })

  it('getAllActiveInstructions 聚合多分类', () => {
    expect(skillRegistry.getAllActiveInstructions()).toBeNull()

    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('shotspec', 'shot-spec-expert')

    const instructions = skillRegistry.getAllActiveInstructions()
    expect(instructions).not.toBeNull()
    expect(instructions).toContain('哥特')
    expect(instructions).toContain('ShotSpec')
    // 用分隔符拼接
    expect(instructions).toContain('---')
  })

  it('clearAllActive 清空所有分类', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('script', 'suspense-script')
    skillRegistry.clearAllActive()

    expect(skillRegistry.getActiveForCategory('bible')).toBeUndefined()
    expect(skillRegistry.getActiveForCategory('script')).toBeUndefined()
    expect(skillRegistry.getAllActiveInstructions()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 匹配
// ---------------------------------------------------------------------------

describe('技能匹配', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
    skillRegistry.clearAllActive()
  })

  it('全局关键词匹配', () => {
    const results = skillRegistry.match('悬疑 惊悚')
    expect(results.length).toBeGreaterThan(0)
    // 应该匹配到 suspense-cinematography 或 suspense-script
    expect(results[0].skill.id).toMatch(/suspense/)
  })

  it('autoMatch 激活最佳匹配', () => {
    const skill = skillRegistry.autoMatch('奇幻 魔法 史诗')
    expect(skill).toBeDefined()
    expect(skill!.id).toMatch(/fantasy/)
  })

  it('autoMatchByCategory 限定分类范围', () => {
    const skill = skillRegistry.autoMatchByCategory('bible', '哥特 黑暗 阴影')
    expect(skill).toBeDefined()
    expect(skill!.id).toBe('dark-gothic')
    expect(skillRegistry.getActiveForCategory('bible')?.id).toBe('dark-gothic')
  })

  it('autoMatchByCategory 不影响其他分类', () => {
    skillRegistry.setActiveForCategory('shotspec', 'shot-spec-expert')
    skillRegistry.autoMatchByCategory('bible', '哥特')
    expect(skillRegistry.getActiveForCategory('shotspec')?.id).toBe('shot-spec-expert')
  })

  it('无匹配时不激活', () => {
    const skill = skillRegistry.autoMatch('完全无关的关键词xyz')
    expect(skill).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 兼容层
// ---------------------------------------------------------------------------

describe('orchestrator 兼容层', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
    skillRegistry.clearAllActive()
  })

  it('无激活技能时返回默认 Prompt', () => {
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)
    expect(result.systemPrompt).toBe('默认Prompt')
    expect(result.temperature).toBe(0.8)
  })

  it('分类激活后指令追加到 Prompt', () => {
    skillRegistry.setActiveForCategory('concept', 'suspense-cinematography')
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)
    expect(result.systemPrompt).toContain('默认Prompt')
    expect(result.systemPrompt).toContain('悬疑')
    expect(result.systemPrompt.length).toBeGreaterThan('默认Prompt'.length)
  })

  it('多分类激活时聚合指令', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('shotspec', 'shot-spec-expert')
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)
    expect(result.systemPrompt).toContain('哥特')
    expect(result.systemPrompt).toContain('ShotSpec')
  })
})
