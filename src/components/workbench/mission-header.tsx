import { Activity, Boxes, PackageOpen } from 'lucide-react'
import { workflowStages } from '@/data'
import { useWorkbenchStore } from '@/store/workbench-store'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function MissionHeader() {
  const workflowStageId = useWorkbenchStore((state) => state.workflowStageId)
  const archiveReady = useWorkbenchStore((state) => state.archiveReady)
  const stage = workflowStages.find((item) => item.id === workflowStageId)!

  return (
    <Card className="overflow-hidden bg-[rgba(7,12,24,0.9)] px-6 py-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 border-sky-400/20 bg-sky-400/10 text-sky-100">Director Console / Industrial Pipeline</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-white">智能分镜制片台</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">用现代前端栈重写导演工作台：当前阶段聚焦中央审批，系统监控收纳到边轨，最终结果统一进入底部结果仓。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
          <MetricCard icon={Activity} label="运行模式" value="Multi-stage HITL" />
          <MetricCard icon={Boxes} label="当前阶段" value={`Stage 0${workflowStageId} · ${stage.label}`} />
          <MetricCard icon={PackageOpen} label="交付状态" value={archiveReady ? 'Archive Ready' : 'Awaiting Sign-off'} />
        </div>
      </div>
    </Card>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500"><Icon className="size-3.5" />{label}</div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
