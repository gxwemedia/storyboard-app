import { 
  Download, 
  Image as ImageIcon, 
  FileText, 
  Package,
  Layers3,
  Film,
  DownloadCloud
} from 'lucide-react'
import { useWorkbenchStore } from '@/store/workbench-store'

interface OutputDockProps {
  onExport?: () => void
}

export function OutputDock({ onExport }: OutputDockProps) {
  const shotSpecs = useWorkbenchStore((state) => state.shotSpecs)
  const outputs = useWorkbenchStore((state) => state.outputs)
  const archiveReady = useWorkbenchStore((state) => state.archiveReady)
  const characters = useWorkbenchStore((state) => state.characters)
  const scenes = useWorkbenchStore((state) => state.scenes)
  const expandedScript = useWorkbenchStore((state) => state.expandedScript)

  const stats = [
    {
      label: '分镜镜头',
      value: shotSpecs.length,
      icon: Layers3,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: '角色设定',
      value: characters.length,
      icon: ImageIcon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: '场景设定',
      value: scenes.length,
      icon: Film,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: '剧本字数',
      value: expandedScript.length,
      icon: FileText,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ]

  const exportFormats = [
    { name: 'PDF 剧本集', format: 'pdf', description: '导出完整的分镜剧本 PDF' },
    { name: 'CSV 场表', format: 'csv', description: '导出场次清单和器材表' },
    { name: 'JSON 归档', format: 'json', description: '导出完整的项目数据' },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">输出面板</h2>
        <p className="card-description">查看项目统计和导出结果</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={`p-4 rounded-xl ${stat.bgColor} border border-white/6`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {stat.label}
                </span>
              </div>
              <p className={`text-2xl font-semibold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Export Options */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          导出格式
        </h3>
        <div className="space-y-2">
          {exportFormats.map((format, index) => (
            <button
              key={index}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/6 hover:border-white/10 hover:bg-white/[0.04] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!archiveReady}
              onClick={() => {
                // TODO: Implement format-specific export
                console.log(`Exporting ${format.format}`)
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-white/6 flex items-center justify-center">
                <Download className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-200">
                  {format.name}
                </p>
                <p className="text-xs text-slate-500">
                  {format.description}
                </p>
              </div>
              <DownloadCloud className="w-4 h-4 text-slate-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Global Export Button */}
      {archiveReady && (
        <button
          onClick={onExport}
          className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          <Package className="w-4 h-4" />
          导出完整交付包
        </button>
      )}

      {!archiveReady && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-300 text-center">
            完成所有阶段后方可导出
          </p>
        </div>
      )}
    </div>
  )
}
