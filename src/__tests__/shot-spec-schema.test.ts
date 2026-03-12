/**
 * shot-spec schema 单元测试
 *
 * 测试 Zod 校验、推断函数、连戏规则检查。
 */

import { describe, it, expect } from 'vitest'
import {
  aiShotSpecSchema,
  aiShotSpecArraySchema,
  inferStructuredFields,
  checkContinuityRules,
  SHOT_SCALES,
  FOCAL_LENGTHS,
  KEY_LIGHT_STYLES,
} from '@/schemas/shot-spec'

// ---------------------------------------------------------------------------
// Zod 校验
// ---------------------------------------------------------------------------

describe('aiShotSpecSchema 校验', () => {
  it('接受完整字段', () => {
    const result = aiShotSpecSchema.safeParse({
      shotCode: 'S01',
      description: '测试镜头',
      lens: '24mm',
      composition: '三分法',
      emotion: '紧张',
      scale: 'WS',
      focalLength: '24mm',
      keyLight: 'Rembrandt',
    })
    expect(result.success).toBe(true)
  })

  it('接受最小字段（利用 default 值）', () => {
    const result = aiShotSpecSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.lens).toBe('')
    }
  })

  it('拒绝非法 scale 枚举值', () => {
    const result = aiShotSpecSchema.safeParse({
      scale: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('拒绝非法 focalLength 枚举值', () => {
    const result = aiShotSpecSchema.safeParse({
      focalLength: '99mm',
    })
    expect(result.success).toBe(false)
  })

  it('拒绝非法 keyLight 枚举值', () => {
    const result = aiShotSpecSchema.safeParse({
      keyLight: 'NotALight',
    })
    expect(result.success).toBe(false)
  })
})

describe('aiShotSpecArraySchema 校验', () => {
  it('接受合法数组', () => {
    const result = aiShotSpecArraySchema.safeParse([
      { shotCode: 'S01', description: '第一镜', lens: '24mm', composition: '三分法', emotion: '紧张' },
      { shotCode: 'S02', description: '第二镜', lens: '135mm', composition: '居中', emotion: '恐惧' },
    ])
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toHaveLength(2)
  })

  it('拒绝空数组', () => {
    const result = aiShotSpecArraySchema.safeParse([])
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 推断函数
// ---------------------------------------------------------------------------

describe('inferStructuredFields 推断', () => {
  it('AI 提供 scale 则直接使用', () => {
    const result = inferStructuredFields({
      description: '', lens: '', composition: '', emotion: '',
      scale: 'CU',
    })
    expect(result.scale).toBe('CU')
  })

  it('从 lens 自然语言推断 scale', () => {
    const result = inferStructuredFields({
      description: '', lens: '24mm 广角', composition: '', emotion: '',
    })
    expect(result.scale).toBe('WS')
    expect(result.focalLength).toBe('24mm')
  })

  it('长焦推断为近景', () => {
    const result = inferStructuredFields({
      description: '', lens: '135mm 长焦 / 极近特写', composition: '', emotion: '',
    })
    expect(result.focalLength).toBe('135mm')
  })

  it('无线索时默认中景 50mm Natural', () => {
    const result = inferStructuredFields({
      description: '', lens: '', composition: '', emotion: '',
    })
    expect(result.scale).toBe('MS')
    expect(result.focalLength).toBe('50mm')
    expect(result.keyLight).toBe('Natural')
  })

  it('中文景别关键词可推断', () => {
    expect(inferStructuredFields({
      description: '', lens: '特写镜头', composition: '', emotion: '',
    }).scale).toBe('ECU')

    expect(inferStructuredFields({
      description: '', lens: '远景', composition: '', emotion: '',
    }).scale).toBe('WS')
  })
})

// ---------------------------------------------------------------------------
// 连戏规则检查
// ---------------------------------------------------------------------------

describe('checkContinuityRules 连戏检查', () => {
  it('相邻镜头景别差 <= 2 无问题', () => {
    const issues = checkContinuityRules([
      { shotCode: 'S01', scale: 'WS', keyLight: 'Natural' },
      { shotCode: 'S02', scale: 'MS', keyLight: 'Natural' },
    ])
    expect(issues).toHaveLength(0)
  })

  it('EWS 直接跳到 ECU 产生景别跳跃警告', () => {
    const issues = checkContinuityRules([
      { shotCode: 'S01', scale: 'EWS', keyLight: 'Natural' },
      { shotCode: 'S02', scale: 'ECU', keyLight: 'Natural' },
    ])
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].type).toBe('scale_jump')
    expect(issues[0].severity).toBe('error') // 跨 6 级是 error
  })

  it('光位从 Natural 到 Backlit 产生光位突变警告', () => {
    const issues = checkContinuityRules([
      { shotCode: 'S01', scale: 'MS', keyLight: 'Natural' },
      { shotCode: 'S02', scale: 'MS', keyLight: 'Backlit' },
    ])
    expect(issues.some((i) => i.type === 'light_mismatch')).toBe(true)
  })

  it('相同光位无警告', () => {
    const issues = checkContinuityRules([
      { shotCode: 'S01', scale: 'MS', keyLight: 'Rembrandt' },
      { shotCode: 'S02', scale: 'MCU', keyLight: 'Rembrandt' },
    ])
    expect(issues.filter((i) => i.type === 'light_mismatch')).toHaveLength(0)
  })

  it('单镜头无连戏问题', () => {
    const issues = checkContinuityRules([
      { shotCode: 'S01', scale: 'ECU', keyLight: 'Split' },
    ])
    expect(issues).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 枚举值常量
// ---------------------------------------------------------------------------

describe('枚举常量完整性', () => {
  it('SHOT_SCALES 有 7 个值', () => {
    expect(SHOT_SCALES).toHaveLength(7)
  })

  it('FOCAL_LENGTHS 有 7 个值', () => {
    expect(FOCAL_LENGTHS).toHaveLength(7)
  })

  it('KEY_LIGHT_STYLES 有 7 个值', () => {
    expect(KEY_LIGHT_STYLES).toHaveLength(7)
  })
})
