import { Download, Sparkles } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { MissionHeader } from '@/components/workbench/mission-header'
import { WorkflowRail } from '@/components/workbench/workflow-rail'
import { DirectorWorkbench } from '@/components/workbench/director-workbench'
import { InspectorRail } from '@/components/workbench/inspector-rail'
import { OutputDock } from '@/components/workbench/output-dock'
import { Button } from '@/components/ui/button'
import { useWorkbenchStore } from '@/store/workbench-store'

function downloadPackage(json: string) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'storyboard-delivery-package.json'
  link.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const approveCurrentStage = useWorkbenchStore((state) => state.approveCurrentStage)
  const rejectCurrentStage = useWorkbenchStore((state) => state.rejectCurrentStage)
  const appendLog = useWorkbenchStore((state) => state.appendLog)
  const projectBible = useWorkbenchStore((state) => state.projectBible)
  const expandedScript = useWorkbenchStore((state) => state.expandedScript)
  const shotSpecs = useWorkbenchStore((state) => state.shotSpecs)
  const finalNotes = useWorkbenchStore((state) => state.finalNotes)
  const characters = useWorkbenchStore((state) => state.characters)
  const scenes = useWorkbenchStore((state) => state.scenes)
  const outputs = useWorkbenchStore((state) => state.outputs)
  const archiveReady = useWorkbenchStore((state) => state.archiveReady)

  const handleApprove = async () => {
    const result = await approveCurrentStage()
    if (result.archived) { toast.success('终版已签发，结果仓开放导出。'); return }
    toast.success(`已推进到 Stage 0${result.to}`)
  }

  const handleReject = () => {
    const result = rejectCurrentStage()
    toast.error(`已回退到 Stage 0${result.to}`)
  }

  const handleExport = () => {
    if (!archiveReady) { toast.warning('请先完成 Stage 5 终版签发。'); return }
    const payload = { exportedAt: new Date().toISOString(), projectBible, expandedScript, characters, scenes, shotSpecs, finalNotes, outputs }
    downloadPackage(JSON.stringify(payload, null, 2))
    appendLog('success', '交付包已导出：ShotSpec JSON / 终版摘要 / 输出镜头清单。')
    toast.success('已导出交付包 JSON')
  }

  return <div className="min-h-screen p-5 text-slate-100 xl:p-6"><Toaster richColors position="top-right" /><div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-[1880px] gap-5 xl:min-h-[calc(100vh-48px)]"><main className="flex min-w-0 flex-1 flex-col gap-5"><MissionHeader /><div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"><div className="flex min-h-0 flex-col gap-5"><WorkflowRail /><Button variant="secondary" size="lg" className="w-full justify-between rounded-[24px] bg-white/[0.04] text-slate-100 hover:bg-white/[0.06]" onClick={handleExport}><span className="flex items-center gap-2"><Download className="size-4" />导出交付包</span><Sparkles className="size-4 text-sky-300" /></Button></div><DirectorWorkbench onApprove={handleApprove} onReject={handleReject} /></div><OutputDock onExport={handleExport} /></main><aside className="hidden w-[360px] shrink-0 xl:block"><InspectorRail /></aside></div></div>
}
