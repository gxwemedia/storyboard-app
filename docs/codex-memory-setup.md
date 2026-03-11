# Codex 长时记忆与 Skill 历史配置建议

## 目标

- 保留完整历史会话原始日志
- 提供可检索的长时记忆
- 自动汇总历史对话里实际使用过的 skills
- 在新会话开场快速回忆用户偏好、项目上下文和常用 skills

## 当前环境判断

- 已存在原始会话日志目录：`C:\Users\xft40\.codex\sessions`
- 已存在全局历史日志：`C:\Users\xft40\.codex\history.jsonl`
- 已启用 `memory` MCP，但当前未沉淀结构化记忆
- 当前配置中 `disable_response_storage = true`，会削弱后续追溯能力

## 推荐结构

### 1. 原始日志层

- 继续使用 `sessions` 和 `history.jsonl` 作为审计与追溯来源
- 建议开启响应存储，保证后续可重建技能使用轨迹与偏好摘要

### 2. 结构化记忆层

- 继续使用 `memory` MCP 存以下几类信息：
  - 用户偏好
  - 项目偏好
  - 关键决策
  - 常用命令
  - 常用 skills

### 3. Skill 台账层

- 用扫描脚本从历史日志里提取真实 skill 使用痕迹
- 生成本地报告：`docs/codex-skill-usage.json`
- 生成可阅读报告：`docs/codex-skill-usage.md`
- 再把高价值摘要写入 `memory` MCP

## 建议修改的 Codex 配置

建议调整 `C:\Users\xft40\.codex\config.toml`：

```toml
model_provider = "custom"
model = "gpt-5.4"
model_reasoning_effort = "high"
disable_response_storage = false
personality = "pragmatic"
```

如果你担心历史文件增长过快，可以后续增加归档策略，而不是直接关闭响应存储。

## 本仓库附带脚本

### 统计历史已使用 skills

```powershell
node scripts/codex-skill-audit.mjs
```

可选参数：

```powershell
node scripts/codex-skill-audit.mjs --codex-root C:\Users\xft40\.codex --sessions-only
```

输出文件：

- `docs/codex-skill-usage.json`
- `docs/codex-skill-usage.md`

## 推荐工作流

### 每次新会话开始

- 先读取 memory 中的用户与项目摘要
- 读取最近高频 skills
- 读取上次未完成事项

### 每次会话结束

- 更新用户偏好与项目记忆
- 更新最近使用的 skills
- 如有重要结论，写入结构化实体而不是原文长段

### 每周或每次大改后

- 运行一次 `node scripts/codex-skill-audit.mjs`
- 把最新 skill 汇总同步到 memory

## 注意事项

- 不建议把全部聊天原文无差别写入 memory
- 建议只存摘要、实体、偏好和决策
- skill 统计应记录“次数 + 最近一次 + 所属会话”，避免只有名字没有上下文
