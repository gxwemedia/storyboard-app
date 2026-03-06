/**
 * Orchestrator — 各阶段 AI 编排逻辑
 *
 * 负责为每个 Pipeline Stage 构建专属的 system prompt，
 * 调用 ai-client，并解析/校验返回结果。
 */

import type { AiMessage } from './ai-client'
import { sendPrompt } from './ai-client'
import type { ProjectBible, ShotSpec } from '@/types'

// ---------------------------------------------------------------------------
// Stage 1 — 剧本扩写 (Script & Emotion Expansion)
// ---------------------------------------------------------------------------

const STAGE1_SYSTEM_PROMPT = `你是一位顶级影视编剧兼情绪分析师，服务于工业级分镜制片系统。

你的任务：根据导演提供的"项目视觉圣经"和"原始剧本大纲"，对大纲进行深度扩写。

扩写要求：
1. 补全角色心理状态与情绪波动曲线
2. 强化环境氛围描写（光流、空气质感、声音景观）
3. 设计情绪钩子（Hooks），标注戏剧张力的起伏节点
4. 保持扩写风格与视觉圣经中定义的基调严格一致
5. 禁止偏离圣经中声明的禁忌规则

输出格式：直接输出扩写后的完整文本，不要包裹任何 markdown 代码块或 JSON。使用中文。
字数控制在 300-600 字之间。`

export interface Stage1Result {
  expandedScript: string
}

export async function orchestrateStage1(
  bible: ProjectBible,
  rawScript: string,
): Promise<Stage1Result> {
  const messages: AiMessage[] = [
    { role: 'system', content: STAGE1_SYSTEM_PROMPT },
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
  return { expandedScript: response.content.trim() }
}

// ---------------------------------------------------------------------------
// Stage 3 — ShotSpec 结构化分镜生成
// ---------------------------------------------------------------------------

const STAGE3_SYSTEM_PROMPT = `你是一位专业的分镜导演兼摄影指导，服务于工业级分镜制片管线。

你的任务：根据导演提供的"项目视觉圣经"、"扩写后的剧本"、以及"已锁定的概念设定方向"，将剧本拆解为独立的分镜卡片（Shot），每张卡片包含精确的专业参数。

输出要求：
- 输出严格的 JSON 数组，每个元素格式如下：
  {
    "shotCode": "S01",
    "description": "镜头内容自然语言描述（含动作、表演、关键视觉元素）",
    "lens": "焦段与机位描述，例如：24mm 广角 / 过肩镜头 / 机位略低于肩线",
    "composition": "构图法则描述，例如：OTS，前景保留火把与岩壁切面",
    "emotion": "镜头情绪关键词，例如：警觉、克制、强压迫感"
  }
- 镜头数量：3-6 个
- 必须严格遵守视觉圣经的风格和禁忌
- 焦段使用真实电影镜头参数（24mm / 35mm / 50mm / 85mm / 135mm 等）
- 输出纯 JSON 数组，不要包裹 markdown 代码块

仅输出 JSON 数组本身，不要添加任何额外文字说明。`

export interface Stage3Result {
  shotSpecs: ShotSpec[]
}

export async function orchestrateStage3(
  bible: ProjectBible,
  expandedScript: string,
  conceptTitle: string,
): Promise<Stage3Result> {
  const messages: AiMessage[] = [
    { role: 'system', content: STAGE3_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        '【项目视觉圣经 (Ground Truth Level 0)】',
        `· 风格锁定：${bible.style}`,
        `· 色彩脚本：${bible.colorScript}`,
        `· 禁忌规则：${bible.forbidden}`,
        '',
        '【扩写后的剧本 (Ground Truth Level 1)】',
        expandedScript,
        '',
        `【概念设定锁定 (Ground Truth Level 2)】`,
        conceptTitle,
        '',
        '请将上述内容拆解为结构化分镜卡片（ShotSpec JSON）。',
      ].join('\n'),
    },
  ]

  const response = await sendPrompt(messages, {
    temperature: 0.5,
    jsonMode: true,
  })

  const parsed = parseShotSpecResponse(response.content)
  return { shotSpecs: parsed }
}

function parseShotSpecResponse(raw: string): ShotSpec[] {
  // 尝试清理 markdown 包裹
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let arr: unknown[]
  try {
    const parsed = JSON.parse(cleaned)
    arr = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    throw new Error(`AI 返回的 ShotSpec JSON 格式无效。原始内容：${raw.slice(0, 300)}`)
  }

  return arr.map((item, index) => {
    const obj = item as Record<string, unknown>
    return {
      id: `shot-${String(index + 1).padStart(2, '0')}`,
      shotCode: (obj.shotCode as string) || `S${String(index + 1).padStart(2, '0')}`,
      description: (obj.description as string) || '',
      lens: (obj.lens as string) || '',
      composition: (obj.composition as string) || '',
      emotion: (obj.emotion as string) || '',
    }
  })
}

// ---------------------------------------------------------------------------
// Stage 0 / 2 / 4 / 5 — 暂留接口桩
// ---------------------------------------------------------------------------

/** Stage 0: 项目圣经由人类直接填写，无需 AI */
export async function orchestrateStage0(): Promise<void> {
  // 人类输入阶段，无 AI 调用
}

/** Stage 2: 角色/场景一致性描述反推 */
export interface Stage2ConsistencyResult {
  consistencyPrompt: string
}

const STAGE2_CHARACTER_PROMPT = `你是一位专业的角色视觉设定师，服务于工业级分镜制片管线。

你的任务：根据导演提供的"项目视觉圣经"和"角色基本信息"，生成一段详细的角色外观一致性描述。

这段描述的目的是：在后续所有分镜中，任何图像生成引擎都能仅通过这段文字，精确还原该角色的外貌特征，确保跨镜头的角色一致性。

描述必须包含：
1. 面部特征（脸型、五官、肤色、表情基调）
2. 发型与发色
3. 体型与姿态气质
4. 服装/盔甲/装备（材质、颜色、磨损程度）
5. 标志性特征（伤疤、饰品、武器等）
6. 光照条件下的视觉表现建议

输出格式：直接输出一段连贯的中文描述（200-400字），不要用列表，不要用 markdown。这段文本将直接嵌入后续的分镜 Prompt 中。`

const STAGE2_SCENE_PROMPT = `你是一位专业的场景视觉设计师，服务于工业级分镜制片管线。

你的任务：根据导演提供的"项目视觉圣经"和"场景基本信息"，生成一段详细的场景环境一致性描述。

这段描述的目的是：在后续所有分镜中，任何图像生成引擎都能仅通过这段文字，精确还原该场景的空间氛围，确保跨镜头的环境一致性。

描述必须包含：
1. 空间结构与尺度（建筑形制、室内/室外、纵深感）
2. 材质与纹理（石材、木材、植被、水体等）
3. 光照环境（主光源方向、色温、阴影特征、雾气/粒子）
4. 色彩基调（与色彩脚本对齐）
5. 氛围关键词（压迫感/开阔/神秘/温暖等）
6. 关键道具与环境元素

输出格式：直接输出一段连贯的中文描述（200-400字），不要用列表，不要用 markdown。这段文本将直接嵌入后续的分镜 Prompt 中。`

export async function orchestrateStage2Consistency(
  bible: ProjectBible,
  type: 'character' | 'scene',
  name: string,
  description: string,
): Promise<Stage2ConsistencyResult> {
  const systemPrompt = type === 'character' ? STAGE2_CHARACTER_PROMPT : STAGE2_SCENE_PROMPT
  const label = type === 'character' ? '角色' : '场景'

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        '【项目视觉圣经 (Ground Truth Level 0)】',
        `· 风格锁定：${bible.style}`,
        `· 色彩脚本：${bible.colorScript}`,
        `· 禁忌规则：${bible.forbidden}`,
        '',
        `【${label}信息】`,
        `· 名称：${name}`,
        `· 描述：${description}`,
        '',
        `请为「${name}」生成一致性视觉描述。`,
      ].join('\n'),
    },
  ]

  const response = await sendPrompt(messages, { temperature: 0.6 })
  return { consistencyPrompt: response.content.trim() }
}

/** Stage 4: 灰模预演需要渲染管线，后续接入 */
export async function orchestrateStage4(): Promise<void> {
  // 需要渲染管线，后续接入
}

/** Stage 5: 终版签发为人类动作，无需 AI */
export async function orchestrateStage5(): Promise<void> {
  // 人类签发阶段，无 AI 调用
}
