import { Activity, Layers3, Zap, Clock, CheckCircle2 } from 'lucide-react'
import { useWorkbenchStore } from '@/store/workbench-store'

export function MissionHeader() {
  const workflowStageId = useWorkbenchStore((state) => state.workflowStageId)
  const archiveReady = useWorkbenchStore((state) => state.archiveReady)
  const aiStatus = useWorkbenchStore((state) => state.aiStatus)

  const stages = [
    { id: 0, label: '项目设定' },
    { id: 1, label: '剧本扩写' },
    { id: 2, label: '概念设定' },
    { id: 3, label: '分镜生成' },
    { id: 4, label: '灰模预演' },
    { id: 5, label: '终版签发' },
  ]

  const currentStage = stages[workflowStageId]

  return (
    <header className="app-header">
      {/* Left: Title & Description */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Layers3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              AI 分镜制作台
            </span>
          </div>
          {aiStatus === 'generating' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                AI 生成中...
              </span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">
          分镜项目制作流程
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          使用 AI 辅助完成从项目设定到终版签发的完整分镜制作流程
        </p>
      </div>

      {/* Right: Status Cards */}
      <div className="flex items-center gap-4">
        <StatusCard
          icon={Activity}
          label="当前阶段"
          value={currentStage.label}
        />
        <StatusCard
          icon={Clock}
          label="流程进度"
          value={`${workflowStageId + 1} / ${stages.length}`}
        />
        {archiveReady && (
          <StatusCard
            icon={CheckCircle2}
            label="项目状态"
            value="已完成"
            success
          />
        )}
      </div>
    </header>
  )
}

function StatusCard({ 
  icon: Icon, 
  label, 
  value, 
  success = false 
}: { 
  icon: typeof Activity
  label: string
  value: string
  success?: boolean
}) {
  return (
    <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/6">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${success ? 'text-emerald-400' : 'text-slate-400'}`} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <p className={`text-sm font-semibold ${success ? 'text-emerald-400' : 'text-slate-100'}`}>
        {value}
      </p>
    </div>
  )
}
