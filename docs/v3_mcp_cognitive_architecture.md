# 智能分镜系统研发记录 V3.0：认知技能与 MCP Server 双层并发架构

## 1. 架构定位 (Architecture Positioning)
痛定思痛 V2.0 时代各 Agent 数据流通的僵硬，我们迎来了革命性的 V3.0 设计：彻底抛弃“多个人互相传纸条”的 Multi-Agent，转用 **“1 个最强大脑 (Orchestrator) + N 个标准化外设 (MCP Servers)”** 的结构。

这是当今 Agent 开发领域最推崇的解耦神话：教模型“怎么想”的软逻辑，与教模型“怎么做”的硬 API 彻底分离。

## 2. 核心大革命：认知栈与执行栈的剥离

### 2.1 顶层认知技能箱 (Cognitive Skill Box) -> 解决“怎么想”
这是该架构的灵魂资产储备库。技能就是“人类经验、工作流 SOP 的数字化结晶”。
* **展现形式**：RAG 向量数据库里的顶级编剧法则书、极端精细的 System Prompt Few-shot (少样本注入)。
* **机制**：当 Orchestrator 大脑 (推荐基于原生具有全能力逻辑体系的 DeepSeek-R1、Gemini 1.5 Pro) 收到短剧本后，根据剧本标签类型自动【挂载 (Mount)】对应的“悬疑开局技能套件”或者“废土机位法则包”。
* **价值**：大模型此时完全沉浸在纯净的故事逻辑拆解中，产出惊叹的分镜详情网，绝不会因为要去计算 JSON API 接口括号配平而导致推理能力（智商）下降。

### 2.2 底层执行工具栈 (MCP Execution Servers) -> 解决“怎么干”
将原本需要独立思考的 Agent，打回原形变成纯机械的、提供基础协议能力的 `Servers`。中央主脑仅在确信需要获取数据或生成画面时，如同调用本地函数一样发起 Request。支持热拔插。

#### 🔌 Server 1: `Script & Memory` (剧本记忆伺服器)
**被动职责**：数据库读取外设。提供存放世界观、角色全生命周期状态机记录的服务。
* `Tool: get_character_blueprint(name)` -> 获取原初设定。
* `Tool: update_subject_state(status_JSON)` -> 把主角脸上的泥巴、损坏的护甲做逐帧累加。保证前后一致性连贯不穿帮。

#### 🔌 Server 2: `Prompt Engineering` (魔法编译伺服器)
**被动职责**：格式化转换器。面对生图引擎经常有“不认识的黑话”，由它全权处理并适配。
* `Tool: compile_comfyui_workflow` -> 如果当前这一帧涉及到“光影突变”（走出洞穴），大脑会强行调用此包生成支持 **IC-Light** 和打光节点的 `workflow.json`（供下一任调用），拒绝纯文生图的简单敷衍。
* `Tool: force_lens_override` -> 在提示词中注入强视听参数，破除其只会生成“漂亮脸蛋近景”的幻觉。

#### 🔌 Server 3: `Render & Synthesis` (生图执行台)
**被动职责**：真正耗费算力的显卡节点层。 Orchestrator 对其内部一无所知，只管拿 URL 结果。
* 支持：`generate_standard_image` (调普通 API 轻量过场)、`generate_complex_image` (发配到 ComfyUI 走长链)。同时支持在开片前调生成 `generate_base_environment` (白模底片)，以防止后续的空间坍塌。

#### 🔌 Server 4: `Consistency Vision` (视觉检验哨所)
**被动职责**：通过视觉多模态大模型，校验生出图片的质量。若人数/光影违和，返回 `False` 给主脑。

## 3. 运行回环机制 (Re-Act Loop Engine)
有了这套 MCP 协议池，中央主脑具备了 **“思考 -> 执行工具 -> 等待反馈 -> 再思考再行动”** (Re-Act) 的能力：
大脑发起 Server 3 的渲染指令 -> 获取图传给 Server 4 -> Server 4 报警：“角色与背景光照不符” -> 大脑重新加载认知技能，认为必须走 IC-Light 打光机制 -> 指挥 Server 2 重新用更暴力的 JSON 配置打包 -> 再次调用 Server 3。全程不需人工插手。

## 4. 结论与不足
系统此时在全自动无人干预下具备了史诗级的渲染保真水平与扩展弹性。但是，这也就是它在此阶段不能作为商用工具下放给影棚使用的深层原因：“毫无节制的全自动化狂奔将带来不可逆的算力沉没成本。” 由此，V4 终极演化路线出现。
