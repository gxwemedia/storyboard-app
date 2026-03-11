import { Settings, Info, FileText, Image as ImageIcon, Layers, Activity } from 'lucide-react'
import { useWorkbenchStore } from '@/store/workbench-store'

export function InspectorRail() {
  const logs = useWorkbenchStore((state) => state.logs)
  const aiStatus = useWorkbenchStore((state) => state.aiStatus)

  return (
    <div className="card flex-1 flex flex-col">
      <div className="card-header">
        <h2 className="card-title">系统日志</h2>
        <p className="card-description">查看操作记录和系统状态</p>
      </div>

      {/* Status Indicator */}
      <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/6">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${
            aiStatus === 'generating' ? 'text-amber-400 animate-pulse' : 'text-slate-400'
          }`} />
          <span className="text-sm font-medium text-slate-300">
            {aiStatus === 'generating' ? 'AI 运行中...' : '系统就绪'}
          </span>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">暂无日志记录</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <LogEntry key={index} log={log} />
          ))
        )}
      </div>
    </div>
  )
}

function LogEntry({ log }: { log: { time: string; type: string; message: string } }) {
  const typeConfig: Record<string, { icon: typeof Info; color: string; bgColor: string; borderColor: string }> = {
    info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
    success: { icon: Info, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    warning: { icon: Info, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
    error: { icon: Info, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
    system: { icon: Activity, color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20' },
  }

  const config = typeConfig[log.type] || typeConfig.system
  const Icon = config.icon

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs text-slate-500 mb-1`}>
          {new Date(log.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className={`text-sm ${config.color} leading-relaxed`}>
          {log.message}
        </p>
      </div>
    </div>
  )
}
