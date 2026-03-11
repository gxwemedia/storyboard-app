/**
 * CSV 导出服务
 * 
 * 生成场表、器材清单等 CSV 文件
 */

import type { ShotSpec, CharacterDesign, SceneDesign, CSVExportOptions, CSVExportResult, SceneListRow, EquipmentListRow } from '@/types'

// ---------------------------------------------------------------------------
// 默认选项
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: CSVExportOptions = {
  type: 'scene_list',
  delimiter: ',',
  includeHeader: true,
  encoding: 'utf-8',
  includeBOM: true,
}

// ---------------------------------------------------------------------------
// CSV 生成
// ---------------------------------------------------------------------------

/**
 * 生成场表 CSV
 */
export function generateSceneList(
  shots: ShotSpec[],
  scenes: SceneDesign[],
  options: Partial<CSVExportOptions> = {}
): CSVExportResult {
  const opts = { ...DEFAULT_OPTIONS, ...options, type: 'scene_list' }
  
  const rows: SceneListRow[] = shots.map((shot, index) => {
    // 尝试匹配场景
    const scene = scenes.find(s => 
      shot.description.toLowerCase().includes(s.name.toLowerCase())
    )
    
    return {
      shotCode: shot.shotCode,
      scene: scene?.name || determineSceneFromDescription(shot.description),
      shotType: extractShotType(shot.composition),
      lens: shot.lens,
      movement: extractMovement(shot.composition),
      characters: extractCharacters(shot.description),
      description: shot.description,
      emotion: shot.emotion,
      estimatedTime: estimateTime(shot),
      notes: '',
    }
  })

  return convertToCSV(rows, opts)
}

/**
 * 生成器材清单 CSV
 */
export function generateEquipmentList(
  shots: ShotSpec[],
  characters: CharacterDesign[],
  scenes: SceneDesign[],
  options: Partial<CSVExportOptions> = {}
): CSVExportResult {
  const opts = { ...DEFAULT_OPTIONS, ...options, type: 'equipment_list' }
  
  const equipment: EquipmentListRow[] = []
  const usedEquipment = new Set<string>()

  // 分析所需的摄影器材
  const lenses = new Set<string>()
  shots.forEach(shot => {
    const lens = shot.lens.toLowerCase()
    if (lens.includes('24mm') || lens.includes('35mm') || lens.includes('50mm') || 
        lens.includes('85mm') || lens.includes('135mm')) {
      lenses.add(shot.lens)
    }
  })

  // 摄影机
  equipment.push({
    category: '摄影机',
    itemName: 'ARRI Alexa Mini LF',
    specification: '4.5K Large Format',
    quantity: 1,
    scenes: shots.map(s => s.shotCode).join('; '),
    notes: '主机',
  })

  // 镜头
  lenses.forEach(lens => {
    equipment.push({
      category: '镜头',
      itemName: `Master Anamorphic ${lens}`,
      specification: '定焦镜头组',
      quantity: 1,
      scenes: shots.filter(s => s.lens === lens).map(s => s.shotCode).join('; '),
      notes: '',
    })
  })

  // 灯光设备（基于场景数量）
  const uniqueScenes = new Set<string>()
  shots.forEach(shot => {
    const scene = determineSceneFromDescription(shot.description)
    if (scene.includes('夜') || scene.includes('内')) {
      uniqueScenes.add(scene)
    }
  })

  if (uniqueScenes.size > 0) {
    equipment.push({
      category: '灯光',
      itemName: 'ARRI SkyPanel S60-C',
      specification: 'LED平板灯',
      quantity: Math.ceil(uniqueScenes.size / 2),
      scenes: Array.from(uniqueScenes).join('; '),
      notes: '根据场景需要配置',
    })

    equipment.push({
      category: '灯光',
      itemName: 'ARRI T12',
      specification: '12K 镝灯',
      quantity: 1,
      scenes: Array.from(uniqueScenes).join('; '),
      notes: '主光',
    })
  }

  // 收音设备
  equipment.push({
    category: '收音',
    itemName: 'Sennheiser MKH 416',
    specification: '枪式麦克风',
    quantity: 2,
    scenes: shots.map(s => s.shotCode).join('; '),
    notes: '主要用于对话场景',
  })

  return convertToCSV(equipment, opts)
}

/**
 * 生成角色清单 CSV
 */
export function generateCharacterList(
  characters: CharacterDesign[],
  options: Partial<CSVExportOptions> = {}
): CSVExportResult {
  const opts = { ...DEFAULT_OPTIONS, ...options, type: 'character_list' }
  
  const rows = characters.map(char => ({
    name: char.name,
    description: char.description,
    locked: char.locked ? '是' : '否',
    consistencyPrompt: char.consistencyPrompt ? '有' : '无',
    imageUrl: char.imageUrl ? '有' : '无',
    notes: '',
  }))

  return convertToCSV(rows, opts)
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function convertToCSV<T extends Record<string, unknown>>(
  rows: T[],
  opts: CSVExportOptions
): CSVExportResult {
  if (rows.length === 0) {
    const emptyContent = opts.includeBOM ? '\uFEFF' : ''
    return {
      content: emptyContent,
      filename: getFilename(opts.type),
      rowCount: 0,
      fileSize: new Blob([emptyContent]).size,
      generatedAt: new Date(),
    }
  }

  const delimiter = opts.delimiter
  const keys = Object.keys(rows[0])
  
  // 表头
  let content = ''
  if (opts.includeHeader) {
    content += keys.map(k => escapeCSVField(k, delimiter)).join(delimiter) + '\n'
  }
  
  // 数据行
  for (const row of rows) {
    const values = keys.map(k => escapeCSVField(String(row[k] || ''), delimiter))
    content += values.join(delimiter) + '\n'
  }

  // 处理编码
  if (opts.encoding === 'utf-8' && opts.includeBOM) {
    content = '\uFEFF' + content
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  
  return {
    content,
    filename: getFilename(opts.type),
    rowCount: rows.length,
    fileSize: blob.size,
    generatedAt: new Date(),
  }
}

function escapeCSVField(field: string, delimiter: string): string {
  // 如果字段包含分隔符、引号或换行符，需要用引号包裹
  if (field.includes(delimiter) || field.includes('"') || field.includes('\n')) {
    // 转义内部的引号（双引号变两个引号）
    return '"' + field.replace(/"/g, '""') + '"'
  }
  return field
}

function getFilename(type: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filenames: Record<string, string> = {
    scene_list: `场表_${date}.csv`,
    equipment_list: `器材清单_${date}.csv`,
    shot_schedule: `拍摄日程_${date}.csv`,
    character_list: `角色清单_${date}.csv`,
  }
  return filenames[type] || `export_${date}.csv`
}

function determineSceneFromDescription(description: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('宅院') || desc.includes('屋内') || desc.includes('室内')) return '室内'
  if (desc.includes('山路') || desc.includes('野外') || desc.includes('林中')) return '外景'
  if (desc.includes('夜')) return '夜景'
  if (desc.includes('日')) return '日景'
  
  return '待定'
}

function extractShotType(composition: string): string {
  const comp = composition.toLowerCase()
  
  if (comp.includes('特写') || comp.includes('close')) return '特写'
  if (comp.includes('中景') || comp.includes('medium')) return '中景'
  if (comp.includes('全景') || comp.includes('wide')) return '全景'
  if (comp.includes('远景') || comp.includes('long')) return '远景'
  if (comp.includes('过肩') || comp.includes('ots')) return '过肩'
  
  return '中景'
}

function extractMovement(composition: string): string {
  const comp = composition.toLowerCase()
  
  if (comp.includes('推') || comp.includes('push')) return '推'
  if (comp.includes('拉') || comp.includes('pull')) return '拉'
  if (comp.includes('摇') || comp.includes('pan')) return '摇'
  if (comp.includes('移') || comp.includes('track')) return '移'
  if (comp.includes('跟') || comp.includes('follow')) return '跟'
  
  return '固定'
}

function extractCharacters(description: string): string {
  // 简单的人物提取逻辑，实际可能需要更复杂的NLP
  const knownCharacters = ['秦牧', '龙麒麟', '司幼幽', '婆婆']
  const found = knownCharacters.filter(name => description.includes(name))
  
  return found.join('; ') || '待定'
}

function estimateTime(shot: ShotSpec): string {
  // 基于镜头复杂程度估算
  const desc = shot.description.toLowerCase()
  const comp = shot.composition.toLowerCase()
  
  let seconds = 5 // 默认
  
  if (desc.includes('动作') || desc.includes('武')) seconds = 8
  else if (desc.includes('对话') || desc.includes('言')) seconds = 6
  else if (desc.includes('静') || desc.includes('特写')) seconds = 3
  
  if (comp.includes('全景') || comp.includes('远景')) seconds += 2
  
  return `${seconds}秒`
}

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 下载 CSV
 */
export function downloadCSV(result: CSVExportResult): void {
  const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
