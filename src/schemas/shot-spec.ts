/**
 * ShotSpec Zod Schema — 运行时校验
 *
 * 用于校验 AI 返回的 ShotSpec JSON，确保字段类型和枚举值合法。
 * Schema 与 types/index.ts 中的 ShotSpec 接口保持同步。
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// 枚举定义（与 types/index.ts 保持一致）
// ---------------------------------------------------------------------------

/** 景别 */
export const SHOT_SCALES = ['EWS', 'WS', 'MWS', 'MS', 'MCU', 'CU', 'ECU'] as const
export const shotScaleLabels: Record<string, string> = {
  EWS: '超远景 (Extreme Wide)',
  WS: '远景 (Wide)',
  MWS: '中远景 (Medium Wide)',
  MS: '中景 (Medium)',
  MCU: '中近景 (Medium Close-Up)',
  CU: '近景 (Close-Up)',
  ECU: '特写 (Extreme Close-Up)',
}

/** 电影焦段 */
export const FOCAL_LENGTHS = ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm'] as const

/** 主光位 */
export const KEY_LIGHT_STYLES = [
  'Rembrandt', 'Butterfly', 'Loop', 'Split', 'Broad', 'Backlit', 'Natural',
] as const
export const keyLightLabels: Record<string, string> = {
  Rembrandt: '伦勃朗光',
  Butterfly: '蝴蝶光',
  Loop: '环形光',
  Split: '劈裂光',
  Broad: '宽光',
  Backlit: '逆光',
  Natural: '自然光',
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

/** AI 返回的单个镜头原始数据（宽松模式，允许 AI 返回部分字段） */
export const aiShotSpecSchema = z.object({
  shotCode: z.string().optional(),
  description: z.string().default(''),
  lens: z.string().default(''),
  composition: z.string().default(''),
  emotion: z.string().default(''),
  // V6 新增结构化字段（AI 可能返回也可能不返回）
  scale: z.enum(SHOT_SCALES).optional(),
  focalLength: z.enum(FOCAL_LENGTHS).optional(),
  keyLight: z.enum(KEY_LIGHT_STYLES).optional(),
  axisAnchor: z.string().optional(),
  continuityLock: z.string().optional(),
})

/** AI 返回的 ShotSpec 数组 */
export const aiShotSpecArraySchema = z.array(aiShotSpecSchema).min(1, {
  message: 'AI 至少应返回 1 个分镜',
})

/** 完整 ShotSpec（用于存储和 UI，所有字段都有默认值） */
export const fullShotSpecSchema = z.object({
  id: z.string(),
  shotCode: z.string(),
  description: z.string(),
  lens: z.string(),
  composition: z.string(),
  emotion: z.string(),
  scale: z.enum(SHOT_SCALES),
  focalLength: z.enum(FOCAL_LENGTHS),
  keyLight: z.enum(KEY_LIGHT_STYLES),
  axisAnchor: z.string().default(''),
  continuityLock: z.string().default(''),
})

// ---------------------------------------------------------------------------
// 类型推导
// ---------------------------------------------------------------------------

export type AiShotSpecInput = z.infer<typeof aiShotSpecSchema>

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 从 AI 返回的松散字段中推断结构化参数
 */
export function inferStructuredFields(raw: AiShotSpecInput): {
  scale: (typeof SHOT_SCALES)[number]
  focalLength: (typeof FOCAL_LENGTHS)[number]
  keyLight: (typeof KEY_LIGHT_STYLES)[number]
} {
  return {
    scale: raw.scale || inferScaleFromLens(raw.lens || ''),
    focalLength: raw.focalLength || inferFocalLengthFromLens(raw.lens || ''),
    keyLight: raw.keyLight || 'Natural',
  }
}

/** 从自然语言焦段描述中推断景别 */
function inferScaleFromLens(lens: string): (typeof SHOT_SCALES)[number] {
  const lower = lens.toLowerCase()
  if (lower.includes('特写') || lower.includes('ecu') || lower.includes('extreme close')) return 'ECU'
  if (lower.includes('近景') || lower.includes('close-up') || lower.includes('close up')) return 'CU'
  if (lower.includes('中近') || lower.includes('mcu') || lower.includes('medium close')) return 'MCU'
  if (lower.includes('中景') || lower.includes('medium shot') || lower.includes('ms')) return 'MS'
  if (lower.includes('中远') || lower.includes('mws') || lower.includes('medium wide')) return 'MWS'
  if (lower.includes('远景') || lower.includes('wide') || lower.includes('ws')) return 'WS'
  if (lower.includes('超远') || lower.includes('ews') || lower.includes('extreme wide')) return 'EWS'
  // 从焦段数值推断
  if (lower.includes('14mm') || lower.includes('16mm')) return 'EWS'
  if (lower.includes('24mm')) return 'WS'
  if (lower.includes('35mm')) return 'MWS'
  if (lower.includes('50mm')) return 'MS'
  if (lower.includes('85mm')) return 'MCU'
  if (lower.includes('135mm')) return 'CU'
  if (lower.includes('200mm')) return 'ECU'
  return 'MS' // 默认中景
}

/** 从自然语言焦段描述中推断标准化焦段 */
function inferFocalLengthFromLens(lens: string): (typeof FOCAL_LENGTHS)[number] {
  // 从最长焦段开始匹配，避免 '35mm' 误匹配 '135mm' 情况
  const sortedByLength = [...FOCAL_LENGTHS].sort((a, b) => b.length - a.length)
  for (const fl of sortedByLength) {
    // 使用数字边界匹配：确保 '135mm' 不会被 '35mm' 匹配
    const numPart = fl.replace('mm', '')
    const regex = new RegExp(`(?<![0-9])${numPart}mm`, 'i')
    if (regex.test(lens)) return fl
  }
  // 从景别关键词推断
  const lower = lens.toLowerCase()
  if (lower.includes('广角') || lower.includes('wide')) return '24mm'
  if (lower.includes('标准') || lower.includes('normal')) return '50mm'
  if (lower.includes('长焦') || lower.includes('telephoto') || lower.includes('tele')) return '135mm'
  if (lower.includes('特写') || lower.includes('close')) return '85mm'
  return '50mm' // 默认标准焦段
}

// ---------------------------------------------------------------------------
// 连戏规则检查
// ---------------------------------------------------------------------------

export interface ContinuityIssue {
  shotIndex: number
  shotCode: string
  type: 'axis_jump' | 'scale_jump' | 'light_mismatch'
  message: string
  severity: 'warning' | 'error'
}

/**
 * 检查前后帧连戏规则
 *
 * 规则：
 * 1. 景别跳跃：相邻镜头景别跨度 > 2 级（如 EWS 直接跳到 ECU）为警告
 * 2. 光位突变：相邻镜头主光位不一致且非有意为之
 */
export function checkContinuityRules(
  shots: Array<{ shotCode: string; scale: string; keyLight: string }>
): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []

  for (let i = 1; i < shots.length; i++) {
    const prev = shots[i - 1]
    const curr = shots[i]

    // 景别跳跃检查
    const prevScaleIdx = SHOT_SCALES.indexOf(prev.scale as typeof SHOT_SCALES[number])
    const currScaleIdx = SHOT_SCALES.indexOf(curr.scale as typeof SHOT_SCALES[number])
    if (prevScaleIdx >= 0 && currScaleIdx >= 0) {
      const jump = Math.abs(prevScaleIdx - currScaleIdx)
      if (jump > 2) {
        issues.push({
          shotIndex: i,
          shotCode: curr.shotCode,
          type: 'scale_jump',
          message: `景别跳跃过大：${prev.shotCode}(${prev.scale}) → ${curr.shotCode}(${curr.scale})，跨越 ${jump} 级`,
          severity: jump > 4 ? 'error' : 'warning',
        })
      }
    }

    // 光位突变检查（同场景相邻镜头光位不同是警告，允许有意为之）
    if (prev.keyLight && curr.keyLight && prev.keyLight !== curr.keyLight) {
      const lightKeys = ['Backlit', 'Split'] // 这些光位变化是强风格变化
      if (lightKeys.includes(prev.keyLight) || lightKeys.includes(curr.keyLight)) {
        issues.push({
          shotIndex: i,
          shotCode: curr.shotCode,
          type: 'light_mismatch',
          message: `主光位突变：${prev.shotCode}(${prev.keyLight}) → ${curr.shotCode}(${curr.keyLight})`,
          severity: 'warning',
        })
      }
    }
  }

  return issues
}
