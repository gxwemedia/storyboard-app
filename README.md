# 智能分镜制片台 (Storyboard App)

> 基于 React + Vite + AI 的工业级分镜制片工作台原型

## 项目概述

智能分镜制片台是一个面向影视制作的专业分镜工作台，采用「人机协作」(HITL - Human In The Loop) 的设计理念，将导演的创意决策与 AI 的自动化生成能力相结合，提供从剧本大纲到最终分镜导出的完整管线。

## 技术栈

### 前端框架
- **React 19.2.4** - 使用最新的 React 特性，包括并发渲染和自动批处理
- **TypeScript 5.9.3** - 全量类型覆盖，保证代码质量与开发体验
- **Vite 7.3.1** - 极速的开发服务器与构建工具

### UI 组件库
- **Radix UI** - 无样式的可访问性组件基础库
  - `@radix-ui/react-scroll-area` - 自定义滚动区域
  - `@radix-ui/react-separator` - 分隔线组件
  - `@radix-ui/react-slot` - 插槽机制
  - `@radix-ui/react-tabs` - 标签页切换
- **Tailwind CSS 4.2.1** - 原子化 CSS 框架
- **shadcn/ui** - 基于 Radix UI 的高质量组件集合
- **Lucide React 0.577.0** - 统一的图标系统
- **Framer Motion 12.35.0** - 声明式动画库
- **Sonner 2.0.7** - 优雅的 Toast 通知组件

### 状态管理
- **Zustand 5.0.11** - 轻量级状态管理库，用于管理工作台全局状态

### 工具库
- **clsx 2.1.1** & **tailwind-merge 3.5.0** - 样式类名工具
- **class-variance-authority 0.7.1** - 组件变体管理

## 项目架构

### 目录结构

```
storyboard-app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 基础组件
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   └── workbench/      # 工作台核心组件
│   │       ├── director-workbench.tsx    # 导演工作台主视图
│   │       ├── inspector-rail.tsx        # 右侧检查器面板
│   │       ├── mission-header.tsx         # 顶部任务头
│   │       ├── output-dock.tsx           # 底部输出坞
│   │       └── workflow-rail.tsx          # 左侧工作流导航
│   ├── services/
│   │   ├── ai-client.ts      # AI API 客户端封装
│   │   └── orchestrator.ts   # 各阶段 AI 编排逻辑
│   ├── store/
│   │   └── workbench-store.ts    # Zustand 全局状态管理
│   ├── types.ts            # TypeScript 类型定义
│   ├── data.ts             # 初始化数据与配置
│   ├── App.tsx             # 应用根组件
│   ├── main.tsx            # 应用入口
│   └── index.css           # 全局样式
├── index.html              # HTML 模板
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

### 核心模块解析

#### 1. 状态管理 (`store/workbench-store.ts`)

使用 Zustand 管理全局状态，主要包含：

- **工作流状态**: 当前阶段、聚焦阶段、归档状态
- **项目数据**: 视觉圣经、剧本、角色、场景、分镜规格
- **AI 状态**: 生成状态、错误信息
- **操作方法**: 阶段推进、数据编辑、AI 调用、日志记录

#### 2. AI 服务层 (`services/`)

**ai-client.ts** - AI API 通信核心
- 支持两种 API 格式：OpenAI Chat Completions 和 Responses API
- 开发环境通过 Vite proxy 绕过 CORS
- 支持超时控制、请求取消、错误重试
- 集成 Gemini 原生生图接口

**orchestrator.ts** - 各阶段 AI 编排
- Stage 1: 剧本扩写 (Script & Emotion Expansion)
- Stage 2: 概念设定一致性描述反推
- Stage 3: ShotSpec 结构化分镜生成
- 图像生成: 角色/场景概念图

#### 3. 工作流阶段

系统采用 6 阶段管线：

| 阶段 | 名称 | 功能 | 交付物 |
|-----|------|------|--------|
| Stage 0 | 项目圣经 | 锁定世界观、色彩脚本、禁忌规则 | Ground Truth Level 0 |
| Stage 1 | 剧情扩写 | 完善情绪节拍、角色心理、戏剧钩子 | Expanded Story Beats |
| Stage 2 | 概念设定 | 锁定角色、场景与关键材质方向 | Face / Scene Reference |
| Stage 3 | 分镜脚本 | 导演视图与机器参数视图并排共创 | ShotSpec JSON |
| Stage 4 | 灰模预演 | 低成本排查空间坍塌、主光方向 | Blockout / Lighting Preview |
| Stage 5 | 终版签发 | 终版批注、签发归档与交付导出 | Archive & Delivery Package |

#### 4. UI 组件架构

**DirectorWorkbench** - 中央导演工作台
- 动态显示当前阶段的内容面板
- 集成 AI 生成状态与错误处理
- 提供签发/驳回操作按钮

**WorkflowRail** - 左侧工作流导航
- 显示所有 6 个阶段的状态
- 支持点击切换聚焦阶段（仅历史阶段）
- 固定显示原始剧本大纲

**InspectorRail** - 右侧检查器面板
- 实时显示后端服务状态
- 展示服务器集群的运行情况

**OutputDock** - 底部输出坞
- 展示各阶段生成的资产输出
- 显示最终归档包状态

## 开发环境配置

### 环境变量

在项目根目录创建 `.env` 文件：

```env
# 文本 AI 配置 (用于 Stage 1、Stage 3 的文本生成)
VITE_AI_API_KEY=your_api_key_here
VITE_AI_BASE_URL=https://gmn.chuangzuoli.com
VITE_AI_MODEL=gpt-5.4
VITE_AI_WIRE_API=chat  # 可选: 'chat' 或 'responses'

# 图像 AI 配置 (用于 Stage 2 的概念图生成)
VITE_IMAGE_AI_API_KEY=your_gemini_api_key_here
VITE_IMAGE_AI_BASE_URL=https://yunwu.ai
VITE_IMAGE_AI_MODEL=gemini-3.1-flash-image-preview
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

### 类型检查

```bash
npm run check
```

## 核心功能

### 1. 项目圣经编辑 (Stage 0)
- 定义风格锁定、色彩脚本、禁忌规则
- 输入原始剧本大纲
- 作为整个管线的 Ground Truth Level 0

### 2. AI 剧本扩写 (Stage 1)
- 基于 AI 自动将大纲扩写为详细剧本
- 补全情绪节拍、环境描写、戏剧钩子
- 保持与视觉圣经风格一致

### 3. 概念设定管理 (Stage 2)
- 角色设定：支持添加/编辑/删除角色
- 场景设定：支持添加/编辑/删除场景
- AI 一致性描述：自动反推角色/场景的视觉特征
- AI 概念图生成：支持自定义宽高比与清晰度
- 锁定机制：锁定后的设定将传递给后续阶段

### 4. 分镜脚本编辑 (Stage 3)
- 导演视图：自然语言描述镜头内容
- 机器视图：结构化 ShotSpec JSON
- 双视图同步编辑，确保意图与参数一致
- AI 自动生成初始分镜建议

### 5. 灰模预演 (Stage 4)
- 快速预览空间布局与光照
- 排查连续性问题
- 降低后续修正成本

### 6. 终版签发 (Stage 5)
- 终版批注确认
- 一键导出交付包 (JSON 格式)
- 包含完整的 ShotSpec、剧本、角色/场景设定

## API 代理配置

开发环境下，Vite 通过代理转发 AI 请求：

```ts
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/api/ai': {
      target: 'https://gmn.chuangzuoli.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ai/, ''),
      secure: true,
    },
    '/api/gemini-image': {
      target: 'https://yunwu.ai',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/gemini-image/, ''),
      secure: true,
    },
  },
}
```

这样可以在开发环境绕过浏览器的 CORS 限制。

## 设计理念

### 1. HITL (Human In The Loop)
- AI 负责初始内容生成与参数计算
- 导演保留最终的审批与修改权
- 每个阶段都提供「签发」与「驳回」选项

### 2. Ground Truth 层级
- Level 0: 项目圣经（基础约束）
- Level 1: 扩写剧本（叙事基础）
- Level 2: 概念设定（视觉基础）
- Level 3: 分镜规格（技术基础）

### 3. 工业级管线
- 阶段渐进，前序阶段锁定后，后续阶段自动继承
- 结构化数据传递，避免自然语言歧义
- 支持导出标准化交付包

## 浏览器兼容性

- Chrome (推荐)
- Edge
- Firefox
- Safari

需要支持：
- ES2020+
- CSS Grid & Flexbox
- CSS Custom Properties
- Resize Observer API

## 许可证

私有项目

## 联系方式

如有问题或建议，请联系项目维护者。
