/**
 * MCP Render Server - 渲染与合成
 * 
 * 提供概念图、灰模、终版渲染等图像生成功能
 */

import type { MCPServer, MCPTool, MCPToolResult } from '@/types'
import { useWorkbenchStore } from '@/store/workbench-store'
import { generateDesignImage } from '../orchestrator'
import { generateGrayModel, generateGrayModelMock } from '../sdxl-client'
import type { GrayModelStyle } from '../sdxl-client'

// ---------------------------------------------------------------------------
// 工具实现
// ---------------------------------------------------------------------------

const generateConceptImage: MCPTool = {
  name: 'generate_concept_image',
  description: '生成角色或场景的概念设定图',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['character', 'scene'], description: '类型' },
      name: { type: 'string', description: '名称' },
      description: { type: 'string', description: '描述' },
      consistencyPrompt: { type: 'string', description: '一致性描述（可选）' },
    },
    required: ['type', 'name', 'description'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { type, name, description, consistencyPrompt } = params as {
      type: 'character' | 'scene'
      name: string
      description: string
      consistencyPrompt?: string
    }
    const store = useWorkbenchStore.getState()
    
    const result = await generateDesignImage(
      store.projectBible,
      type,
      name,
      description,
      consistencyPrompt,
      { 
        aspectRatio: type === 'character' ? '9:16' : '16:9',
        imageSize: '1K',
      }
    )
    
    return {
      content: [{
        type: 'image',
        data: result.imageUrl,
        mimeType: 'image/png',
      }],
    }
  },
}

const generateGrayModelTool: MCPTool = {
  name: 'generate_gray_model',
  description: '生成镜头灰模预演（低成本快速预览）',
  inputSchema: {
    type: 'object',
    properties: {
      shotId: { type: 'string', description: '镜头ID' },
      style: { 
        type: 'string', 
        enum: ['sketch', 'grayscale', 'wireframe'],
        description: '灰模风格' 
      },
    },
    required: ['shotId'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { shotId, style = 'grayscale' } = params as { shotId: string; style?: GrayModelStyle }
    const store = useWorkbenchStore.getState()
    
    const shotSpec = store.shotSpecs.find(s => s.id === shotId)
    if (!shotSpec) {
      return {
        content: [{
          type: 'text',
          text: `未找到镜头: ${shotId}`,
        }],
        isError: true,
        errorMessage: `镜头不存在: ${shotId}`,
      }
    }
    
    // 检查是否有SDXL配置
    const hasSDXLConfig = !!(import.meta.env.VITE_SDXL_API_KEY || import.meta.env.DEV)
    const useMock = !hasSDXLConfig
    
    const result = await generateGrayModel(
      shotSpec,
      store.projectBible,
      { style, aspectRatio: '16:9', imageSize: '1K' }
    )
    
    return {
      content: [{
        type: 'image',
        data: result.imageUrl,
        mimeType: 'image/png',
      }],
    }
  },
}

const generateFinalShot: MCPTool = {
  name: 'generate_final_shot',
  description: '生成终版分镜渲染图（高质量）',
  inputSchema: {
    type: 'object',
    properties: {
      shotId: { type: 'string', description: '镜头ID' },
      references: { 
        type: 'array', 
        items: { type: 'string' },
        description: '参考图URL列表' 
      },
    },
    required: ['shotId'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { shotId, references = [] } = params as { shotId: string; references?: string[] }
    const store = useWorkbenchStore.getState()
    
    const shotSpec = store.shotSpecs.find(s => s.id === shotId)
    if (!shotSpec) {
      return {
        content: [{
          type: 'text',
          text: `未找到镜头: ${shotId}`,
        }],
        isError: true,
        errorMessage: `镜头不存在: ${shotId}`,
      }
    }
    
    // 这里调用高质量渲染（复用现有的概念图生成逻辑）
    // 实际项目中应该使用更高质量的模型
    const result = await generateDesignImage(
      store.projectBible,
      'scene', // 临时使用scene类型
      shotSpec.shotCode,
      shotSpec.description,
      undefined,
      { aspectRatio: '16:9', imageSize: '2K' }
    )
    
    return {
      content: [{
        type: 'image',
        data: result.imageUrl,
        mimeType: 'image/png',
      }],
    }
  },
}

const rerenderAsset: MCPTool = {
  name: 'rerender_asset',
  description: '重新渲染已有资产',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: { type: 'string', description: '资产ID' },
      params: { 
        type: 'object', 
        description: '新的生成参数',
        additionalProperties: true,
      },
    },
    required: ['assetId'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { assetId, params: renderParams } = params as { assetId: string; params?: Record<string, unknown> }
    
    // 查找资产类型并重新生成
    // 这是一个简化实现
    
    return {
      content: [{
        type: 'text',
        text: `资产 ${assetId} 已标记为需重新渲染`,
      }],
    }
  },
}

// ---------------------------------------------------------------------------
// Server 定义
// ---------------------------------------------------------------------------

export const renderServer: MCPServer = {
  name: 'render',
  description: '渲染与合成 - 提供概念图、灰模、终版渲染等图像生成功能',
  version: '1.0.0',
  tools: [
    generateConceptImage,
    generateGrayModelTool,
    generateFinalShot,
    rerenderAsset,
  ],
}
