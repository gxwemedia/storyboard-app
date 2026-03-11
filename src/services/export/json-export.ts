/**
 * JSON 归档导出服务
 * 
 * 生成完整的 JSON 资产归档包
 */

import type {
  ProjectBible,
  ShotSpec,
  CharacterDesign,
  SceneDesign,
  JSONExportOptions,
  JSONExportResult,
  ArchivePackage,
  AssetManifest,
  AssetManifestItem,
} from '@/types'
import { ARCHIVE_VERSION } from '@/types'
import { useLineageStore } from '@/store/lineage-store'

// ---------------------------------------------------------------------------
// 默认选项
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: JSONExportOptions = {
  includeImages: false,
  includeThumbnails: false,
  includeLineage: true,
  includeGenerationHistory: true,
  imageQuality: 80,
  compress: false,
}

// ---------------------------------------------------------------------------
// JSON 归档包生成
// ---------------------------------------------------------------------------

/**
 * 生成完整 JSON 归档包
 */
export async function generateArchivePackage(
  bible: ProjectBible,
  rawScript: string,
  expandedScript: string,
  characters: CharacterDesign[],
  scenes: SceneDesign[],
  shotSpecs: ShotSpec[],
  workflowStageId: number,
  options: Partial<JSONExportOptions> = {}
): Promise<JSONExportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 获取资产清单
  const assets = await buildAssetManifest(characters, scenes, shotSpecs, opts)

  // 获取血缘图
  const lineage = opts.includeLineage ? useLineageStore.getState().getLineageGraph() : undefined

  // 获取生成历史
  const generationHistory = opts.includeGenerationHistory 
    ? useLineageStore.getState().generationHistory 
    : undefined

  // 构建归档包
  const archivePackage: ArchivePackage = {
    version: ARCHIVE_VERSION,
    exportedAt: new Date(),
    exportedBy: 'Storyboard App',

    projectBible: bible,
    rawScript,
    expandedScript,

    characters: characters.map(c => ({
      ...c,
      // 移除 base64 图片数据，只保留 URL
      imageUrl: opts.includeImages ? c.imageUrl : undefined,
    })),
    scenes: scenes.map(s => ({
      ...s,
      imageUrl: opts.includeImages ? s.imageUrl : undefined,
    })),

    shotSpecs,

    lineage,
    generationHistory,

    assets,

    metadata: {
      totalShots: shotSpecs.length,
      totalCharacters: characters.length,
      totalScenes: scenes.length,
      totalAssets: assets.totalAssets,
      workflowStageId,
      archiveSize: 0, // 稍后计算
    },
  }

  // 转换为 JSON 字符串
  const content = JSON.stringify(archivePackage, null, 2)
  
  // 计算预估大小
  const blob = new Blob([content], { type: 'application/json' })
  archivePackage.metadata.archiveSize = blob.size

  const filename = `分镜归档_${bible.style.slice(0, 10)}_${formatDate(new Date())}.json`

  return {
    content: JSON.stringify(archivePackage, null, 2),
    filename,
    fileSize: blob.size,
    assetCount: assets.totalAssets,
    generatedAt: new Date(),
  }
}

// ---------------------------------------------------------------------------
// 资产清单构建
// ---------------------------------------------------------------------------

async function buildAssetManifest(
  characters: CharacterDesign[],
  scenes: SceneDesign[],
  shotSpecs: ShotSpec[],
  opts: JSONExportOptions
): Promise<AssetManifest> {
  const assets: AssetManifestItem[] = []

  // 添加角色图片
  for (const char of characters) {
    if (char.imageUrl) {
      assets.push(await createAssetItem(char.id, 'character_image', char.imageUrl, opts))
    }
  }

  // 添加场景图片
  for (const scene of scenes) {
    if (scene.imageUrl) {
      assets.push(await createAssetItem(scene.id, 'scene_image', scene.imageUrl, opts))
    }
  }

  // 添加分镜图片（如果有）
  // 注意：这里需要从其他来源获取分镜图片

  return {
    totalAssets: assets.length,
    totalSize: assets.reduce((sum, a) => sum + (a.size || 0), 0),
    assets,
  }
}

async function createAssetItem(
  referenceId: string,
  type: string,
  url: string,
  opts: JSONExportOptions
): Promise<AssetManifestItem> {
  const item: AssetManifestItem = {
    id: `asset-${referenceId}`,
    type,
    filename: `${referenceId}.${getImageExtension(url)}`,
    mimeType: getMimeType(url),
  }

  // 处理图片数据
  if (opts.includeImages && url.startsWith('data:')) {
    // Base64 图片
    const base64Data = url.split(',')[1]
    item.base64 = base64Data
    item.size = Math.round((base64Data.length * 3) / 4) // 估算大小
  } else if (opts.includeImages && url.startsWith('http')) {
    // 远程图片 - 尝试下载
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      item.size = blob.size
      // 如果需要，可以转换为 base64
      if (opts.includeImages) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        item.base64 = base64.split(',')[1]
      }
    } catch (error) {
      console.warn(`Failed to fetch image: ${url}`, error)
    }
  }

  return item
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function getImageExtension(url: string): string {
  if (url.includes('png')) return 'png'
  if (url.includes('gif')) return 'gif'
  if (url.includes('webp')) return 'webp'
  return 'jpg'
}

function getMimeType(url: string): string {
  if (url.includes('png')) return 'image/png'
  if (url.includes('gif')) return 'image/gif'
  if (url.includes('webp')) return 'image/webp'
  return 'image/jpeg'
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 下载 JSON
 */
export function downloadJSON(result: JSONExportResult): void {
  const blob = new Blob([result.content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 复制 JSON 到剪贴板
 */
export async function copyToClipboard(result: JSONExportResult): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(result.content)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
