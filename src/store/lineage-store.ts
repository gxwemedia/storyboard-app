/**
 * 资产血缘状态管理 Store
 * 
 * 使用Zustand管理资产血缘追踪的完整状态，
 * 支持DAG图操作、节点查询和血缘追踪。
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  AssetNode,
  AssetType,
  GenerationParams,
  LineageEdge,
  LineageGraph,
  LineageChain,
  ImpactReport,
  AffectedAsset,
  RelationType,
  VersionDiff,
  AssetVersion,
} from '@/types'
import type { StageId, ImageAspectRatio, ImageSize } from '@/types'

// ---------------------------------------------------------------------------
// State 接口
// ---------------------------------------------------------------------------

interface LineageState {
  // 核心数据
  nodes: Map<string, AssetNode>
  edges: LineageEdge[]
  generationHistory: GenerationParams[]
  versions: Map<string, AssetVersion[]>
  
  // 缓存
  nodeMap: Map<string, AssetNode>
  inEdges: Map<string, LineageEdge[]>
  outEdges: Map<string, LineageEdge[]>
  
  // Actions — 节点操作
  addNode: (node: Omit<AssetNode, 'id' | 'generatedAt' | 'version'>) => string
  updateNode: (id: string, updates: Partial<AssetNode>) => void
  removeNode: (id: string) => void
  lockNode: (id: string) => void
  unlockNode: (id: string) => void
  
  // Actions — 边操作
  addEdge: (sourceId: string, targetId: string, relationType: RelationType, description?: string) => void
  removeEdge: (edgeId: string) => void
  
  // Actions — 生成参数追踪
  trackGeneration: (nodeId: string, params: Omit<GenerationParams, 'id' | 'assetId' | 'generatedAt'>) => void
  
  // Actions — 版本管理
  createVersion: (assetId: string, url: string, thumbnailUrl?: string, note?: string) => void
  getVersions: (assetId: string) => AssetVersion[]
  getLatestVersion: (assetId: string) => AssetVersion | undefined
  compareVersions: (assetId: string, v1: number, v2: number) => VersionDiff | undefined
  
  // Actions — 查询操作
  getNode: (id: string) => AssetNode | undefined
  getNodesByType: (type: AssetType) => AssetNode[]
  getNodesByStage: (stageId: StageId) => AssetNode[]
  getNodesByReference: (referenceId: string) => AssetNode[]
  
  // Actions — 血缘查询
  getAncestors: (assetId: string) => AssetNode[]
  getDescendants: (assetId: string) => AssetNode[]
  getLineageChain: (assetId: string) => LineageChain | null
  getAllDependencies: (assetId: string) => Map<string, AssetNode[]>
  
  // Actions — 影响分析
  analyzeImpact: (assetId: string, maxDepth?: number) => ImpactReport
  
  // Actions — 图操作
  getLineageGraph: () => LineageGraph
  clearLineage: () => void
  exportLineage: () => string
  importLineage: (json: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

const buildIndexes = (nodes: Map<string, AssetNode>, edges: LineageEdge[]) => {
  const nodeMap = new Map<string, AssetNode>()
  const inEdges = new Map<string, LineageEdge[]>()
  const outEdges = new Map<string, LineageEdge[]>()
  
  // 构建节点索引
  nodes.forEach((node, id) => nodeMap.set(id, node))
  
  // 构建边索引
  edges.forEach((edge) => {
    // 入边
    if (!inEdges.has(edge.targetId)) {
      inEdges.set(edge.targetId, [])
    }
    inEdges.get(edge.targetId)!.push(edge)
    
    // 出边
    if (!outEdges.has(edge.sourceId)) {
      outEdges.set(edge.sourceId, [])
    }
    outEdges.get(edge.sourceId)!.push(edge)
  })
  
  return { nodeMap, inEdges, outEdges }
}

// ---------------------------------------------------------------------------
// Store 实现
// ---------------------------------------------------------------------------

export const useLineageStore = create<LineageState>()(
  subscribeWithSelector((set, get) => ({
    // ---- Initial state ----
    nodes: new Map(),
    edges: [],
    generationHistory: [],
    versions: new Map(),
    nodeMap: new Map(),
    inEdges: new Map(),
    outEdges: new Map(),
    
    // ---- Node actions ----
    
    addNode: (nodeData) => {
      const id = generateId('asset')
      const now = new Date()
      
      // 计算版本号
      const existingNodes = Array.from(get().nodes.values())
        .filter(n => n.type === nodeData.type && n.referenceId === nodeData.referenceId)
      const version = existingNodes.length + 1
      
      const node: AssetNode = {
        ...nodeData,
        id,
        generatedAt: now,
        version,
      }
      
      set((state) => {
        const newNodes = new Map(state.nodes)
        newNodes.set(id, node)
        const { nodeMap, inEdges, outEdges } = buildIndexes(newNodes, state.edges)
        
        return {
          nodes: newNodes,
          nodeMap,
          inEdges,
          outEdges,
        }
      })
      
      return id
    },
    
    updateNode: (id, updates) => {
      set((state) => {
        const node = state.nodes.get(id)
        if (!node) return state
        
        const newNodes = new Map(state.nodes)
        newNodes.set(id, { ...node, ...updates })
        const { nodeMap, inEdges, outEdges } = buildIndexes(newNodes, state.edges)
        
        return {
          nodes: newNodes,
          nodeMap,
          inEdges,
          outEdges,
        }
      })
    },
    
    removeNode: (id) => {
      set((state) => {
        const newNodes = new Map(state.nodes)
        newNodes.delete(id)
        
        // 删除相关的边
        const newEdges = state.edges.filter(
          (e) => e.sourceId !== id && e.targetId !== id
        )
        
        // 删除相关的生成历史
        const newHistory = state.generationHistory.filter((h) => h.assetId !== id)
        
        // 删除相关的版本
        const newVersions = new Map(state.versions)
        newVersions.delete(id)
        
        const { nodeMap, inEdges, outEdges } = buildIndexes(newNodes, newEdges)
        
        return {
          nodes: newNodes,
          edges: newEdges,
          generationHistory: newHistory,
          versions: newVersions,
          nodeMap,
          inEdges,
          outEdges,
        }
      })
    },
    
    lockNode: (id) => {
      get().updateNode(id, { locked: true })
    },
    
    unlockNode: (id) => {
      get().updateNode(id, { locked: false })
    },
    
    // ---- Edge actions ----
    
    addEdge: (sourceId, targetId, relationType, description) => {
      // 检查是否存在重复边
      const existingEdge = get().edges.find(
        (e) => e.sourceId === sourceId && e.targetId === targetId
      )
      if (existingEdge) return
      
      const edge: LineageEdge = {
        id: generateId('edge'),
        sourceId,
        targetId,
        relationType,
        createdAt: new Date(),
        description,
      }
      
      set((state) => {
        const newEdges = [...state.edges, edge]
        const { nodeMap, inEdges, outEdges } = buildIndexes(state.nodes, newEdges)
        
        return {
          edges: newEdges,
          nodeMap,
          inEdges,
          outEdges,
        }
      })
    },
    
    removeEdge: (edgeId) => {
      set((state) => {
        const newEdges = state.edges.filter((e) => e.id !== edgeId)
        const { nodeMap, inEdges, outEdges } = buildIndexes(state.nodes, newEdges)
        
        return {
          edges: newEdges,
          nodeMap,
          inEdges,
          outEdges,
        }
      })
    },
    
    // ---- Generation tracking ----
    
    trackGeneration: (nodeId, paramsData) => {
      const now = new Date()
      const params: GenerationParams = {
        ...paramsData,
        id: generateId('gen'),
        assetId: nodeId,
        generatedAt: now,
      }
      
      set((state) => ({
        generationHistory: [...state.generationHistory, params],
      }))
    },
    
    // ---- Version management ----
    
    createVersion: (assetId, url, thumbnailUrl, note) => {
      const node = get().nodes.get(assetId)
      if (!node) return
      
      const existingVersions = get().versions.get(assetId) || []
      const newVersion: AssetVersion = {
        id: generateId('ver'),
        assetId,
        version: existingVersions.length + 1,
        createdAt: new Date(),
        params: existingVersions.length > 0 
          ? existingVersions[existingVersions.length - 1].params 
          : get().generationHistory.find(h => h.assetId === assetId)!,
        url,
        thumbnailUrl,
        note,
      }
      
      set((state) => {
        const newVersions = new Map(state.versions)
        newVersions.set(assetId, [...existingVersions, newVersion])
        
        // 同时更新节点的版本号
        const newNodes = new Map(state.nodes)
        newNodes.set(assetId, { ...node, version: newVersion.version, url })
        
        return { versions: newVersions, nodes: newNodes }
      })
    },
    
    getVersions: (assetId) => {
      return get().versions.get(assetId) || []
    },
    
    getLatestVersion: (assetId) => {
      const versions = get().versions.get(assetId)
      if (!versions || versions.length === 0) return undefined
      return versions[versions.length - 1]
    },
    
    compareVersions: (assetId, v1, v2) => {
      const versions = get().versions.get(assetId)
      if (!versions) return undefined
      
      const oldVer = versions.find((v) => v.version === v1)
      const newVer = versions.find((v) => v.version === v2)
      if (!oldVer || !newVer) return undefined
      
      const oldParams = oldVer.params
      const newParams = newVer.params
      
      const paramChanges: VersionDiff['paramChanges'] = []
      
      // 比较所有参数
      const allKeys = new Set([
        ...Object.keys(oldParams),
        ...Object.keys(newParams),
      ])
      
      allKeys.forEach((key) => {
        const oldValue = (oldParams as Record<string, unknown>)[key]
        const newValue = (newParams as Record<string, unknown>)[key]
        if (oldValue !== newValue) {
          paramChanges.push({ field: key, oldValue, newValue })
        }
      })
      
      return {
        assetId,
        oldVersion: v1,
        newVersion: v2,
        paramChanges,
        timestamp: new Date(),
      }
    },
    
    // ---- Query actions ----
    
    getNode: (id) => {
      return get().nodeMap.get(id)
    },
    
    getNodesByType: (type) => {
      return Array.from(get().nodes.values()).filter((n) => n.type === type)
    },
    
    getNodesByStage: (stageId) => {
      return Array.from(get().nodes.values()).filter((n) => n.sourceStage === stageId)
    },
    
    getNodesByReference: (referenceId) => {
      return Array.from(get().nodes.values()).filter((n) => n.referenceId === referenceId)
    },
    
    // ---- Lineage queries ----
    
    getAncestors: (assetId, visited = new Set<string>()): AssetNode[] => {
      if (visited.has(assetId)) return []
      visited.add(assetId)
      
      const state = get()
      const inEdges = state.inEdges.get(assetId) || []
      const ancestors: AssetNode[] = []
      
      for (const edge of inEdges) {
        const sourceNode = state.nodeMap.get(edge.sourceId)
        if (sourceNode) {
          ancestors.push(sourceNode)
          ancestors.push(...get().getAncestors(edge.sourceId, visited))
        }
      }
      
      return ancestors
    },
    
    getDescendants: (assetId, visited = new Set<string>()): AssetNode[] => {
      if (visited.has(assetId)) return []
      visited.add(assetId)
      
      const state = get()
      const outEdges = state.outEdges.get(assetId) || []
      const descendants: AssetNode[] = []
      
      for (const edge of outEdges) {
        const targetNode = state.nodeMap.get(edge.targetId)
        if (targetNode) {
          descendants.push(targetNode)
          descendants.push(...get().getDescendants(edge.targetId, visited))
        }
      }
      
      return descendants
    },
    
    getLineageChain: (assetId) => {
      const state = get()
      const node = state.nodeMap.get(assetId)
      if (!node) return null
      
      const ancestors = get().getAncestors(assetId)
      const path = [...ancestors.reverse(), node]
      
      return {
        assetId,
        path,
        depth: path.length - 1,
        totalDependencies: ancestors.length,
      }
    },
    
    getAllDependencies: (assetId) => {
      const state = get()
      const dependencies = new Map<string, AssetNode[]>()
      
      // 获取直接依赖
      const directAncestors = state.inEdges.get(assetId) || []
      const directDescendants = state.outEdges.get(assetId) || []
      
      dependencies.set('direct_ancestors', [])
      dependencies.set('direct_descendants', [])
      
      for (const edge of directAncestors) {
        const node = state.nodeMap.get(edge.sourceId)
        if (node) {
          dependencies.get('direct_ancestors')!.push(node)
        }
      }
      
      for (const edge of directDescendants) {
        const node = state.nodeMap.get(edge.targetId)
        if (node) {
          dependencies.get('direct_descendants')!.push(node)
        }
      }
      
      // 获取所有祖先和后代
      dependencies.set('all_ancestors', get().getAncestors(assetId))
      dependencies.set('all_descendants', get().getDescendants(assetId))
      
      return dependencies
    },
    
    // ---- Impact analysis ----
    
    analyzeImpact: (assetId, maxDepth = 3) => {
      const state = get()
      const node = state.nodeMap.get(assetId)
      if (!node) {
        return {
          changedAssetId: assetId,
          affectedAssets: [],
          totalAffected: 0,
          blastRadius: 0,
          recommendation: 'no_action' as const,
        }
      }
      
      // 获取所有后代（受影响资产）
      const allDescendants = get().getDescendants(assetId)
      
      // 按深度分组
      const affectedAssets: AffectedAsset[] = []
      let blastRadius = 0
      
      const collectDescendants = (id: string, depth: number) => {
        if (depth > maxDepth) return
        
        const outEdges = state.outEdges.get(id) || []
        for (const edge of outEdges) {
          const targetNode = state.nodeMap.get(edge.targetId)
          if (targetNode) {
            blastRadius = Math.max(blastRadius, depth)
            affectedAssets.push({
              node: targetNode,
              impactLevel: depth === 1 ? 'direct' : 'indirect',
              depth,
              reason: `${edge.relationType}: ${edge.description || ''}`,
            })
            collectDescendants(edge.targetId, depth + 1)
          }
        }
      }
      
      collectDescendants(assetId, 1)
      
      // 计算预估成本
      const regenerationCount = affectedAssets.length
      const estimatedTime = regenerationCount * 30 // 假设每次重绘30秒
      
      // 判断建议
      let recommendation: ImpactReport['recommendation']
      if (regenerationCount === 0) {
        recommendation = 'no_action'
      } else if (regenerationCount <= 3) {
        recommendation = 'propagate'
      } else {
        recommendation = 'manual_review'
      }
      
      return {
        changedAssetId: assetId,
        affectedAssets,
        totalAffected: regenerationCount,
        blastRadius,
        recommendation,
        estimatedCost: {
          regenerationCount,
          estimatedTime,
        },
      }
    },
    
    // ---- Graph operations ----
    
    getLineageGraph: (): LineageGraph => {
      const state = get()
      return {
        nodes: Array.from(state.nodes.values()),
        edges: state.edges,
        nodeMap: state.nodeMap,
        inEdges: state.inEdges,
        outEdges: state.outEdges,
      }
    },
    
    clearLineage: () => {
      set({
        nodes: new Map(),
        edges: [],
        generationHistory: [],
        versions: new Map(),
        nodeMap: new Map(),
        inEdges: new Map(),
        outEdges: new Map(),
      })
    },
    
    exportLineage: () => {
      const state = get()
      return JSON.stringify({
        nodes: Array.from(state.nodes.entries()),
        edges: state.edges,
        generationHistory: state.generationHistory,
      }, null, 2)
    },
    
    importLineage: (json) => {
      try {
        const data = JSON.parse(json)
        
        set({
          nodes: new Map(data.nodes || []),
          edges: data.edges || [],
          generationHistory: data.generationHistory || [],
          versions: new Map(),
          ...buildIndexes(new Map(data.nodes || []), data.edges || []),
        })
      } catch (error) {
        console.error('Failed to import lineage:', error)
        throw new Error('Invalid lineage JSON format')
      }
    },
  }))
)

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 追踪资产生成（简化版）
 */
export function trackAssetGeneration(
  type: AssetType,
  referenceId: string,
  sourceStage: StageId,
  url: string,
  params: {
    prompt: string
    model: string
    aspectRatio: ImageAspectRatio
    imageSize: ImageSize
    seed?: number
    loraIds?: string[]
  }
): string {
  const store = useLineageStore.getState()
  
  // 创建节点
  const nodeId = store.addNode({
    type,
    sourceStage,
    referenceId,
    url,
    locked: false,
  })
  
  // 追踪生成参数
  store.trackGeneration(nodeId, {
    prompt: params.prompt,
    model: params.model,
    aspectRatio: params.aspectRatio,
    imageSize: params.imageSize,
    seed: params.seed,
    loraIds: params.loraIds,
  })
  
  // 创建初始版本
  store.createVersion(nodeId, url)
  
  return nodeId
}

/**
 * 建立资产间的依赖关系
 */
export function linkAssetDependency(
  sourceId: string,
  targetId: string,
  relationType: RelationType,
  description?: string
): void {
  const store = useLineageStore.getState()
  store.addEdge(sourceId, targetId, relationType, description)
}
