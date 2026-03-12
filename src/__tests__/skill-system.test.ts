/**
 * 工作流技能系统单元测试
 *
 * 覆盖：Markdown 解析、工作流执行、条件分支、错误处理、注册表匹配
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseSkillMarkdown, serializeSkillMarkdown } from '@/skills/parser'
import { WorkflowExecutor } from '@/skills/executor'
import { skillRegistry } from '@/skills/loader'
import type { WorkflowStep, WorkflowContext, StepResult } from '@/skills/schema'

// ---------------------------------------------------------------------------
// Markdown 解析
// ---------------------------------------------------------------------------

describe('Markdown 技能解析', () => {
  const sampleMd = `---
name: 测试技能
description: 用于测试的技能
tags: [测试, demo]
priority: 5
stages: [3, 4]
---

## 步骤 1: 构建 Prompt
<!-- action: transform -->
<!-- timeout: 5000 -->

将 ShotSpec 转换为生成 Prompt。

## 步骤 2: 生成图片
<!-- action: generate_image -->
<!-- onError: retry -->
<!-- retry: 2 -->

调用 RunningHub 工作流。

## 步骤 3: 条件保存
<!-- action: store -->
<!-- when: has:step-2.output -->

保存生成结果。
`

  it('解析 frontmatter', () => {
    const skill = parseSkillMarkdown(sampleMd, 'test-skill')
    expect(skill.meta.name).toBe('测试技能')
    expect(skill.meta.description).toBe('用于测试的技能')
    expect(skill.meta.tags).toEqual(['测试', 'demo'])
    expect(skill.meta.priority).toBe(5)
    expect(skill.meta.stages).toEqual([3, 4])
  })

  it('解析步骤', () => {
    const skill = parseSkillMarkdown(sampleMd, 'test-skill')
    expect(skill.steps).toHaveLength(3)

    expect(skill.steps[0].name).toBe('构建 Prompt')
    expect(skill.steps[0].action).toBe('transform')
    expect(skill.steps[0].timeoutMs).toBe(5000)

    expect(skill.steps[1].name).toBe('生成图片')
    expect(skill.steps[1].action).toBe('generate_image')
    expect(skill.steps[1].onError).toBe('retry')
    expect(skill.steps[1].retryCount).toBe(2)

    expect(skill.steps[2].name).toBe('条件保存')
    expect(skill.steps[2].action).toBe('store')
    expect(skill.steps[2].when).toBe('has:step-2.output')
  })

  it('步骤内容作为 params.content', () => {
    const skill = parseSkillMarkdown(sampleMd, 'test-skill')
    expect(skill.steps[0].params.content).toContain('ShotSpec')
  })

  it('无 frontmatter 的文件也能解析', () => {
    const bare = '## Step 1: Do something\n<!-- action: prompt -->\nHello'
    const skill = parseSkillMarkdown(bare, 'bare')
    expect(skill.meta.name).toBe('Unnamed Skill')
    expect(skill.steps).toHaveLength(1)
  })

  it('序列化后可被重新解析', () => {
    const original = parseSkillMarkdown(sampleMd, 'test-skill')
    const serialized = serializeSkillMarkdown(original)
    const reparsed = parseSkillMarkdown(serialized, 'test-skill-2')

    expect(reparsed.meta.name).toBe(original.meta.name)
    expect(reparsed.steps).toHaveLength(original.steps.length)
  })
})

// ---------------------------------------------------------------------------
// 工作流执行
// ---------------------------------------------------------------------------

describe('工作流执行器', () => {
  let executor: WorkflowExecutor

  beforeEach(() => {
    executor = new WorkflowExecutor()
  })

  it('按顺序执行所有步骤', async () => {
    const skill = parseSkillMarkdown(`---
name: Simple
description: test
---

## Step 1: First
<!-- action: prompt -->
hello

## Step 2: Second
<!-- action: store -->
save
`, 'simple')

    const result = await executor.execute(skill)
    expect(result.success).toBe(true)
    expect(result.steps).toHaveLength(2)
    expect(result.steps.every((s) => s.success)).toBe(true)
  })

  it('条件 when 为 false 时跳过步骤', async () => {
    const skill = parseSkillMarkdown(`---
name: Conditional
description: test
---

## Step 1: Always
<!-- action: prompt -->
always runs

## Step 2: Sometimes
<!-- action: store -->
<!-- when: has:nonexistent -->
conditional step
`, 'cond')

    const result = await executor.execute(skill)
    expect(result.success).toBe(true)
    expect(result.steps).toHaveLength(2)
    expect(result.steps[1].output).toBe('skipped (condition not met)')
  })

  it('自定义处理器被调用', async () => {
    const handler = vi.fn(async (step: WorkflowStep, ctx: WorkflowContext): Promise<StepResult> => ({
      stepId: step.id,
      success: true,
      output: { custom: true },
      duration: 10,
    }))

    executor.registerHandler('prompt', handler)

    const skill = parseSkillMarkdown(`---
name: Custom
description: test
---

## Step 1: Custom
<!-- action: prompt -->
test
`, 'custom')

    await executor.execute(skill)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('步骤输出存入 context.variables', async () => {
    const mockOutput = { imageUrl: 'https://example.com/img.png' }
    executor.registerHandler('generate_image', async (step) => ({
      stepId: step.id,
      success: true,
      output: mockOutput,
      duration: 100,
    }))

    const skill = parseSkillMarkdown(`---
name: Vars
description: test
---

## Step 1: Generate
<!-- action: generate_image -->
gen

## Step 2: Save
<!-- action: store -->
<!-- when: has:step-1.output -->
save
`, 'vars')

    const result = await executor.execute(skill)
    expect(result.success).toBe(true)
    // Step 2 should execute (condition met)
    expect(result.steps[1].output).not.toBe('skipped (condition not met)')
  })

  it('onError=abort 终止执行', async () => {
    executor.registerHandler('transform', async (step) => {
      throw new Error('Boom')
    })

    const skill = parseSkillMarkdown(`---
name: Error
description: test
---

## Step 1: Fail
<!-- action: transform -->
<!-- onError: abort -->
fail

## Step 2: Never
<!-- action: store -->
never reached
`, 'error')

    const result = await executor.execute(skill)
    expect(result.success).toBe(false)
    expect(result.steps).toHaveLength(1) // Step 2 never reached
  })

  it('进度回调被触发', async () => {
    const progress: string[] = []

    const skill = parseSkillMarkdown(`---
name: Progress
description: test
---

## Step 1: Alpha
<!-- action: prompt -->
a

## Step 2: Beta
<!-- action: prompt -->
b
`, 'progress')

    await executor.execute(skill, {}, (idx, total, name) => {
      progress.push(name)
    })

    expect(progress).toEqual(['Alpha', 'Beta'])
  })
})

// ---------------------------------------------------------------------------
// 技能注册表
// ---------------------------------------------------------------------------

describe('技能注册表', () => {
  beforeEach(() => {
    skillRegistry.clearActive()
  })

  it('有内置技能', () => {
    const list = skillRegistry.list()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.some((s) => s.id === 'suspense-workflow')).toBe(true)
    expect(list.some((s) => s.id === 'default-workflow')).toBe(true)
  })

  it('悬疑技能有 5 个步骤', () => {
    const skill = skillRegistry.get('suspense-workflow')
    expect(skill).toBeDefined()
    expect(skill!.steps).toHaveLength(5)
    expect(skill!.steps[0].action).toBe('transform')
    expect(skill!.steps[2].action).toBe('generate_image')
  })

  it('标签匹配返回排序结果', () => {
    const results = skillRegistry.matchByTags(['悬疑', '惊悚'])
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].skill.id).toBe('suspense-workflow')
  })

  it('autoMatch 激活匹配的技能', () => {
    const skill = skillRegistry.autoMatch(['悬疑'])
    expect(skill).toBeDefined()
    expect(skillRegistry.getActiveId()).toBe('suspense-workflow')
  })

  it('getSkillsForStage 过滤阶段', () => {
    const stage3Skills = skillRegistry.getSkillsForStage(3)
    expect(stage3Skills.length).toBeGreaterThan(0)
  })
})
