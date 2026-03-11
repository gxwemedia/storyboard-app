/**
 * MCP Prompt Server - 提示词工程
 * 
 * 提供提示词构建、优化和细化功能
 */

import type { MCPServer, MCPTool, MCPToolResult } from '@/types'
import { useWorkbenchStore } from '@/store/workbench-store'
import { orchestrateStage1, orchestrateStage2Consistency, orchestrateStage3 } from '../orchestrator'

// ---------------------------------------------------------------------------
// 工具实现
// ---------------------------------------------------------------------------

const buildStage1Prompt: MCPTool = {
  name: 'build_stage1_prompt',
  description: '构建Stage 1剧本扩写的完整Prompt',
  inputSchema: {
    type: 'object',
    properties: {
      rawScript: { type: 'string', description: '原始剧本大纲' },
    },
    required: ['rawScript'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { rawScript } = params as { rawScript: string }
    const store = useWorkbenchStore.getState()
    
    // 调用实际的编排逻辑
    const result = await orchestrateStage1(store.projectBible, rawScript)
    
    return {
      content: [{
        type: 'text',
        text: result.expandedScript,
      }],
    }
  },
}

const buildStage3Prompt: MCPTool = {
  name: 'build_stage3_prompt',
  description: '构建Stage 3分镜生成的完整Prompt',
  inputSchema: {
    type: 'object',
    properties: {
      expandedScript: { type: 'string', description: '扩写后的剧本' },
      context: { type: 'string', description: '概念设定上下文' },
    },
    required: ['expandedScript'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { expandedScript, context } = params as { expandedScript: string; context?: string }
    const store = useWorkbenchStore.getState()
    
    const result = await orchestrateStage3(
      store.projectBible,
      expandedScript,
      context || '未锁定'
    )
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.shotSpecs, null, 2),
      }],
    }
  },
}

const refineShotDescription: MCPTool = {
  name: 'refine_shot_description',
  description: '根据反馈优化镜头描述',
  inputSchema: {
    type: 'object',
    properties: {
      shotSpec: { 
        type: 'object', 
        description: '当前ShotSpec',
        properties: {
          id: { type: 'string' },
          shotCode: { type: 'string' },
          description: { type: 'string' },
          lens: { type: 'string' },
          composition: { type: 'string' },
          emotion: { type: 'string' },
        },
      },
      feedback: { type: 'string', description: '优化反馈' },
    },
    required: ['shotSpec', 'feedback'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { shotSpec, feedback } = params as { 
      shotSpec: { id: string; shotCode: string; description: string; lens: string; composition: string; emotion: string }
      feedback: string
    }
    
    const store = useWorkbenchStore.getState()
    
    // 更新ShotSpec
    store.updateShot(shotSpec.id, 'description', `${shotSpec.description}\n\n[优化建议]: ${feedback}`)
    
    return {
      content: [{
        type: 'text',
        text: `已更新镜头 ${shotSpec.shotCode} 的描述`,
      }],
    }
  },
}

const generateConsistencyPrompt: MCPTool = {
  name: 'generate_consistency_prompt',
  description: '生成角色或场景的一致性描述Prompt',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['character', 'scene'], description: '类型' },
      name: { type: 'string', description: '名称' },
      description: { type: 'string', description: '描述' },
    },
    required: ['type', 'name', 'description'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { type, name, description } = params as { type: 'character' | 'scene'; name: string; description: string }
    const store = useWorkbenchStore.getState()
    
    const result = await orchestrateStage2Consistency(
      store.projectBible,
      type,
      name,
      description
    )
    
    return {
      content: [{
        type: 'text',
        text: result.consistencyPrompt,
      }],
    }
  },
}

// ---------------------------------------------------------------------------
// Server 定义
// ---------------------------------------------------------------------------

export const promptServer: MCPServer = {
  name: 'prompt',
  description: '提示词工程 - 提供各阶段Prompt构建和优化功能',
  version: '1.0.0',
  tools: [
    buildStage1Prompt,
    buildStage3Prompt,
    refineShotDescription,
    generateConsistencyPrompt,
  ],
}
