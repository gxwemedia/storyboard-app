/**
 * SDXL-Turbo 客户端
 * 
 * 低算力快速生成灰模/线稿预览
 * 支持多种风格：sketch(素描)、grayscale(灰度)、wireframe(线框)
 */

import type { ImageAspectRatio, ImageSize, ShotSpec, ProjectBible } from '@/types'

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

export interface SDXLConfig {
  baseUrl: string
  apiKey: string
  model: 'sdxl-turbo' | 'sdxl-lightning'
  defaultSteps: number  // 1-4步，极低算力
}

const DEFAULT_CONFIG: SDXLConfig = {
  baseUrl: '',
  apiKey: '',
  model: 'sdxl-turbo',
  defaultSteps: 2,
}

const getConfig = (): SDXLConfig => {
  const isDev = import.meta.env.DEV
  return {
    baseUrl: isDev ? '/api/sdxl' : (import.meta.env.VITE_SDXL_BASE_URL as string) || '',
    apiKey: (import.meta.env.VITE_SDXL_API_KEY as string) || '',
    model: (import.meta.env.VITE_SDXL_MODEL as 'sdxl-turbo' | 'sdxl-lightning') || 'sdxl-turbo',
    defaultSteps: parseInt(import.meta.env.VITE_SDXL_STEPS as string) || 2,
  }
}

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 灰模风格 */
export type GrayModelStyle = 'sketch' | 'grayscale' | 'wireframe'

/** 灰模生成结果 */
export interface GrayModelResult {
  imageUrl: string
  seed?: number
  width: number
  height: number
  steps: number
  duration: number  // 生成耗时（毫秒）
}

/** 灰模生成选项 */
export interface GrayModelOptions {
  style: GrayModelStyle
  aspectRatio: ImageAspectRatio
  imageSize: ImageSize
  steps?: number
  seed?: number
  controlNetStrength?: number
  /** 是否添加文字标注 */
  withAnnotations?: boolean
  /** 参考图URL（用于ControlNet） */
  referenceImageUrl?: string
}

// ---------------------------------------------------------------------------
// Prompt 构建
// ---------------------------------------------------------------------------

/**
 * 根据ShotSpec构建灰模Prompt
 */
export function buildGrayModelPrompt(
  shotSpec: ShotSpec,
  bible: ProjectBible,
  style: GrayModelStyle
): string {
  const styleModifiers: Record<GrayModelStyle, string> = {
    sketch: '草图风格, 素描线条, 手绘感, 简洁轮廓, 单色调',
    grayscale: '灰度图像, 单色渲染, 简洁影调, 电影感, 低饱和度',
    wireframe: '线框渲染, 3D线稿, 结构线条, 几何感, 蓝图风格',
  }

  const basePrompt = [
    // 镜头描述作为核心
    shotSpec.description,
    '',
    // 构图和机位
    `镜头参数: ${shotSpec.lens}`,
    `构图: ${shotSpec.composition}`,
    `情绪: ${shotSpec.emotion}`,
    '',
    // 风格要求
    styleModifiers[style],
    // 基础风格
    bible锁定.style,
    bible.colorScript,
  ].join('\n')

  // 添加通用负面Prompt
  const negativePrompt = [
    '彩色, 完整上色, 精细渲染, 高细节, 复杂纹理',
    '照片级真实, 3D渲染, 光照复杂',
    '文字, 标志, 水印',
  ].join(', ')

  return { prompt: basePrompt, negativePrompt }
}

// ---------------------------------------------------------------------------
// 客户端实现
// ---------------------------------------------------------------------------

/**
 * 生成灰模图像
 */
export async function generateGrayModel(
  shotSpec: ShotSpec,
  bible: ProjectBible,
  options: GrayModelOptions
): Promise<GrayModelResult> {
  const config = getConfig()
  const startTime = Date.now()

  if (!config.apiKey) {
    throw new Error('未配置SDXL API Key。请设置VITE_SDXL_API_KEY环境变量。')
  }

  // 构建Prompt
  const { prompt, negativePrompt } = buildGrayModelPrompt(shotSpec, bible, options.style)

  // 计算尺寸
  const { width, height } = calculateImageSize(options.aspectRatio, options.imageSize)

  // 构建请求体
  const requestBody = {
    prompt,
    negative_prompt: negativePrompt,
    width,
    height,
    steps: options.steps || config.defaultSteps,
    seed: options.seed || Math.floor(Math.random() * 999999999),
    guidance_scale: 1.0,  // Turbo模式使用低CFG
    sampler: 'Euler a',
    model: config.model,
  }

  // 添加ControlNet参考（如果有）
  if (options.referenceImageUrl) {
    Object.assign(requestBody, {
      controlnet: [
        {
          input_image: options.referenceImageUrl,
          module: 'canny',  // 使用canny作为默认
          model: 'control_v11p_sd15_canny',
          weight: options.controlNetStrength || 0.5,
        },
      ],
    })
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`SDXL请求失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    // 解析结果
    if (data.images && data.images.length > 0) {
      const imageData = data.images[0]
      return {
        imageUrl: imageData.url || `data:image/png;base64,${imageData.base64}`,
        seed: data.seed || requestBody.seed,
        width,
        height,
        steps: requestBody.steps,
        duration: Date.now() - startTime,
      }
    }

    throw new Error('SDXL未返回图片')
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('SDXL灰模生成未知错误')
  }
}

/**
 * 批量生成灰模
 */
export async function generateGrayModelBatch(
  shotSpecs: ShotSpec[],
  bible: ProjectBible,
  options: Omit<GrayModelOptions, 'seed'>,
  onProgress?: (current: number, total: number, result?: GrayModelResult) => void
): Promise<GrayModelResult[]> {
  const results: GrayModelResult[] = []

  for (let i = 0; i < shotSpecs.length; i++) {
    const shotSpec = shotSpecs[i]

    try {
      const result = await generateGrayModel(shotSpec, bible, {
        ...options,
        seed: Math.floor(Math.random() * 999999999),
      })
      results.push(result)

      onProgress?.(i + 1, shotSpecs.length, result)
    } catch (error) {
      console.error(`灰模生成失败 (${shotSpec.shotCode}):`, error)
      // 继续生成下一个，不中断
      onProgress?.(i + 1, shotSpecs.length, undefined)
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/**
 * 根据宽高比和清晰度计算图像尺寸
 */
function calculateImageSize(
  aspectRatio: ImageAspectRatio,
  imageSize: ImageSize
): { width: number; height: number } {
  // 基础尺寸表
  const baseSizes: Record<ImageSize, number> = {
    '1K': 512,
    '2K': 768,
    '4K': 1024,
  }

  const base = baseSizes[imageSize]

  // 宽高比映射
  const aspectRatios: Record<ImageAspectRatio, { w: number; h: number }> = {
    '1:1': { w: base, h: base },
    '3:4': { w: base * 0.75, h: base },
    '4:3': { w: base, h: base * 0.75 },
    '9:16': { w: base * 0.5625, h: base },
    '16:9': { w: base, h: base * 0.5625 },
  }

  const ratio = aspectRatios[aspectRatio]

  // 确保尺寸是8的倍数（SDXL要求）
  return {
    width: Math.round(ratio.w / 8) * 8,
    height: Math.round(ratio.h / 8) * 8,
  }
}

/**
 * 获取默认灰模选项
 */
export function getDefaultGrayModelOptions(): GrayModelOptions {
  return {
    style: 'grayscale',
    aspectRatio: '16:9',
    imageSize: '1K',
    steps: 2,
    withAnnotations: true,
  }
}

// ---------------------------------------------------------------------------
// 便捷函数：模拟灰模生成（用于开发/测试）
// ---------------------------------------------------------------------------

/**
 * 模拟灰模生成（返回占位图）
 * 用于开发环境或API未配置时
 */
export async function generateGrayModelMock(
  shotSpec: ShotSpec,
  _bible: ProjectBible,
  options: GrayModelOptions
): Promise<GrayModelResult> {
  // 生成一个简单的SVG占位图
  const { width, height } = calculateImageSize(options.aspectRatio, options.imageSize)

  const styleColors: Record<GrayModelStyle, string> = {
    sketch: '#333',
    grayscale: '#666',
    wireframe: '#0066cc',
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <rect x="10%" y="10%" width="80%" height="60%" fill="none" stroke="${styleColors[options.style]}" stroke-width="2"/>
      <text x="50%" y="45%" text-anchor="middle" fill="${styleColors[options.style]}" font-family="sans-serif" font-size="14">
        ${shotSpec.shotCode} - ${options.style.toUpperCase()}
      </text>
      <text x="50%" y="55%" text-anchor="middle" fill="${styleColors[options.style]}" font-family="sans-serif" font-size="10">
        ${shotSpec.lens}
      </text>
      <text x="50%" y="62%" text-anchor="middle" fill="${styleColors[options.style]}" font-family="sans-serif" font-size="8">
        ${shotSpec.emotion}
      </text>
    </svg>
  `

  const base64 = btoa(unescape(encodeURIComponent(svg)))

  return {
    imageUrl: `data:image/svg+xml;base64,${base64}`,
    seed: Math.floor(Math.random() * 999999999),
    width,
    height,
    steps: options.steps || 2,
    duration: 500,  // 模拟耗时
  }
}
