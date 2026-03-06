// -- UI Reference Mapping --
const UI = {
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    scriptInput: document.getElementById('script-input'),
    terminal: document.getElementById('terminal-output'),
    gallery: document.getElementById('storyboard-gallery'),
    mcp: {
        memory: { card: document.getElementById('mcp-memory'), status: document.getElementById('status-memory') },
        prompt: { card: document.getElementById('mcp-prompt'), status: document.getElementById('status-prompt') },
        render: { card: document.getElementById('mcp-render'), status: document.getElementById('status-render') },
        vision: { card: document.getElementById('mcp-vision'), status: document.getElementById('status-vision') }
    },
    hitl: {
        panel: document.getElementById('hitl-panel'),
        approveBtn: document.getElementById('approve-btn'),
        rejectBtn: document.getElementById('reject-btn'),
        stageTitle: document.getElementById('hitl-stage-title'),
        stageDesc: document.getElementById('hitl-stage-desc'),
        workspaces: {
            0: document.getElementById('workspace-s0'),
            1: document.getElementById('workspace-s1'),
            2: document.getElementById('workspace-s2'),
            3: document.getElementById('workspace-s3'),
            4: document.getElementById('workspace-s4'),
            5: document.getElementById('workspace-s5')
        }
    },
    exportBtn: document.getElementById('export-btn'),
    sysDot: document.getElementById('sys-dot'),
    sysStatus: document.getElementById('sys-status')
};

// -- Helpers --
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const addLog = async (msg, type = 'info', simulateTyping = false) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const line = document.createElement('div');
    line.className = `log-entry log-${type}`;
    const timeSpan = `<span class="log-time">[${time}]</span>`;

    if (simulateTyping) {
        line.innerHTML = timeSpan;
        UI.terminal.appendChild(line);
        let currentText = '';
        for (let char of msg) {
            currentText += char;
            line.innerHTML = timeSpan + ` <span>${currentText}</span>`;
            UI.terminal.scrollTop = UI.terminal.scrollHeight;
            await wait(10);
        }
    } else {
        line.innerHTML = `${timeSpan} ${msg}`;
        UI.terminal.appendChild(line);
    }

    UI.terminal.scrollTop = UI.terminal.scrollHeight;
    if (UI.terminal.children.length > 50) UI.terminal.removeChild(UI.terminal.firstChild);
};

const setMcpObj = (server, state, text) => {
    const srv = UI.mcp[server];
    srv.card.className = `mcp-card ${state}`;
    srv.status.textContent = text;
};

const updateStepper = (targetStep) => {
    for (let i = 0; i <= 5; i++) {
        const step = document.getElementById(`step-${i}`);
        if (!step) continue;
        step.classList.remove('active', 'completed');
        if (i < targetStep) step.classList.add('completed');
        else if (i === targetStep) step.classList.add('active');
    }
};

const initGalleryCard = (id) => {
    const card = document.createElement('div');
    card.className = 'storyboard-card';
    card.id = `shot-${id}`;
    card.innerHTML = `
        <div class="card-image-wrap">
            <div class="loader-overlay" id="loader-${id}">
                <div class="spinner"></div>
                <span>Awaiting Rendering...</span>
            </div>
            <img id="img-${id}" src="" alt="Awaiting image">
        </div>
        <div class="card-content">
            <div class="card-info-row">
                <span class="badge shot">Shot ${id}</span>
                <span class="badge" id="engine-${id}">Pending</span>
            </div>
            <div class="card-desc" id="desc-${id}"></div>
            <div class="card-lens" id="lens-${id}"></div>
        </div>
    `;
    UI.gallery.appendChild(card);
    return card;
};

const updateGalleryCard = (id, updates) => {
    if (updates.desc) document.getElementById(`desc-${id}`).textContent = updates.desc;
    if (updates.lens) document.getElementById(`lens-${id}`).textContent = updates.lens;
    if (updates.engine) {
        const engObj = document.getElementById(`engine-${id}`);
        engObj.textContent = updates.engine;
        engObj.className = `badge engine-${updates.engine.toLowerCase().includes('gemini') ? 'gemini' : 'comfy'}`;
    }
    if (updates.imgUrl) {
        const img = document.getElementById(`img-${id}`);
        img.src = updates.imgUrl;
        img.onload = () => {
            img.classList.add('loaded');
            document.getElementById(`loader-${id}`).classList.add('hidden');
        };
    }
    if (updates.loaderText) {
        const loader = document.getElementById(`loader-${id}`);
        loader.classList.remove('hidden');
        loader.querySelector('span').textContent = updates.loaderText;
        const img = document.getElementById(`img-${id}`);
        img.classList.remove('loaded');
    }
};

const setHitlActionLabels = (stageId) => {
    if (!UI.hitl.approveBtn || !UI.hitl.rejectBtn) return;

    if (stageId === 5) {
        UI.hitl.approveBtn.textContent = '✅ 最终签发并归档';
        UI.hitl.rejectBtn.textContent = '驳回，回退至 Stage 4';
        return;
    }

    UI.hitl.approveBtn.textContent = '✅ 签发：写入系统记忆并推入下阶段';
    UI.hitl.rejectBtn.textContent = stageId === 0
        ? '驳回，保持在 Stage 0'
        : '驳回，回溯至上一节点';
};

const escapeHtml = (value = '') => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getSelectedConceptReference = () => {
    const activeCard = document.querySelector('.concept-card.active');
    return activeCard?.textContent?.trim() || '未锁定概念设定';
};

const collectShotSpecs = () => ([
    {
        shot_id: 'S01',
        description: document.getElementById('edit-desc-1')?.value.trim() || '',
        lens: document.getElementById('edit-lens-1')?.value.trim() || '',
        scale: 'Wide',
        emotion: 'Tense, cautious'
    },
    {
        shot_id: 'S02',
        description: document.getElementById('edit-desc-2')?.value.trim() || '',
        lens: document.getElementById('edit-lens-2')?.value.trim() || '',
        scale: 'ECU',
        emotion: 'Overwhelming threat'
    }
]);

const collectOutputAssets = () => Array.from(document.querySelectorAll('.storyboard-card')).map(card => ({
    shot_id: card.id.replace('shot-', ''),
    description: card.querySelector('.card-desc')?.textContent?.trim() || '',
    lens: card.querySelector('.card-lens')?.textContent?.trim() || '',
    engine: card.querySelector('.badge:not(.shot)')?.textContent?.trim() || '',
    image_url: card.querySelector('img')?.src || ''
}));

const collectProductionPackage = () => ({
    package_version: 'V6-preview',
    exported_at: new Date().toISOString(),
    project_bible: {
        style: document.getElementById('s0-style')?.value.trim() || '',
        color_and_lighting: document.getElementById('s0-color')?.value.trim() || '',
        negative_rules: document.getElementById('s0-reject')?.value.trim() || ''
    },
    script: {
        raw_outline: UI.scriptInput.value.trim() || '',
        expanded_script: document.getElementById('s1-script')?.value.trim() || ''
    },
    concept_lock: getSelectedConceptReference(),
    shot_specs: collectShotSpecs(),
    final_review: {
        notes: document.getElementById('s5-notes')?.value.trim() || ''
    },
    output_assets: collectOutputAssets()
});

const renderFinalReviewSummary = () => {
    const summary = document.getElementById('s5-summary');
    if (!summary) return;

    const packageData = collectProductionPackage();
    summary.textContent = [
        `项目包版本: ${packageData.package_version}`,
        `概念锁定: ${packageData.concept_lock}`,
        `镜头总数: ${packageData.shot_specs.length}`,
        `已渲染终图: ${packageData.output_assets.length}`,
        '',
        '待导出物料:',
        '- ShotSpec JSON',
        '- 可打印分镜 PDF 包',
        '- 终版导演批注',
        '',
        '导演备注:',
        packageData.final_review.notes || '无'
    ].join('\n');
};

const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const openPrintablePacket = (packageData) => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return false;

    const shotMarkup = packageData.shot_specs.map(shot => `
        <section class="shot-card">
            <h3>${escapeHtml(shot.shot_id)}</h3>
            <p><strong>描述：</strong>${escapeHtml(shot.description)}</p>
            <p><strong>镜头：</strong>${escapeHtml(shot.lens)}</p>
            <p><strong>景别：</strong>${escapeHtml(shot.scale)}</p>
            <p><strong>情绪：</strong>${escapeHtml(shot.emotion)}</p>
        </section>
    `).join('');

    const outputMarkup = packageData.output_assets.map(asset => `
        <section class="asset-card">
            <h3>Shot ${escapeHtml(asset.shot_id)}</h3>
            <p><strong>引擎：</strong>${escapeHtml(asset.engine)}</p>
            <p><strong>描述：</strong>${escapeHtml(asset.description)}</p>
            <img src="${escapeHtml(asset.image_url)}" alt="Shot ${escapeHtml(asset.shot_id)}" />
        </section>
    `).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <title>分镜生产物料包</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
        h1, h2 { margin-bottom: 12px; }
        .meta, .section { margin-bottom: 24px; }
        .shot-card, .asset-card { border: 1px solid #CBD5E1; border-radius: 12px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
        .asset-card img { width: 100%; max-width: 480px; border-radius: 8px; margin-top: 12px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media print { body { margin: 12mm; } }
    </style>
</head>
<body>
    <h1>智能分镜生产物料包</h1>
    <div class="meta">
        <p><strong>导出时间：</strong>${escapeHtml(packageData.exported_at)}</p>
        <p><strong>项目风格：</strong>${escapeHtml(packageData.project_bible.style)}</p>
        <p><strong>色彩光影：</strong>${escapeHtml(packageData.project_bible.color_and_lighting)}</p>
        <p><strong>禁忌规则：</strong>${escapeHtml(packageData.project_bible.negative_rules)}</p>
        <p><strong>概念锁定：</strong>${escapeHtml(packageData.concept_lock)}</p>
    </div>

    <div class="section">
        <h2>导演扩写文本</h2>
        <p>${escapeHtml(packageData.script.expanded_script).replaceAll('\n', '<br/>')}</p>
    </div>

    <div class="section">
        <h2>ShotSpec 镜头包</h2>
        ${shotMarkup}
    </div>

    <div class="section">
        <h2>终版批注</h2>
        <p>${escapeHtml(packageData.final_review.notes).replaceAll('\n', '<br/>')}</p>
    </div>

    <div class="section">
        <h2>终版输出</h2>
        <div class="grid">${outputMarkup}</div>
    </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
    return true;
};

const exportProductionPackage = async () => {
    const packageData = collectProductionPackage();
    downloadFile('storyboard-production-package.json', JSON.stringify(packageData, null, 2), 'application/json;charset=utf-8');

    const printReady = openPrintablePacket(packageData);
    if (printReady) {
        await addLog('📦 [Export] 已导出 ShotSpec JSON，并打开可打印分镜包窗口。', 'action');
        return;
    }

    await addLog('⚠️ [Export] JSON 已导出，但打印窗口被浏览器拦截，请允许弹窗后重试。', 'warn');
};

// -- FSM Simulator V5 / V6 Preview --
let FSM = {
    currentStage: 0,
    hitlResolve: null,

    // Core Engine Flow
    async executeStage(stage) {
        this.currentStage = stage;
        updateStepper(stage);

        if (stage > 1) {
            // 模拟回流动作
            await addLog("🔧 [Context Sync] Script & Memory Server -> 更新全局 Ground Truth Context", "action");
            setMcpObj('memory', 'active', 'UPDATING');
            await wait(1200);
            setMcpObj('memory', '', 'IDLE');
        }

        switch (stage) {
            case 0:
                return this.runStage0();
            case 1:
                return this.runStage1();
            case 2:
                return this.runStage2();
            case 3:
                return this.runStage3();
            case 4:
                return this.runStage4();
            case 5:
                return this.runStage5();
        }
    },

    async suspendSystemAndWait(title, desc, stageId) {
        // UI
        UI.sysDot.className = "dot paused";
        UI.sysStatus.textContent = "SUSPENDED";
        UI.hitl.stageTitle.textContent = title;
        UI.hitl.stageDesc.textContent = desc;
        setHitlActionLabels(stageId);

        // Hide all workspaces, show current
        Object.values(UI.hitl.workspaces).forEach(w => w?.classList.add('hidden'));
        if (UI.hitl.workspaces[stageId]) {
            UI.hitl.workspaces[stageId].classList.remove('hidden');
        }
        UI.hitl.panel.classList.remove('hidden');

        await addLog(`⚠️ [HITL Triggered] 流程挂起，等待导演在 Workstation ${stageId} 审查指示。`, "warn");

        // Wait for user click
        return new Promise(resolve => {
            this.hitlResolve = resolve;
        });
    },

    async runStage0() {
        UI.startBtn.disabled = true;
        document.getElementById('input-section').classList.add('hidden');
        if (UI.exportBtn) UI.exportBtn.classList.add('hidden');

        UI.terminal.innerHTML = '<p class="sys-msg">工业管道初始加载中... 确立全局视觉圣经</p>';
        UI.gallery.innerHTML = '<div class="empty-state">渲染序列锁定中 (等待至 Stage 5 解锁)...</div>';

        await addLog("✨ Orchestrator 启动项目架构 (V6 制片管线级别)...", "highlight");
        await addLog("🧠 [Cognitive Active] 加载【导演偏好模式】与【全球美术禁忌大词典】...", "cog");
        await wait(1500);

        return this.suspendSystemAndWait(
            "Stage 0: 视觉圣经与项目基调确立 (Ground Truth Level 0)",
            "请确认整个项目的色彩倾向、光影规则与镜头排斥规则。签发后，所有下流管线和渲染集群将强制服从此主盘设定。",
            0
        );
    },

    async runStage1() {
        UI.sysDot.className = "dot online";
        UI.sysStatus.textContent = "SYSTEM ONLINE";
        UI.hitl.panel.classList.add('hidden');
        await addLog("🔓 [HITL Released] Stage 0 视觉圣经定稿。强制约束网已拉起", "highlight");
        await wait(800);

        const rawScript = UI.scriptInput.value.trim() || '勇士进入了昏暗的山洞，发现了一只巨龙。';

        await addLog("🧠 [Cognitive Active] 挂载【剧作认知技能包 v1.2】，填补原大纲剧作留白...", "cog");
        await wait(1500);

        const expandedText = `【原始大纲】\n${rawScript}\n\n【Orchestrator 情绪与细节扩写】\n亚瑟感到一阵彻骨的寒意。他握紧了家族祖传的猎魔银剑，火把的光芒在湿冷粗糙的石灰岩壁上摇晃，投下张牙舞爪的阴影。洞穴湿气极重，远处传来犹如闷雷般的低压呼吸声……目标巨龙就在前方的黑暗中。每走一步，硫磺与腐肉的气息就越发浓烈，压迫感逐渐剥夺他的氧气。`;
        document.getElementById('s1-script').value = expandedText;

        return this.suspendSystemAndWait(
            "Stage 1: 剧本扩写与情绪埋点审查",
            "Orchestrator 已对大纲完成悬疑色彩增补，请审查或重写文本。批准后这将作为底层骨架写入 Memory Server。",
            1
        );
    },

    async runStage2() {
        UI.sysDot.className = "dot online";
        UI.sysStatus.textContent = "SYSTEM ONLINE";
        UI.hitl.panel.classList.add('hidden');
        await addLog("🔓 [HITL Released] Stage 1 剧本文本定稿。", "highlight");
        await wait(800);

        await addLog("🔧 [Execute Tool] Prompt Server -> 分析角色与场景元素", "action");
        setMcpObj('prompt', 'active', 'ANALYZING');
        await wait(1200);
        setMcpObj('prompt', '', 'IDLE');

        await addLog("🔧 [Execute Tool] Render Server -> 生成概念美术与三视图选项", "action");
        setMcpObj('render', 'active', 'CONCEPT_ART');
        await wait(2000);
        setMcpObj('render', '', 'IDLE');

        return this.suspendSystemAndWait(
            "Stage 2: 概念美术设定锁定",
            "基于 Stage 1 的剧本，AI已生成两组美术基准图。请选择您的心仪方案，系统将据此生成全局锁定所需的 FaceID / Lora 配置。",
            2
        );
    },

    async runStage3() {
        UI.sysDot.className = "dot online";
        UI.sysStatus.textContent = "SYSTEM ONLINE";
        UI.hitl.panel.classList.add('hidden');
        await addLog("🔓 [HITL Released] Stage 2 美术资产锁定完毕 (Reference ID 固化)。", "highlight");
        await wait(1000);

        await addLog("🧠 [Cognitive Active] 加载【电影机位语义库 v3.0】，开始推导纯文本镜号矩阵...", "cog");
        await wait(1500);

        return this.suspendSystemAndWait(
            "Stage 3: 纯文字分镜脚本工作台",
            "这是纯参数骨架。所有的引擎预测、叙事焦点和机位均已出炉，调整下方的参数可直接避免渲染后发现构图不合意。",
            3
        );
    },

    async runStage4() {
        UI.sysDot.className = "dot online";
        UI.sysStatus.textContent = "SYSTEM ONLINE";
        UI.hitl.panel.classList.add('hidden');
        await addLog("🔓 [HITL Released] Stage 3 摄影参数定稿。", "highlight");
        await wait(1000);

        await addLog("🔧 [Execute Tool] Render Server -> (ComfyUI Workflow: Fast Pre-viz)", "action");
        setMcpObj('render', 'active', 'PRE_VIZ');
        await addLog("⚡ 采取成本极低的白模/灰阶预演管线，验证物理深度与光照几何...", "info");
        await wait(2500);
        setMcpObj('render', '', 'IDLE');

        return this.suspendSystemAndWait(
            "Stage 4: 空间动态与光影预验证",
            "为防止“空间坍塌”，请审视以下粗略灰模底图。确认空间透视与大光比方向无误后，我们将作为 ControlNet 深度图锁定。",
            4
        );
    },

    async runStage5() {
        UI.sysDot.className = "dot online";
        UI.sysStatus.textContent = "SYSTEM ONLINE";
        UI.hitl.panel.classList.add('hidden');
        await addLog("🔓 [HITL Released] Stage 4 防坍塌约束链已闭环。全节点定稿！", "highlight");
        await wait(1000);

        UI.gallery.innerHTML = '';
        await addLog("🔥 [Final Pipeline] 开始并发执行终极渲染。装载【Stage 2: Lora特征】 + 【Stage 3: 焦段参数】 + 【Stage 4: Canny深度预演底图】", "highlight");

        // Render Shot 1
        initGalleryCard('01');
        updateGalleryCard('01', { desc: "亚瑟手持火把步入阴暗的洞穴", lens: "过肩镜头(OTS)", engine: "ComfyUI/IC-Light", loaderText: "Building Depth & Lights..." });

        setMcpObj('prompt', 'active', 'COMPILING_NODE');
        setMcpObj('memory', 'active', 'READING');
        await wait(1500);
        setMcpObj('prompt', '', 'IDLE');
        setMcpObj('memory', '', 'IDLE');

        setMcpObj('render', 'active', 'RENDERING_FINAL');
        await wait(3000);
        setMcpObj('render', '', 'IDLE');

        setMcpObj('vision', 'active', 'VERIFYING');
        await wait(1000);
        setMcpObj('vision', '', 'IDLE');

        updateGalleryCard('01', { imgUrl: "https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=600&auto=format&fit=crop" });

        // Render Shot 2
        await addLog("=========== [Rendering 🎬 Shot 02] ===========", "highlight");
        initGalleryCard('02');
        updateGalleryCard('02', { desc: "火光照亮了满身红色粗糙鳞片的巨龙。", lens: "极近特写(ECU)", engine: "Gemini-3.1-Flash", loaderText: "API Request..." });

        setMcpObj('render', 'active', 'RENDERING_TXT2IMG');
        await wait(2500);
        setMcpObj('render', '', 'IDLE');

        updateGalleryCard('02', { imgUrl: "https://images.unsplash.com/photo-1629858348740-1a6104f6e1f0?q=80&w=600&auto=format&fit=crop" });

        renderFinalReviewSummary();
        await addLog("🧾 [Sign-off Pending] 终版已进入导演签发与归档环节。", "highlight");

        return this.suspendSystemAndWait(
            "Stage 5: 终版签发、归档与导出",
            "请确认终版输出可归档。签发后系统将开放 ShotSpec JSON 与可打印分镜包导出。",
            5
        );
    },

    async finalizeStage5() {
        UI.sysDot.className = "dot online";
        UI.sysStatus.textContent = "ARCHIVE READY";
        UI.hitl.panel.classList.add('hidden');
        renderFinalReviewSummary();
        await addLog("🎉 工业级制片流签发完成。终版已归档，可导出生产物料包。", "highlight");

        UI.startBtn.disabled = false;
        document.getElementById('input-section').classList.remove('hidden');
        UI.startBtn.innerHTML = "<span>🔄 重新发起新概念工作流</span>";
        if (UI.exportBtn) UI.exportBtn.classList.remove('hidden');
    }
};

// -- Listeners --
UI.startBtn.addEventListener('click', () => {
    FSM.executeStage(0);
});

UI.hitl.approveBtn.addEventListener('click', async () => {
    if (!FSM.hitlResolve) return;

    FSM.hitlResolve();
    FSM.hitlResolve = null;

    if (FSM.currentStage === 5) {
        await FSM.finalizeStage5();
        return;
    }

    FSM.executeStage(FSM.currentStage + 1);
});

UI.hitl.rejectBtn.addEventListener('click', async () => {
    const previousStage = Math.max(0, FSM.currentStage - 1);
    UI.hitl.panel.classList.add('hidden');
    UI.sysDot.className = "dot online";
    UI.sysStatus.textContent = "SYSTEM ONLINE";
    FSM.hitlResolve = null;
    if (UI.exportBtn) UI.exportBtn.classList.add('hidden');
    await addLog(`❌ 人类导演已在 Stage ${FSM.currentStage} 驳回当前产出，系统回退至 Stage ${previousStage} 重新修订。`, "error");
    FSM.executeStage(previousStage);
});

UI.resetBtn.addEventListener('click', () => {
    UI.terminal.innerHTML = '<p class="sys-msg">日志已重置...</p>';
    UI.gallery.innerHTML = '<div class="empty-state">渲染序列锁定中 (等待至 Stage 5 解锁)...</div>';
    UI.hitl.panel.classList.add('hidden');
    UI.sysDot.className = "dot online";
    UI.sysStatus.textContent = "SYSTEM ONLINE";
    UI.startBtn.disabled = false;
    document.getElementById('input-section').classList.remove('hidden');
    if (UI.exportBtn) UI.exportBtn.classList.add('hidden');
    UI.startBtn.innerHTML = "<span>🚀 0. 锁定视觉圣经，启动制片流</span>";
    updateStepper(0);
    FSM.hitlResolve = null;
    UI.hitl.approveBtn.textContent = '✅ 签发：写入系统记忆并推入下阶段';
    UI.hitl.rejectBtn.textContent = '驳回，回溯至上一节点';

    const finalNotes = document.getElementById('s5-notes');
    if (finalNotes) finalNotes.value = '终版通过，可归档并导出 ShotSpec JSON 与分镜 PDF 包。';

    const finalSummary = document.getElementById('s5-summary');
    if (finalSummary) finalSummary.textContent = '等待终版渲染结果写入归档摘要...';

    const termSec = document.getElementById('terminal-section');
    if (termSec) termSec.classList.remove('collapsed');
});

if (UI.exportBtn) {
    UI.exportBtn.addEventListener('click', async () => {
        await exportProductionPackage();
    });
}

const toggleBtn = document.getElementById('toggle-log-btn');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        const termSec = document.getElementById('terminal-section');
        if (termSec) {
            termSec.classList.toggle('collapsed');
        }
    });
}

// 设定图点击选择态
document.querySelectorAll('.concept-card').forEach(card => {
    card.addEventListener('click', function () {
        document.querySelectorAll('.concept-card').forEach(c => {
            c.classList.remove('active');
            c.style.opacity = '0.6';
        });
        this.classList.add('active');
        this.style.opacity = '1';
    });
});

setHitlActionLabels(0);
