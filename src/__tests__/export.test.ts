/**
 * 导出服务单元测试
 *
 * 测试 JSON 归档导出的结构正确性和辅助函数。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock lineage-store（导出服务会读取血缘数据）
vi.mock('@/store/lineage-store', () => ({
  useLineageStore: {
    getState: () => ({
      getLineageGraph: () => ({ nodes: [], edges: [] }),
      generationHistory: [],
      getNodesByReference: () => [],
    }),
  },
  trackAssetGeneration: vi.fn(() => 'mock-asset-id'),
  linkAssetDependency: vi.fn(),
}))

import { generateArchivePackage } from '@/services/export/json-export'
import type { ProjectBible, ShotSpec, CharacterDesign, SceneDesign } from '@/types'

// ---------------------------------------------------------------------------
// 测试数据
// ---------------------------------------------------------------------------

const testBible: ProjectBible = {
  style: '黑暗奇幻',
  colorScript: '冷色为主',
  forbidden: '禁止卡通',
}

const testCharacters: CharacterDesign[] = [
  {
    id: 'char-1',
    name: '亚瑟',
    description: '年轻猎魔人',
    locked: true,
    imageAspectRatio: '9:16',
    imageSize: '1K',
    imageUrl: 'https://example.com/arthur.jpg',
  },
]

const testScenes: SceneDesign[] = [
  {
    id: 'scene-1',
    name: '洞穴',
    description: '黑暗潮湿的龙穴',
    locked: true,
    imageAspectRatio: '16:9',
    imageSize: '1K',
  },
]

const testShotSpecs: ShotSpec[] = [
  {
    id: 'shot-01',
    shotCode: 'S01',
    description: '主角踏入洞穴',
    lens: '24mm',
    composition: '对称',
    emotion: '紧张',
  },
  {
    id: 'shot-02',
    shotCode: 'S02',
    description: '龙眼特写',
    lens: '135mm',
    composition: '居中',
    emotion: '恐惧',
  },
]

// ---------------------------------------------------------------------------
// JSON 归档导出
// ---------------------------------------------------------------------------

describe('JSON 归档导出', () => {
  beforeEach(() => vi.clearAllMocks())

  it('生成的归档包包含关键字段', async () => {
    const result = await generateArchivePackage(
      testBible,
      '原始大纲',
      '扩写后剧本',
      testCharacters,
      testScenes,
      testShotSpecs,
      5,
    )

    expect(result.filename).toContain('分镜归档')
    expect(result.filename).toMatch(/\.json$/)
    expect(result.fileSize).toBeGreaterThan(0)
    expect(result.assetCount).toBeGreaterThanOrEqual(0)

    // 验证 JSON 内容可解析
    const parsed = JSON.parse(result.content)
    expect(parsed.projectBible).toBeDefined()
    expect(parsed.projectBible.style).toBe('黑暗奇幻')
    expect(parsed.rawScript).toBe('原始大纲')
    expect(parsed.expandedScript).toBe('扩写后剧本')
    expect(parsed.shotSpecs).toHaveLength(2)
    expect(parsed.characters).toHaveLength(1)
    expect(parsed.scenes).toHaveLength(1)
  })

  it('metadata 统计正确', async () => {
    const result = await generateArchivePackage(
      testBible,
      '原始大纲',
      '扩写后剧本',
      testCharacters,
      testScenes,
      testShotSpecs,
      5,
    )

    const parsed = JSON.parse(result.content)
    expect(parsed.metadata.totalShots).toBe(2)
    expect(parsed.metadata.totalCharacters).toBe(1)
    expect(parsed.metadata.totalScenes).toBe(1)
    expect(parsed.metadata.workflowStageId).toBe(5)
  })

  it('includeImages=false 时不包含图片数据', async () => {
    const result = await generateArchivePackage(
      testBible,
      '大纲',
      '剧本',
      testCharacters,
      testScenes,
      testShotSpecs,
      5,
      { includeImages: false },
    )

    const parsed = JSON.parse(result.content)
    // 角色图片应被移除
    expect(parsed.characters[0].imageUrl).toBeUndefined()
  })

  it('version 字段存在', async () => {
    const result = await generateArchivePackage(
      testBible,
      '大纲',
      '剧本',
      testCharacters,
      testScenes,
      testShotSpecs,
      3,
    )

    const parsed = JSON.parse(result.content)
    expect(parsed.version).toBeDefined()
    expect(typeof parsed.version).toBe('string')
  })
})
