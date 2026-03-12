/**
 * 血缘追踪与变更传导单元测试
 *
 * 覆盖：DAG 构建、双向遍历、stale 标记、影响分析、传导服务
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useLineageStore } from '@/store/lineage-store'
import { changePropagationService } from '@/services/change-propagation'

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function resetStore() {
  useLineageStore.getState().clearLineage()
}

/** 创建一个简单的 3 层 DAG: Bible → ShotSpec → GrayModel */
function buildTestDAG() {
  const store = useLineageStore.getState()

  const bibleId = store.addNode({
    type: 'character_image',
    sourceStage: 1,
    referenceId: 'char-arthur',
    locked: false,
    stale: false,
  })

  const shotId = store.addNode({
    type: 'shot_image',
    sourceStage: 3,
    referenceId: 'shot-01',
    locked: false,
    stale: false,
  })

  const grayId = store.addNode({
    type: 'gray_model',
    sourceStage: 4,
    referenceId: 'shot-01-gray',
    locked: false,
    stale: false,
  })

  // Bible → Shot → Gray
  store.addEdge(bibleId, shotId, 'derived_from', '角色设计 → 分镜')
  store.addEdge(shotId, grayId, 'derived_from', '分镜 → 灰模')

  return { bibleId, shotId, grayId }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('血缘 DAG 操作', () => {
  beforeEach(resetStore)

  it('创建节点和边', () => {
    const { bibleId, shotId, grayId } = buildTestDAG()
    const state = useLineageStore.getState()

    expect(state.nodes.size).toBe(3)
    expect(state.edges).toHaveLength(2)

    const bibleNode = state.getNode(bibleId)
    expect(bibleNode).toBeDefined()
    expect(bibleNode!.type).toBe('character_image')
    expect(bibleNode!.stale).toBe(false)
  })

  it('重复边被忽略', () => {
    const { bibleId, shotId } = buildTestDAG()
    const store = useLineageStore.getState()
    store.addEdge(bibleId, shotId, 'derived_from')
    expect(useLineageStore.getState().edges).toHaveLength(2)
  })
})

describe('双向遍历', () => {
  beforeEach(resetStore)

  it('getDescendants 返回所有下游', () => {
    const { bibleId, shotId, grayId } = buildTestDAG()
    const descendants = useLineageStore.getState().getDescendants(bibleId)
    expect(descendants).toHaveLength(2)
    expect(descendants.map((n) => n.id)).toContain(shotId)
    expect(descendants.map((n) => n.id)).toContain(grayId)
  })

  it('getAncestors 返回所有上游', () => {
    const { bibleId, shotId, grayId } = buildTestDAG()
    const ancestors = useLineageStore.getState().getAncestors(grayId)
    expect(ancestors).toHaveLength(2)
    expect(ancestors.map((n) => n.id)).toContain(shotId)
    expect(ancestors.map((n) => n.id)).toContain(bibleId)
  })

  it('getLineageChain 返回完整路径', () => {
    const { grayId } = buildTestDAG()
    const chain = useLineageStore.getState().getLineageChain(grayId)
    expect(chain).not.toBeNull()
    expect(chain!.depth).toBe(2)
    expect(chain!.path).toHaveLength(3)
  })
})

describe('stale 标记 (invalidateSubtree)', () => {
  beforeEach(resetStore)

  it('标记所有下游为 stale', () => {
    const { bibleId, shotId, grayId } = buildTestDAG()
    const store = useLineageStore.getState()

    const staleIds = store.invalidateSubtree(bibleId)

    expect(staleIds).toHaveLength(2)
    expect(staleIds).toContain(shotId)
    expect(staleIds).toContain(grayId)

    // Bible 自身不标记为 stale
    expect(store.getNode(bibleId)!.stale).toBe(false)
    // 下游标记为 stale
    expect(useLineageStore.getState().getNode(shotId)!.stale).toBe(true)
    expect(useLineageStore.getState().getNode(grayId)!.stale).toBe(true)
    expect(useLineageStore.getState().getNode(grayId)!.staleSource).toBe(bibleId)
  })

  it('locked 节点不被标记为 stale', () => {
    const { bibleId, shotId, grayId } = buildTestDAG()
    const store = useLineageStore.getState()

    // 锁定 shot
    store.lockNode(shotId)

    const staleIds = store.invalidateSubtree(bibleId)

    // Shot 被锁定，跳过
    expect(staleIds).not.toContain(shotId)
    expect(useLineageStore.getState().getNode(shotId)!.stale).toBe(false)
    // Gray 仍被标记
    expect(staleIds).toContain(grayId)
  })

  it('validateNode 恢复单个节点', () => {
    const { bibleId, shotId } = buildTestDAG()
    const store = useLineageStore.getState()

    store.invalidateSubtree(bibleId)
    expect(useLineageStore.getState().getNode(shotId)!.stale).toBe(true)

    useLineageStore.getState().validateNode(shotId)
    expect(useLineageStore.getState().getNode(shotId)!.stale).toBe(false)
    expect(useLineageStore.getState().getNode(shotId)!.staleSince).toBeUndefined()
  })

  it('getStaleNodes 返回所有失效节点', () => {
    const { bibleId } = buildTestDAG()
    useLineageStore.getState().invalidateSubtree(bibleId)

    const staleNodes = useLineageStore.getState().getStaleNodes()
    expect(staleNodes).toHaveLength(2)
    expect(staleNodes.every((n) => n.stale)).toBe(true)
  })
})

describe('影响分析 (analyzeImpact)', () => {
  beforeEach(resetStore)

  it('叶子节点无受影响资产', () => {
    const { grayId } = buildTestDAG()
    const report = useLineageStore.getState().analyzeImpact(grayId)
    expect(report.totalAffected).toBe(0)
    expect(report.recommendation).toBe('no_action')
  })

  it('根节点影响所有下游', () => {
    const { bibleId } = buildTestDAG()
    const report = useLineageStore.getState().analyzeImpact(bibleId)
    expect(report.totalAffected).toBe(2)
    expect(report.blastRadius).toBe(2)
    expect(report.affectedAssets[0].impactLevel).toBe('direct')
  })

  it('中间节点仅影响直接下游', () => {
    const { shotId } = buildTestDAG()
    const report = useLineageStore.getState().analyzeImpact(shotId)
    expect(report.totalAffected).toBe(1)
    expect(report.blastRadius).toBe(1)
  })
})

describe('变更传导服务', () => {
  beforeEach(resetStore)

  it('analyzeChangeImpact 代理到 store', () => {
    const { bibleId } = buildTestDAG()
    const report = changePropagationService.analyzeChangeImpact(bibleId)
    expect(report.totalAffected).toBe(2)
  })

  it('getChangeRecommendations 按优先级排序', () => {
    const { bibleId } = buildTestDAG()
    const recs = changePropagationService.getChangeRecommendations(bibleId)
    expect(recs.length).toBeGreaterThan(0)
    // 检查优先级递增
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].priority).toBeGreaterThanOrEqual(recs[i - 1].priority)
    }
  })

  it('previewChangeEffect 不修改状态', () => {
    const { bibleId } = buildTestDAG()
    const preview = changePropagationService.previewChangeEffect(bibleId)
    expect(preview.affectedCount).toBe(2)
    // 确保 stale 不被修改
    const staleNodes = useLineageStore.getState().getStaleNodes()
    expect(staleNodes).toHaveLength(0)
  })

  it('propagateChange 非自动模式返回 skipped', async () => {
    const { bibleId } = buildTestDAG()
    const result = await changePropagationService.propagateChange(bibleId, {
      autoExecute: false,
    })
    expect(result.success).toBe(true)
    expect(result.skipped.length).toBeGreaterThan(0)
    expect(result.propagated).toHaveLength(0)
  })
})

describe('版本管理', () => {
  beforeEach(resetStore)

  it('创建和查询版本', () => {
    const store = useLineageStore.getState()
    const nodeId = store.addNode({
      type: 'shot_image',
      sourceStage: 3,
      referenceId: 'shot-01',
      locked: false,
      stale: false,
    })

    // 先追踪生成参数
    store.trackGeneration(nodeId, {
      prompt: 'test prompt',
      model: 'sdxl',
      aspectRatio: '16:9',
      imageSize: '1K',
    })

    store.createVersion(nodeId, 'https://example.com/v1.png')
    store.createVersion(nodeId, 'https://example.com/v2.png')

    const versions = useLineageStore.getState().getVersions(nodeId)
    expect(versions).toHaveLength(2)
    expect(versions[0].version).toBe(1)
    expect(versions[1].version).toBe(2)

    const latest = useLineageStore.getState().getLatestVersion(nodeId)
    expect(latest!.url).toContain('v2.png')
  })
})

describe('导入导出', () => {
  beforeEach(resetStore)

  it('导出并重新导入', () => {
    buildTestDAG()
    const json = useLineageStore.getState().exportLineage()
    expect(json).toBeTruthy()

    useLineageStore.getState().clearLineage()
    expect(useLineageStore.getState().nodes.size).toBe(0)

    useLineageStore.getState().importLineage(json)
    expect(useLineageStore.getState().nodes.size).toBe(3)
    expect(useLineageStore.getState().edges).toHaveLength(2)
  })
})
