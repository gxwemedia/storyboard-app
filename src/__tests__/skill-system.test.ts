/**
 * Skills 系统单元测试（5 分类 + SKILL.md 范式）
 *
 * 覆盖：注册表、分类查询、多激活模式、匹配、bible 预设、兼容层
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { skillRegistry, parseSkillMd, skillPackRegistry } from '@/skills'
import type { SkillCategory } from '@/skills'

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function resetActiveState() {
  skillRegistry.clearAllActive()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SKILL.md 解析', () => {
  it('解析标准 frontmatter', () => {
    const raw = `---
name: 测试技能
description: 用于测试
category: concept
---

# 指令正文

这是指令内容。
`
    const skill = parseSkillMd(raw, 'test-skill')
    expect(skill.meta.name).toBe('测试技能')
    expect(skill.meta.description).toBe('用于测试')
    expect(skill.meta.category).toBe('concept')
    expect(skill.instructions).toContain('指令正文')
    expect(skill.instructions).toContain('这是指令内容')
  })

  it('解析 bible 预设值', () => {
    const raw = `---
name: 暗黑哥特
description: 哥特风格
category: bible
preset_style: 暗黑哥特
preset_colorScript: 冷色调
preset_forbidden: 禁止卡通
---

指令正文
`
    const skill = parseSkillMd(raw, 'test-bible')
    expect(skill.preset).toBeDefined()
    expect(skill.preset!.style).toBe('暗黑哥特')
    expect(skill.preset!.colorScript).toBe('冷色调')
    expect(skill.preset!.forbidden).toBe('禁止卡通')
  })

  it('无 frontmatter 也能解析', () => {
    const raw = '# 纯 Markdown\n\n一些指令。'
    const skill = parseSkillMd(raw, 'bare')
    expect(skill.meta.name).toBe('bare')
    expect(skill.instructions).toContain('纯 Markdown')
  })
})

describe('注册表 — 基础操作', () => {
  it('有 11 个内置技能', () => {
    const list = skillRegistry.list()
    expect(list.length).toBe(11)
  })

  it('按 ID 获取技能', () => {
    const skill = skillRegistry.get('suspense-cinematography')
    expect(skill).toBeDefined()
    expect(skill!.meta.category).toBe('concept')
  })

  it('注册用户自定义技能', () => {
    const raw = `---
name: 用户自定义
description: 测试
category: shotspec
---

自定义指令
`
    skillRegistry.registerRaw('custom-test', raw)
    expect(skillRegistry.get('custom-test')).toBeDefined()
    // 清理
    skillRegistry.unregister('custom-test')
    expect(skillRegistry.get('custom-test')).toBeUndefined()
  })
})

describe('注册表 — 分类查询', () => {
  it('bible 分类有 2 个技能', () => {
    const bibleSkills = skillRegistry.getByCategory('bible')
    expect(bibleSkills).toHaveLength(2)
  })

  it('script 分类有 2 个技能', () => {
    const scriptSkills = skillRegistry.getByCategory('script')
    expect(scriptSkills).toHaveLength(2)
  })

  it('concept 分类有 3 个技能', () => {
    const conceptSkills = skillRegistry.getByCategory('concept')
    expect(conceptSkills).toHaveLength(3)
    expect(conceptSkills.some((s) => s.id === 'character-design-sheet')).toBe(true)
  })

  it('shotspec 分类有 3 个技能', () => {
    const shotspecSkills = skillRegistry.getByCategory('shotspec')
    expect(shotspecSkills).toHaveLength(3)
  })

  it('rendering 分类有 1 个技能', () => {
    const renderingSkills = skillRegistry.getByCategory('rendering')
    expect(renderingSkills).toHaveLength(1)
  })
})

describe('注册表 — 多激活模式', () => {
  beforeEach(resetActiveState)

  it('每个分类独立激活', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('shotspec', 'shot-spec-expert')

    expect(skillRegistry.getActiveForCategory('bible')?.id).toBe('dark-gothic')
    expect(skillRegistry.getActiveForCategory('shotspec')?.id).toBe('shot-spec-expert')
    expect(skillRegistry.getActiveForCategory('concept')).toBeUndefined()
  })

  it('清空分类激活', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('bible', null)
    expect(skillRegistry.getActiveForCategory('bible')).toBeUndefined()
  })

  it('跨分类激活不受干扰', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('bible', 'bright-fairy-tale')
    expect(skillRegistry.getActiveForCategory('bible')?.id).toBe('bright-fairy-tale')
  })

  it('getAllActiveInstructions 聚合所有激活技能', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('shotspec', 'shot-spec-expert')

    const instructions = skillRegistry.getAllActiveInstructions()
    expect(instructions).toBeTruthy()
    expect(instructions!.includes('---')).toBe(true) // 分隔符
  })

  it('clearAllActive 清空全部', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    skillRegistry.setActiveForCategory('shotspec', 'shot-spec-expert')
    skillRegistry.clearAllActive()

    expect(skillRegistry.getActiveForCategory('bible')).toBeUndefined()
    expect(skillRegistry.getActiveForCategory('shotspec')).toBeUndefined()
  })
})

describe('注册表 — 匹配', () => {
  beforeEach(resetActiveState)

  it('关键词匹配返回排序结果', () => {
    const results = skillRegistry.match('悬疑 推理')
    expect(results.length).toBeGreaterThan(0)
  })

  it('按分类匹配并激活', () => {
    const skill = skillRegistry.autoMatchByCategory('concept', '悬疑')
    expect(skill).toBeDefined()
    expect(skill!.meta.category).toBe('concept')
    expect(skillRegistry.getActiveForCategory('concept')?.id).toBe(skill!.id)
  })

  it('无匹配不激活', () => {
    const skill = skillRegistry.autoMatchByCategory('shotspec', '完全无关')
    expect(skill).toBeUndefined()
  })
})

describe('注册表 — bible 预设', () => {
  it('dark-gothic 有预设值', () => {
    const preset = skillRegistry.getBiblePreset('dark-gothic')
    expect(preset).toBeDefined()
    expect(preset!.style).toBeTruthy()
  })

  it('non-bible 技能无预设', () => {
    const preset = skillRegistry.getBiblePreset('suspense-cinematography')
    expect(preset).toBeUndefined()
  })
})

describe('注册表 — 兼容层', () => {
  beforeEach(resetActiveState)

  it('resolveStageSkill 默认返回原始 Prompt', () => {
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认 Prompt', 0.8)
    expect(result.systemPrompt).toBe('默认 Prompt')
    expect(result.temperature).toBe(0.8)
  })

  it('resolveStageSkill 激活后追加指令', () => {
    skillRegistry.setActiveForCategory('bible', 'dark-gothic')
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认 Prompt', 0.8)
    expect(result.systemPrompt.length).toBeGreaterThan('默认 Prompt'.length)
  })
})
