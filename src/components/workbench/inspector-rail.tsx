import { Bot, Eye, MemoryStick, Sparkles, Wand2 } from 'lucide-react'
import { useServerStates, useWorkbenchStore } from '@/store/workbench-store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

const logToneMap = { system: 'text-slate-400', info: 'text-sky-200', success: 'text-emerald-200', warning: 'text-amber-200', error: 'text-rose-200' } as const
const serverIcons = { memory: MemoryStick, prompt: Wand2, render: Sparkles, vision: Eye } as const

export function InspectorRail() {
  const logs = useWorkbenchStore((state) => state.logs)
  const serverStates = useServerStates()
  const workflowStageId = useWorkbenchStore((state) => state.workflowStageId)

  return <div className="flex h-full flex-col gap-4">
    <Card className="bg-[rgba(8,14,28,0.9)]"><CardHeader className="pb-4"><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-base">系统监控</CardTitle><CardDescription>将执行态、日志和工具层集中收纳在右侧，降低对主审批区的干扰。</CardDescription></div><Badge className="border-amber-400/20 bg-amber-400/10 text-amber-100">Stage 0{workflowStageId}</Badge></div></CardHeader><CardContent className="space-y-3">{serverStates.map((server) => { const Icon = serverIcons[server.key]; return <div key={server.key} className={['rounded-3xl border px-4 py-3', server.tone === 'active' ? 'border-sky-400/25 bg-sky-500/10' : 'border-white/8 bg-white/[0.03]'].join(' ')}><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-2xl border border-white/8 bg-slate-950/80 p-2"><Icon className="size-4 text-slate-200" /></div><div><p className="text-sm font-semibold text-white">{server.title}</p><p className="text-xs text-slate-500">{server.meta}</p></div></div><span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{server.status}</span></div></div> })}</CardContent></Card>
    <Card className="min-h-0 flex-1 bg-[rgba(8,14,28,0.9)]"><CardHeader className="pb-4"><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-base">Orchestrator Logs</CardTitle><CardDescription>辅助信息留在边轨，需要时阅读，不与导演主工位争夺注意力。</CardDescription></div><div className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500"><Bot className="mr-1 inline size-3" />live</div></div></CardHeader><CardContent className="min-h-0 pb-5"><ScrollArea className="h-[420px] rounded-[24px] border border-white/8 bg-slate-950/70 p-3"><div className="space-y-2">{logs.map((log) => <div key={log.id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5"><div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-500"><span>{log.timestamp}</span><span>{log.kind}</span></div><p className={['text-sm leading-6', logToneMap[log.kind]].join(' ')}>{log.message}</p></div>)}</div></ScrollArea></CardContent></Card>
  </div>
}
