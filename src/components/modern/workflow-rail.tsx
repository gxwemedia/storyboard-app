import { 
  Layers3, 
  Wand2, 
  Image as ImageIcon, 
  Layout, 
  Film, 
  CheckCircle,
  ChevronRight,
  Lock 
} from 'lucide-react'
import { workflowStages } from '@/data'
import { useWorkbenchStore } from '@/store/workbench-store'

const stageIcons = {
  0: Layers3,
  1: Wand2,
  2: ImageIcon,
  3: Layout,
  4: Film,
  5: CheckCircle,
} as const

export function WorkflowRail() {
  const workflowStageId = useWorkbenchStore((state) => state.workflowStageId)
  const rawScript = useWorkbenchStore((state) => state.rawScript)

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">制作流程</h2>
        <p className="card-description">按照顺序完成各个阶段</p>
      </div>

      {/* Steps */}
      <div className="steps-container">
        {workflowStages.map((stage, index) => {
          const Icon = stageIcons[stage.id as keyof typeof stageIcons]
          const isCompleted = stage.id < workflowStageId
          const isActive = stage.id === workflowStageId
          const isLocked = stage.id > workflowStageId

          return (
            <button
              key={stage.id}
              className="step-item"
              disabled={isLocked}
            >
              <div className="step-indicator">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isLocked ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <span>{stage.id}</span>
                )}
              </div>
              <div className="step-content">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${
                    isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                  <span className="step-title">{stage.label}</span>
                </div>
                <p className="step-description">{stage.summary}</p>
              </div>
              {!isLocked && (
                <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
              )}
            </button>
          )
        })}
      </div>

      {/* Quick Reference */}
      <div className="mt-6 pt-6 border-t border-white/6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          项目参考
        </h3>
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/6">
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
            {rawScript || '暂无项目参考文本'}
          </p>
        </div>
      </div>
    </div>
  )
}
