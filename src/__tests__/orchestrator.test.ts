/**
 * orchestrator 单元测试
 *
 * 测试 Prompt 组装逻辑和 ShotSpec JSON 解析，
 * AI 调用通过 mock 不做真实网络请求。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ai-client 模块：不发真实 API 请求
vi.mock('@/services/ai-client', () => ({
  sendPrompt: vi.fn(),
  sendImagePrompt: vi.fn(),
}))

// Mock sdxl-client：不发真实 API 请求
vi.mock('@/services/sdxl-client', () => ({
  generateGrayModel: vi.fn(),
  generateGrayModelMock: vi.fn(),
}))

import { sendPrompt } from '@/services/ai-client'
import {
  orchestrateStage1,
  orchestrateStage3,
  orchestrateStage2Consistency,
} from '@/services/orchestrator'
import type { ProjectBible } from '@/types'

// ---------------------------------------------------------------------------
// 测试数据
// ---------------------------------------------------------------------------

const testBible: ProjectBible = {
  style: '黑暗奇幻',
  colorScript: '冷色为主',
  forbidden: '禁止卡通',
}

// ---------------------------------------------------------------------------
// Stage 1 剧本扩写
// ---------------------------------------------------------------------------

describe('orchestrateStage1 - 剧本扩写', () => {
  beforeEach(() => vi.clearAllMocks())

  it('将 bible 和 rawScript 组装到 prompt 中', async () => {
    const mockSendPrompt = vi.mocked(sendPrompt)
    mockSendPrompt.mockResolvedValueOnce({ content: '扩写后的剧本内容', imageUrls: [] })

    const result = await orchestrateStage1(testBible, '原始大纲')

    expect(mockSendPrompt).toHaveBeenCalledTimes(1)
    const messages = mockSendPrompt.mock.calls[0][0]

    // system prompt 应当包含编剧相关指令
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('编剧')

    // user prompt 应当包含 bible 字段和原始剧本
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('黑暗奇幻')
    expect(messages[1].content).toContain('冷色为主')
    expect(messages[1].content).toContain('禁止卡通')
    expect(messages[1].content).toContain('原始大纲')

    expect(result.expandedScript).toBe('扩写后的剧本内容')
  })

  it('返回值会被 trim', async () => {
    vi.mocked(sendPrompt).mockResolvedValueOnce({
      content: '  前后有空格的文本  ',
      imageUrls: [],
    })
    const result = await orchestrateStage1(testBible, '测试')
    expect(result.expandedScript).toBe('前后有空格的文本')
  })
})

// ---------------------------------------------------------------------------
// Stage 3 ShotSpec 解析
// ---------------------------------------------------------------------------

describe('orchestrateStage3 - ShotSpec 解析', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正确解析标准 JSON 数组', async () => {
    const shotJson = JSON.stringify([
      {
        shotCode: 'S01',
        description: '主角走入洞穴',
        lens: '24mm 广角',
        composition: '对称构图',
        emotion: '紧张',
      },
      {
        shotCode: 'S02',
        description: '特写龙眼',
        lens: '135mm',
        composition: '居中',
        emotion: '恐惧',
      },
    ])

    vi.mocked(sendPrompt).mockResolvedValueOnce({ content: shotJson, imageUrls: [] })

    const result = await orchestrateStage3(testBible, '扩写剧本', '概念锁定')

    expect(result.shotSpecs).toHaveLength(2)
    expect(result.shotSpecs[0].shotCode).toBe('S01')
    expect(result.shotSpecs[0].description).toBe('主角走入洞穴')
    expect(result.shotSpecs[1].shotCode).toBe('S02')
  })

  it('解析被 markdown 代码块包裹的 JSON', async () => {
    const wrappedJson = '```json\n[{"shotCode":"S01","description":"测试","lens":"50mm","composition":"中心","emotion":"平静"}]\n```'
    vi.mocked(sendPrompt).mockResolvedValueOnce({ content: wrappedJson, imageUrls: [] })

    const result = await orchestrateStage3(testBible, '剧本', '概念')
    expect(result.shotSpecs).toHaveLength(1)
    expect(result.shotSpecs[0].shotCode).toBe('S01')
  })

  it('自动生成 id 和 shotCode 补全', async () => {
    const json = JSON.stringify([
      { description: '无编号镜头', lens: '35mm', composition: '三分法', emotion: '安宁' },
    ])

    vi.mocked(sendPrompt).mockResolvedValueOnce({ content: json, imageUrls: [] })

    const result = await orchestrateStage3(testBible, '剧本', '概念')
    expect(result.shotSpecs[0].id).toBe('shot-01')
    expect(result.shotSpecs[0].shotCode).toBe('S01')
  })

  it('无效 JSON 抛出错误', async () => {
    vi.mocked(sendPrompt).mockResolvedValueOnce({ content: '这不是JSON', imageUrls: [] })

    await expect(orchestrateStage3(testBible, '剧本', '概念')).rejects.toThrow(
      /JSON 格式无效/
    )
  })

  it('缺失字段默认为空字符串', async () => {
    const json = JSON.stringify([{ shotCode: 'S01' }])
    vi.mocked(sendPrompt).mockResolvedValueOnce({ content: json, imageUrls: [] })

    const result = await orchestrateStage3(testBible, '剧本', '概念')
    expect(result.shotSpecs[0].description).toBe('')
    expect(result.shotSpecs[0].lens).toBe('')
    expect(result.shotSpecs[0].emotion).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Stage 2 一致性描述
// ---------------------------------------------------------------------------

describe('orchestrateStage2Consistency - 一致性描述', () => {
  beforeEach(() => vi.clearAllMocks())

  it('角色一致性描述包含角色关键词', async () => {
    vi.mocked(sendPrompt).mockResolvedValueOnce({
      content: '角色视觉描述文本',
      imageUrls: [],
    })

    const result = await orchestrateStage2Consistency(testBible, 'character', '亚瑟', '勇士猎魔人')

    const messages = vi.mocked(sendPrompt).mock.calls[0][0]
    expect(messages[0].content).toContain('角色')
    expect(messages[1].content).toContain('亚瑟')
    expect(messages[1].content).toContain('勇士猎魔人')
    expect(result.consistencyPrompt).toBe('角色视觉描述文本')
  })

  it('场景一致性描述包含场景关键词', async () => {
    vi.mocked(sendPrompt).mockResolvedValueOnce({
      content: '场景环境描述',
      imageUrls: [],
    })

    const result = await orchestrateStage2Consistency(testBible, 'scene', '龙巢', '黑暗洞穴')

    const messages = vi.mocked(sendPrompt).mock.calls[0][0]
    expect(messages[0].content).toContain('场景')
    expect(messages[1].content).toContain('龙巢')
    expect(result.consistencyPrompt).toBe('场景环境描述')
  })
})
