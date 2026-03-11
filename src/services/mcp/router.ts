/**
 * MCP Router - 统一路由和调用分发
 * 
 * 提供标准化的工具调用接口，支持多Server协作
 */

import type { 
  MCPServer, 
  MCPTool, 
  MCPToolResult, 
  MCPCallRequest, 
  MCPCallResponse, 
  MCPToolListItem,
  MCPRouterConfig,
  MCPEvent,
  MCPEventListener,
  MCPStatistics,
} from '@/types'
import { memoryServer } from './memory-server'
import { promptServer } from './prompt-server'
import { renderServer } from './render-server'
import { visionServer } from './vision-server'

// ---------------------------------------------------------------------------
// Router 类
// ---------------------------------------------------------------------------

class MCPRouter {
  private servers: Map<string, MCPServer> = new Map()
  private config: MCPRouterConfig
  private listeners: Set<MCPEventListener> = new Set()
  private statistics: MCPStatistics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageDuration: 0,
    serverStats: new Map(),
    toolStats: new Map(),
    cacheHits: 0,
    cacheMisses: 0,
  }

  constructor(config: Partial<MCPRouterConfig> = {}) {
    this.config = {
      defaultTimeout: 60000,
      maxConcurrency: 5,
      enableCache: false,
      cacheTTL: 300000,
      retryCount: 3,
      retryDelay: 1000,
      ...config,
    }

    // 注册默认Server
    this.registerServer(memoryServer)
    this.registerServer(promptServer)
    this.registerServer(renderServer)
    this.registerServer(visionServer)
  }

  /**
   * 注册 Server
   */
  registerServer(server: MCPServer): void {
    this.servers.set(server.name, server)
    
    // 初始化统计
    this.statistics.serverStats.set(server.name, {
      calls: 0,
      success: 0,
      failures: 0,
      avgDuration: 0,
    })

    this.emit({
      type: 'server_registered',
      timestamp: new Date(),
      serverName: server.name,
    })
  }

  /**
   * 注销 Server
   */
  unregisterServer(serverName: string): boolean {
    const server = this.servers.get(serverName)
    if (!server) return false

    this.servers.delete(serverName)
    this.statistics.serverStats.delete(serverName)

    this.emit({
      type: 'server_unregistered',
      timestamp: new Date(),
      serverName,
    })

    return true
  }

  /**
   * 调用工具
   */
  async callTool(
    serverName: string,
    toolName: string,
    params: unknown = {}
  ): Promise<MCPToolResult> {
    const startTime = Date.now()
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const server = this.servers.get(serverName)
    if (!server) {
      throw new Error(`Server not found: ${serverName}`)
    }

    const tool = server.tools.find(t => t.name === toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${serverName}.${toolName}`)
    }

    // 发射事件
    this.emit({
      type: 'tool_called',
      timestamp: new Date(),
      serverName,
      toolName,
      requestId,
    })

    try {
      // 参数验证（简化实现）
      this.validateParams(tool, params)

      // 执行工具
      const result = await tool.handler(params)

      // 更新统计
      this.updateStatistics(serverName, toolName, Date.now() - startTime, true)

      this.emit({
        type: 'tool_completed',
        timestamp: new Date(),
        serverName,
        toolName,
        requestId,
      })

      return result
    } catch (error) {
      this.updateStatistics(serverName, toolName, Date.now() - startTime, false)

      this.emit({
        type: 'tool_failed',
        timestamp: new Date(),
        serverName,
        toolName,
        requestId,
        data: { error: (error as Error).message },
      })

      throw error
    }
  }

  /**
   * 调用工具（带重试）
   */
  async callToolWithRetry(
    serverName: string,
    toolName: string,
    params: unknown = {},
    retryCount?: number
  ): Promise<MCPToolResult> {
    const maxRetries = retryCount ?? this.config.retryCount
    let lastError: Error | null = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.callTool(serverName, toolName, params)
      } catch (error) {
        lastError = error as Error
        if (i < maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * (i + 1))
          )
        }
      }
    }

    throw lastError
  }

  /**
   * 批量调用工具
   */
  async callToolsBatch(
    requests: Array<{ serverName: string; toolName: string; params?: unknown }>
  ): Promise<MCPCallResponse[]> {
    const results: MCPCallResponse[] = []

    // 并发执行（有限流）
    const batchSize = this.config.maxConcurrency
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (req) => {
          const startTime = Date.now()
          try {
            const result = await this.callTool(req.serverName, req.toolName, req.params)
            return {
              serverName: req.serverName,
              toolName: req.toolName,
              result,
              duration: Date.now() - startTime,
              timestamp: new Date(),
            }
          } catch (error) {
            return {
              serverName: req.serverName,
              toolName: req.toolName,
              result: {
                content: [{ type: 'text', text: (error as Error).message }],
                isError: true,
                errorMessage: (error as Error).message,
              },
              duration: Date.now() - startTime,
              timestamp: new Date(),
            }
          }
        })
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * 获取所有工具列表
   */
  listTools(): MCPToolListItem[] {
    const tools: MCPToolListItem[] = []

    this.servers.forEach((server) => {
      server.tools.forEach((tool) => {
        tools.push({
          serverName: server.name,
          toolName: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })
      })
    })

    return tools
  }

  /**
   * 获取 Server 列表
   */
  listServers(): Array<{ name: string; description: string; toolCount: number }> {
    return Array.from(this.servers.values()).map(server => ({
      name: server.name,
      description: server.description,
      toolCount: server.tools.length,
    }))
  }

  /**
   * 获取统计信息
   */
  getStatistics(): MCPStatistics {
    return { ...this.statistics }
  }

  /**
   * 重置统计
   */
  resetStatistics(): void {
    this.statistics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      serverStats: new Map(),
      toolStats: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: MCPEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 发射事件
   */
  private emit(event: MCPEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Event listener error:', error)
      }
    })
  }

  /**
   * 验证参数
   */
  private validateParams(tool: MCPTool, params: unknown): void {
    // 简化实现 - 实际应该用 JSON Schema 验证
    const required = tool.inputSchema.required || []
    
    for (const field of required) {
      if (params && typeof params === 'object' && !(field in (params as object))) {
        throw new Error(`Missing required parameter: ${field}`)
      }
    }
  }

  /**
   * 更新统计
   */
  private updateStatistics(
    serverName: string,
    toolName: string,
    duration: number,
    success: boolean
  ): void {
    this.statistics.totalCalls++
    
    if (success) {
      this.statistics.successfulCalls++
    } else {
      this.statistics.failedCalls++
    }

    // 更新平均响应时间
    this.statistics.averageDuration = 
      (this.statistics.averageDuration * (this.statistics.totalCalls - 1) + duration) /
      this.statistics.totalCalls

    // 更新 Server 统计
    const serverStats = this.statistics.serverStats.get(serverName)
    if (serverStats) {
      serverStats.calls++
      if (success) serverStats.success++
      else serverStats.failures++
      serverStats.avgDuration = 
        (serverStats.avgDuration * (serverStats.calls - 1) + duration) /
        serverStats.calls
    }

    // 更新 Tool 统计
    const toolKey = `${serverName}.${toolName}`
    if (!this.statistics.toolStats.has(toolKey)) {
      this.statistics.toolStats.set(toolKey, {
        calls: 0,
        success: 0,
        failures: 0,
        avgDuration: 0,
      })
    }
    const toolStats = this.statistics.toolStats.get(toolKey)!
    toolStats.calls++
    if (success) toolStats.success++
    else toolStats.failures++
    toolStats.avgDuration = 
      (toolStats.avgDuration * (toolStats.calls - 1) + duration) /
      toolStats.calls
  }
}

// ---------------------------------------------------------------------------
// 单例实例
// ---------------------------------------------------------------------------

export const mcpRouter = new MCPRouter()

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 便捷调用函数
 */
export async function callMCPTool(
  serverName: string,
  toolName: string,
  params?: unknown
): Promise<MCPToolResult> {
  return mcpRouter.callTool(serverName, toolName, params)
}

/**
 * 获取工具列表
 */
export function listMCPTools(): MCPToolListItem[] {
  return mcpRouter.listTools()
}

/**
 * 获取 Server 列表
 */
export function listMCPServers() {
  return mcpRouter.listServers()
}
