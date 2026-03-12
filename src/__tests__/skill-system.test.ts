/**
 * 认知技能系统单元测试
 *
 * 覆盖：技能包加载、标签匹配、Prompt 合并策略
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { skillPackRegistry } from '@/skills/loader'
import { matchByTags, matchByScript, autoMatch } from '@/skills/matcher'
import type { SkillPack } from '@/skills/schema'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('技能包加载器', () => {
  beforeEach(() => {
    skillPackRegistry.clearActive()
  })

  it('内置 4 个技能包', () => {
    const packs = skillPackRegistry.list()
    expect(packs).toHaveLength(4)
    expect(packs.map((p) => p.id)).toContain('suspense-v1')
    expect(packs.map((p) => p.id)).toContain('scifi-v1')
    expect(packs.map((p) => p.id)).toContain('epic-fantasy-v1')
    expect(packs.map((p) => p.id)).toContain('realistic-v1')
  })

  it('根据 ID 获取技能包', () => {
    const pack = skillPackRegistry.get('suspense-v1')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('悬疑惊悚')
    expect(pack!.tags).toContain('悬疑')
  })

  it('激活/取消技能包', () => {
    expect(skillPackRegistry.getActive()).toBeUndefined()

    skillPackRegistry.setActive('scifi-v1')
    expect(skillPackRegistry.getActiveId()).toBe('scifi-v1')
    expect(skillPackRegistry.getActive()?.name).toBe('科幻未来')

    skillPackRegistry.clearActive()
    expect(skillPackRegistry.getActive()).toBeUndefined()
  })

  it('注册自定义技能包', () => {
    const custom: SkillPack = {
      id: 'custom-test',
      name: '测试技能包',
      version: '0.1.0',
      description: '用于测试',
      tags: ['测试'],
      stages: {},
    }
    skillPackRegistry.register(custom)
    expect(skillPackRegistry.get('custom-test')).toBeDefined()

    // 清理
    skillPackRegistry.unregister('custom-test')
    expect(skillPackRegistry.get('custom-test')).toBeUndefined()
  })
})

describe('Prompt 合并策略', () => {
  beforeEach(() => {
    skillPackRegistry.clearActive()
  })

  it('无激活技能包时返回默认 Prompt', () => {
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)
    expect(result.systemPrompt).toBe('默认Prompt')
    expect(result.temperature).toBe(0.8)
    expect(result.fewShots).toHaveLength(0)
  })

  it('激活技能包后追加 Prompt', () => {
    skillPackRegistry.setActive('suspense-v1')
    const result = skillPackRegistry.resolveStageSkill('stage1', '默认Prompt', 0.8)

    // systemPromptAppend 模式：默认 + 追加
    expect(result.systemPrompt).toContain('默认Prompt')
    expect(result.systemPrompt).toContain('悬疑类剧本扩写')
    // 温度被覆盖
    expect(result.temperature).toBe(0.75)
  })

  it('Stage 3 解析含偏好参数', () => {
    skillPackRegistry.setActive('suspense-v1')
    const result = skillPackRegistry.resolveStage3Skill('默认Stage3', 0.5)

    expect(result.preferredScales).toContain('CU')
    expect(result.preferredLighting).toContain('Split')
    expect(result.shotCountHint).toEqual([4, 6])
  })
})

describe('技能包匹配器', () => {
  beforeEach(() => {
    skillPackRegistry.clearActive()
  })

  it('标签匹配返回有序结果', () => {
    const results = matchByTags(['悬疑', '惊悚'])
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].pack.id).toBe('suspense-v1')
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('科幻标签匹配到 scifi 包', () => {
    const results = matchByTags(['科幻', '太空'])
    expect(results[0].pack.id).toBe('scifi-v1')
  })

  it('文本匹配从剧本中提取关键词', () => {
    const script = '在一个赛博朋克世界中，主角驾驶飞船穿越太空...'
    const results = matchByScript(script)
    expect(results.length).toBeGreaterThan(0)
    // 应匹配到科幻包
    const scifiResult = results.find((r) => r.pack.id === 'scifi-v1')
    expect(scifiResult).toBeDefined()
  })

  it('autoMatch 自动激活最佳匹配', () => {
    const pack = autoMatch({ tags: ['奇幻', '魔法', '骑士'] })
    expect(pack).toBeDefined()
    expect(pack!.id).toBe('epic-fantasy-v1')
    expect(skillPackRegistry.getActiveId()).toBe('epic-fantasy-v1')
  })

  it('无匹配时不激活', () => {
    const pack = autoMatch({ tags: ['完全无关的标签'] })
    expect(pack).toBeUndefined()
    expect(skillPackRegistry.getActiveId()).toBeNull()
  })
})
