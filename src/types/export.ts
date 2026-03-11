/**
 * 导出功能类型定义
 * 
 * 定义PDF、CSV、JSON三种导出格式的数据结构和配置
 */

import type { ProjectBible, ShotSpec, CharacterDesign, SceneDesign } from '../index'
import type { LineageGraph, GenerationParams } from './lineage'

// ---------------------------------------------------------------------------
// 导出格式类型
// ---------------------------------------------------------------------------

/** 导出格式 */
export type ExportFormat = 'pdf' | 'csv' | 'json'

/** 导出选项 */
export interface ExportOptions {
  format: ExportFormat
  /** PDF选项 */
  pdf?: PDFExportOptions
  /** CSV选项 */
  csv?: CSVExportOptions
  /** JSON选项 */
  json?: JSONExportOptions
}

// ---------------------------------------------------------------------------
// PDF导出类型
// ---------------------------------------------------------------------------

/** PDF布局风格 */
export type PDFLayoutStyle = 
  | 'grid_2x2'      // 每页4个镜头（2行2列）
  | 'grid_3x2'      // 每页6个镜头（3行2列）
  | 'vertical'      // 每页1个镜头（垂直布局）
  | 'horizontal'    // 每页1个镜头（水平布局）

/** PDF页面尺寸 */
export type PDFPageSize = 'A4' | 'A3' | 'Letter' | 'Legal'

/** PDF导出选项 */
export interface PDFExportOptions {
  layoutStyle: PDFLayoutStyle
  pageSize: PDFPageSize
  orientation: 'portrait' | 'landscape'
  /** 是否包含项目圣经 */
  includeBible: boolean
  /** 是否包含扩写剧本 */
  includeExpandedScript: boolean
  /** 是否包含镜头参数 */
  includeShotParams: boolean
  /** 图片质量 (1-100) */
  imageQuality: number
  /** 页边距 (mm) */
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** 是否添加页眉页脚 */
  showHeaderFooter: boolean
  /** 是否添加页码 */
  showPageNumbers: boolean
  /** 自定义标题 */
  customTitle?: string
  /** 是否添加水印 */
  watermark?: string
}

/** 带图片的镜头数据（用于PDF生成） */
export interface ShotWithImage extends ShotSpec {
  imageUrl?: string
  imageBase64?: string
  grayModelUrl?: string
  grayModelBase64?: string
  /** 镜头序号（从1开始） */
  shotNumber: number
  /** 场景名称 */
  sceneName?: string
  /** 出场角色列表 */
  characters?: string[]
}

/** PDF生成结果 */
export interface PDFExportResult {
  blob: Blob
  filename: string
  pageCount: number
  fileSize: number  // 字节
  generatedAt: Date
}

// ---------------------------------------------------------------------------
// CSV导出类型
// ---------------------------------------------------------------------------

/** CSV导出类型 */
export type CSVExportType = 
  | 'scene_list'       // 场表
  | 'equipment_list'   // 器材清单
  | 'shot_schedule'    // 拍摄日程
  | 'character_list'   // 角色清单

/** CSV导出选项 */
export interface CSVExportOptions {
  type: CSVExportType
  /** 字段分隔符 */
  delimiter: ',' | ';' | '\t'
  /** 是否包含表头 */
  includeHeader: boolean
  /** 编码格式 */
  encoding: 'utf-8' | 'gbk' | 'gb2312'
  /** 是否包含BOM（UTF-8） */
  includeBOM: boolean
  /** 自定义列 */
  customColumns?: string[]
}

/** 场表CSV行数据 */
export interface SceneListRow {
  shotCode: string
  scene: string
  shotType: string      // 景别
  lens: string          // 焦段
  movement?: string     // 运镜
  characters: string    // 出场角色
  description: string
  emotion: string
  estimatedTime?: string  // 预估时长
  notes?: string
}

/** 器材清单CSV行数据 */
export interface EquipmentListRow {
  category: string      // 类别（摄影机/灯光/收音等）
  itemName: string      // 器材名称
  specification: string // 规格型号
  quantity: number      // 数量
  scenes: string        // 使用场景
  notes?: string
}

/** CSV生成结果 */
export interface CSVExportResult {
  content: string
  filename: string
  rowCount: number
  fileSize: number  // 字节
  generatedAt: Date
}

// ---------------------------------------------------------------------------
// JSON导出类型
// ---------------------------------------------------------------------------

/** JSON归档包版本 */
export const ARCHIVE_VERSION = '1.0.0'

/** 资产清单项 */
export interface AssetManifestItem {
  id: string
  type: string
  filename: string
  mimeType: string
  size?: number
  url?: string
  base64?: string
  thumbnailUrl?: string
  thumbnailBase64?: string
}

/** 资产清单 */
export interface AssetManifest {
  totalAssets: number
  totalSize: number
  assets: AssetManifestItem[]
}

/** JSON归档包选项 */
export interface JSONExportOptions {
  /** 是否包含图片文件（Base64编码） */
  includeImages: boolean
  /** 是否包含缩略图 */
  includeThumbnails: boolean
  /** 是否包含血缘图 */
  includeLineage: boolean
  /** 是否包含生成参数历史 */
  includeGenerationHistory: boolean
  /** 图片压缩质量 (1-100)，仅对Base64有效 */
  imageQuality: number
  /** 是否压缩为zip */
  compress: boolean
  /** 压缩格式 */
  compressionFormat?: 'zip' | 'tar.gz'
}

/** 完整JSON归档包 */
export interface ArchivePackage {
  version: string
  exportedAt: Date
  exportedBy?: string
  
  // 项目数据
  projectBible: ProjectBible
  rawScript: string
  expandedScript: string
  
  // 概念设定
  characters: CharacterDesign[]
  scenes: SceneDesign[]
  
  // 分镜数据
  shotSpecs: ShotSpec[]
  
  // 血缘图（可选）
  lineage?: LineageGraph
  
  // 生成历史（可选）
  generationHistory?: GenerationParams[]
  
  // 资产清单
  assets: AssetManifest
  
  // 元数据
  metadata: {
    totalShots: number
    totalCharacters: number
    totalScenes: number
    totalAssets: number
    workflowStageId: number
    archiveSize: number  // 字节
  }
}

/** JSON导出结果 */
export interface JSONExportResult {
  content: string  // JSON字符串
  blob?: Blob      // 如果是zip格式
  filename: string
  fileSize: number
  assetCount: number
  generatedAt: Date
}

// ---------------------------------------------------------------------------
// 导出统一类型
// ---------------------------------------------------------------------------

/** 导出结果（联合类型） */
export type ExportResult = 
  | { format: 'pdf'; result: PDFExportResult }
  | { format: 'csv'; result: CSVExportResult }
  | { format: 'json'; result: JSONExportResult }

/** 导出进度 */
export interface ExportProgress {
  stage: 'preparing' | 'generating' | 'compressing' | 'completed' | 'failed'
  progress: number  // 0-100
  message: string
  error?: string
}

/** 导出任务 */
export interface ExportTask {
  id: string
  options: ExportOptions
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: ExportProgress
  result?: ExportResult
  startedAt?: Date
  completedAt?: Date
  error?: string
}
