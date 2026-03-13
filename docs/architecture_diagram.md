# Storyboard App 架构图

## 整体架构图

```mermaid
flowchart TD
    subgraph Frontend["前端应用层"]
        UI[React UI v19]
        State[Zustand状态管理]
        Components[shadcn/ui组件库]
        Styles[Tailwind CSS + Framer Motion]
    end

    subgraph Business["业务逻辑层"]
        Workflow[工作流管理]
        Orchestrator[AI编排器]
        Skills[技能系统]
        Agents[多智能体路由]
    end

    subgraph Data["数据层"]
        Types[TypeScript类型定义]
        Schemas[Zod数据校验]
        Store[状态存储]
        Export[导出功能]
    end

    subgraph Service["服务层"]
        AI[AI API客户端]
        MCP[MCP协议服务]
        Change[变更传导]
        External[外部服务集成]
    end

    UI --> State
    State --> Business
    Business --> Data
    Data --> Service
```

## 五阶段工作流图

```mermaid
flowchart LR
    Stage0["Stage 0<br/>圣经 & 剧本"]
    Stage1["Stage 1<br/>概念设定"]
    Stage2["Stage 2<br/>分镜脚本"]
    Stage3["Stage 3<br/>灰模预演"]
    Stage4["Stage 4<br/>终版签发"]

    Stage0 --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4

    subgraph Inputs0["Stage 0 输入"]
        Bible[项目圣经]
        Script[剧本大纲]
    end

    subgraph Outputs0["Stage 0 输出"]
        GT0[Ground Truth L0]
        FullScript[扩写剧本]
    end

    subgraph Outputs1["Stage 1 输出"]
        Character[角色参考图]
        Scene[场景参考图]
    end

    subgraph Outputs2["Stage 2 输出"]
        ShotSpec[ShotSpec JSON]
    end

    subgraph Outputs3["Stage 3 输出"]
        Blockout[Blockout预览]
        Lighting[光照预览]
    end

    subgraph Outputs4["Stage 4 输出"]
        Archive[归档包]
        Delivery[交付包]
    end

    Inputs0 --> Stage0
    Stage0 --> Outputs0
    Stage1 --> Outputs1
    Stage2 --> Outputs2
    Stage3 --> Outputs3
    Stage4 --> Outputs4
```

## 认知技能系统架构

```mermaid
flowchart TD
    subgraph SkillSystem["认知技能系统"]
        direction LR
        SkillPacks["技能包目录"]
        Registry["技能注册表"]
        Loader["技能加载器"]
        Injector["技能注入器"]
    end

    subgraph SkillTypes["技能分类"]
        Bible["bible<br/>Stage 0"]
        Script["script<br/>Stage 0"]
        Concept["concept<br/>Stage 1"]
        ShotSpec["shotspec<br/>Stage 2"]
        Rendering["rendering<br/>Stage 3"]
    end

    subgraph SkillFormat["技能格式"]
        YAML[YAML frontmatter<br/>元数据]
        Markdown[Markdown<br/>指令内容]
    end

    Director[导演选择技能] --> SkillPacks
    SkillPacks --> Registry
    Registry --> SkillTypes
    SkillTypes --> SkillFormat
    
    Agent[AI智能体] --> Injector
    Injector --> AI[AI System Prompt]
    
    SkillFormat --> Loader
    Loader --> Injector
```

## 多智能体编排架构

```mermaid
flowchart TD
    Director[导演控制台] --> Router[智能体路由器]
    
    subgraph Agents["阶段智能体"]
        Agent0["Stage 0 Agent<br/>圣经剧本智能体"]
        Agent1["Stage 1 Agent<br/>概念设定智能体"]
        Agent2["Stage 2 Agent<br/>分镜脚本智能体"]
        Agent3["Stage 3 Agent<br/>灰模预演智能体"]
        Agent4["Stage 4 Agent<br/>终版签发智能体"]
    end

    Router --> Agent0
    Router --> Agent1
    Router --> Agent2
    Router --> Agent3
    Router --> Agent4

    subgraph Skills["技能注入"]
        Skill0[圣经技能包]
        Skill1[概念技能包]
        Skill2[分镜技能包]
        Skill3[渲染技能包]
        Skill4[签发技能包]
    end

    Agent0 --> Skill0
    Agent1 --> Skill1
    Agent2 --> Skill2
    Agent3 --> Skill3
    Agent4 --> Skill4

    subgraph AI["AI服务"]
        LLM[LLM API]
        RunningHub[RunningHub]
        SDXL[SDXL服务]
    end

    Agents --> Orchestrator[AI编排器]
    Orchestrator --> AI
    
    subgraph Output["输出处理"]
        Validator[Zod验证器]
        Store[状态存储]
        UI[UI渲染]
    end

    AI --> Validator
    Validator --> Store
    Store --> UI
```

## 数据流架构

```mermaid
sequenceDiagram
    participant D as 导演
    participant UI as 用户界面
    participant S as 状态存储
    participant R as 技能注册表
    participant A as 智能体路由器
    participant O as AI编排器
    participant AI as AI服务
    participant V as 验证器
    participant L as 血缘追踪

    D->>UI: 选择技能包
    UI->>R: 加载技能指令
    R-->>UI: 返回技能数据
    
    D->>UI: 触发AI执行
    UI->>S: 更新AI状态
    S->>A: 路由到对应智能体
    A->>O: 调用编排器
    O->>R: 获取技能指令
    R-->>O: 返回增强prompt
    O->>AI: 发送API请求
    AI-->>O: 返回AI响应
    O->>V: 验证数据格式
    V-->>O: 验证通过
    O->>S: 更新结果数据
    S->>L: 记录血缘关系
    L-->>S: 更新DAG图
    S->>UI: 通知数据更新
    UI-->>D: 显示AI结果
```

## 技术栈依赖图

```mermaid
graph TD
    App[Storyboard App] --> React[React 19]
    App --> TypeScript[TypeScript 5.9]
    App --> Vite[Vite 7.3]
    
    React --> Zustand[Zustand]
    React --> Radix[Radix UI]
    React --> shadcn[shadcn/ui]
    
    Zustand --> Store[状态管理]
    Radix --> Accessibility[可访问性]
    shadcn --> Components[预制组件]
    
    App --> Tailwind[Tailwind CSS 4]
    App --> Motion[Framer Motion]
    
    Tailwind --> Styling[原子化样式]
    Motion --> Animations[动画效果]
    
    App --> Zod[Zod 4.3]
    App --> Vitest[Vitest]
    
    Zod --> Validation[数据验证]
    Vitest --> Testing[测试框架]
    
    App --> Skills[技能系统]
    App --> Agents[智能体系统]
    
    Skills --> MCP[MCP协议]
    Agents --> Orchestrator[编排器]
```

## 文件结构图

```mermaid
graph TD
    Root[e:/storyboard-app]
    Src[src/]
    Docs[docs/]
    
    Root --> Src
    Root --> Docs
    
    Src --> App[App.tsx]
    Src --> Main[main.tsx]
    
    subgraph Components["components/"]
        UI[ui/基础组件]
        V2[v2/新版组件]
    end
    
    subgraph Services["services/"]
        AI[ai-client.ts]
        MCP[mcp/协议服务]
        Export[export/导出功能]
        Change[change-propagation.ts]
    end
    
    subgraph Store["store/"]
        Workbench[workbench-store.ts]
        Lineage[lineage-store.ts]
        RunningHub[runninghub-store.ts]
    end
    
    subgraph Skills["skills/"]
        Registry[registry.ts]
        Packs[packs/技能包]
    end
    
    subgraph Agents["agents/"]
        StageAgents[stage-agents.ts]
        Router[router.ts]
    end
    
    subgraph Types["types/"]
        Index[index.ts]
        ExportTypes[export.ts]
        LineageTypes[lineage.ts]
    end
    
    Src --> Components
    Src --> Services
    Src --> Store
    Src --> Skills
    Src --> Agents
    Src --> Types
```

## 架构演进历史图

```mermaid
timeline
    title Storyboard App 架构演进历史
    section V1
        Prompt工程基线 : 基础AI集成
    section V2
        多智能体框架 : 智能体分工
    section V3
        MCP认知架构 : 标准化协议
    section V4
        HITL生产架构 : 人机协作
    section V5
        工业管线架构 : 五阶段流程
    section V6
        工业横向扩展 : ShotSpec JSON<br/>血缘DAG<br/>归档系统
    section V7 (当前)
        认知技能系统 : 技能包机制<br/>多智能体编排<br/>导演控制优化
```

## 核心模块关系图

```mermaid
graph LR
    Workbench[工作台状态] --> Orchestrator[AI编排器]
    Workbench --> Skills[技能系统]
    Workbench --> Agents[智能体系统]
    
    Skills --> SkillPacks[技能包]
    Agents --> StageAgents[阶段智能体]
    
    Orchestrator --> AI[AI服务]
    AI --> MCP[MCP协议]
    AI --> RunningHub[RunningHub]
    
    Workbench --> Lineage[血缘追踪]
    Lineage --> DAG[依赖图]
    
    Orchestrator --> Validation[数据验证]
    Validation --> Zod[Zod模式]
    
    Workbench --> Export[导出功能]
    Export --> PDF[PDF导出]
    Export --> JSON[JSON导出]
    Export --> CSV[CSV导出]
    
    Orchestrator --> Change[变更传导]
    Change --> Impact[影响分析]
```

---

## 图表说明

### 1. 整体架构图
展示了项目的四层架构：
- **前端应用层**: React UI和状态管理
- **业务逻辑层**: 工作流、AI编排、技能系统
- **数据层**: 类型定义、数据验证、状态存储
- **服务层**: AI API、MCP协议、外部服务

### 2. 五阶段工作流图
展示了影视分镜的完整制作流程：
- Stage 0: 项目圣经和剧本设定
- Stage 1: 概念设计和视觉参考
- Stage 2: 分镜脚本和技术规格
- Stage 3: 空间布局和光照预览
- Stage 4: 最终确认和交付归档

### 3. 认知技能系统架构
展示了V7的核心创新：
- 技能包按Stage分类
- YAML+Markdown格式
- 动态注入到AI系统提示词
- 导演可选的技能组合

### 4. 多智能体编排架构
展示了AI辅助的详细流程：
- 每个阶段有专属智能体
- 智能体支持技能注入
- 统一的AI编排器管理
- 完整的数据验证流程

### 5. 数据流架构
使用序列图展示用户操作到AI响应的完整流程，强调：
- 技能加载和注入时机
- 数据验证的重要性
- 血缘追踪的记录

### 6. 技术栈依赖图
展示了项目的技术选型和依赖关系，突出：
- 现代前端技术栈组合
- 专业化工具的选择
- 测试和质量保证

### 7. 文件结构图
展示了项目的代码组织结构，强调：
- 模块化设计原则
- 清晰的职责分离
- 易于维护的目录结构

### 8. 架构演进历史图
展示了项目从V1到V7的演进历程，体现了：
- 持续改进的设计哲学
- 适应需求变化的架构调整
- 技术债务的积极管理

### 9. 核心模块关系图
展示了项目主要模块的交互关系，强调：
- 状态管理作为核心协调者
- AI服务与业务逻辑的分离
- 扩展性设计的考虑

---

## 关键设计原则

1. **模块化**: 每个功能模块独立，通过清晰接口交互
2. **可扩展性**: 技能包热插拔，支持新类型片
3. **类型安全**: 全量TypeScript覆盖，Zod运行时验证
4. **导演控制**: HITL设计，AI辅助而非取代
5. **工业标准**: 遵循MCP等业界协议，确保互操作性
6. **测试驱动**: Vitest测试框架，确保质量
7. **文档完整**: 详细的架构文档和开发指南

---

## 架构评估

### 优势
1. **技术先进**: 采用最新前端技术和AI集成模式
2. **专业深度**: 深入理解影视分镜制作流程
3. **扩展性强**: 模块化设计，易于添加新功能
4. **质量保证**: 全面的类型检查和测试覆盖

### 改进建议
1. **性能监控**: 可添加应用性能监控
2. **错误恢复**: 增强异常处理和恢复机制
3. **国际化**: 考虑多语言支持
4. **离线能力**: 考虑PWA和离线缓存

---

**最后更新**: 2025-03-13
**架构版本**: V7.0 (认知技能系统与多智能体编排基座)