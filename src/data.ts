import type { ConceptReference, LogEntry, OutputFrame, ProjectBible, ServerState, ShotSpec, StageId, WorkflowStage } from '@/types'

export const workflowStages: WorkflowStage[] = [
  { id: 0, label: '项目圣经', shortLabel: 'Bible', summary: '锁定世界观、色彩脚本与镜头排斥规则。', deliverable: 'Ground Truth Level 0', decisionHint: '先定调，再让所有节点服从。' },
  { id: 1, label: '剧情扩写', shortLabel: 'Script', summary: '完善情绪节拍、角色心理与戏剧钩子。', deliverable: 'Expanded Story Beats', decisionHint: '文本决定后续镜头张力。' },
  { id: 2, label: '概念设定', shortLabel: 'Concept', summary: '锁定角色、场景与关键材质方向。', deliverable: 'Face / Scene Reference', decisionHint: '不要让世界观在这一步漂。' },
  { id: 3, label: '分镜脚本', shortLabel: 'ShotSpec', summary: '导演视图与机器参数视图并排共创。', deliverable: 'ShotSpec JSON', decisionHint: '让机位语言和文本节奏对齐。' },
  { id: 4, label: '灰模预演', shortLabel: 'Previz', summary: '低成本排查空间坍塌、主光方向与连续性。', deliverable: 'Blockout / Lighting Preview', decisionHint: '在最便宜的地方消灭昂贵错误。' },
  { id: 5, label: '终版签发', shortLabel: 'Final', summary: '终版批注、签发归档与交付导出。', deliverable: 'Archive & Delivery Package', decisionHint: '只在结果仓里做最后判断。' },
]

export const initialBible: ProjectBible = {
  style: '黑暗奇幻 · 电影级写实材质 · 潮湿岩洞与火把主光',
  colorScript: '冷色环境 + 极暖主光冲突，整体对比高，保留压迫感与雾气层次。',
  forbidden: '禁止鱼眼镜头、禁止卡通比例、禁止低幼色彩、禁止过度景深虚化。',
}

export const initialScript = `亚瑟握着猎魔银剑走入岩洞深处。火把的光切开潮湿空气，墙面不断回响未知生物的低吼。每往前一步，空气中的硫磺味与压迫感就更重一分。`

export const conceptReferences: ConceptReference[] = [
  { id: 'concept-a', title: '亚瑟 · 冷峻猎魔版', subtitle: '银甲、旧伤、火把反打光、洞穴潮湿颗粒感', palette: 'from-sky-500/25 via-slate-900 to-slate-950' },
  { id: 'concept-b', title: '废土龙巢 · 熔岩残照版', subtitle: '红鳞巨龙、石灰岩洞壁、硫磺雾、热冷对冲', palette: 'from-orange-500/25 via-rose-950 to-slate-950' },
  { id: 'concept-c', title: '导演备选 · 低色温悬疑版', subtitle: '压暗环境、单点主光、强化呼吸声空间感', palette: 'from-violet-500/25 via-slate-950 to-slate-950' },
]

export const initialShotSpecs: ShotSpec[] = [
  { id: 'shot-01', shotCode: 'S01', description: '亚瑟手持火把步入洞穴，肩背僵硬，视线被前方黑暗吸走。', lens: '24mm 广角 / 过肩镜头 / 机位略低于肩线', composition: 'OTS，前景保留火把与岩壁切面，突出人物渺小感。', emotion: '警觉、克制、强压迫感' },
  { id: 'shot-02', shotCode: 'S02', description: '火光扫过远处巨龙鳞片，只露出一只反光龙眼与半截头骨轮廓。', lens: '135mm 长焦 / 极近特写 / 焦点压在龙眼高光', composition: '画面几乎只保留龙眼与热雾边缘，背景全部压暗。', emotion: '威压、不可知、猎物被注视' },
]

export const outputFrames: OutputFrame[] = [
  { id: 'frame-01', title: 'Shot 01 / 火把入洞', engine: 'ComfyUI / IC-Light', status: 'ready', caption: '亚瑟进入洞穴，火把主光与湿冷环境形成强对比。', grade: '镜头一致性 93%', palette: 'from-slate-950 via-sky-900/40 to-amber-500/20' },
  { id: 'frame-02', title: 'Shot 02 / 龙眼现身', engine: 'Gemini Flash + ControlNet', status: 'ready', caption: '长焦压缩空间，龙眼高光与热雾边缘保持稳定。', grade: '镜头一致性 96%', palette: 'from-slate-950 via-rose-950/40 to-orange-500/20' },
  { id: 'frame-03', title: 'Shot 03 / 终版签发包', engine: 'Archive Bundle', status: 'locked', caption: '等待导演最终签发后生成可交付的 PDF / JSON 包。', grade: '待签发', palette: 'from-slate-950 via-violet-950/40 to-fuchsia-500/20' },
]

export const initialLogs: LogEntry[] = [
  { id: 'log-1', kind: 'system', timestamp: '15:34:21', message: 'V6 导演控制台已加载，当前为 Stage 3 分镜脚本。' },
  { id: 'log-2', kind: 'info', timestamp: '15:34:26', message: 'Ground Truth Level 0 已同步到所有执行节点。' },
  { id: 'log-3', kind: 'success', timestamp: '15:34:31', message: '概念设定已锁定，Reference ID 已固化。' },
  { id: 'log-4', kind: 'warning', timestamp: '15:34:36', message: '等待导演确认 ShotSpec，尚未推进到灰模预演。' },
]

export const buildServerStates = (stageId: StageId, aiStatus: 'idle' | 'generating' | 'error' = 'idle'): ServerState[] => {
  const activeMap: Record<StageId, ServerState['key'][]> = {
    0: ['memory'],
    1: ['memory', 'prompt'],
    2: ['prompt', 'render'],
    3: ['memory', 'prompt'],
    4: ['render', 'vision'],
    5: ['memory', 'render', 'vision'],
  }

  const isPromptBusy = aiStatus === 'generating' && (stageId === 1 || stageId === 3)
  const promptStatus = isPromptBusy
    ? 'GPT-5.4 Generating…'
    : aiStatus === 'error' && (stageId === 1 || stageId === 3)
      ? 'Error'
      : stageId === 3
        ? 'Compiling ShotSpec'
        : 'Idle'

  const promptTone: ServerState['tone'] = isPromptBusy
    ? 'active'
    : aiStatus === 'error' && (stageId === 1 || stageId === 3)
      ? 'warning'
      : activeMap[stageId].includes('prompt')
        ? 'active'
        : 'idle'

  return [
    { key: 'memory', title: 'Script & Memory', meta: 'Database / Vector', status: 'Ground Truth Sync', tone: activeMap[stageId].includes('memory') ? 'active' : 'idle' },
    { key: 'prompt', title: 'Prompt Engineering', meta: 'GPT-5.4 / Comfy JSON', status: promptStatus, tone: promptTone },
    { key: 'render', title: 'Render & Synthesis', meta: 'Flash API / RunningHub', status: stageId >= 4 ? 'Rendering / Previz' : 'Idle', tone: activeMap[stageId].includes('render') ? 'active' : 'idle' },
    { key: 'vision', title: 'Consistency Vision', meta: 'Vision Verifier', status: stageId >= 4 ? 'Continuity Check' : 'Idle', tone: activeMap[stageId].includes('vision') ? 'active' : 'idle' },
  ]
}
