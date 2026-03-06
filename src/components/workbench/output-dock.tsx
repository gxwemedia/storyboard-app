import { Download, ImageUp, ShieldCheck } from 'lucide-react'
import { useWorkbenchStore } from '@/store/workbench-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface OutputDockProps { onExport: () => void }

export function OutputDock({ onExport }: OutputDockProps) {
  const outputs = useWorkbenchStore((state) => state.outputs)
  const archiveReady = useWorkbenchStore((state) => state.archiveReady)

  return <Card className="overflow-hidden bg-[rgba(7,12,24,0.92)]"><CardHeader className="border-b border-white/6 pb-5"><div className="flex items-center justify-between gap-4"><div><Badge className="mb-3 border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100">Output Dock</Badge><CardTitle className="text-xl">结果仓</CardTitle><CardDescription>终图与交付包不再挤进审批区，而是作为独立的结果仓停靠在底部。</CardDescription></div><Button variant={archiveReady ? 'default' : 'secondary'} onClick={onExport} disabled={!archiveReady}><Download className="size-4" />导出交付包</Button></div></CardHeader><CardContent className="pt-6"><div className="grid gap-4 xl:grid-cols-3">{outputs.map((frame) => <div key={frame.id} className={['relative overflow-hidden rounded-[28px] border border-white/8 p-4', frame.status === 'ready' ? 'bg-slate-950/80' : 'bg-slate-950/55'].join(' ')}><div className={['absolute inset-0 opacity-70', `bg-gradient-to-br ${frame.palette}`].join(' ')} /><div className="panel-grid absolute inset-0 opacity-30" /><div className="relative flex h-full min-h-[220px] flex-col justify-between gap-5"><div><div className="mb-4 flex items-center justify-between gap-4"><Badge className={frame.status === 'ready' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : ''}>{frame.status === 'ready' ? 'Ready' : 'Locked'}</Badge><span className="text-xs uppercase tracking-[0.18em] text-slate-300">{frame.engine}</span></div><div className="rounded-[24px] border border-white/8 bg-black/25 p-4 backdrop-blur-sm"><div className="mb-16 flex items-center gap-3 text-slate-300">{frame.status === 'ready' ? <ImageUp className="size-5" /> : <ShieldCheck className="size-5" />}<span className="text-sm">{frame.title}</span></div><div className="h-24 rounded-[20px] border border-dashed border-white/10 bg-black/20" /></div></div><div className="space-y-2"><p className="text-sm leading-6 text-slate-200">{frame.caption}</p><p className="text-xs uppercase tracking-[0.18em] text-slate-400">{frame.grade}</p></div></div></div>)}</div></CardContent></Card>
}
