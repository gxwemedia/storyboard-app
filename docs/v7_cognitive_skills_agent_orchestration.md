# 智能分镜系统研发记录 V7.0：认知技能系统与多智能体编排基座 (Cognitive Skills & Agent Orchestration)

## 1. 痛点：流水线"能跑"，但AI"不懂行"

V6 完成了工业级横向支撑（ShotSpec JSON、变更传导 DAG、终版归档），但暴露了一个根本性缺陷：

**所有阶段的 AI 行为都是硬编码的。** 无论拍悬疑片还是奇幻史诗，Orchestrator 使用同一套 system prompt、同一个温度参数、同一组构图偏好。这意味着：

- 导演无法按类型片调整 AI 的"审美直觉"
- 镜头规划的景别/光位偏好无法随项目变化
- 新增类型片支持需要改源码，而非加配置
- AI 像一个"万金油实习生"，什么都能做但什么都不精

同时，Stage 0（项目圣经）和 Stage 1（剧本扩写）的分离导致了体验断裂：用户填完圣经后，一点"签发"就被自动扔到扩写阶段，甚至没有输入剧本的机会。

## 2. V7 架构核心：三层变革

### 2.1 Stage 重构：从 6 阶段压缩为 5 阶段（全局重编号 0~4）

| 旧编号 | 新编号 | 名称 | 变更说明 |
|:------:|:------:|------|---------|
| 0 + 1 | **0** | 圣经 & 剧本 | 合并。圣经表单 + 剧本输入 + AI 扩写按钮（手动触发）|
| 2 | **1** | 概念设定 | 编号前移 |
| 3 | **2** | 分镜脚本 | 编号前移 |
| 4 | **3** | 灰模预演 | 编号前移 |
| 5 | **4** | 终版签发 | 编号前移 |

**关键行为变更**：`approveCurrentStage()` 不再自动调用 `runStageAI()`。推进到下一阶段后，用户在新页面手动决定何时触发 AI。这将控制权交还给导演。

影响范围：`StageId` 类型、`data.ts`、`workbench-store.ts`、`app.tsx`、Sidebar、所有 Stage 组件、lineage 追踪编号、全部测试文件。

### 2.2 认知技能系统：让 AI "懂行"

对齐 Claude/Codex CLI 的 Skills 范式，构建了一套**模块化、可组合的 AI 技能单元系统**。

#### 设计哲学

```
Skills ≈ 函数（Function）
  输入：YAML frontmatter 元数据 + Markdown 指令正文
  输出：注入到 AI system prompt 的领域知识 + 行为约束
```

#### 5 分类体系

每个分类对应一个 Stage，技能包在所属 Stage 页面加载（而非全部堆到一个页面）：

| 分类 | Stage | 说明 | 内置技能包 |
|------|:-----:|------|-----------|
| `bible` | 0 | 世界观、基调与禁忌规则 | 暗黑哥特、明亮童话 |
| `script` | 0 | 按类型定制扩写策略 | 悬疑剧本、史诗奇幻剧本 |
| `concept` | 1 | 角色/场景一致性描述风格 | 悬疑电影摄影、写实剧情 |
| `shotspec` | 2 | 景别/光位/构图偏好 | 分镜专家、史诗奇幻视觉、赛博科幻 |
| `rendering` | 3 | 灰模/渲染工作流参数 | 默认渲染 |

#### 目录结构（对齐 Claude SKILL.md 范式）

```
src/skills/
├── types.ts                      # SkillCategory / SkillMeta / Skill 类型
├── registry.ts                   # 单例注册表：解析、注册、匹配、多激活
├── index.ts                      # 统一导出
└── packs/                        # 内置技能包（每个 = 目录 + SKILL.md）
    ├── bible/
    │   ├── dark-gothic/SKILL.md
    │   └── bright-fairy-tale/SKILL.md
    ├── script/
    │   ├── suspense-script/SKILL.md
    │   └── epic-fantasy-script/SKILL.md
    ├── concept/
    │   ├── suspense-cinematography/SKILL.md
    │   └── realistic-drama/SKILL.md
    ├── shotspec/
    │   ├── shot-spec-expert/SKILL.md
    │   ├── epic-fantasy-visual/SKILL.md
    │   └── scifi-worldbuilding/SKILL.md
    └── rendering/
        └── default-render/SKILL.md
```

#### SKILL.md 格式

每个技能包由 YAML frontmatter（元数据，~100 tokens）+ Markdown body（指令正文，按需加载）组成：

```markdown
---
name: 暗黑哥特风格
description: 黑暗奇幻、电影级写实材质、低调光影
category: bible
preset_style: "黑暗奇幻 · 电影级写实材质 · 潮湿岩洞与火把主光"
preset_colorScript: "冷色环境 + 极暖主光冲突，整体对比高"
preset_forbidden: "禁止鱼眼镜头、禁止卡通比例、禁止低幼色彩"
---

## 视觉语言规则

- 景别偏好：MS / MCU / CU（强调角色情绪和材质细节）
- 光位偏好：Rembrandt / Split（面部阴影+明暗对比）
...
```

#### 注册表核心能力

| 能力 | API |
|------|-----|
| 按分类查询 | `getByCategory(cat)` |
| 分类多激活 | `setActiveForCategory(cat, skillId)` — 每个 Stage 独立激活一个技能 |
| 自动匹配 | `autoMatchByCategory(cat, styleHint)` — 根据项目风格文本自动选择 |
| 聚合指令 | `getAllActiveInstructions()` — 拼接所有分类激活技能的指令，注入 system prompt |
| BiblePreset 回填 | `getBiblePreset(skillId)` — bible 技能选中后自动回填圣经表单 |

### 2.3 技能装载 UI：每个 Stage 只管自己的分类

`SkillSelector` 组件新增 `filterCategories` prop，实现按 Stage 分拆：

```tsx
// Stage 0：仅显示 bible + script 下拉
<SkillSelector filterCategories={['bible', 'script']} />

// Stage 1：仅显示 concept 下拉
<SkillSelector filterCategories={['concept']} />

// Stage 2：仅显示 shotspec 下拉
<SkillSelector filterCategories={['shotspec']} />

// Stage 3：仅显示 rendering 下拉
<SkillSelector filterCategories={['rendering']} />
```

每个下拉框左侧显示绿色圆点（已选）+ 分类标签 + Stage 编号，右侧提供"自动"匹配按钮。

## 3. 资产血缘与变更传导

V7 在 V6 的 DAG 基础上强化了三个关键能力：

| 能力 | 实现 |
|------|------|
| **Stale 标记** | `invalidateSubtree(nodeId)` 递归标记下游资产为 stale，带 staleSince 时间戳 |
| **局部恢复** | `validateNode(nodeId)` 重置 stale 状态，适用于重新渲染后的回收 |
| **影响分析** | `impactAnalysis(nodeId)` 计算爆炸半径、受影响节点数、推荐操作 |
| **DAG 可视化** | `LineageDAGViewer` 组件：按 Stage 分层、stale 红框高亮、锁定标记 🔒、点击节点弹出影响面板 |

## 4. 数据流全景

```
┌─────────────────────────────────────────────────────────────┐
│                      Director Console                        │
│  ┌──────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │ Sidebar  │   │  Workbench      │   │  Log Panel       │  │
│  │ Stage 0  │   │  ┌────────────┐ │   │  [system logs]   │  │
│  │ Stage 1  │   │  │SkillSelect│ │   │                  │  │
│  │ Stage 2  │   │  │(per stage) │ │   │                  │  │
│  │ Stage 3  │   │  └────────────┘ │   │                  │  │
│  │ Stage 4  │   │  [Stage Content]│   │                  │  │
│  └──────────┘   └────────┬────────┘   └──────────────────┘  │
│                          │                                    │
│                    ┌─────▼─────┐                              │
│                    │ Registry  │                              │
│                    │ (Skills)  │                              │
│                    └─────┬─────┘                              │
│                          │ getAllActiveInstructions()          │
│                    ┌─────▼─────┐                              │
│                    │Orchestrator│                             │
│                    │ + Skill    │                             │
│                    │ Prompts    │                             │
│                    └─────┬─────┘                              │
│                          │                                    │
│               ┌──────────┴──────────┐                        │
│               │   LLM API / RH     │                        │
│               │  (GPT / Gemini /   │                        │
│               │   RunningHub)      │                        │
│               └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## 5. 验证结果

```
 Test Files  8 passed (8)
      Tests  127 passed (127)
   Duration  1.39s

 npm run build  ✓ 148 modules, 2.03s
```

## 6. 下一步：多智能体编排层（V7.1 预告）

当前 Skills 系统解决了"教 AI 画什么风格"的问题，但还缺少"教 AI 怎么干活"的编排层。V7.1 计划引入轻量 StageAgent 抽象（零新依赖，~360 行代码）：

```typescript
interface StageAgent {
  stageId: number
  name: string
  systemPrompt: string     // 从 SKILL.md 动态加载
  tools: AgentTool[]       // 可用工具声明
  execute(ctx: AgentContext): Promise<AgentResult>
}

interface AgentContext {
  bible: ProjectBible
  previousOutput: unknown  // 上一阶段输出
  activeSkills: Skill[]    // 当前激活的技能包
  variables: Map<string, unknown>
}
```

这将使每个 Stage 从"一个 function call"进化为"一个有技能、有工具、有上下文的智能体"。

## 7. 架构结论

V6 定义了"拍完的戏由谁保管"的**数据模型**和"导演如何审签"的**交互模型**。

V7 定义了"AI 如何理解不同类型片"的**认知模型 (Cognitive Model)** 和"导演如何按阶段装配 AI 能力"的**技能模型 (Skill Model)**。

至此，系统从"一个 AI 工具"开始向"一个可配置的 AI 制片团队"演进。每个 Stage 拥有自己的技能包，就像每个部门有自己的专业能力。技能包可热插拔、可扩展、可由社区贡献——这才是工业级 AIGC 平台的基础形态。
