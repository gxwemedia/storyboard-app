/**
 * Stage Agents — 5 个阶段的 Agent 实现
 *
 * 每个 Agent 从 orchestrator.ts 中已有的逻辑提取而来，
 * 增加了 AgentContext 感知（技能指令注入、上下文传递、结构化结果）。
 * 不引入新的外部依赖。
 */

import type { StageAgent, AgentContext, AgentResult } from './types'
import type { AiMessage } from '@/services/ai-client'
import { sendPrompt, sendImagePrompt } from '@/services/ai-client'
import { aiShotSpecArraySchema, inferStructuredFields } from '@/schemas/shot-spec'
import { generateGrayModel, generateGrayModelMock, type GrayModelStyle } from '@/services/sdxl-client'
import { parseShotSpecResponse } from '@/services/orchestrator'

// ═══════════════════════════════════════════════════════════════════════════
// Agent 0 — 圣经 & 剧本扩写
// ═══════════════════════════════════════════════════════════════════════════

const BASE_PROMPT_STAGE0 = `你是一位顶级影视编剧兼情绪分析师，服务于工业级分镜制片系统。

你的任务：根据导演提供的"项目视觉圣经"和"原始剧本大纲"，对大纲进行深度扩写。

扩写要求：
1. 补全角色心理状态与情绪波动曲线
2. 强化环境氛围描写（光流、空气质感、声音景观）
3. 设计情绪钩子（Hooks），标注戏剧张力的起伏节点
4. 保持扩写风格与视觉圣经中定义的基调严格一致
5. 禁止偏离圣经中声明的禁忌规则

输出格式：直接输出扩写后的完整文本，不要包裹任何 markdown 代码块或 JSON。使用中文。
字数控制在 300-600 字之间。`

export const bibleScriptAgent: StageAgent = {
  name: '圣经 & 剧本扩写 Agent',
  stageId: 0,
  description: '锁定项目基调并完成剧本深度扩写',
  tools: [], // 未来可扩展：风格分析工具、情绪弧线工具

  buildSystemPrompt(ctx) {
    let prompt = BASE_PROMPT_STAGE0
    if (ctx.skillInstructions) {
      prompt += `\n\n【技能包补充指令】\n${ctx.skillInstructions}`
    }
    return prompt
  },

  async execute(ctx): Promise<AgentResult> {
    const logs: AgentResult['logs'] = []
    const { bible, rawScript } = ctx.groundTruth

    if (!rawScript.trim()) {
      return {
        success: false,
        output: {},
        logs: [{ level: 'error', message: '原始剧本为空，无法扩写' }],
        durationMs: 0,
      }
    }

    logs.push({ level: 'info', message: `开始剧本扩写，原始文本 ${rawScript.length} 字` })

    const messages: AiMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(ctx) },
      {
        role: 'user',
        content: [
          '【项目视觉圣经 (Ground Truth Level 0)】',
          `· 风格锁定：${bible.style}`,
          `· 色彩脚本：${bible.colorScript}`,
          `· 禁忌规则：${bible.forbidden}`,
          '',
          '【原始剧本大纲】',
          rawScript,
          '',
          '请对以上大纲进行深度扩写。',
        ].join('\n'),
      },
    ]

    const response = await sendPrompt(messages, { temperature: 0.8 })
    const expandedScript = response.content.trim()

    logs.push({ level: 'success', message: `扩写完成（${expandedScript.length} 字）` })

    return {
      success: true,
      output: { expandedScript },
      logs,
      durationMs: 0,
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent 1 — 概念设定
// ═══════════════════════════════════════════════════════════════════════════

const BASE_PROMPT_CONCEPT_CHAR = `你是一位专业的角色视觉设定师，服务于工业级分镜制片管线。
根据"项目视觉圣经"和"角色基本信息"，生成一段详细的角色外观一致性描述（200-400字连贯中文）。`

const BASE_PROMPT_CONCEPT_SCENE = `你是一位专业的场景视觉设计师，服务于工业级分镜制片管线。
根据"项目视觉圣经"和"场景基本信息"，生成一段详细的场景环境一致性描述（200-400字连贯中文）。`

export const conceptAgent: StageAgent = {
  name: '概念设定 Agent',
  stageId: 1,
  description: '角色/场景一致性描述与概念图生成',
  tools: [
    {
      name: 'generate_consistency',
      description: '生成角色/场景一致性描述',
      execute: async () => ({}), // 占位，实际逻辑在 execute 中
    },
    {
      name: 'generate_image',
      description: '生成概念设定图',
      execute: async () => ({}),
    },
  ],

  buildSystemPrompt(ctx) {
    const subType = ctx.variables.subType as string || 'character'
    let prompt = subType === 'scene' ? BASE_PROMPT_CONCEPT_SCENE : BASE_PROMPT_CONCEPT_CHAR
    if (ctx.skillInstructions) {
      prompt += `\n\n【技能包补充指令】\n${ctx.skillInstructions}`
    }
    return prompt
  },

  async execute(ctx): Promise<AgentResult> {
    const logs: AgentResult['logs'] = []
    const action = ctx.variables.action as string || 'consistency'
    const subType = ctx.variables.subType as string || 'character'
    const targetName = ctx.variables.targetName as string || ''
    const targetDesc = ctx.variables.targetDescription as string || ''

    if (action === 'consistency') {
      logs.push({ level: 'info', message: `为 ${subType === 'character' ? '角色' : '场景'}「${targetName}」生成一致性描述` })

      const messages: AiMessage[] = [
        { role: 'system', content: this.buildSystemPrompt(ctx) },
        {
          role: 'user',
          content: [
            '【项目视觉圣经 (Ground Truth Level 0)】',
            `· 风格锁定：${ctx.groundTruth.bible.style}`,
            `· 色彩脚本：${ctx.groundTruth.bible.colorScript}`,
            `· 禁忌规则：${ctx.groundTruth.bible.forbidden}`,
            '',
            `【${subType === 'character' ? '角色' : '场景'}信息】`,
            `· 名称：${targetName}`,
            `· 描述：${targetDesc}`,
            '',
            `请为「${targetName}」生成一致性视觉描述。`,
          ].join('\n'),
        },
      ]

      const response = await sendPrompt(messages, { temperature: 0.7 })
      logs.push({ level: 'success', message: '一致性描述生成完成' })

      return { success: true, output: { consistencyPrompt: response.content.trim() }, logs, durationMs: 0 }
    }

    if (action === 'image') {
      logs.push({ level: 'info', message: `为「${targetName}」生成概念设定图` })
      const consistencyPrompt = ctx.variables.consistencyPrompt as string || ''
      const aspectRatio = subType === 'character' ? '9:16' : '16:9'

      const prompt = [
        `请为以下${subType === 'character' ? '角色' : '场景'}生成一张高质量概念设定图：`,
        `名称：${targetName}`,
        `描述：${targetDesc}`,
        `风格要求：${ctx.groundTruth.bible.style}`,
        consistencyPrompt ? `一致性参考：${consistencyPrompt}` : '',
      ].filter(Boolean).join('\n')

      const response = await sendImagePrompt(prompt, { timeoutMs: 120_000, aspectRatio, imageSize: '1K' })
      if (response.imageUrls?.length) {
        logs.push({ level: 'success', message: '概念图生成完成' })
        return { success: true, output: { imageUrl: response.imageUrls[0] }, logs, durationMs: 0 }
      }
      return { success: false, output: {}, logs: [{ level: 'error', message: '未返回图片' }], durationMs: 0 }
    }

    return { success: false, output: {}, logs: [{ level: 'error', message: `未知 action: ${action}` }], durationMs: 0 }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent 2 — 分镜脚本
// ═══════════════════════════════════════════════════════════════════════════

const BASE_PROMPT_SHOTSPEC = `你是一位专业的分镜导演兼摄影指导，服务于工业级分镜制片管线。
将剧本拆解为独立的分镜卡片（Shot），每张卡片包含精确的专业参数。
输出严格 JSON 数组，3-6 个镜头，scale/focalLength/keyLight 从枚举值选择。`

export const shotSpecAgent: StageAgent = {
  name: '分镜脚本 Agent',
  stageId: 2,
  description: '将扩写剧本拆解为结构化 ShotSpec JSON',
  tools: [],

  buildSystemPrompt(ctx) {
    let prompt = BASE_PROMPT_SHOTSPEC
    if (ctx.skillInstructions) {
      prompt += `\n\n【技能包补充指令】\n${ctx.skillInstructions}`
    }
    return prompt
  },

  async execute(ctx): Promise<AgentResult> {
    const logs: AgentResult['logs'] = []
    const { bible, expandedScript, characters, scenes } = ctx.groundTruth

    const charContext = characters
      .filter(c => c.locked && c.consistencyPrompt)
      .map(c => `[角色: ${c.name}] ${c.consistencyPrompt}`)
      .join('\n')
    const sceneContext = scenes
      .filter(s => s.locked && s.consistencyPrompt)
      .map(s => `[场景: ${s.name}] ${s.consistencyPrompt}`)
      .join('\n')

    logs.push({ level: 'info', message: '开始分镜 JSON 生成' })

    const messages: AiMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(ctx) },
      {
        role: 'user',
        content: [
          '【项目视觉圣经】',
          `· 风格：${bible.style}`,
          `· 色彩：${bible.colorScript}`,
          `· 禁忌：${bible.forbidden}`,
          '',
          '【扩写剧本】',
          expandedScript,
          '',
          '【概念设定锁定】',
          [charContext, sceneContext].filter(Boolean).join('\n') || '未锁定',
          '',
          '请拆解为 ShotSpec JSON 数组。',
        ].join('\n'),
      },
    ]

    const response = await sendPrompt(messages, { temperature: 0.5, jsonMode: true })
    const shotSpecs = parseShotSpecResponse(response.content)

    logs.push({ level: 'success', message: `分镜生成完成（${shotSpecs.length} 个镜头）` })

    return { success: true, output: { shotSpecs }, logs, durationMs: 0 }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent 3 — 灰模预演
// ═══════════════════════════════════════════════════════════════════════════

export const previzAgent: StageAgent = {
  name: '灰模预演 Agent',
  stageId: 3,
  description: '为分镜生成低成本灰模预览图',
  tools: [],

  buildSystemPrompt() {
    return '' // 灰模走 SDXL，不需要 LLM system prompt
  },

  async execute(ctx): Promise<AgentResult> {
    const logs: AgentResult['logs'] = []
    const { bible, shotSpecs } = ctx.groundTruth
    const style = (ctx.variables.style as GrayModelStyle) || 'grayscale'
    const useMock = (ctx.variables.useMock as boolean) ?? false
    const targetShotId = ctx.variables.targetShotId as string | undefined

    const targets = targetShotId
      ? shotSpecs.filter(s => s.id === targetShotId)
      : shotSpecs

    logs.push({ level: 'info', message: `开始灰模生成（${targets.length} 个镜头，${style} 风格）` })

    const grayModels: Record<string, string> = {}

    for (const shot of targets) {
      try {
        const genFn = useMock ? generateGrayModelMock : generateGrayModel
        const result = await genFn(shot, bible, { style, aspectRatio: '16:9', imageSize: '1K' })
        grayModels[shot.id] = result.imageUrl
        logs.push({ level: 'success', message: `${shot.shotCode} 灰模完成` })
      } catch (err) {
        logs.push({ level: 'warning', message: `${shot.shotCode} 灰模失败: ${(err as Error).message}` })
      }
    }

    return {
      success: Object.keys(grayModels).length > 0,
      output: { grayModels },
      logs,
      durationMs: 0,
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent 4 — 终版签发
// ═══════════════════════════════════════════════════════════════════════════

export const finalAgent: StageAgent = {
  name: '终版签发 Agent',
  stageId: 4,
  description: '终版批注、归档与交付导出',
  tools: [],

  buildSystemPrompt() {
    return '' // 终版由人类主导
  },

  async execute(ctx): Promise<AgentResult> {
    // 终版签发主要是人类操作，Agent 负责验证完整性
    const { shotSpecs, expandedScript } = ctx.groundTruth
    const logs: AgentResult['logs'] = []

    if (!expandedScript) {
      logs.push({ level: 'warning', message: '扩写剧本为空，建议回到 Stage 0 补充' })
    }
    if (shotSpecs.length === 0) {
      logs.push({ level: 'warning', message: 'ShotSpec 为空，建议回到 Stage 2 生成' })
    }

    logs.push({
      level: 'info',
      message: `终版检查完成：${shotSpecs.length} 个镜头，剧本 ${expandedScript.length} 字`,
    })

    return {
      success: true,
      output: {
        summary: {
          shotCount: shotSpecs.length,
          scriptLength: expandedScript.length,
          readyForExport: shotSpecs.length > 0 && expandedScript.length > 0,
        },
      },
      logs,
      durationMs: 0,
    }
  },
}
