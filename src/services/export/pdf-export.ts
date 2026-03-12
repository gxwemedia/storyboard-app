/**
 * PDF 导出服务
 * 
 * 使用 jsPDF + html2canvas 生成带图片的分镜PDF文档
 */

import type { ProjectBible, ShotSpec, ShotWithImage, PDFExportOptions, PDFExportResult } from '@/types'

// 动态导入 jsPDF（避免 SSR 问题）
let jsPDF: typeof import('jspdf').default | null = null

async function loadJsPDF() {
  if (!jsPDF) {
    const module = await import('jspdf')
    jsPDF = module.default
  }
  return jsPDF!
}

// ---------------------------------------------------------------------------
// 默认选项
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: PDFExportOptions = {
  layoutStyle: 'grid_2x2',
  pageSize: 'A4',
  orientation: 'landscape',
  includeBible: true,
  includeExpandedScript: true,
  includeShotParams: true,
  imageQuality: 80,
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  showHeaderFooter: true,
  showPageNumbers: true,
}

// ---------------------------------------------------------------------------
// PDF 生成
// ---------------------------------------------------------------------------

/**
 * 生成 PDF 分镜剧本集
 */
export async function generateStoryboardPDF(
  shots: ShotSpec[],
  images: Record<string, string>,
  bible: ProjectBible,
  expandedScript: string,
  options: Partial<PDFExportOptions> = {}
): Promise<PDFExportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const doc = await loadJsPDF()

  // 设置页面尺寸和方向
  const pageSize = getPageSize(opts.pageSize)
  doc.setPage(0)
  doc.internal.pageSize = { width: pageSize.width, height: pageSize.height }
  
  if (opts.orientation === 'landscape') {
    doc.internal.pageSize = { width: pageSize.height, height: pageSize.width }
  }

  let pageCount = 1
  let currentShotIndex = 0

  // 封面页
  await addCoverPage(doc, bible, opts)

  // 项目圣经页
  if (opts.includeBible) {
    await addBiblePage(doc, bible, opts, ++pageCount)
    pageCount++
  }

  // 剧本页
  if (opts.includeExpandedScript && expandedScript) {
    await addScriptPage(doc, expandedScript, opts, ++pageCount)
    pageCount++
  }

  // 分镜头页面
  const shotsPerPage = getShotsPerPage(opts.layoutStyle)
  
  while (currentShotIndex < shots.length) {
    const pageShots = shots.slice(currentShotIndex, currentShotIndex + shotsPerPage)
    await addShotPage(
      doc, 
      pageShots, 
      images, 
      currentShotIndex + 1, 
      opts, 
      ++pageCount
    )
    currentShotIndex += shotsPerPage
    pageCount++
  }

  // 生成 blob
  const blob = doc.output('blob')
  const filename = `分镜剧本_${bible.style.slice(0, 10)}_${formatDate(new Date())}.pdf`

  return {
    blob,
    filename,
    pageCount: pageCount - 1,
    fileSize: blob.size,
    generatedAt: new Date(),
  }
}

// ---------------------------------------------------------------------------
// 页面生成函数
// ---------------------------------------------------------------------------

async function addCoverPage(
  doc: InstanceType<typeof import('jspdf').default>,
  bible: ProjectBible,
  opts: PDFExportOptions
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth()
  
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('分镜剧本集', pageWidth / 2, 60, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`风格: ${bible.style}`, pageWidth / 2, 90, { align: 'center' })
  doc.text(`色彩脚本: ${bible.colorScript}`, pageWidth / 2, 105, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, pageWidth / 2, 140, { align: 'center' })

  if (opts.showHeaderFooter) {
    addHeaderFooter(doc, 1, '分镜剧本集')
  }
}

async function addBiblePage(
  doc: InstanceType<typeof import('jspdf').default>,
  bible: ProjectBible,
  opts: PDFExportOptions,
  pageNum: number
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = opts.margins.left
  
  doc.addPage()
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('项目视觉圣经', margin, margin + 20)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  
  let y = margin + 40
  const lineHeight = 8

  doc.text('风格锁定:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(bible.style, margin + 30, y)
  y += lineHeight

  doc.setFont('helvetica', 'normal')
  doc.text('色彩脚本:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(bible.colorScript, margin + 30, y)
  y += lineHeight

  doc.setFont('helvetica', 'normal')
  doc.text('禁忌规则:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(bible.forbidden, margin + 30, y)

  if (opts.showHeaderFooter) {
    addHeaderFooter(doc, pageNum, '项目视觉圣经')
  }
}

async function addScriptPage(
  doc: InstanceType<typeof import('jspdf').default>,
  script: string,
  opts: PDFExportOptions,
  pageNum: number
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = opts.margins.left
  
  doc.addPage()
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('扩写剧本', margin, margin + 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const lines = doc.splitTextToSize(script, pageWidth - margin * 2)
  let y = margin + 40
  
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - margin - 20) {
      doc.addPage()
      y = margin + 20
      if (opts.showHeaderFooter) {
        addHeaderFooter(doc, pageNum, '扩写剧本')
      }
    }
    doc.text(line, margin, y)
    y += 6
  }

  if (opts.showHeaderFooter) {
    addHeaderFooter(doc, pageNum, '扩写剧本')
  }
}

async function addShotPage(
  doc: InstanceType<typeof import('jspdf').default>,
  shots: ShotSpec[],
  images: Record<string, string>,
  startIndex: number,
  opts: PDFExportOptions,
  pageNum: number
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = opts.margins.left
  
  doc.addPage()

  // 计算布局
  const { cols, rows, cellWidth, cellHeight } = getLayout(opts.layoutStyle, pageWidth, pageHeight, margin)

  // 标题
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`分镜页面 (${startIndex}-${startIndex + shots.length - 1})`, margin, margin + 15)

  let shotIndex = 0
  for (let row = 0; row < rows && shotIndex < shots.length; row++) {
    for (let col = 0; col < cols && shotIndex < shots.length; col++) {
      const shot = shots[shotIndex]
      const x = margin + col * cellWidth + 5
      const y = margin + 30 + row * cellHeight

      // 绘制单元格边框
      doc.setDrawColor(200, 200, 200)
      doc.rect(x, y, cellWidth - 10, cellHeight - 10)

      // 添加图片
      const imageUrl = images[shot.id]
      if (imageUrl) {
        try {
          const imgWidth = cellWidth - 20
          const imgHeight = (cellHeight - 60) * 0.7
          doc.addImage(imageUrl, 'JPEG', x + 5, y + 5, imgWidth, imgHeight)
        } catch (error) {
          // 图片加载失败，显示占位符
          doc.setFillColor(240, 240, 240)
          doc.rect(x + 5, y + 5, cellWidth - 20, (cellHeight - 60) * 0.7, 'F')
          doc.setFontSize(8)
          doc.setTextColor(150, 150, 150)
          doc.text('[图片]', x + (cellWidth - 20) / 2, y + (cellHeight - 60) * 0.35)
          doc.setTextColor(0, 0, 0)
        }
      }

      // 镜号
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(shot.shotCode, x + 5, y + (cellHeight - 60) * 0.7 + 15)

      // 描述
      if (opts.includeShotParams) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        
        const descLines = doc.splitTextToSize(shot.description, cellWidth - 25)
        doc.text(descLines.slice(0, 2), x + 5, y + (cellHeight - 60) * 0.7 + 22)

        // 镜头参数
        doc.setFontSize(6)
        doc.setTextColor(100, 100, 100)
        doc.text(`焦段: ${shot.lens}`, x + 5, y + (cellHeight - 60) * 0.7 + 32)
        doc.text(`构图: ${shot.composition}`, x + 5, y + (cellHeight - 60) * 0.7 + 38)
        doc.text(`情绪: ${shot.emotion}`, x + 5, y + (cellHeight - 60) * 0.7 + 44)
        doc.setTextColor(0, 0, 0)
      }

      shotIndex++
    }
  }

  if (opts.showHeaderFooter) {
    addHeaderFooter(doc, pageNum, `分镜 ${startIndex}-${startIndex + shots.length - 1}`)
  }
}

function addHeaderFooter(
  doc: InstanceType<typeof import('jspdf').default>,
  pageNum: number,
  title: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  
  // 页眉
  doc.text(title, pageWidth / 2, 8, { align: 'center' })
  
  // 页脚 - 页码
  doc.text(`第 ${pageNum} 页`, pageWidth / 2, pageHeight - 5, { align: 'center' })
  
  doc.setTextColor(0, 0, 0)
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function getPageSize(size: string): { width: number; height: number } {
  const sizes: Record<string, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    Letter: { width: 215.9, height: 279.4 },
    Legal: { width: 215.9, height: 355.6 },
  }
  return sizes[size] || sizes.A4
}

function getShotsPerPage(style: string): number {
  const counts: Record<string, number> = {
    grid_2x2: 4,
    grid_3x2: 6,
    vertical: 1,
    horizontal: 1,
  }
  return counts[style] || 4
}

function getLayout(
  style: string,
  pageWidth: number,
  pageHeight: number,
  margin: number
): { cols: number; rows: number; cellWidth: number; cellHeight: number } {
  const layouts: Record<string, { cols: number; rows: number }> = {
    grid_2x2: { cols: 2, rows: 2 },
    grid_3x2: { cols: 3, rows: 2 },
    vertical: { cols: 1, rows: 1 },
    horizontal: { cols: 1, rows: 1 },
  }
  const layout = layouts[style] || layouts.grid_2x2
  
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2 - 30 // 减去标题空间
  
  return {
    ...layout,
    cellWidth: usableWidth / layout.cols,
    cellHeight: usableHeight / layout.rows,
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 下载 PDF
 */
export function downloadPDF(result: PDFExportResult): void {
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
