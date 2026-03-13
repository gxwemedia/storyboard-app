# 增强 ShotSpec 字段与数据流修复

## 问题概述

1. **数据流断裂**：分镜阶段拿到的仍是默认剧本，不是 AI 扩写后的文本
2. **ShotSpec 字段不足**：缺少 AI 制图/视频必备的提示词字段和分镜辅助信息

---

## 提议变更

### 1. 类型层 — 扩展 ShotSpec

#### [MODIFY] [index.ts](file:///f:/storyboard-app/src/types/index.ts)

新增 6 个字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `imagePrompt` | `string` | AI 合成图片的英文提示词 |
| `videoPrompt` | `string` | 生成视频的提示词（含表演和运镜描述） |
| `dialogue` | `string` | 角色对白（当前镜头内的台词） |
| `soundEffect` | `string` | 音效描述（环境音、动效） |
| `notes` | `string` | 备注栏（导演批注、特殊要求） |
| `duration` | `number` | 镜头时长估算（秒） |

---

### 2. Schema 层 — 同步 Zod

#### [MODIFY] [shot-spec.ts](file:///f:/storyboard-app/src/schemas/shot-spec.ts)

在 `aiShotSpecSchema` 中追加 6 个可选字段。

---

### 3. Agent 层 — 修复数据流 + 扩展输出

#### [MODIFY] [stage-agents.ts](file:///f:/storyboard-app/src/agents/stage-agents.ts)

- `shotSpecAgent` 的 system prompt 要求 AI 输出新字段
- 确认 `ctx.groundTruth.expandedScript` 数据源正确

#### [MODIFY] [orchestrator.ts](file:///f:/storyboard-app/src/services/orchestrator.ts)

- [parseShotSpecResponse](file:///f:/storyboard-app/src/services/orchestrator.ts#159-199) 解析新字段

---

### 4. Store 层 — 确保 expandedScript 正确传递

#### [MODIFY] [workbench-store.ts](file:///f:/storyboard-app/src/store/workbench-store.ts)

- 确认 `expandedScript` 存入 store 并传递到分镜阶段

---

### 5. UI 层 — 分镜卡展示新字段

#### [MODIFY] Stage 2 分镜 UI 组件

- 分镜卡增加 imagePrompt / videoPrompt / dialogue / soundEffect / notes / duration 的展示和编辑

---

## 验证计划

```bash
npx vitest run
npm run build
```
