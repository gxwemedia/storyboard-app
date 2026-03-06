import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  FileJson2,
  Film,
  Flame,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { workflowStages } from '@/data'
import { useWorkbenchStore } from '@/store/workbench-store'
import type { StageId } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

// ---------------------------------------------------------------------------
// Props & constants
// ---------------------------------------------------------------------------

interface DirectorWorkbenchProps {
  onApprove: () => void
  onReject: () => void
}

const stageAccent: Record<StageId, string> = {
  0: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
  1: 'border-violet-400/25 bg-violet-500/10 text-violet-100',
  2: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100',
  3: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
  4: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  5: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
}

const stageIcons: Record<StageId, React.ComponentType<{ className?: string }>> = {
  0: Layers3,
  1: WandSparkles,
  2: Clapperboard,
  3: FileJson2,
  4: Film,
  5: Flame,
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DirectorWorkbench({ onApprove, onReject }: DirectorWorkbenchProps) {
  const focusedStageId = useWorkbenchStore((s) => s.focusedStageId)
  const workflowStageId = useWorkbenchStore((s) => s.workflowStageId)
  const archiveReady = useWorkbenchStore((s) => s.archiveReady)
  const aiStatus = useWorkbenchStore((s) => s.aiStatus)
  const aiError = useWorkbenchStore((s) => s.aiError)
  const clearAiError = useWorkbenchStore((s) => s.clearAiError)
  const runStageAI = useWorkbenchStore((s) => s.runStageAI)

  const stage = workflowStages.find((item) => item.id === focusedStageId)!
  const isLiveStage = focusedStageId === workflowStageId
  const StageIcon = stageIcons[focusedStageId]
  const isGenerating = aiStatus === 'generating'

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header card */}
      <Card className="bg-[rgba(8,14,28,0.86)]">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge className={stageAccent[focusedStageId]}>Director Workbench</Badge>
              <CardTitle className="mt-4 text-2xl">{stage.label}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                {stage.summary} · 当前交付物：{stage.deliverable} · 决策提示：{stage.decisionHint}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  isLiveStage
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                    : 'border-white/10 bg-white/[0.03]'
                }
              >
                {isLiveStage ? 'Live Stage' : 'Review Mode'}
              </Badge>
              {isGenerating && (
                <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-100">
                  <Loader2 className="mr-1.5 inline size-3 animate-spin" />
                  AI Generating
                </Badge>
              )}
              {archiveReady && (
                <Badge className="border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100">
                  Archive Ready
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Error Banner */}
      {aiStatus === 'error' && aiError && (
        <div className="flex items-start gap-3 rounded-[24px] border border-rose-400/25 bg-rose-500/10 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-100">AI 调用失败</p>
            <p className="mt-1 text-sm leading-6 text-rose-200/80">{aiError}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                clearAiError()
                runStageAI(workflowStageId)
              }}
            >
              <RefreshCw className="mr-1.5 size-3" />
              重试
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAiError}>
              忽略
            </Button>
          </div>
        </div>
      )}

      {/* Content area */}
      <Card className="panel-grid min-h-0 flex-1 overflow-hidden bg-[rgba(7,12,24,0.94)]">
        <CardContent className="flex h-full min-h-0 flex-col p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={focusedStageId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex h-full min-h-0 flex-col"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-3">
                  <StageIcon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Stage 0{focusedStageId} / {stage.shortLabel}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    工业级导演审批工位
                  </p>
                </div>
                {isGenerating && (
                  <div className="ml-auto flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs text-sky-100">
                    <Loader2 className="size-3 animate-spin" />
                    GPT-5.4 生成中…
                  </div>
                )}
              </div>
              <StageView stageId={focusedStageId} />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldAlert className="size-4" />
          {isLiveStage
            ? '中心区域只展示当前真实审批动作。'
            : '你正在查看历史阶段，审批按钮仍作用于当前工作流阶段。'}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={(workflowStageId === 0 && focusedStageId === 0) || isGenerating}
          >
            驳回并回退
          </Button>
          <Button
            variant={workflowStageId === 5 ? 'success' : 'default'}
            onClick={onApprove}
            disabled={isGenerating}
          >
            {isGenerating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {workflowStageId === 5 ? '最终签发并归档' : '签发并进入下一阶段'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage views
// ---------------------------------------------------------------------------

function StageView({ stageId }: { stageId: StageId }) {
  switch (stageId) {
    case 0:
      return <ProjectBibleStage />
    case 1:
      return <ExpandedScriptStage />
    case 2:
      return <ConceptStage />
    case 3:
      return <ShotSpecStage />
    case 4:
      return <PrevizStage />
    case 5:
      return <FinalStage />
    default:
      return null
  }
}

function ProjectBibleStage() {
  const bible = useWorkbenchStore((s) => s.projectBible)
  const updateBible = useWorkbenchStore((s) => s.updateBible)
  const rawScript = useWorkbenchStore((s) => s.rawScript)
  const updateRawScript = useWorkbenchStore((s) => s.updateRawScript)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-slate-950/55">
          <CardHeader>
            <CardTitle className="text-lg">Stage 0 · 视觉圣经</CardTitle>
            <CardDescription>先锁定方向，再让所有下游节点服从统一规则。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                风格锁定
              </label>
              <Input
                value={bible.style}
                onChange={(e) => updateBible('style', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                色彩脚本
              </label>
              <Textarea
                value={bible.colorScript}
                onChange={(e) => updateBible('colorScript', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                禁忌规则
              </label>
              <Textarea
                value={bible.forbidden}
                onChange={(e) => updateBible('forbidden', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-950/55">
          <CardHeader>
            <CardTitle className="text-lg">约束摘要</CardTitle>
            <CardDescription>
              这是进入所有节点前必须统一的 Ground Truth Level 0。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
            <p>· 风格锁：{bible.style}</p>
            <p>· 色彩脚本：{bible.colorScript}</p>
            <p>· 禁用规则：{bible.forbidden}</p>
          </CardContent>
        </Card>
      </div>
      {/* 原始剧本大纲输入 */}
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">📜 原始剧本大纲</CardTitle>
          <CardDescription>
            提供你的故事线 / 基础大纲。签发后，AI 将基于圣经约束和这段大纲进行深度扩写。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="例如：勇士进入了昏暗的山洞，发现了一只巨龙……"
            value={rawScript}
            onChange={(e) => updateRawScript(e.target.value)}
            className="min-h-[160px]"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ExpandedScriptStage() {
  const expandedScript = useWorkbenchStore((s) => s.expandedScript)
  const updateExpandedScript = useWorkbenchStore((s) => s.updateExpandedScript)
  const aiStatus = useWorkbenchStore((s) => s.aiStatus)

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">
            剧情扩写与情绪埋点
            {aiStatus === 'generating' && (
              <Loader2 className="ml-2 inline size-4 animate-spin text-sky-300" />
            )}
          </CardTitle>
          <CardDescription>
            {aiStatus === 'generating'
              ? 'GPT-5.4 正在对剧本进行深度扩写…'
              : '让文本先把节奏、压迫感和角色心态撑起来。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={expandedScript}
            onChange={(e) => updateExpandedScript(e.target.value)}
            className="min-h-[360px]"
            disabled={aiStatus === 'generating'}
          />
        </CardContent>
      </Card>
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">关键节拍</CardTitle>
          <CardDescription>工业写法先看情绪链，而不是直接看镜头。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            1. 进入空间时的未知压迫
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            2. 火把主光与岩壁湿气形成叙事钩子
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            3. 巨龙只先露出部分信息，延迟揭示
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            4. 主角不是进攻，而是先被环境吞没
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ConceptStage() {
  const references = useWorkbenchStore((s) => s.conceptReferences)
  const selectedConceptId = useWorkbenchStore((s) => s.selectedConceptId)
  const selectConcept = useWorkbenchStore((s) => s.selectConcept)

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {references.map((reference) => (
        <button
          key={reference.id}
          type="button"
          onClick={() => selectConcept(reference.id)}
          className={[
            'group relative overflow-hidden rounded-[28px] border p-5 text-left transition',
            selectedConceptId === reference.id
              ? 'border-fuchsia-400/25 shadow-[0_18px_50px_-28px_rgba(217,70,239,0.55)]'
              : 'border-white/8',
          ].join(' ')}
        >
          <div
            className={[
              'absolute inset-0 bg-gradient-to-br opacity-90',
              reference.palette,
            ].join(' ')}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_40%)] opacity-60" />
          <div className="relative flex h-[280px] flex-col justify-between rounded-[24px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
            <Badge className="w-fit border-white/15 bg-black/25 text-white">Reference</Badge>
            <div>
              <p className="text-xl font-semibold text-white">{reference.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">{reference.subtitle}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function ShotSpecStage() {
  const shotSpecs = useWorkbenchStore((s) => s.shotSpecs)
  const updateShot = useWorkbenchStore((s) => s.updateShot)
  const aiStatus = useWorkbenchStore((s) => s.aiStatus)

  return (
    <Tabs defaultValue="director" className="flex h-full min-h-0 flex-col">
      <TabsList>
        <TabsTrigger value="director">导演视图</TabsTrigger>
        <TabsTrigger value="machine">机器视图</TabsTrigger>
      </TabsList>
      <TabsContent value="director" className="h-full min-h-0">
        <div className="grid h-full gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <Card className="min-h-0 bg-slate-950/55">
            <CardHeader>
              <CardTitle className="text-lg">
                Director View / Tabular
                {aiStatus === 'generating' && (
                  <Loader2 className="ml-2 inline size-4 animate-spin text-sky-300" />
                )}
              </CardTitle>
              <CardDescription>
                {aiStatus === 'generating'
                  ? 'GPT-5.4 正在生成结构化分镜…'
                  : '导演使用可读语言修整镜头意图，保持叙事语感。'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shotSpecs.map((shot) => (
                <div
                  key={shot.id}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{shot.shotCode}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {shot.emotion}
                      </p>
                    </div>
                    <Badge className="border-amber-400/20 bg-amber-400/10 text-amber-100">
                      ShotSpec
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <Textarea
                      value={shot.description}
                      onChange={(e) =>
                        updateShot(shot.id, 'description', e.target.value)
                      }
                      className="min-h-[112px]"
                      disabled={aiStatus === 'generating'}
                    />
                    <Input
                      value={shot.lens}
                      onChange={(e) => updateShot(shot.id, 'lens', e.target.value)}
                      disabled={aiStatus === 'generating'}
                    />
                    <Textarea
                      value={shot.composition}
                      onChange={(e) =>
                        updateShot(shot.id, 'composition', e.target.value)
                      }
                      className="min-h-[84px]"
                      disabled={aiStatus === 'generating'}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-slate-950/55">
            <CardHeader>
              <CardTitle className="text-lg">Machine View / ShotSpec JSON</CardTitle>
              <CardDescription>
                所有镜头参数都落成结构化实体，避免下游重新理解自然语言。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-[24px] border border-white/8 bg-black/30 p-5 font-mono text-xs leading-7 text-sky-100">
                {JSON.stringify(
                  shotSpecs.map((shot) => ({
                    shot_id: shot.shotCode,
                    description: shot.description,
                    lens: shot.lens,
                    composition: shot.composition,
                    emotion: shot.emotion,
                  })),
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="machine">
        <Card className="bg-slate-950/55">
          <CardHeader>
            <CardTitle className="text-lg">结构化字段检查</CardTitle>
            <CardDescription>
              切换到机器视角时，导演可以看到哪些字段真正会进入工作流。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {shotSpecs.map((shot) => (
              <div
                key={shot.id}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"
              >
                <p className="mb-3 text-white">{shot.shotCode}</p>
                <p>
                  <span className="text-slate-500">description</span> · {shot.description}
                </p>
                <p>
                  <span className="text-slate-500">lens</span> · {shot.lens}
                </p>
                <p>
                  <span className="text-slate-500">composition</span> · {shot.composition}
                </p>
                <p>
                  <span className="text-slate-500">emotion</span> · {shot.emotion}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function PrevizStage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">Blockout / Lighting Preview</CardTitle>
          <CardDescription>
            在最便宜的阶段确认空间、轴线和光位是否稳定。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]"
            >
              <div className="h-[220px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_50%),linear-gradient(135deg,rgba(15,23,42,1),rgba(30,41,59,1))]" />
              <div className="p-4 text-sm text-slate-300">
                Shot 0{index} / 灰模构图与主光方向预演
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">排雷清单</CardTitle>
          <CardDescription>这一阶段不追求漂亮，只追求便宜且可靠。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 主角与门位保持同一轴线关系
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 逆光方向与火把主光保持逻辑一致
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 背景层次、雾气遮挡和热源位置不冲突
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 下游若只修局部，可使用 Inpainting / Mask 而非全图重跑
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FinalStage() {
  const finalNotes = useWorkbenchStore((s) => s.finalNotes)
  const updateFinalNotes = useWorkbenchStore((s) => s.updateFinalNotes)

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">终版批注与签发</CardTitle>
          <CardDescription>
            在结果仓出现之前，先确认它是否真的值得被归档。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              '人物长相与概念设定一致',
              '镜头语言与 ShotSpec 参数一致',
              '主光方向与空间连续性无穿帮',
              '可以进入归档与导出环节',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-200"
              >
                <CheckCircle2 className="size-4 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
          <Textarea
            value={finalNotes}
            onChange={(e) => updateFinalNotes(e.target.value)}
            className="min-h-[190px]"
          />
        </CardContent>
      </Card>
      <Card className="bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-lg">交付摘要</CardTitle>
          <CardDescription>签发后将自动进入元数据归档与交付包生成。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 输出 ShotSpec JSON / 导演批注 / 参考资产清单
          </div>
          <Separator />
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 导出分镜 PDF 剧本集，供外包动画或片场部门交接
          </div>
          <Separator />
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            · 归档 Prompt 历史、Reference ID、终版审批时间戳
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
