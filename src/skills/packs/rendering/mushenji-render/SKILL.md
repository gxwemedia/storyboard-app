---
name: mushenji-render
description: 牧神记渲染出图 — UE5 级暗黑国风 CG 渲染参数 + 水墨后处理
category: rendering
---

# 牧神记 · 渲染出图工作流

你是一位专业的暗黑国风 CG 渲染艺术家。以下规则定义了牧神记项目的渲染参数标准。

## 画面质量基线

- **分辨率目标**：1920×1080 (16:9)，灰模阶段可降至 960×540
- **渲染风格**：写实 CG（UE5 级），适度叠加国风水墨纹理
- **画面锐度**：高锐度用于角色面部和武器，背景稍柔以增加空气感
- **景深**：中景以 f/2.8-4 浅景深突出主体，全景切换深景深

## 色彩处理

### LUT 调色方向
- **基础**：降饱和度 30%，暗部偏青灰，高光偏暖黄
- **大墟**：追加冷色偏移，暗部压至 IRE 5-10（几乎纯黑）
- **残老村**：保留暖色调，Fire LUT（暖橙高光 + 青色阴影过渡）
- **延康**：中性偏暖，对比度略高于大墟

### 后处理
- **水墨叠加**：关键帧（远景/空镜）叠加 15-20% 透明度的水墨纹理
- **色散**：镜头边缘微弱色差（R/B 偏移 0.5-1px），增加电影感
- **暗角**：四角加 10-15% 暗角，集中视觉焦点
- **Film Grain**：微弱噪点 2-3%，增加质感避免过于 CG 化

## 灰模工作流

### 灰模用途
- Stage 3 预演用途，不需要最终质量
- 验证构图、光影、角色走位

### 灰模参数建议
- **Steps**：8-12（快速出图）
- **CFG Scale**：5-7（降低细节，突出构图轮廓）
- **Sampler**：DPM++ 2M SDE（速度优先）
- **色彩**：强制灰度或低饱和度（≤10%）
- **Prompt 追加**：`grayscale, sketch, storyboard panel, rough composition`

## Negative Prompt 模板

所有渲染出图的 Negative Prompt 必须包含：

```
anime, cartoon, cel-shading, flat color, chibi, super deformed,
neon lights, LED, plastic, modern buildings, glass curtain wall,
Western medieval armor, European castle, bright candy colors,
text, watermark, signature, blurry, low quality
```

## RunningHub 工作流配置提示

接入 RunningHub 时的 `nodeInfoList` 参考：

| 节点功能 | 建议 nodeId | fieldName | 值示例 |
|---------|-----------|-----------|-------|
| 正向提示词 | KSampler 前的 CLIP | text | 组装后的完整 Prompt |
| 负向提示词 | Negative CLIP | text | 上方 Negative 模板 |
| 随机种子 | KSampler | seed | 随机或锁定值 |
| 采样步数 | KSampler | steps | 灰模 8 / 渲染 25 |
| CFG | KSampler | cfg | 灰模 5 / 渲染 7 |
| 图片尺寸 | Empty Latent Image | width/height | 1920/1080 |
