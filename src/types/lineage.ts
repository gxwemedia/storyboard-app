/**
 * 资产血缘追踪类型定义
 * 
 * 用于追踪每个资产（图片、灰模等）的生成来源、参数依赖和版本历史
 */

import type { StageId, ImageAspectRatio, ImageSize } from '../index'

// ---------------------------------------------------------------------------
// 资产节点类型
// ---------------------------------------------------------------------------

/** 资产类型 */
export type AssetType = 
  | 'character_image'   // 角色概念图
  | 'scene_image'       // 场景概念图
  | 'shot_image'        // 分镜图
  | 'gray_model'        // 灰模预演

/** 资产节点：代表一个可追踪的生产资产 */
export interface AssetNode {
  id: string
  type: AssetType
  sourceStage: StageId
  generatedAt: Date
  version: number
  locked: boolean
  /** 关联的业务对象ID（如角色ID、场景ID、镜头ID） */
  referenceId?: string
  /** 文件URL或Base64数据 */
  url?: string
  /** 缩略图URL */
  thumbnailUrl?: string
}

// ---------------------------------------------------------------------------
// 生成参数类型
// ---------------------------------------------------------------------------

/** ControlNet配置 */
export interface ControlNetConfig {
  type: 'depth' | 'canny' | 'openpose' | 'scribble'
  strength: number  // 0.0 - 1.0
  preprocessor: string
  /** ControlNet参考图URL */
  referenceImage?: string
}

/** 生成参数快照 */
export interface GenerationParams {
  id: string
  assetId: string
  generatedAt: Date
  
  // 文本参数
  prompt: string
  negativePrompt?: string
  
  // 模型参数
  model: string
  aspectRatio: ImageAspectRatio
  imageSize: ImageSize
  temperature?: number
  
  // 高级参数
  seed?: number
  loraIds?: string[]
  controlNetSettings?: ControlNetConfig[]
  
  // 其他参数
  steps?: number
  sampler?: string
  cfgScale?: number
  
  /** API返回的原始数据（用于调试） */
  rawResponse?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// 血缘关系类型
// ---------------------------------------------------------------------------

/** 关系类型 */
export type RelationType = 
  | 'derived_from'          // 衍生自（如：灰模衍生自ShotSpec）
  | 'consistency_locked'    // 一致性锁定（如：分镜图锁定角色外观）
  | 'parameter_inherited'   // 参数继承（如：继承相同的Prompt模板）
  | 'version_succession'    // 版本延续（如：重新生成的版本）

/** 血缘边：代表依赖关系 */
export interface LineageEdge {
  id: string
  sourceId: string      // 源节点ID
  targetId: string      // 目标节点ID
  relationType: RelationType
  createdAt: Date
  /** 关系描述 */
  description?: string
}

// ---------------------------------------------------------------------------
// 血缘图类型
// ---------------------------------------------------------------------------

/** 血缘链：从根节点到当前节点的完整路径 */
export interface LineageChain {
  assetId: string
  path: AssetNode[]
  depth: number
  totalDependencies: number
}

/** 血缘图 */
export interface LineageGraph {
  nodes: AssetNode[]
  edges: LineageEdge[]
  /** 节点ID到节点的映射 */
  nodeMap: Map<string, AssetNode>
  /** 节点ID到入边的映射 */
  inEdges: Map<string, LineageEdge[]>
  /** 节点ID到出边的映射 */
  outEdges: Map<string, LineageEdge[]>
}

// ---------------------------------------------------------------------------
// 影响分析类型
// ---------------------------------------------------------------------------

/** 受影响的资产 */
export interface AffectedAsset {
  node: AssetNode
  impactLevel: 'direct' | 'indirect'
  depth: number
  reason: string
}

/** 影响报告 */
export interface ImpactReport {
  changedAssetId: string
  affectedAssets: AffectedAsset[]
  totalAffected: number
  blastRadius: number  // 爆炸半径（最大深度）
  recommendation: 'propagate' | 'manual_review' | 'no_action'
  estimatedCost?: {
    regenerationCount: number
    estimatedTime: number  // 秒
  }
}

// ---------------------------------------------------------------------------
// 版本管理类型
// ---------------------------------------------------------------------------

/** 资产版本快照 */
export interface AssetVersion {
  id: string
  assetId: string
  version: number
  createdAt: Date
  params: GenerationParams
  url: string
  thumbnailUrl?: string
  approvedBy?: string  // 审批人
  approvedAt?: Date
  note?: string
}

/** 版本对比结果 */
export interface VersionDiff {
  assetId: string
  oldVersion: number
  newVersion: number
  paramChanges: {
    field: string
    oldValue: unknown
    newValue: unknown
  }[]
  timestamp: Date
}
