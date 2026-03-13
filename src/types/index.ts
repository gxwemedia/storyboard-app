/**
 * 类型定义统一导出入口
 */

// ---------------------------------------------------------------------------
// 基础类型（从原 types.ts 迁移）
// ---------------------------------------------------------------------------

export type StageId = 0 | 1 | 2 | 3 | 4
export type ServerKey = 'memory' | 'prompt' | 'render' | 'vision'

export interface WorkflowStage {
  id: StageId
  label: string
  shortLabel: string
  summary: string
  deliverable: string
  decisionHint: string
}

export interface LogEntry {
  id: string
  kind: 'info' | 'success' | 'warning' | 'error' | 'system'
  timestamp: string
  message: string
}

export interface ConceptReference {
  id: string
  title: string
  subtitle: string
  palette: string
  imageUrl?: string
}

export type ShotScale = 'EWS' | 'WS' | 'MWS' | 'MS' | 'MCU' | 'CU' | 'ECU'
export type KeyLightStyle = 'Rembrandt' | 'Butterfly' | 'Loop' | 'Split' | 'Broad' | 'Backlit' | 'Natural'
export type LensFocalLength = '14mm' | '24mm' | '35mm' | '50mm' | '85mm' | '135mm' | '200mm'

export interface ShotSpec {
  id: string
  shotCode: string
  description: string
  lens: string
  composition: string
  emotion: string
  // V6 结构化字段
  scale: ShotScale
  focalLength: LensFocalLength
  keyLight: KeyLightStyle
  axisAnchor: string
  continuityLock: string
}

export interface OutputFrame {
  id: string
  title: string
  engine: string
  status: 'locked' | 'ready'
  caption: string
  grade: string
  palette: string
}

export interface ServerState {
  key: ServerKey
  title: string
  meta: string
  status: string
  tone: 'idle' | 'active' | 'warning'
}

export interface ProjectBible {
  style: string
  colorScript: string
  forbidden: string
}

export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
export type ImageSize = '1K' | '2K' | '4K'

export interface ImageGenSettings {
  aspectRatio: ImageAspectRatio
  imageSize: ImageSize
}

export type AiStatus = 'idle' | 'generating' | 'error'

/** 角色设定 */
export interface CharacterDesign {
  id: string
  name: string
  description: string
  imageUrl?: string
  imageAspectRatio: ImageAspectRatio
  imageSize: ImageSize
  /** AI 反推的一致性 Prompt（用于后续分镜生成锁定外观） */
  consistencyPrompt?: string
  locked: boolean
}

/** 场景设定 */
export interface SceneDesign {
  id: string
  name: string
  description: string
  imageUrl?: string
  imageAspectRatio: ImageAspectRatio
  imageSize: ImageSize
  /** AI 反推的一致性 Prompt（用于后续分镜生成锁定环境） */
  consistencyPrompt?: string
  locked: boolean
}

// ---------------------------------------------------------------------------
// 资产血缘追踪类型
// ---------------------------------------------------------------------------

export type {
  AssetType,
  AssetNode,
  ControlNetConfig,
  GenerationParams,
  RelationType,
  LineageEdge,
  LineageChain,
  LineageGraph,
  AffectedAsset,
  ImpactReport,
  AssetVersion,
  VersionDiff,
} from './lineage'

// ---------------------------------------------------------------------------
// MCP协议类型
// ---------------------------------------------------------------------------

export type {
  JSONSchema,
  MCPResource,
  MCPPrompt,
  MCPToolResult,
  MCPTool,
  MCPServer,
  MCPCallRequest,
  MCPCallResponse,
  MCPToolListItem,
  MCPRouterConfig,
  MCPServerName,
  MemoryServerTools,
  PromptServerTools,
  RenderServerTools,
  VisionServerTools,
  MCPEventType,
  MCPEvent,
  MCPEventListener,
  MCPStatistics,
} from './mcp'

// ---------------------------------------------------------------------------
// 导出功能类型
// ---------------------------------------------------------------------------

export type {
  ExportFormat,
  ExportOptions,
  PDFLayoutStyle,
  PDFPageSize,
  PDFExportOptions,
  ShotWithImage,
  PDFExportResult,
  CSVExportType,
  CSVExportOptions,
  SceneListRow,
  EquipmentListRow,
  CSVExportResult,
  AssetManifestItem,
  AssetManifest,
  JSONExportOptions,
  ArchivePackage,
  JSONExportResult,
  ExportResult,
  ExportProgress,
  ExportTask,
} from './export'

export { ARCHIVE_VERSION } from './export'
