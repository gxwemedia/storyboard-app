import { ArrowRight, BookMarked, Clapperboard, FileStack, Flame, ScanSearch, Sparkles } from 'lucide-react'
import { workflowStages } from '@/data'
import { getStageStatus, useWorkbenchStore } from '@/store/workbench-store'
import type { StageId } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

const stageIcons = { 0: BookMarked, 1: Sparkles, 2: Clapperboard, 3: FileStack, 4: ScanSearch, 5: Flame } satisfies Record<StageId, typeof BookMarked>

export function WorkflowRail() {
  const workflowStageId = useWorkbenchStore((state) => state.workflowStageId)
  const focusedStageId = useWorkbenchStore((state) => state.focusedStageId)
  const setFocusedStage = useWorkbenchStore((state) => state.setFocusedStage)
  const expandedScript = useWorkbenchStore((state) => state.expandedScript)
  const archiveReady = useWorkbenchStore((state) => state.archiveReady)

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="overflow-hidden bg-[rgba(8,14,28,0.88)]">
        <CardHeader className="pb-4"><Badge className="w-fit border-sky-400/20 bg-sky-400/10 text-sky-100">Workflow Rail</Badge><CardTitle className="text-base">项目推进</CardTitle><CardDescription>把流程导航、项目入口和阶段态势固定在左侧，避免导演在审批时失去上下文。</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {workflowStages.map((stage) => {
            const status = getStageStatus(stage.id, workflowStageId, archiveReady)
            const Icon = stageIcons[stage.id]
            return (
              <button key={stage.id} type="button" onClick={() => setFocusedStage(stage.id)} className={[
                'w-full rounded-3xl border px-4 py-4 text-left transition',
                focusedStageId === stage.id ? 'border-sky-400/35 bg-sky-500/10 shadow-[0_18px_50px_-28px_rgba(96,165,250,0.5)]' : 'border-white/8 bg-white/[0.03]',
                status === 'pending' && 'opacity-45',
              ].join(' ')}>
                <div className="flex items-start gap-3">
                  <div className={[
                    'flex size-11 items-center justify-center rounded-2xl border text-sm font-semibold',
                    status === 'completed' ? 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100' : '',
                    status === 'active' ? 'border-sky-400/25 bg-sky-400/12 text-sky-100' : '',
                    status === 'pending' ? 'border-white/8 bg-slate-900/60 text-slate-500' : '',
                  ].join(' ')}><Icon className="size-4" /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{stage.label}</p><span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">0{stage.id}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{stage.summary}</p></div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
      <Card className="bg-[rgba(8,14,28,0.88)]">
        <CardHeader className="pb-4"><CardTitle className="text-base">导演指令室</CardTitle><CardDescription>项目入口保留在侧栏，导演可以随时回看原始意图与文本基调。</CardDescription></CardHeader>
        <CardContent className="space-y-3"><Textarea value={expandedScript} readOnly className="min-h-[180px] bg-slate-950/60 text-sm text-slate-200" /><div className="flex items-center gap-2 text-xs text-slate-500"><ArrowRight className="size-3.5" />当前工作流停留在 Stage 0{workflowStageId}。</div></CardContent>
      </Card>
    </div>
  )
}
