---
name: 悬疑分镜生成
description: 为悬疑类剧本生成带暗调光影的分镜工作流
tags: [悬疑, 惊悚, 犯罪, 推理, noir]
priority: 10
stages: [3, 4]
---

## 步骤 1: 构建悬疑风格 Prompt
<!-- action: transform -->
<!-- onError: abort -->

将 ShotSpec 转换为带有悬疑视觉风格的生成 Prompt：

- 景别偏好：CU / ECU / MS（捕捉微表情和线索特写）
- 光位偏好：Split / Rembrandt（面部阴影+明暗对比）
- 色彩调性：青灰、暗蓝、褪色黄
- 荷兰角（Dutch Angle）适当使用以增加不安感
- 环境：封闭空间、阴影区域占比大
- Negative prompt 追加：bright colors, happy atmosphere, cartoon

## 步骤 2: 上传参考图（如有）
<!-- action: upload -->
<!-- when: has:referenceImage -->
<!-- onError: skip -->

检查上下文中是否有参考图。如有，上传至 RunningHub 获取 fileName 用于后续 ControlNet 输入。

## 步骤 3: 生成灰模预演
<!-- action: generate_image -->
<!-- timeout: 600000 -->
<!-- onError: retry -->
<!-- retry: 2 -->

调用 RunningHub 工作流生成灰模：

- 使用灰模工作流 ID（VITE_RUNNINGHUB_WORKFLOW_GRAY）
- nodeInfoList 中注入 Prompt（step-1 输出）和 seed
- 轮询等待完成，超时 10 分钟

## 步骤 4: 一致性校验
<!-- action: validate -->
<!-- when: has:step-3.output -->
<!-- onError: skip -->

对生成的灰模进行自动校验：

- 检查是否包含预期的暗调光影特征
- 验证角色面部是否清晰可辨（非过度阴影遮挡）
- 标记不满足条件的结果为 stale

## 步骤 5: 持久化结果
<!-- action: store -->

将生成结果保存到血缘 DAG：

- 创建 AssetNode（type: gray_model）
- 建立与源 ShotSpec 的 derived_from 边
- 记录生成参数快照
