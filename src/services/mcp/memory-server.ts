/**
 * MCP Memory Server - 记忆与剧本管理
 * 
 * 提供项目圣经、剧本、角色/场景设定等数据的存取接口
 */

import type { MCPServer, MCPTool, MCPToolResult } from '@/types'
import { useWorkbenchStore } from '@/store/workbench-store'

// ---------------------------------------------------------------------------
// 工具实现
// ---------------------------------------------------------------------------

const getProjectBible: MCPTool = {
  name: 'get_project_bible',
  description: '获取当前项目的视觉圣经，包含风格锁定、色彩脚本和禁忌规则',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (): Promise<MCPToolResult> => {
    const store = useWorkbenchStore.getState()
    const bible = store.projectBible
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(bible, null, 2),
      }],
    }
  },
}

const getExpandedScript: MCPTool = {
  name: 'get_expanded_script',
  description: '获取扩写后的完整剧本',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (): Promise<MCPToolResult> => {
    const store = useWorkbenchStore.getState()
    const script = store.expandedScript || store.rawScript
    
    return {
      content: [{
        type: 'text',
        text: script,
      }],
    }
  },
}

const getCharacterBlueprint: MCPTool = {
  name: 'get_character_blueprint',
  description: '获取角色详细设定信息',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '角色名称' },
    },
    required: ['name'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { name } = params as { name: string }
    const store = useWorkbenchStore.getState()
    
    const character = store.characters.find(
      c => c.name === name || c.id === name
    )
    
    if (!character) {
      return {
        content: [{
          type: 'text',
          text: `未找到角色: ${name}`,
        }],
        isError: true,
        errorMessage: `角色不存在: ${name}`,
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(character, null, 2),
      }],
    }
  },
}

const getSceneBlueprint: MCPTool = {
  name: 'get_scene_blueprint',
  description: '获取场景详细设定信息',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '场景名称' },
    },
    required: ['name'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { name } = params as { name: string }
    const store = useWorkbenchStore.getState()
    
    const scene = store.scenes.find(
      s => s.name === name || s.id === name
    )
    
    if (!scene) {
      return {
        content: [{
          type: 'text',
          text: `未找到场景: ${name}`,
        }],
        isError: true,
        errorMessage: `场景不存在: ${name}`,
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(scene, null, 2),
      }],
    }
  },
}

const getShotSpecs: MCPTool = {
  name: 'get_shot_specs',
  description: '获取所有分镜规格数据',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (): Promise<MCPToolResult> => {
    const store = useWorkbenchStore.getState()
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(store.shotSpecs, null, 2),
      }],
    }
  },
}

const updateSubjectState: MCPTool = {
  name: 'update_subject_state',
  description: '更新角色或场景的状态信息',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: '角色或场景ID' },
      type: { type: 'string', enum: ['character', 'scene'], description: '类型' },
      state: { 
        type: 'object', 
        description: '要更新的状态字段',
        additionalProperties: true,
      },
    },
    required: ['id', 'type', 'state'],
  },
  handler: async (params: unknown): Promise<MCPToolResult> => {
    const { id, type, state } = params as { id: string; type: 'character' | 'scene'; state: Record<string, unknown> }
    const store = useWorkbenchStore.getState()
    
    // 更新状态
    if (type === 'character') {
      Object.entries(state).forEach(([field, value]) => {
        if (field === 'name' || field === 'description') {
          store.updateCharacterField(id, field as 'name' | 'description', value as string)
        }
      })
    } else {
      Object.entries(state).forEach(([field, value]) => {
        if (field === 'name' || field === 'description') {
          store.updateSceneField(id, field as 'name' | 'description', value as string)
        }
      })
    }
    
    return {
      content: [{
        type: 'text',
        text: `已更新 ${type}: ${id}`,
      }],
    }
  },
}

// ---------------------------------------------------------------------------
// Server 定义
// ---------------------------------------------------------------------------

export const memoryServer: MCPServer = {
  name: 'memory',
  description: '记忆与剧本管理 - 提供项目圣经、剧本、角色/场景设定等数据的存取接口',
  version: '1.0.0',
  tools: [
    getProjectBible,
    getExpandedScript,
    getCharacterBlueprint,
    getSceneBlueprint,
    getShotSpecs,
    updateSubjectState,
  ],
}
