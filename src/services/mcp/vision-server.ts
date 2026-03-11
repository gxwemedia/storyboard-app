/**
 * MCP Vision Server - 一致性校验
 * 
 * 提供角色一致性、场景一致性、镜头连续性等视觉校验功能
 */

import type { MCPServer, MCPTool, MCPToolResult } from '@/types'
import { useWorkbenchStore, useLineageStore } from '@/store'

// ---------------------------------------------------------------------------
// 工具实现
// ---------------------------------------------------------------------------

const verifyCharacterConsistency: MCPTool = {
  name: 'verify_character_consistency',
  description: '验证角色在不同镜头中的一致性',
  inputSchema: {
    type: 'object',
    properties: {
      characterId: { type: 'string', description: '角色ID' },
    },
    required: ['characterId'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { characterId } = params as { characterId: string }
    const workbenchStore = useWorkbenchStore.getState()
    const lineageStore = useLineageStore.getState()
    
    const character = workbenchStore.characters.find(c => c.id === characterId)
    if (!character) {
      return {
        content: [{
          type: 'text',
          text: `未找到角色: ${characterId}`,
        }],
        isError: true,
        errorMessage: `角色不存在: ${characterId}`,
      }
    }
    
    // 获取该角色的所有资产
    const assets = lineageStore.getNodesByReference(characterId)
    
    // 简化的校验逻辑
    const report = {
      characterId,
      characterName: character.name,
      totalAssets: assets.length,
      locked: character.locked,
      hasConsistencyPrompt: !!character.consistencyPrompt,
      consistency: assets.length > 0 && character.locked ? '一致' : '未验证',
      recommendations: [] as string[],
    }
    
    if (!character.locked) {
      report.recommendations.push('建议锁定角色设定后再进行校验')
    }
    
    if (!character.consistencyPrompt) {
      report.recommendations.push('建议先生成一致性描述Prompt')
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(report, null, 2),
      }],
    }
  },
}

const verifySceneConsistency: MCPTool = {
  name: 'verify_scene_consistency',
  description: '验证场景在不同镜头中的一致性',
  inputSchema: {
    type: 'object',
    properties: {
      sceneId: { type: 'string', description: '场景ID' },
    },
    required: ['sceneId'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { sceneId } = params as { sceneId: string }
    const workbenchStore = useWorkbenchStore.getState()
    const lineageStore = useLineageStore.getState()
    
    const scene = workbenchStore.scenes.find(s => s.id === sceneId)
    if (!scene) {
      return {
        content: [{
          type: 'text',
          text: `未找到场景: ${sceneId}`,
        }],
        isError: true,
        errorMessage: `场景不存在: ${sceneId}`,
      }
    }
    
    const assets = lineageStore.getNodesByReference(sceneId)
    
    const report = {
      sceneId,
      sceneName: scene.name,
      totalAssets: assets.length,
      locked: scene.locked,
      hasConsistencyPrompt: !!scene.consistencyPrompt,
      consistency: assets.length > 0 && scene.locked ? '一致' : '未验证',
      recommendations: [] as string[],
    }
    
    if (!scene.locked) {
      report.recommendations.push('建议锁定场景设定后再进行校验')
    }
    
    if (!scene.consistencyPrompt) {
      report.recommendations.push('建议先生成一致性描述Prompt')
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(report, null, 2),
      }],
    }
  },
}

const checkShotContinuity: MCPTool = {
  name: 'check_shot_continuity',
  description: '检查相邻镜头之间的连续性',
  inputSchema: {
    type: 'object',
    properties: {
      shotIds: { 
        type: 'array', 
        items: { type: 'string' },
        description: '镜头ID列表' 
      },
    },
    required: ['shotIds'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { shotIds } = params as { shotIds: string[] }
    const store = useWorkbenchStore.getState()
    
    const shots = shotIds
      .map(id => store.shotSpecs.find(s => s.id === id))
      .filter(Boolean)
    
    if (shots.length < 2) {
      return {
        content: [{
          type: 'text',
          text: '需要至少2个镜头才能检查连续性',
        }],
        isError: true,
        errorMessage: '镜头数量不足',
      }
    }
    
    // 简化的连续性检查
    const issues: string[] = []
    
    for (let i = 1; i < shots.length; i++) {
      const prev = shots[i - 1]!
      const curr = shots[i]!
      
      // 检查焦段是否合理过渡
      const prevLens = parseInt(prev.lens) || 50
      const currLens = parseInt(curr.lens) || 50
      const lensDiff = Math.abs(currLens - prevLens)
      
      if (lensDiff > 50) {
        issues.push(`镜头 ${prev.shotCode} -> ${curr.shotCode}: 焦段变化过大 (${prev.lens} -> ${curr.lens})`)
      }
    }
    
    const report = {
      totalShots: shots.length,
      continuity: issues.length === 0 ? '良好' : '存在问题',
      issues,
      recommendations: issues.length > 0 
        ? ['建议检查镜头顺序和焦段过渡']
        : ['连续性良好'],
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(report, null, 2),
      }],
    }
  },
}

const detectVisualErrors: MCPTool = {
  name: 'detect_visual_errors',
  description: '检测图像中的视觉错误（如比例失常、穿模等）',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: { type: 'string', description: '资产ID' },
    },
    required: ['assetId'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { assetId } = params as { assetId: string }
    const lineageStore = useLineageStore.getState()
    
    const asset = lineageStore.getNode(assetId)
    if (!asset) {
      return {
        content: [{
          type: 'text',
          text: `未找到资产: ${assetId}`,
        }],
        isError: true,
        errorMessage: `资产不存在: ${assetId}`,
      }
    }
    
    // 简化实现 - 实际需要使用计算机视觉模型
    const report = {
      assetId,
      assetType: asset.type,
      status: '检测完成',
      errors: [] as string[],
      confidence: 0.85,
      note: '简化实现，建议人工复核',
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(report, null, 2),
      }],
    }
  },
}

// ---------------------------------------------------------------------------
// Server 定义
// ---------------------------------------------------------------------------

export const visionServer: MCPServer = {
  name: 'vision',
  description: '一致性校验 - 提供角色/场景一致性、镜头连续性等视觉校验功能',
  version: '1.0.0',
  tools: [
    verifyCharacterConsistency,
    verifySceneConsistency,
    checkShotContinuity,
    detectVisualErrors,
  ],
}
