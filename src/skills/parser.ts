/**
 * Markdown 技能文件解析器
 *
 * 解析 YAML frontmatter + Markdown 步骤序列格式：
 *
 * ```markdown
 * ---
 * name: 悬疑分镜生成
 * description: 为悬疑类剧本生成带暗调光影的分镜
 * tags: [悬疑, 惊悚]
 * stages: [3]
 * ---
 *
 * ## 步骤 1: 构建悬疑 Prompt
 * <!-- action: prompt -->
 * <!-- timeout: 30000 -->
 *
 * 使用暗调光影风格构建分镜 Prompt...
 *
 * ## 步骤 2: 生成灰模
 * <!-- action: generate_image -->
 * ...
 * ```
 */

import type { Skill, SkillFrontmatter, WorkflowStep, StepAction } from './schema'

// ---------------------------------------------------------------------------
// YAML Frontmatter 解析
// ---------------------------------------------------------------------------

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/

function parseFrontmatter(content: string): { meta: SkillFrontmatter; body: string } {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) {
    return {
      meta: { name: 'Unnamed Skill', description: '' },
      body: content,
    }
  }

  const yamlBlock = match[1]
  const body = content.slice(match[0].length).trim()

  // 简易 YAML 解析（不依赖外部库）
  const meta: Record<string, unknown> = {}
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    let value: unknown = line.slice(colonIdx + 1).trim()

    // 数组解析: [a, b, c]
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s) => {
        const trimmed = s.trim()
        const num = Number(trimmed)
        return isNaN(num) ? trimmed : num
      })
    }
    // 数字解析
    else if (typeof value === 'string' && !isNaN(Number(value))) {
      value = Number(value)
    }

    meta[key] = value
  }

  return {
    meta: {
      name: (meta.name as string) || 'Unnamed Skill',
      description: (meta.description as string) || '',
      tags: (meta.tags as string[]) || [],
      priority: (meta.priority as number) || 0,
      stages: (meta.stages as number[]) || [],
    },
    body,
  }
}

// ---------------------------------------------------------------------------
// 步骤解析
// ---------------------------------------------------------------------------

const STEP_HEADING_REGEX = /^##\s+(.+)$/gm
const HTML_COMMENT_REGEX = /<!--\s*(\w+)\s*:\s*(.+?)\s*-->/g

function parseSteps(body: string): WorkflowStep[] {
  const steps: WorkflowStep[] = []
  const sections = body.split(/^##\s+/gm).filter(Boolean)

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const lines = section.split('\n')
    const title = lines[0].trim()
    const content = lines.slice(1).join('\n').trim()

    // 从 HTML 注释中提取参数
    const params: Record<string, unknown> = {}
    let action: StepAction = 'prompt'
    let timeoutMs: number | undefined
    let onError: 'skip' | 'retry' | 'abort' | undefined
    let retryCount: number | undefined
    let when: string | undefined

    const commentMatches = content.matchAll(HTML_COMMENT_REGEX)
    for (const match of commentMatches) {
      const [, key, value] = match
      switch (key) {
        case 'action':
          action = value as StepAction
          break
        case 'timeout':
          timeoutMs = parseInt(value)
          break
        case 'onError':
          onError = value as 'skip' | 'retry' | 'abort'
          break
        case 'retry':
          retryCount = parseInt(value)
          break
        case 'when':
          when = value
          break
        default:
          params[key] = value
      }
    }

    // 剩余 Markdown 内容作为 prompt / 指令体
    const cleanContent = content.replace(HTML_COMMENT_REGEX, '').trim()
    if (cleanContent) {
      params.content = cleanContent
    }

    steps.push({
      id: `step-${i + 1}`,
      name: title.replace(/^步骤\s*\d+\s*[:：]\s*/i, '').replace(/^Step\s*\d+\s*[:：]\s*/i, ''),
      action,
      params,
      timeoutMs,
      onError,
      retryCount,
      when,
    })
  }

  return steps
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/**
 * 解析 Markdown 技能文件
 */
export function parseSkillMarkdown(
  content: string,
  id: string,
  source: 'builtin' | 'user' = 'builtin',
): Skill {
  const { meta, body } = parseFrontmatter(content)
  const steps = parseSteps(body)

  return {
    id,
    meta,
    rawContent: content,
    steps,
    source,
    loadedAt: new Date(),
  }
}

/**
 * 将技能序列化回 Markdown
 */
export function serializeSkillMarkdown(skill: Skill): string {
  const lines: string[] = [
    '---',
    `name: ${skill.meta.name}`,
    `description: ${skill.meta.description}`,
  ]

  if (skill.meta.tags?.length) {
    lines.push(`tags: [${skill.meta.tags.join(', ')}]`)
  }
  if (skill.meta.priority) {
    lines.push(`priority: ${skill.meta.priority}`)
  }
  if (skill.meta.stages?.length) {
    lines.push(`stages: [${skill.meta.stages.join(', ')}]`)
  }
  lines.push('---', '')

  for (const step of skill.steps) {
    lines.push(`## 步骤: ${step.name}`)
    lines.push(`<!-- action: ${step.action} -->`)
    if (step.timeoutMs) lines.push(`<!-- timeout: ${step.timeoutMs} -->`)
    if (step.onError) lines.push(`<!-- onError: ${step.onError} -->`)
    if (step.retryCount) lines.push(`<!-- retry: ${step.retryCount} -->`)
    if (step.when) lines.push(`<!-- when: ${step.when} -->`)
    lines.push('')
    if (step.params.content) {
      lines.push(step.params.content as string)
    }
    lines.push('')
  }

  return lines.join('\n')
}
