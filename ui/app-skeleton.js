// ui/app-skeleton.js
// 界面骨架渲染器，挂载 window.AppSkeleton
// 负责构建完整的 DOM 并绑定事件、初始化 UI 组件

window.AppSkeleton = (function() {
    function render() {
        const EC = window.EngineConfig;
        const appRoot = document.getElementById('app-root');
        if (!appRoot) {
            console.error('[AppSkeleton] 找不到 app-root 元素');
            return false;
        }

        // 构建主界面 HTML
        appRoot.innerHTML = `
            <div class="header-row">
                <h1>🎬 提示词生成器 <span class="version-badge">v8.8.2</span></h1>
                <button class="theme-toggle" onclick="window.FormBindings.toggleTheme()">🌓</button>
            </div>
            <p class="subtitle">综合模式 · 身份档案 · 定向反射 · 过渡填充 · 伏笔识别 · 多文件章节排序检测</p>

            <!-- ========== 引擎设置面板 ========== -->
            <div class="section-title" onclick="window.UiUtils.toggleSection('engineSettingsBody')">⚙️ 引擎设置 <span>▼</span></div>
            <div class="section-content" id="engineSettingsBody">
                <div style="background:var(--bg);padding:10px;border-radius:8px;margin-bottom:8px;">
                    <div style="font-weight:600;margin-bottom:6px;">🔌 引擎总控</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <label><input type="checkbox" id="engineElizaCheck" checked onchange="window.EngineConfig.setEngine('eliza',this.checked);window.ExtractManager.updateUIVisibility();"> 反射引擎 (ELIZA)</label>
                        <label><input type="checkbox" id="engineForeshadowCheck" checked onchange="window.EngineConfig.setEngine('foreshadow',this.checked);window.ExtractManager.updateUIVisibility();"> 伏笔引擎</label>
                        <label><input type="checkbox" id="engineStandardCheck" checked onchange="window.EngineConfig.setEngine('standardExtract',this.checked);"> 标准提取</label>
                    </div>
                    <div style="font-weight:600;margin:8px 0 6px;">📋 面板显隐</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <label><input type="checkbox" id="panelStyleTagsCheck" checked onchange="window.EngineConfig.setPanel('styleTags',this.checked);window.ExtractManager.updateUIVisibility();"> 风格标签</label>
                        <label><input type="checkbox" id="panelSceneTplCheck" checked onchange="window.EngineConfig.setPanel('sceneTemplate',this.checked);window.ExtractManager.updateUIVisibility();"> 场景模板</label>
                        <label><input type="checkbox" id="panelNegativeCheck" checked onchange="window.EngineConfig.setPanel('negativePanel',this.checked);window.ExtractManager.updateUIVisibility();"> 负面提示词</label>
                        <label><input type="checkbox" id="panelHistoryCheck" checked onchange="window.EngineConfig.setPanel('history',this.checked);window.ExtractManager.updateUIVisibility();"> 历史记录</label>
                        <label><input type="checkbox" id="panelMultiShotCheck" checked onchange="window.EngineConfig.setPanel('multiShotMode',this.checked);"> 多镜头</label>
                    </div>
                    <div style="font-weight:600;margin:8px 0 6px;">🔬 伏笔子开关</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <label><input type="checkbox" id="subAutoDetectCheck" checked onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.autoDetect=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 自动检测</label>
                        <label><input type="checkbox" id="subManualAddCheck" checked onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.manualAdd=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 手动添加</label>
                        <label><input type="checkbox" id="subSpeciesCheck" onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.speciesDetection=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 物种检测</label>
                        <label><input type="checkbox" id="subPowerCheck" checked onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.powerLevelDetection=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 等级检测</label>
                        <label><input type="checkbox" id="subAcqCheck" checked onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.acquisitionTracking=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 获取物追踪</label>
                        <label><input type="checkbox" id="subContextCheck" checked onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.contextInjection=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 上下文注入</label>
                        <label><input type="checkbox" id="subTransCheck" checked onchange="var c=window.EngineConfig.getConfig();c.engines.foreshadow.subFeatures.transitionEngine=this.checked;window.EngineConfig.setEngine('foreshadow',true);"> 过渡引擎</label>
                    </div>
                    <button class="btn-small btn-outline" style="margin-top:8px;" onclick="window.EngineConfig.reset();location.reload();">🔄 恢复默认设置</button>
                </div>
            </div>

            <!-- 多文件上传区域 -->
            <div class="section-title" onclick="window.UiUtils.toggleSection('batchSection')">📂 多文件章节上传 <span>▼</span></div>
            <div class="section-content" id="batchSection">
                <div class="file-upload-area">
                    <input type="file" id="fileInput" accept=".txt,.md,.markdown,.text" multiple style="display:none;" onchange="window.FormBindings.handleFileUpload(event)">
                    <span class="file-label" onclick="document.getElementById('fileInput').click()">📁 选择多个文件 (txt/md/markdown/text)</span>
                    <span class="file-name" id="fileNameDisplay">未选择</span>
                </div>
                <div id="fileListContainer" class="file-list" style="margin-top: 6px; max-height: 120px; overflow-y: auto; border:1px solid var(--border); border-radius: 8px; padding: 4px;"></div>
                <div class="btn-row" style="margin-top: 8px;">
                    <button class="btn-small btn-outline" onclick="window.FormBindings.startBatchProcess()">🔁 顺序检测（按章节）</button>
                </div>
                <div style="margin-top: 8px;">
                    <div style="background:var(--bg); border-radius:8px; height:8px; width:100%; overflow:hidden;">
                        <div id="batchProgressBar" style="width:0%; height:100%; background:var(--accent); transition:width 0.3s;"></div>
                    </div>
                    <div id="batchProgressText" style="font-size:0.75rem; text-align:center; margin-top:2px;">0 / 0</div>
                </div>
                <div id="batchResult" style="max-height:200px; overflow-y:auto; margin-top:8px; font-size:0.75rem; border-top:1px solid var(--border); padding-top:4px;"></div>
            </div>

            <div class="section-title" onclick="window.UiUtils.toggleSection('refSection')">📎 参考文本 <span>▼</span></div>
            <div class="section-content" id="refSection">
                <textarea id="referenceText" rows="3" placeholder="上传或粘贴文本..." oninput="window.ExtractManager.extractKeywords()"></textarea>
                <div id="extractedKeywords" class="extracted-tags"></div>
            </div>

            <div class="section-title">🔍 提取模式
                <div class="mode-switch-row" style="margin-left:auto;">
                    <span class="mode-switch-btn active" onclick="window.ExtractManager.switchExtractMode('standard')" id="modeStandardBtn">📋 标准</span>
                    <span class="mode-switch-btn" onclick="window.ExtractManager.switchExtractMode('eliza')" id="modeElizaBtn">🪞 反射</span>
                    <span class="mode-switch-btn" onclick="window.ExtractManager.switchExtractMode('composite')" id="modeCompositeBtn">🔀 综合</span>
                </div>
            </div>

            <div class="reflect-style-slider-group" id="reflectStyleGroup" style="display:none;">
                <span class="reflect-slider-label">📝 白描</span>
                <div class="reflect-slider-container">
                    <div class="reflect-slider-track"></div>
                    <input type="range" class="reflect-slider" id="reflectStyleSlider" min="0" max="100" value="50" step="1" oninput="window.ExtractManager.onReflectStyleChange()">
                </div>
                <span class="reflect-slider-label">文丑</span>
                <span class="reflect-style-hint" id="reflectStyleHint">⚖️ 均衡</span>
            </div>

            <div id="customRuleSection" style="display:none;">
                <div class="section-title" onclick="window.UiUtils.toggleSection('customRuleBody')">🔧 自定义反射规则 <span>▼</span></div>
                <div class="section-content" id="customRuleBody">
                    <div class="custom-rule-panel">
                        <div class="custom-rule-row">
                            <input type="text" id="customRulePattern" placeholder="正则匹配模式" style="flex:2;">
                            <input type="text" id="customRuleResult" placeholder="反射结果" style="flex:2;">
                            <input type="number" id="customRulePriority" value="4" min="1" max="10" style="width:50px;">
                            <button class="btn-small" onclick="window.ExtractManager.addCustomRule()">+ 添加</button>
                        </div>
                        <div class="custom-rule-list" id="customRuleList"></div>
                    </div>
                </div>
            </div>

            <div id="foreshadowSection">
                <div class="section-title" onclick="window.UiUtils.toggleSection('foreshadowBody')">📌 伏笔识别 <span>▼</span></div>
                <div class="section-content" id="foreshadowBody">
                    <div class="foreshadow-controls">
                        <button class="btn-small btn-outline" id="foreshadowToggleBtn" onclick="window.ExtractManager.toggleForeshadow()">📌 伏笔：开</button>
                        <button class="btn-small btn-outline" onclick="window.ExtractManager.addManualForeshadow()">🔍 手动添加伏笔</button>
                        <select id="foreshadowLimitSelect" onchange="window.ExtractManager.setForeshadowLimit(this.value)">
                            <option value="10">上限 10</option>
                            <option value="30">上限 30</option>
                            <option value="50" selected>上限 50</option>
                            <option value="100">上限 100</option>
                            <option value="200">上限 200</option>
                        </select>
                        <button class="btn-small btn-outline btn-danger" onclick="window.ExtractManager.resetForeshadowPool()">🗑️ 重置词库</button>
                    </div>
                    <div class="foreshadow-pool-list" id="foreshadowPoolList"></div>
                    <div id="protagonistPanel" style="margin-top:10px;"></div>
                </div>
            </div>

            <div class="section-title" onclick="window.UiUtils.toggleSection('styleSection')">🎨 风格标签 <span>▼</span></div>
            <div class="section-content" id="styleSection"><div class="style-tags" id="styleTags"></div></div>

            <div class="section-title">⚙️ 镜头模式
                <button class="btn-small btn-outline" onclick="window.ModeManager.switchMode('single')" id="modeSingleBtn" style="margin-left:auto;">📷 单镜头</button>
                <button class="btn-small btn-outline" onclick="window.ModeManager.switchMode('multi')" id="modeMultiBtn">🎞️ 多镜头</button>
            </div>

            <div class="flex-row">
                <div class="form-group"><label>📌 类型</label><select id="mediaType" onchange="window.ModeManager.onMediaChange()"><option value="image">图片</option><option value="video" selected>视频</option></select></div>
                <div class="form-group"><label>🖼️ 画幅</label><select id="ratio"><option value="9:16">9:16 竖屏</option><option value="16:9" selected>16:9 横屏</option><option value="1:1">1:1 方形</option></select></div>
                <div class="form-group"><label>🎯 平台</label><select id="targetPlatform"><option value="general" selected>通用</option><option value="kling">可灵</option><option value="jimeng">即梦</option><option value="runway">Runway</option><option value="pixverse">PixVerse</option><option value="veo">Veo</option></select></div>
            </div>
            <div class="form-group"><label>🏞️ 场景 *</label><div class="scene-row"><input type="text" id="scene" placeholder="奇幻森林，晨雾弥漫"><button type="button" class="btn-small btn-outline" id="sceneTemplateBtn" onclick="window.FormBindings.openTemplatePanel()">📋 场景模板</button></div></div>
            <div class="form-group"><label>🧑 主体 *</label><input type="text" id="subject" placeholder="精灵少女，银白长发"></div>
            <div class="form-group"><label>💡 情绪/氛围 *</label><input type="text" id="mood" placeholder="宁静、微哀伤"></div>

            <div id="singleModePanel">
                <div class="form-group"><label>🤸 动作/姿态</label><input type="text" id="singleAction" placeholder="缓缓转身抬手接住树叶" oninput="window.ExtractManager.autoFillCamera()"></div>
                <div class="form-group" id="singleCameraGroup"><label>🎥 镜头与运镜</label><input type="text" id="singleCamera" placeholder="自动匹配或手动输入"></div>
            </div>

            <div id="multiModePanel" style="display:none;">
                <div class="note">每个镜头独立填写，场景/主体/氛围自动继承。</div>
                <div class="batch-row">
                    <span style="font-size:0.8rem;">⏱️ 批量时长:</span>
                    <input type="number" id="batchDuration" value="5" min="1" max="30" step="1">
                    <button class="btn-small btn-outline" onclick="window.ModeManager.batchSetDuration()">全部设为该秒数</button>
                    <button class="btn-small btn-outline" id="undoBatchBtn" style="display:none;" onclick="window.ModeManager.undoBatchSet()">↩ 撤销批量</button>
                </div>
                <div id="shotsContainer"></div>
                <button class="add-shot-btn btn-outline" onclick="window.ModeManager.addShot()">+ 添加镜头</button>
                <div id="totalDurationHint" class="hint-text" style="margin-top:6px;"></div>
            </div>

            <div class="section-title" onclick="window.UiUtils.toggleSection('negSection')">⚠️ 负面提示词 <span>▼</span></div>
            <div class="section-content" id="negSection">
                <div class="neg-actions">
                    <button class="btn-small btn-outline" onclick="window.NegativePanel.negSelectAll()">全选</button>
                    <button class="btn-small btn-outline" onclick="window.NegativePanel.negClearAll()">清空</button>
                    <button class="btn-small btn-outline" onclick="window.NegativePanel.negInvert()">反选</button>
                </div>
                <div class="neg-checklist" id="negChecklist"></div>
                <div class="neg-custom-row">
                    <input type="text" id="customNegInput" placeholder="添加自定义负面词" maxlength="20">
                    <button class="btn-small" onclick="window.NegativePanel.addCustomNeg()">+ 添加</button>
                </div>
                <div id="customNegList" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;"></div>
            </div>

            <div style="margin-top:0.8rem; display:flex; gap:8px;">
                <button onclick="window.OutputPanel.generatePrompt()">✨ 生成提示词</button>
                <button class="btn-outline" onclick="window.FormBindings.clearAll()">🗑️ 清空</button>
            </div>
            <div id="errorMsg" class="error"></div>

            <div class="output-section" id="outputSection" style="display: none;">
                <div class="output-title">📋 生成结果</div>
                <div class="output-box" id="outputText"></div>
                <button class="copy-btn" id="copyAllBtn" onclick="window.OutputPanel.copyToClipboard()">📋 复制全部</button>
                <span id="copyStatus" style="font-size:0.8rem; color:#27ae60; margin-left:8px;"></span>
            </div>

            <div class="section-title" onclick="window.UiUtils.toggleSection('historySection')">📜 历史（5条）<span>▼</span> <button class="btn-small btn-outline" onclick="window.OutputPanel.clearHistory()" style="margin-left:auto;">清空</button></div>
            <div class="section-content" id="historySection"><div id="historyList"><span class="no-history">暂无记录</span></div></div>

            <div class="template-panel" id="templatePanel" style="display:none;">
                <div class="template-panel-header"><span>📋 选择场景模板</span><button class="btn-small btn-outline" onclick="window.FormBindings.closeTemplatePanel()">✕</button></div>
                <div class="template-list" id="templateList"></div>
            </div>
        `;

        // ---- 初始化各个 UI 组件 ----
        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
        window.NegativePanel.loadCustomNegatives();
        window.FormBindings.renderStyleTags();
        window.NegativePanel.renderNegChecklist();
        window.NegativePanel.renderCustomNegList();
        window.OutputPanel.renderHistory();
        window.ModeManager.onMediaChange();
        window.ModeManager.switchMode('single');
        window.FormBindings.renderTemplatePanel();
        window.ExtractManager.renderCustomRules();

        // 初始化伏笔面板
        if (typeof window.ForeshadowEngine !== 'undefined') {
            window.ExtractManager.initForeshadowConfig();
            window.ExtractManager.renderForeshadowPanel();
            var limit = localStorage.getItem('foreshadowLimit') || '50';
            var limitSelect = document.getElementById('foreshadowLimitSelect');
            if (limitSelect) limitSelect.value = limit;
        }

        // 同步引擎配置到复选框
        if (EC) {
            var cfg = EC.getConfig();
            setCheckbox('engineElizaCheck', cfg.engines.eliza.enabled);
            setCheckbox('engineForeshadowCheck', cfg.engines.foreshadow.enabled);
            setCheckbox('engineStandardCheck', cfg.engines.standardExtract.enabled);
            setCheckbox('panelStyleTagsCheck', cfg.panels.styleTags);
            setCheckbox('panelSceneTplCheck', cfg.panels.sceneTemplate);
            setCheckbox('panelNegativeCheck', cfg.panels.negativePanel);
            setCheckbox('panelHistoryCheck', cfg.panels.history);
            setCheckbox('panelMultiShotCheck', cfg.panels.multiShotMode);

            var sub = cfg.engines.foreshadow.subFeatures;
            setCheckbox('subAutoDetectCheck', sub.autoDetect);
            setCheckbox('subManualAddCheck', sub.manualAdd);
            setCheckbox('subSpeciesCheck', sub.speciesDetection);
            setCheckbox('subPowerCheck', sub.powerLevelDetection);
            setCheckbox('subAcqCheck', sub.acquisitionTracking);
            setCheckbox('subContextCheck', sub.contextInjection);
            setCheckbox('subTransCheck', sub.transitionEngine);
        }

        // 更新 UI 显隐
        if (window.ExtractManager.updateUIVisibility) {
            window.ExtractManager.updateUIVisibility();
        }

        console.log('[AppSkeleton] 界面渲染与初始化完成');
        return true;
    }

    // 辅助：设置复选框状态
    function setCheckbox(id, checked) {
        var el = document.getElementById(id);
        if (el) el.checked = checked;
    }

    return { render: render };
})();