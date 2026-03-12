---
name: 通用分镜生成
description: 通用分镜生成工作流（适用于所有类型）
tags: [通用, 分镜, default]
priority: 1
stages: [3, 4]
---

## 步骤 1: 构建 Prompt
<!-- action: transform -->

将 ShotSpec 中的自然语言描述转换为图片生成 Prompt：

- 按景别（scale）选择合适的构图关键词
- 按光位（keyLight）添加光影描述
- 拼接 Bible 中的风格锁定和禁忌规则
- 追加 Negative prompt

## 步骤 2: 调用 RunningHub 工作流
<!-- action: generate_image -->
<!-- timeout: 600000 -->
<!-- onError: retry -->
<!-- retry: 1 -->

使用配置的工作流 ID 创建生成任务，轮询等待完成。

## 步骤 3: 保存结果
<!-- action: store -->

将生成的图片 URL 保存到项目数据中，创建血缘追踪记录。
