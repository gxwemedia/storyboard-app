/**
 * Skills 系统单元测试 — Claude SKILL.md 范式
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { skillRegistry, parseSkillMd, skillPackRegistry } from '@/skills/registry'

// ---------------------------------------------------------------------------
// SKILL.md 解析
// ---------------------------------------------------------------------------

describe('SKILL.md 解析', () => {
  it('解析 YAML frontmatter', () => {
    const skill = parseSkillMd(`---
name: test-skill
description: 这是一个测试技能
---

# 测试技能

这里是指令内容。
`, 'test')

    expect(skill.meta.name).toBe('test-skill')
    expect(skill.meta.description).toBe('这是一个测试技能')
    expect(skill.instructions).toContain('# 测试技能')
    expect(skill.instructions).toContain('这里是指令内容')
  })

  it('无 frontmatter 时使用 id 作为 name', () => {
    const skill = parseSkillMd('# 纯内容\n\n无元数据', 'fallback-id')
    expect(skill.meta.name).toBe('fallback-id')
    expect(skill.instructions).toContain('# 纯内容')
  })
})

// ---------------------------------------------------------------------------
// 技能注册表
// ---------------------------------------------------------------------------

describe('技能注册表', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
  })

  it('有 5 个内置技能', () => {
    const list = skillRegistry.list()
    expect(list).toHaveLength(5)
    expect(list.map((s) => s.id)).toContain('suspense-cinematography')
    expect(list.map((s) => s.id)).toContain('scifi-worldbuilding')
    expect(list.map((s) => s.id)).toContain('epic-fantasy-visual')
    expect(list.map((s) => s.id)).toContain('realistic-drama')
    expect(list.map((s) => s.id)).toContain('shot-spec-expert')
  })

  it('列表仅返回 L1 元数据（id + name + description）', () => {
    const list = skillRegistry.list()
    const item = list[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('name')
    expect(item).toHaveProperty('description')
    // 不应包含 instructions（L2 按需加载）
    expect(item).not.toHaveProperty('instructions')
  })

  it('获取完整技能包含 L2 instructions', () => {
    const skill = skillRegistry.get('suspense-cinematography')
    expect(skill).toBeDefined()
    expect(skill!.instructions).toContain('悬疑')
    expect(skill!.instructions.length).toBeGreaterThan(100)
  })

  it('激活/取消技能', () => {
    expect(skillRegistry.getActive()).toBeUndefined()

    skillRegistry.setActive('scifi-worldbuilding')
    expect(skillRegistry.getActiveId()).toBe('scifi-worldbuilding')
    expect(skillRegistry.getActive()?.meta.name).toBe('scifi-worldbuilding')

    skillRegistry.clearActive()
    expect(skillRegistry.getActive()).toBeUndefined()
  })

  it('getActiveInstructions 返回 L2 指令', () => {
    expect(skillRegistry.getActiveInstructions()).toBeNull()

    skillRegistry.setActive('shot-spec-expert')
    const instructions = skillRegistry.getActiveInstructions()
    expect(instructions).not.toBeNull()
    expect(instructions).toContain('ShotSpec')
  })

  it('注册和移除自定义技能', () => {
    skillRegistry.registerRaw('custom', `---
name: custom-skill
description: 自定义技能
---
# Custom
自定义指令
`, 'user')

    expect(skillRegistry.get('custom')).toBeDefined()
    expect(skillRegistry.get('custom')!.source).toBe('user')

    skillRegistry.unregister('custom')
    expect(skillRegistry.get('custom')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 匹配
// ---------------------------------------------------------------------------

describe('技能匹配', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
  })

  it('关键词匹配到悬疑技能', () => {
    const results = skillRegistry.match('悬疑 惊悚')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].skill.id).toBe('suspense-cinematography')
  })

  it('关键词匹配到科幻技能', () => {
    const results = skillRegistry.match('科幻 赛博朋克')
    expect(results[0].skill.id).toBe('scifi-worldbuilding')
  })

  it('autoMatch 激活最佳匹配', () => {
    const skill = skillRegistry.autoMatch('奇幻 魔法 史诗')
    expect(skill).toBeDefined()
    expect(skill!.id).toBe('epic-fantasy-visual')
    expect(skillRegistry.getActiveId()).toBe('epic-fantasy-visual')
  })

  it('无匹配时不激活', () => {
    const skill = skillRegistry.autoMatch('完全无关的关键词xyz')
    expect(skill).toBeUndefined()
    expect(skillRegistry.getActiveId()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 兼容层
// ---------------------------------------------------------------------------

describe('orchestrator 兼容层', () => {

  beforeEach(() => {
    skillRegistry.clearActive()
  })

  it('无激活技能时返回默认 Prompt', () => {
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)
    expect(result.systemPrompt).toBe('默认Prompt')
    expect(result.temperature).toBe(0.8)
  })

  it('激活技能后追加指令到 Prompt', () => {
    skillRegistry.setActive('suspense-cinematography')
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)
    expect(result.systemPrompt).toContain('默认Prompt')
    expect(result.systemPrompt).toContain('悬疑')
    expect(result.systemPrompt.length).toBeGreaterThan('默认Prompt'.length)
  })
})
