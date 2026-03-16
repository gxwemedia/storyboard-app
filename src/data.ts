import type { ConceptReference, LogEntry, OutputFrame, ProjectBible, ServerState, ShotSpec, StageId, WorkflowStage } from '@/types'

export const workflowStages: WorkflowStage[] = [
  { id: 0, label: '圣经 & 剧本', shortLabel: 'Bible+Script', summary: '锁定世界观、色彩脚本、禁忌规则，并完成剧本扩写。', deliverable: 'Ground Truth + Expanded Script', decisionHint: '先定调、再扩写，让所有节点服从。' },
  { id: 1, label: '概念设定', shortLabel: 'Concept', summary: '锁定角色、场景与关键材质方向。', deliverable: 'Face / Scene Reference', decisionHint: '不要让世界观在这一步漂。' },
  { id: 2, label: '分镜脚本', shortLabel: 'ShotSpec', summary: '导演视图与机器参数视图并排共创。', deliverable: 'ShotSpec JSON', decisionHint: '让机位语言和文本节奏对齐。' },
  { id: 3, label: '灰模预演', shortLabel: 'Previz', summary: '低成本排查空间坍塌、主光方向与连续性。', deliverable: 'Blockout / Lighting Preview', decisionHint: '在最便宜的地方消灭昂贵错误。' },
  { id: 4, label: '终版签发', shortLabel: 'Final', summary: '终版批注、签发归档与交付导出。', deliverable: 'Archive & Delivery Package', decisionHint: '只在结果仓里做最后判断。' },
]

export const initialBible: ProjectBible = {
  style: '暗黑国风 · 电影级写实材质 · 阴云山林与晨雾主光',
  colorScript: '冷青灰环境 + 晨光暖色点缀，整体低饱和，保留山林肃杀与仙侠气韵。',
  forbidden: '禁止鱼眼镜头、禁止卡通比例、禁止低幼色彩、禁止过度景深虚化。',
}

export const initialScript = `原始脚本
场景：司婆婆宅院外
时间：清晨（一片阴云笼罩延康）
人物：秦牧 龙麒麟 司幼幽
日落月升，昼夜交替，龙麒麟疾驰。
清晨，龙麒麟气喘吁吁落地。
龙膜麟：公子⋯我…我跑不动了⋯
秦牧从饕餮袋取出一盆赤火灵丹，龙麒麟猛吃。
秦牧（看地图，松了一口气）：距离霸州只剩一千里了，今晚就能赶到。先找个地方休息吧…
秦牧环顾山林，见远处有座宅院。
秦牧（内心）：好新的一座宅院，似乎是刚刚建成的⋯
突然，一个美丽女子（司幼幽）走出宅院，与秦牧四目相对。
秦牧（惊喜）：婆婆？你怎么在这里！
司幼幽（惊讶）：牧儿？你怎么找过来的？我好不容易才甩掉瞎子和马爷，居然被你寻到了。
秦牧（警觉）：不对，你是婆婆还是厉教主？
司幼幽（笑）：老魔头暂时被我镇压住了，老伽菜虽然没能除掉他，但也让他元气大伤，我现在与他势均力敌，于是和他定了协议。晚上的时候他出来，自天的时候我出来。
秦牧（狐疑）：倘若你真的是婆婆，为何还要故意避开马爷爷和瞎爷爷？为何不回大墟？
司幼幽（叹）：回去又如何，大墟晚上有黑暗来袭，如果老魔头再跑出来折腾，他们几个老骨头怎能禁得起？不如就住在这里，磨一磨老魔头的心性。
司幼幽瞪泰牧。
司幼幽：臭小子连婆婆也敢怀疑了？我若是老魔头，想害你还需要编假话？
秦牧（怔，笑）：婆婆说得有理。
`

export const conceptReferences: ConceptReference[] = [
  { id: 'concept-a', title: '秦牧 · 少年牧神版', subtitle: '布衣短褐、饕餮袋、晨雾散射光、山林清冷质感', palette: 'from-sky-500/25 via-slate-900 to-slate-950' },
  { id: 'concept-b', title: '龙麒麟 · 疾驰旷野版', subtitle: '麒麟鳞甲、日夜交替光影、旷野沙尘、速度动态模糊', palette: 'from-orange-500/25 via-rose-950 to-slate-950' },
  { id: 'concept-c', title: '司幼幽 · 宅院初现版', subtitle: '美丽女子、新建宅院门前、阴云柔光、克制温情', palette: 'from-violet-500/25 via-slate-950 to-slate-950' },
]

export const initialShotSpecs: ShotSpec[] = [
  { id: 'shot-01', shotCode: 'S01', sceneId: 'SC01', description: '日落月升快速交替，龙麒麟驮着秦牧疾驰穿越旷野与山林。', imagePrompt: '@龙麒麟 驮着 @秦牧 穿越旷野，日落月升快速交替/\n@LongQilin carrying @QinMu galloping across wilderness, rapid day-night transition', videoPrompt: '@龙麒麟 全速奔跑、镜头侧面跟拍平移/\n@LongQilin running at full speed, camera tracking from side', dialogue: '', soundEffect: '风声呼啸/蹄声密集/昼夜切换的环境音变化', lens: '24mm 广角 / 跟拍运动镜头 / 机位平视', composition: '前景保留飞驰的草地与树影，龙麒麟居画面中央偏右。', emotion: '急迫、奔波、昼夜不停的紧张感', scale: 'WS', focalLength: '24mm', keyLight: 'Natural', axisAnchor: '以龙麒麟奔跑方向为轴线基准', continuityLock: '', notes: '需要日夜快速交替的光影特效', duration: 4 },
  { id: 'shot-02', shotCode: 'S02', sceneId: 'SC02', description: '清晨阴云下，秦牧与司幼幽在宅院门前四目相对，表情从惊喜转为警觉。', imagePrompt: '@秦牧 与 @司幼幽 在新建宅院门前对视，阴云笼罩的清晨/\n@QinMu and @SiYouyou facing each other at manor gate, overcast morning', videoPrompt: '@秦牧 表情从惊喜转为警觉、@司幼幽 微笑中带意外/\nExpression shift from surprise to alert, soft overcast light', dialogue: '秦牧：婆婆？你怎么在这里！', soundEffect: '晨风轻拂树叶/远处鸟鸣', lens: '85mm 中长焦 / 双人中景 / 机位平视', composition: '两人对称构图，宅院大门居中，晨雾弥漫前景。', emotion: '惊喜、试探、暗藏警觉', scale: 'MS', focalLength: '85mm', keyLight: 'Loop', axisAnchor: '以两人连线为轴线基准', continuityLock: '与上一镜保持同一山林环境方向', notes: '', duration: 5 },
]

export const outputFrames: OutputFrame[] = [
  { id: 'frame-01', title: 'Shot 01 / 龙麒麟疾驰', engine: 'ComfyUI / IC-Light', status: 'ready', caption: '龙麒麟驮秦牧昼夜疾驰，日落月升快速交替光影。', grade: '镜头一致性 93%', palette: 'from-slate-950 via-sky-900/40 to-amber-500/20' },
  { id: 'frame-02', title: 'Shot 02 / 宅院重逢', engine: 'Gemini Flash + ControlNet', status: 'ready', caption: '秦牧与司幼幽宅院门前对视，晨雾柔光与阴云氛围。', grade: '镜头一致性 96%', palette: 'from-slate-950 via-rose-950/40 to-orange-500/20' },
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
    0: ['memory', 'prompt'],
    1: ['prompt', 'render'],
    2: ['memory', 'prompt'],
    3: ['render', 'vision'],
    4: ['memory', 'render', 'vision'],
  }

  const isPromptBusy = aiStatus === 'generating' && (stageId === 0 || stageId === 2)
  const promptStatus = isPromptBusy
    ? 'GPT-5.4 Generating…'
    : aiStatus === 'error' && (stageId === 0 || stageId === 2)
      ? 'Error'
      : stageId === 2
        ? 'Compiling ShotSpec'
        : 'Idle'

  const promptTone: ServerState['tone'] = isPromptBusy
    ? 'active'
    : aiStatus === 'error' && (stageId === 0 || stageId === 2)
      ? 'warning'
      : activeMap[stageId].includes('prompt')
        ? 'active'
        : 'idle'

  const isRenderBusy = aiStatus === 'generating' && stageId === 1
  const renderStatus = isRenderBusy
    ? 'Gemini Image Generating…'
    : stageId >= 3
      ? 'Rendering / Previz'
      : stageId === 1
        ? 'Concept Image Ready'
        : 'Idle'

  const renderTone: ServerState['tone'] = isRenderBusy
    ? 'active'
    : aiStatus === 'error' && stageId === 1
      ? 'warning'
      : activeMap[stageId].includes('render')
        ? 'active'
        : 'idle'

  return [
    { key: 'memory', title: 'Script & Memory', meta: 'Database / Vector', status: 'Ground Truth Sync', tone: activeMap[stageId].includes('memory') ? 'active' : 'idle' },
    { key: 'prompt', title: 'Prompt Engineering', meta: 'GPT-5.4 / Comfy JSON', status: promptStatus, tone: promptTone },
    { key: 'render', title: 'Render & Synthesis', meta: 'Gemini Image / RunningHub', status: renderStatus, tone: renderTone },
    { key: 'vision', title: 'Consistency Vision', meta: 'Vision Verifier', status: stageId >= 3 ? 'Continuity Check' : 'Idle', tone: activeMap[stageId].includes('vision') ? 'active' : 'idle' },
  ]
}
