import { 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  X,
  ArrowRight,
  Info
} from 'lucide-react'
import { workflowStages } from '@/data'
import { useWorkbenchStore } from '@/store/workbench-store'
import type { StageId } from '@/types'
import { Button } from '@/components/ui/button'

interface DirectorWorkbenchProps {
  onApprove: () => void
  onReject: () => void
  onExport: () => void
}

export function DirectorWorkbench({ onApprove, onReject, onExport }: DirectorWorkbenchProps) {
  const workflowStageId = useWorkbenchStore((s) => s.workflowStageId)
  const archiveReady = useWorkbenchStore((s) => s.archiveReady)
  const aiStatus = useWorkbenchStore((s) => s.aiStatus)
  const aiError = useWorkbenchStore((s) => s.aiError)
  const clearAiError = useWorkbenchStore((s) => s.clearAiError)
  const runStageAI = useWorkbenchStore((s) => s.runStageAI)

  const stage = workflowStages[workflowStageId]
  const isGenerating = aiStatus === 'generating'

  const handleRunAI = () => {
    runStageAI(workflowStageId)
  }

  return (
    <div className="card flex-1 flex flex-col">
      {/* Stage Header */}
      <div className="card-header pb-4 border-b border-white/6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-semibold text-blue-300">
                  Stage 0{workflowStageId}
                </span>
              </div>
              {archiveReady && (
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs font-semibold text-emerald-300">
                    已归档
                  </span>
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold text-slate-100 mb-2">
              {stage.label}
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl">
              {stage.summary}
            </p>
          </div>
        </div>
      </div>

      {/* AI Error Banner */}
      {aiStatus === 'error' && aiError && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-rose-300 mb-1">
                AI 调用失败
              </p>
              <p className="text-sm text-rose-200/80 leading-relaxed">
                {aiError}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                clearAiError()
                runStageAI(workflowStageId)
              }}
              className="flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              重试
            </Button>
          </div>
        </div>
      )}

      {/* Stage Content */}
      <div className="flex-1 py-6">
        <StageContent stageId={workflowStageId} />
      </div>

      {/* Action Bar */}
      <div className="pt-6 border-t border-white/6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Info className="w-4 h-4" />
            <span>完成当前阶段后点击推进</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Reject Button */}
            <Button
              variant="secondary"
              onClick={onReject}
              disabled={workflowStageId === 0}
            >
              <X className="w-4 h-4 mr-2" />
              返回上一阶段
            </Button>

            {/* Run AI Button */}
            {workflowStageId > 0 && workflowStageId < 5 && (
              <Button
                variant="secondary"
                onClick={handleRunAI}
                disabled={isGenerating}
              >
                <Play className="w-4 h-4 mr-2" />
                {isGenerating ? '生成中...' : '运行 AI'}
              </Button>
            )}

            {/* Approve Button */}
            <Button
              onClick={onApprove}
              disabled={isGenerating}
            >
              {archiveReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  导出交付包
                </>
              ) : (
                <>
                  推进到下一阶段
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StageContent({ stageId }: { stageId: StageId }) {
  // TODO: Implement actual stage content rendering
  const stageContent: Record<StageId, { title: string; description: string }> = {
    0: {
      title: '项目圣经',
      description: '设定项目的基本信息、风格、角色和场景'
    },
    1: {
      title: '剧本扩写',
      description: '基于原始脚本生成详细的分镜剧本'
    },
    2: {
      title: '概念设定',
      description: '生成角色和场景的概念图像'
    },
    3: {
      title: '分镜生成',
      description: '生成详细的分镜规格和镜头描述'
    },
    4: {
      title: '灰模预演',
      description: '生成灰模预演图像'
    },
    5: {
      title: '终版签发',
      description: '审核并归档最终版本'
    },
  }

  const content = stageContent[stageId]

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <span className="text-3xl">📋</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          {content.title}
        </h3>
        <p className="text-sm text-slate-400">
          {content.description}
        </p>
      </div>
    </div>
  )
}
