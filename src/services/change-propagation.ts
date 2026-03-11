/**
 * 变更传导服务
 * 
 * 实现增量更新和爆炸半径控制，
 * 支持局部重绘和自动影响分析。
 */

import { useLineageStore, trackAssetGeneration, linkAssetDependency } from '@/store/lineage-store'
import type { AssetNode, ImpactReport, AffectedAsset, GenerationParams, RelationType } from '@/types'
import type { StageId, ImageAspectRatio, ImageSize } from '@/types'

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 受影响的资产及操作 */
export interface AffectedAssetAction {
  asset: AssetNode
  action: 'regenerate' | 'revalidate' | 'notify'
  reason: string
  priority: number
}

/** 传导结果 */
export interface PropagationResult {
  success: boolean
  propagated: AffectedAssetAction[]
  failed: AffectedAssetAction[]
  skipped: AffectedAssetAction[]
  totalTime: number
}

/** 传导选项 */
export interface PropagationOptions {
  /** 最大爆炸半径 */
  maxBlastRadius: number
  /** 是否自动执行 */
  autoExecute: boolean
  /** 是否并行执行 */
  parallel: boolean
  /** 回调函数 */
  onProgress?: (progress: number, message: string) => void
  /** 错误回调 */
  onError?: (error: Error, asset: AffectedAssetAction) => void
}

/** 渲染器接口（用于实际重新生成资产） */
export interface AssetRenderer {
  /** 重新生成角色概念图 */
  regenerateCharacter: (characterId: string, params: Partial<GenerationParams>) => Promise<string>
  /** 重新生成场景概念图 */
  regenerateScene: (sceneId: string, params: Partial<GenerationParams>) => Promise<string>
  /** 重新生成分镜图 */
  regenerateShot: (shotId: string, params: Partial<GenerationParams>) => Promise<string>
  /** 重新生成灰模 */
  regenerateGrayModel: (shotId: string, params: Partial<GenerationParams>) => Promise<string>
}

// ---------------------------------------------------------------------------
// 核心服务类
// ---------------------------------------------------------------------------

class ChangePropagationService {
  private renderer: AssetRenderer | null = null
  private defaultOptions: PropagationOptions = {
    maxBlastRadius: 3,
    autoExecute: false,
    parallel: true,
  }

  /**
   * 注册渲染器
   */
  registerRenderer(renderer: AssetRenderer): void {
    this.renderer = renderer
  }

  /**
   * 设置默认选项
   */
  setDefaultOptions(options: Partial<PropagationOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options }
  }

  /**
   * 分析变更影响
   * 
   * 当某个资产被修改时，分析需要重新生成或验证的下游资产
   */
  analyzeChangeImpact(assetId: string, maxDepth?: number): ImpactReport {
    const lineageStore = useLineageStore.getState()
    return lineageStore.analyzeImpact(assetId, maxDepth || this.defaultOptions.maxBlastRadius)
  }

  /**
   * 获取变更建议
   * 
   * 基于影响分析，返回具体的操作建议
   */
  getChangeRecommendations(assetId: string): AffectedAssetAction[] {
    const impact = this.analyzeChangeImpact(assetId)
    const recommendations: AffectedAssetAction[] = []
    
    for (const affected of impact.affectedAssets) {
      let action: AffectedAssetAction['action']
      let priority: number
      let reason: string
      
      // 根据资产类型和影响级别决定操作
      switch (affected.node.type) {
        case 'gray_model':
          action = 'regenerate'
          priority = 1
          reason = '灰模依赖于ShotSpec，需要重新生成'
          break
        case 'shot_image':
          action = 'regenerate'
          priority = 2
          reason = '分镜图可能受上游变更影响，需要重新生成'
          break
        case 'character_image':
          if (affected.impactLevel === 'direct') {
            action = 'regenerate'
            priority = 1
            reason = '角色概念图直接依赖变更源'
          } else {
            action = 'revalidate'
            priority = 3
            reason = '间接依赖，需要验证一致性'
          }
          break
        case 'scene_image':
          if (affected.impactLevel === 'direct') {
            action = 'regenerate'
            priority = 1
            reason = '场景概念图直接依赖变更源'
          } else {
            action = 'revalidate'
            priority = 3
            reason = '间接依赖，需要验证一致性'
          }
          break
        default:
          action = 'notify'
          priority = 4
          reason = '需要人工确认'
      }
      
      recommendations.push({
        asset: affected.node,
        action,
        reason,
        priority,
      })
    }
    
    // 按优先级排序
    return recommendations.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 传导变更
   * 
   * 自动执行受影响资产的操作
   */
  async propagateChange(
    assetId: string,
    options?: Partial<PropagationOptions>
  ): Promise<PropagationResult> {
    const opts = { ...this.defaultOptions, ...options }
    const startTime = Date.now()
    
    const recommendations = this.getChangeRecommendations(assetId)
    
    const propagated: AffectedAssetAction[] = []
    const failed: AffectedAssetAction[] = []
    const skipped: AffectedAssetAction[] = []
    
    // 过滤超出爆炸半径的资产
    const filteredRecommendations = recommendations.filter(
      (r) => r.asset.sourceStage <= opts.maxBlastRadius
    )
    
    // 如果不自动执行，返回建议但不执行
    if (!opts.autoExecute) {
      return {
        success: true,
        propagated: [],
        failed: [],
        skipped: filteredRecommendations,
        totalTime: Date.now() - startTime,
      }
    }
    
    // 检查渲染器是否注册
    if (!this.renderer) {
      throw new Error('AssetRenderer not registered. Please call registerRenderer() first.')
    }
    
    // 执行操作
    for (let i = 0; i < filteredRecommendations.length; i++) {
      const recommendation = filteredRecommendations[i]
      
      opts.onProgress?.(
        Math.round((i / filteredRecommendations.length) * 100),
        `处理资产: ${recommendation.asset.id}`
      )
      
      try {
        await this.executeAction(recommendation)
        propagated.push(recommendation)
      } catch (error) {
        opts.onError?.(error as Error, recommendation)
        failed.push(recommendation)
      }
    }
    
    return {
      success: failed.length === 0,
      propagated,
      failed,
      skipped: [],
      totalTime: Date.now() - startTime,
    }
  }

  /**
   * 执行单个操作
   */
  private async executeAction(action: AffectedAssetAction): Promise<void> {
    if (!this.renderer) {
      throw new Error('Renderer not registered')
    }
    
    const { asset, action: actionType } = action
    
    switch (actionType) {
      case 'regenerate':
        await this.regenerateAsset(asset)
        break
      case 'revalidate':
        // 暂时只记录日志，后续可实现一致性验证
        console.log(`[ChangePropagation] Revalidating: ${asset.id}`)
        break
      case 'notify':
        // 发送通知
        console.log(`[ChangePropagation] Notifying: ${asset.id}`)
        break
    }
  }

  /**
   * 重新生成资产
   */
  private async regenerateAsset(asset: AssetNode): Promise<void> {
    if (!this.renderer) {
      throw new Error('Renderer not registered')
    }
    
    const referenceId = asset.referenceId
    if (!referenceId) {
      throw new Error(`Asset ${asset.id} has no reference ID`)
    }
    
    switch (asset.type) {
      case 'character_image':
        await this.renderer.regenerateCharacter(referenceId, {})
        break
      case 'scene_image':
        await this.renderer.regenerateScene(referenceId, {})
        break
      case 'shot_image':
        await this.renderer.regenerateShot(referenceId, {})
        break
      case 'gray_model':
        await this.renderer.regenerateGrayModel(referenceId, {})
        break
    }
  }

  /**
   * 批量传导变更
   * 
   * 当多个资产同时变更时，一次性分析并传导
   */
  async propagateBatchChanges(
    assetIds: string[],
    options?: Partial<PropagationOptions>
  ): Promise<PropagationResult> {
    const startTime = Date.now()
    
    const allPropagated: AffectedAssetAction[] = []
    const allFailed: AffectedAssetAction[] = []
    const allSkipped: AffectedAssetAction[] = []
    
    // 收集所有受影响资产（去重）
    const affectedAssetIds = new Set<string>()
    const recommendationsMap = new Map<string, AffectedAssetAction>()
    
    for (const assetId of assetIds) {
      const recommendations = this.getChangeRecommendations(assetId)
      for (const rec of recommendations) {
        if (!affectedAssetIds.has(rec.asset.id)) {
          affectedAssetIds.add(rec.asset.id)
          recommendationsMap.set(rec.asset.id, rec)
        }
      }
    }
    
    // 执行
    const recommendations = Array.from(recommendationsMap.values())
    const opts = { ...this.defaultOptions, ...options }
    
    if (opts.parallel) {
      // 并行执行
      const results = await Promise.allSettled(
        recommendations.map((rec) => this.executeAction(rec))
      )
      
      results.forEach((result, index) => {
        const rec = recommendations[index]
        if (result.status === 'fulfilled') {
          allPropagated.push(rec)
        } else {
          allFailed.push(rec)
          opts.onError?.(result.reason, rec)
        }
      })
    } else {
      // 串行执行
      for (const rec of recommendations) {
        try {
          await this.executeAction(rec)
          allPropagated.push(rec)
        } catch (error) {
          allFailed.push(rec)
          opts.onError?.(error as Error, rec)
        }
      }
    }
    
    return {
      success: allFailed.length === 0,
      propagated: allPropagated,
      failed: allFailed,
      skipped: allSkipped,
      totalTime: Date.now() - startTime,
    }
  }

  /**
   * 爆炸半径控制
   * 
   * 限制级联更新的范围
   */
  containsBlastRadius(assetId: string, maxDepth: number): boolean {
    const impact = this.analyzeChangeImpact(assetId, maxDepth)
    return impact.blastRadius <= maxDepth
  }

  /**
   * 获取最小爆炸路径
   * 
   * 返回修复某资产所需的最少操作数
   */
  getMinimumBlastPath(assetId: string): AffectedAssetAction[] {
    return this.getChangeRecommendations(assetId).slice(0, 3)
  }

  /**
   * 预览变更效果
   * 
   * 不实际执行变更，只返回预估的影响范围
   */
  previewChangeEffect(assetId: string): {
    affectedCount: number
    blastRadius: number
    estimatedTime: number
    assets: Array<{ id: string; type: string; action: string }>
  } {
    const impact = this.analyzeChangeImpact(assetId)
    const recommendations = this.getChangeRecommendations(assetId)
    
    return {
      affectedCount: impact.totalAffected,
      blastRadius: impact.blastRadius,
      estimatedTime: impact.estimatedCost?.estimatedTime || 0,
      assets: recommendations.map((r) => ({
        id: r.asset.id,
        type: r.asset.type,
        action: r.action,
      })),
    }
  }
}

// ---------------------------------------------------------------------------
// 单例实例
// ---------------------------------------------------------------------------

export const changePropagationService = new ChangePropagationService()

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 分析角色变更影响
 */
export function analyzeCharacterImpact(characterId: string): ImpactReport {
  const lineageStore = useLineageStore.getState()
  const characterNodes = lineageStore.getNodesByReference(characterId)
  
  // 分析所有相关的资产节点
  let totalImpact: ImpactReport | null = null
  
  for (const node of characterNodes) {
    const impact = changePropagationService.analyzeChangeImpact(node.id)
    
    if (!totalImpact) {
      totalImpact = impact
    } else {
      // 合并影响
      totalImpact.affectedAssets = [
        ...totalImpact.affectedAssets,
        ...impact.affectedAssets,
      ]
      totalImpact.totalAffected += impact.totalAffected
      totalImpact.blastRadius = Math.max(totalImpact.blastRadius, impact.blastRadius)
    }
  }
  
  return totalImpact || {
    changedAssetId: characterId,
    affectedAssets: [],
    totalAffected: 0,
    blastRadius: 0,
    recommendation: 'no_action',
  }
}

/**
 * 分析场景变更影响
 */
export function analyzeSceneImpact(sceneId: string): ImpactReport {
  const lineageStore = useLineageStore.getState()
  const sceneNodes = lineageStore.getNodesByReference(sceneId)
  
  let totalImpact: ImpactReport | null = null
  
  for (const node of sceneNodes) {
    const impact = changePropagationService.analyzeChangeImpact(node.id)
    
    if (!totalImpact) {
      totalImpact = impact
    } else {
      totalImpact.affectedAssets = [
        ...totalImpact.affectedAssets,
        ...impact.affectedAssets,
      ]
      totalImpact.totalAffected += impact.totalAffected
      totalImpact.blastRadius = Math.max(totalImpact.blastRadius, impact.blastRadius)
    }
  }
  
  return totalImpact || {
    changedAssetId: sceneId,
    affectedAssets: [],
    totalAffected: 0,
    blastRadius: 0,
    recommendation: 'no_action',
  }
}

/**
 * 传导角色变更
 */
export async function propagateCharacterChange(
  characterId: string,
  options?: Partial<PropagationOptions>
): Promise<PropagationResult> {
  const lineageStore = useLineageStore.getState()
  const characterNodes = lineageStore.getNodesByReference(characterId)
  
  return changePropagationService.propagateBatchChanges(
    characterNodes.map((n) => n.id),
    options
  )
}

/**
 * 传导场景变更
 */
export async function propagateSceneChange(
  sceneId: string,
  options?: Partial<PropagationOptions>
): Promise<PropagationResult> {
  const lineageStore = useLineageStore.getState()
  const sceneNodes = lineageStore.getNodesByReference(sceneId)
  
  return changePropagationService.propagateBatchChanges(
    sceneNodes.map((n) => n.id),
    options
  )
}
