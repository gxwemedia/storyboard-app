/**
 * Orchestrator — 各阶段 AI 编排逻辑
 *
 * 负责为每个 Pipeline Stage 构建专属的 system prompt，
 * 调用 ai-client，并解析/校验返回结果。
 */

import type { AiMessage } from './ai-client'
import { sendPrompt, sendImagePrompt } from './ai-client'
import type { ImageAspectRatio, ImageGenSettings, ProjectBible, ShotSpec } from '@/types'
import { aiShotSpecArraySchema, inferStructuredFields } from '@/schemas/shot-spec'
import { generateGrayModel, generateGrayModelMock, type GrayModelStyle, type GrayModelResult } from './sdxl-client'
import { skillPackRegistry } from '@/skills'

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
  // 技能包解析：覆盖/追加/默认 Prompt
  const skill = skillPackRegistry.resolveStageSkill('stage1', STAGE1_SYSTEM_PROMPT, 0.8)

  const messages: AiMessage[] = [
    { role: 'system', content: skill.systemPrompt },
    // Few-shot 样例注入
    ...skill.fewShots.flatMap((fs) => [
      { role: 'user' as const, content: fs.input },
      { role: 'assistant' as const, content: fs.output },
    ]),
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

  const response = await sendPrompt(messages, { temperature: skill.temperature })
  return { expandedScript: response.content.trim() }
}

// ---------------------------------------------------------------------------
// Stage 3 — ShotSpec 结构化分镜生成
// ---------------------------------------------------------------------------

const STAGE3_SYSTEM_PROMPT = `你是一位拥有30年经验的A级导演兼摄影指导，精通好莱坞工业级分镜预演体系（Previz）。

你的核心任务：以专业导演思维，将剧本拆解为完整的分镜序列。你必须像拍摄现场的导演一样思考每一个镜头的存在意义。

## 导演分镜方法论（你必须严格遵守）

**第一步：情绪节拍分析**
阅读整段剧本，标记所有的情绪转折点（Beat）。每个 Beat 至少对应 1-2 个镜头。

**第二步：镜头拆分原则**
必须考虑以下分镜切割点，每个切割点都应产生独立镜头：
1. **建立镜头（Establishing Shot）**：每个新场次/场景必须有一个交代环境的建立镜头
2. **动作切点**：角色动作发生变化时切镜（站→坐、走→跑、开门→进入）
3. **反应镜头（Reaction Shot）**：重要对白后必须有听者的反应特写
4. **视线匹配（Eyeline Match）**：角色看向某物时，下一镜紧接被看物的主观视角
5. **情绪高潮镜头**：戏剧张力达到峰值时，用特写或极特写强化
6. **过渡/节拍镜头**：场景之间用空镜或意象镜头过渡

**第三步：景别节奏设计**
- 禁止连续使用相同景别（如连续两个中景）
- 经典节奏：WS → MS → CU → 反应CU → MS → WS
- 紧张场景节奏加快：景别跨度加大（WS 直切 ECU）
- 抒情场景节奏放缓：景别渐变过渡

**第四步：轴线与连戏**
- 同场次镜头严格遵守180度轴线规则
- 标注每个镜头的轴线锚点
- 标注连戏关键元素（道具位置、光线方向、服装状态）

## 输出格式

输出严格的 JSON 数组，每个元素格式如下：
{
  "shotCode": "S01",
  "sceneId": "场次标识（如 SC01），同场次的镜头共享相同的光影和氛围",
  "description": "镜头内容自然语言描述（含动作、表演、关键视觉元素、运镜方式）",
  "imagePrompt": "中英双语 AI 合图提示词。角色用 @名称 引用，如：@秦牧 站在荒原上/\\n@QinMu standing on wasteland",
  "videoPrompt": "中英双语视频生成提示词，含表演动作+运镜描述。角色用 @名称 引用",
  "dialogue": "当前镜头的角色对白台词，无对白留空",
  "soundEffect": "音效描述（环境音、动效），如：风声呼啸/剑出鞘金属声/脚步踏草声",
  "lens": "焦段与机位描述，例如：24mm 广角 / 过肩镜头 / 机位略低于肩线",
  "composition": "构图法则描述，例如：OTS，前景保留火把与岩壁切面",
  "emotion": "镜头情绪关键词，例如：警觉、克制、强压迫感",
  "scale": "景别枚举值，可选: EWS / WS / MWS / MS / MCU / CU / ECU",
  "focalLength": "标准焦段枚举值，可选: 14mm / 24mm / 35mm / 50mm / 85mm / 135mm / 200mm",
  "keyLight": "主光位枚举值，可选: Rembrandt / Butterfly / Loop / Split / Broad / Backlit / Natural",
  "axisAnchor": "轴线锚点参考，例如：以主角肩线为轴线基准",
  "continuityLock": "连戏锁定描述，例如：与上一镜保持同一窗户背景",
  "notes": "备注（特效要求、后期注意事项等）",
  "duration": 3
}

## 强制规则（违反任何一条即为失败）

1. ⚠️ 镜头数量：根据剧本的情绪节拍数、场次数和动作密度自行判断合理的镜头数量。每个情绪节拍至少对应 1-2 个镜头，每个场次至少包含一个建立镜头。宁可多拆不要少拆，确保叙事完整。
2. 每个场次（sceneId）的第一个镜头必须是建立镜头（EWS 或 WS）
3. 不允许连续两个镜头使用完全相同的 scale 值
4. 必须严格遵守视觉圣经的风格和禁忌
5. scale、focalLength、keyLight 务必从给定的枚举值中选择
6. imagePrompt 和 videoPrompt 必须中英双语，用 @主体名称 引用角色/场景
7. 同一 sceneId 的镜头必须保持一致的光影和氛围
8. duration 为整数秒，建议 2-8 秒
9. 输出纯 JSON 数组，不要包裹 markdown 代码块

仅输出 JSON 数组本身，不要添加任何额外文字说明。`

export interface Stage3Result {
  shotSpecs: ShotSpec[]
}

export async function orchestrateStage3(
  bible: ProjectBible,
  expandedScript: string,
  conceptTitle: string,
): Promise<Stage3Result> {
  // 技能包解析（含 Stage 3 扩展）
  const skill = skillPackRegistry.resolveStage3Skill(STAGE3_SYSTEM_PROMPT, 0.5)

  // 植入景别/光位偏好提示
  let promptSuffix = ''
  if (skill.preferredScales?.length) {
    promptSuffix += `\n景别偏好：优先使用 ${skill.preferredScales.join('/')}\u3002`
  }
  if (skill.preferredLighting?.length) {
    promptSuffix += `\n光位偏好：优先使用 ${skill.preferredLighting.join('/')}\u3002`
  }
  if (skill.shotCountHint) {
    promptSuffix += `\n镜头数量建议：${skill.shotCountHint[0]}-${skill.shotCountHint[1]} 个\u3002`
  }

  const messages: AiMessage[] = [
    { role: 'system', content: skill.systemPrompt + promptSuffix },
    // Few-shot 样例
    ...skill.fewShots.flatMap((fs) => [
      { role: 'user' as const, content: fs.input },
      { role: 'assistant' as const, content: fs.output },
    ]),
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
    temperature: skill.temperature,
    jsonMode: true,
    timeoutMs: 600_000,  // 分镜生成需要输出大量结构化 JSON，给予 10 分钟超时
  })

  const parsed = parseShotSpecResponse(response.content)
  return { shotSpecs: parsed }
}

export function parseShotSpecResponse(raw: string): ShotSpec[] {
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

  // 使用 Zod schema 校验（safeParse 模式，校验失败时 fallback 手动解析）
  const zodResult = aiShotSpecArraySchema.safeParse(arr)
  const validatedArr = zodResult.success ? zodResult.data : arr

  return (validatedArr as unknown[]).map((item, index) => {
    const obj = item as Record<string, unknown>
    const aiInput = zodResult.success ? zodResult.data[index] : { description: '', lens: '', composition: '', emotion: '', ...obj }
    const inferred = inferStructuredFields(aiInput)

    return {
      id: `shot-${String(index + 1).padStart(2, '0')}`,
      shotCode: (obj.shotCode as string) || `S${String(index + 1).padStart(2, '0')}`,
      description: (obj.description as string) || '',
      lens: (obj.lens as string) || '',
      composition: (obj.composition as string) || '',
      emotion: (obj.emotion as string) || '',
      // V6 结构化字段（AI 提供或推断）
      scale: inferred.scale,
      focalLength: inferred.focalLength,
      keyLight: inferred.keyLight,
      axisAnchor: (obj.axisAnchor as string) || '',
      continuityLock: (obj.continuityLock as string) || '',
      // V7 分镜增强字段
      sceneId: (obj.sceneId as string) || `SC${String(index + 1).padStart(2, '0')}`,
      imagePrompt: (obj.imagePrompt as string) || '',
      videoPrompt: (obj.videoPrompt as string) || '',
      dialogue: (obj.dialogue as string) || '',
      soundEffect: (obj.soundEffect as string) || '',
      notes: (obj.notes as string) || '',
      duration: (obj.duration as number) || 3,
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
  imageUrls?: string[],
): Promise<Stage2ConsistencyResult> {
  const stageKey = type === 'character' ? 'stage2Character' as const : 'stage2Scene' as const
  const defaultPrompt = type === 'character' ? STAGE2_CHARACTER_PROMPT : STAGE2_SCENE_PROMPT
  const label = type === 'character' ? '角色' : '场景'

  // 有图片时追加视觉分析指令
  const visionAppend = (imageUrls && imageUrls.length > 0)
    ? `\n\n【重要】用户提供了参考图片，请结合图片中的视觉信息进行分析。仔细观察图中的面部特征、服装材质、色彩搭配、光影效果、空间结构等细节，将这些视觉信息融入你的一致性描述中。`
    : ''

  // 技能包解析
  const skill = skillPackRegistry.resolveStageSkill(stageKey, defaultPrompt + visionAppend, 0.7)

  const textContent = [
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
  ].join('\n')

  // 构建用户消息：有图片时用 Vision 图文混合格式
  const userContent: AiMessage['content'] = (imageUrls && imageUrls.length > 0)
    ? [
      { type: 'text' as const, text: textContent },
      ...imageUrls.map((url) => ({
        type: 'image_url' as const,
        image_url: { url, detail: 'high' as const },
      })),
    ]
    : textContent

  const messages: AiMessage[] = [
    { role: 'system', content: skill.systemPrompt },
    // Few-shot 样例
    ...skill.fewShots.flatMap((fs) => [
      { role: 'user' as const, content: fs.input },
      { role: 'assistant' as const, content: fs.output },
    ]),
    { role: 'user', content: userContent },
  ]

  const response = await sendPrompt(messages, { temperature: skill.temperature })
  const content = typeof response.content === 'string' ? response.content : ''
  return { consistencyPrompt: content.trim() }
}

// ---------------------------------------------------------------------------
// Stage 2 — AI 概念图生成
// ---------------------------------------------------------------------------

export interface ImageGenResult {
  imageUrl: string
}

export async function generateDesignImage(
  bible: ProjectBible,
  type: 'character' | 'scene',
  name: string,
  description: string,
  consistencyPrompt?: string,
  imageSettings?: ImageGenSettings,
): Promise<ImageGenResult> {
  let prompt: string
  let aspectRatio: string
  const imageSize = imageSettings?.imageSize || '1K'

  if (type === 'character') {
    // 工业级三视图转台 prompt
    const visualRef = consistencyPrompt
      ? `\n\n角色一致性视觉描述参考：${consistencyPrompt}`
      : ''
    aspectRatio = '16:9' // 横构图适合三视图排列

    prompt = [
      `Professional live-action character design sheet, photorealistic, 8K UHD,`,
      `clean multi-panel layout on neutral gray background,`,
      `left panel: high-detail facial closeup portrait,`,
      `right panels: full-body front view, profile view, back view,`,
      `nine-head-tall proportions, consistent design across all views,`,
      `neutral global illumination, RAW photography quality,`,
      `NO anime, NO cartoon, NO cel-shading, NO fantasy background.`,
      ``,
      `角色名称：${name}`,
      `角色描述：${description}`,
      ``,
      `风格要求：${bible.style}`,
      `色彩基调：${bible.colorScript}`,
      `禁忌规则：${bible.forbidden}`,
      visualRef,
      ``,
      `要求：`,
      `- 纯净工业灰色背景，带细微物理阴影`,
      `- 左侧为高清脸部特写大头照`,
      `- 右侧为正面、侧面、背面三个全身站姿视图`,
      `- 所有视角比例严格一致`,
      `- 禁止出现任何场景/环境背景`,
      `- 写实摄影风格，禁止动漫化`,
    ].join('\n')
  } else {
    // 场景图保持原有逻辑
    const visualRef = consistencyPrompt
      ? `\n\n一致性视觉描述参考：${consistencyPrompt}`
      : ''
    aspectRatio = imageSettings?.aspectRatio || '16:9'

    prompt = [
      `请为以下场景生成一张高质量、电影概念设定级别的图片：`,
      ``,
      `场景名称：${name}`,
      `场景描述：${description}`,
      ``,
      `风格要求：${bible.style}`,
      `色彩基调：${bible.colorScript}`,
      `禁忌规则：${bible.forbidden}`,
      visualRef,
      ``,
      `要求：`,
      `- 画面风格严格遵循上述风格要求`,
      `- 构图清晰，主体突出`,
      `- 输出宽高比：${aspectRatio}`,
      `- 场景广角展示，包含典型光照和氛围`,
      `- 适合作为影视分镜的参考概念设定图`,
    ].join('\n')
  }

  const response = await sendImagePrompt(prompt, { timeoutMs: 120_000, aspectRatio: aspectRatio as ImageAspectRatio, imageSize })

  if (response.imageUrls && response.imageUrls.length > 0) {
    return { imageUrl: response.imageUrls[0] }
  }

  throw new Error(`Gemini 未返回图片。文本回复：${response.content.slice(0, 100)}`)
}

// ---------------------------------------------------------------------------
// Stage 4 — 灰模预演 (Gray Model Preview)
// ---------------------------------------------------------------------------

/** 灰模预演结果 */
export interface GrayModelStageResult {
  shotSpecs: ShotSpec[]
  grayModels: Record<string, GrayModelResult>  // shotId -> grayModel
}

/**
 * 为所有ShotSpec生成灰模预演
 */
export async function orchestrateStage4(
  bible: ProjectBible,
  shotSpecs: ShotSpec[],
  style: GrayModelStyle = 'grayscale',
  useMock: boolean = false
): Promise<GrayModelStageResult> {
  const grayModels: Record<string, GrayModelResult> = {}

  for (const shotSpec of shotSpecs) {
    try {
      let result: GrayModelResult

      if (useMock) {
        // 使用模拟生成（开发/测试用）
        result = await generateGrayModelMock(shotSpec, bible, {
          style,
          aspectRatio: '16:9',
          imageSize: '1K',
        })
      } else {
        // 实际调用SDXL-Turbo
        result = await generateGrayModel(shotSpec, bible, {
          style,
          aspectRatio: '16:9',
          imageSize: '1K',
        })
      }

      grayModels[shotSpec.id] = result
    } catch (error) {
      console.error(`灰模生成失败 (${shotSpec.shotCode}):`, error)
      // 继续处理下一个，不中断
    }
  }

  return {
    shotSpecs,
    grayModels,
  }
}

/**
 * 为单个ShotSpec生成灰模预演
 */
export async function orchestrateStage4Single(
  bible: ProjectBible,
  shotSpec: ShotSpec,
  style: GrayModelStyle = 'grayscale',
  useMock: boolean = false
): Promise<GrayModelResult> {
  if (useMock) {
    return generateGrayModelMock(shotSpec, bible, {
      style,
      aspectRatio: '16:9',
      imageSize: '1K',
    })
  }

  return generateGrayModel(shotSpec, bible, {
    style,
    aspectRatio: '16:9',
    imageSize: '1K',
  })
}
