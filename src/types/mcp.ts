/**
 * MCP (Model Context Protocol) 协议类型定义
 * 
 * 定义标准化的AI工具调用协议，支持多Server协作和第三方工具接入
 */

// ---------------------------------------------------------------------------
// JSON Schema 类型
// ---------------------------------------------------------------------------

/** JSON Schema 定义 */
export interface JSONSchema {
  type: string | string[]
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  enum?: (string | number | boolean)[]
  default?: unknown
  description?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// MCP Server 类型
// ---------------------------------------------------------------------------

/** MCP资源 */
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/** MCP提示词模板 */
export interface MCPPrompt {
  id: string
  name: string
  description?: string
  template: string
  arguments?: Array<{
    name: string
    description?: string
    required: boolean
  }>
}

/** MCP工具调用结果 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    resourceUri?: string
  }>
  isError?: boolean
  errorMessage?: string
}

/** MCP工具定义 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema
  handler: (params: unknown) => Promise<MCPToolResult>
}

/** MCP Server标准接口 */
export interface MCPServer {
  name: string
  description: string
  version?: string
  tools: MCPTool[]
  resources?: MCPResource[]
  prompts?: MCPPrompt[]
  /** 初始化钩子 */
  onInitialize?: () => Promise<void>
  /** 关闭钩子 */
  onShutdown?: () => Promise<void>
}

// ---------------------------------------------------------------------------
// MCP Router 类型
// ---------------------------------------------------------------------------

/** MCP调用请求 */
export interface MCPCallRequest {
  serverName: string
  toolName: string
  params: unknown
  requestId?: string
  timeout?: number
}

/** MCP调用响应 */
export interface MCPCallResponse {
  requestId?: string
  serverName: string
  toolName: string
  result: MCPToolResult
  duration: number  // 毫秒
  timestamp: Date
}

/** MCP工具列表项 */
export interface MCPToolListItem {
  serverName: string
  toolName: string
  description: string
  inputSchema: JSONSchema
}

/** MCP Router配置 */
export interface MCPRouterConfig {
  /** 默认超时时间（毫秒） */
  defaultTimeout: number
  /** 最大并发调用数 */
  maxConcurrency: number
  /** 是否启用结果缓存 */
  enableCache: boolean
  /** 缓存TTL（毫秒） */
  cacheTTL: number
  /** 错误重试次数 */
  retryCount: number
  /** 重试延迟（毫秒） */
  retryDelay: number
}

// ---------------------------------------------------------------------------
// MCP Server类型标识
// ---------------------------------------------------------------------------

/** 系统定义的四个核心Server */
export type MCPServerName = 'memory' | 'prompt' | 'render' | 'vision'

/** Memory Server：记忆与剧本管理 */
export interface MemoryServerTools {
  get_project_bible: { params: {}; result: MCPToolResult }
  get_expanded_script: { params: {}; result: MCPToolResult }
  get_character_blueprint: { params: { name: string }; result: MCPToolResult }
  get_scene_blueprint: { params: { name: string }; result: MCPToolResult }
  update_subject_state: { params: { id: string; state: Record<string, unknown> }; result: MCPToolResult }
}

/** Prompt Server：提示词工程 */
export interface PromptServerTools {
  build_stage1_prompt: { params: { bible: unknown; rawScript: string }; result: MCPToolResult }
  build_stage3_prompt: { params: { bible: unknown; expandedScript: string; context: string }; result: MCPToolResult }
  refine_shot_description: { params: { shotSpec: unknown; feedback: string }; result: MCPToolResult }
  generate_consistency_prompt: { params: { type: 'character' | 'scene'; name: string; description: string }; result: MCPToolResult }
}

/** Render Server：渲染与合成 */
export interface RenderServerTools {
  generate_concept_image: { params: { type: 'character' | 'scene'; name: string; description: string }; result: MCPToolResult }
  generate_gray_model: { params: { shotSpec: unknown; style: 'sketch' | 'grayscale' | 'wireframe' }; result: MCPToolResult }
  generate_final_shot: { params: { shotSpec: unknown; references: string[] }; result: MCPToolResult }
  rerender_asset: { params: { assetId: string; params: unknown }; result: MCPToolResult }
}

/** Vision Server：一致性校验 */
export interface VisionServerTools {
  verify_character_consistency: { params: { imageId: string; characterId: string }; result: MCPToolResult }
  verify_scene_consistency: { params: { imageId: string; sceneId: string }; result: MCPToolResult }
  check_shot_continuity: { params: { shotIds: string[] }; result: MCPToolResult }
  detect_visual_errors: { params: { imageId: string }; result: MCPToolResult }
}

// ---------------------------------------------------------------------------
// MCP事件类型
// ---------------------------------------------------------------------------

/** MCP事件类型 */
export type MCPEventType = 
  | 'server_registered'
  | 'server_unregistered'
  | 'tool_called'
  | 'tool_completed'
  | 'tool_failed'
  | 'cache_hit'
  | 'cache_miss'

/** MCP事件 */
export interface MCPEvent {
  type: MCPEventType
  timestamp: Date
  serverName?: string
  toolName?: string
  requestId?: string
  data?: unknown
}

/** MCP事件监听器 */
export type MCPEventListener = (event: MCPEvent) => void

// ---------------------------------------------------------------------------
// MCP统计类型
// ---------------------------------------------------------------------------

/** MCP调用统计 */
export interface MCPStatistics {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageDuration: number
  serverStats: Map<string, {
    calls: number
    success: number
    failures: number
    avgDuration: number
  }>
  toolStats: Map<string, {
    calls: number
    success: number
    failures: number
    avgDuration: number
  }>
  cacheHits: number
  cacheMisses: number
}
