// ui/extract-manager.js
// 关键词提取、反射模式、风格滑动条、伏笔检测，挂载 window.ExtractManager
// v8.9-P4：集成 HC+level 领域投票器，自动填充场景/主体/氛围字段

window.ExtractManager = (function() {
    const U = window.UiUtils;
    const dict = window.__DictionariesDomain || window.Dictionaries;
    const er = window.ElizaRules;
    const sp = window.StylePresets;
    const FI = window.FlowInspector;
    const EC = window.EngineConfig;

    let extractMode = 'standard';
    let reflectStyleValue = 50;
    let foreshadowEnabled = (localStorage.getItem('foreshadowEnabled') !== 'false');
    let compositeEnabled = (localStorage.getItem('compositeEnabled') === 'true');

    // ==================== 领域到输出字段映射规则（v8.9 新增） ====================
    const DOMAIN_FIELD_MAP = {
        "奇幻史诗": { scene: true, subject: true, mood: false },
        "仙武玄幻": { scene: true, subject: true, mood: false },
        "现代科幻": { scene: true, subject: true, mood: true },
        "古代官场": { scene: true, subject: true, mood: true },
        "意境氛围": { scene: false, subject: false, mood: true },
        "人物身份": { scene: false, subject: true, mood: false },
        "空间地名": { scene: true, subject: false, mood: false },
        "视听叙事": { scene: false, subject: false, mood: false, camera: true },
        "克苏鲁恐怖": { scene: true, subject: true, mood: true },
        "现代生活": { scene: true, subject: true, mood: true },
        "通用高频": { scene: false, subject: false, mood: false }
    };

    // ==================== 字段填充辅助函数（v8.9 新增） ====================
    function safeSetField(fieldId, value, append) {
        var el = document.getElementById(fieldId);
        if (!el) return false;
        if (append && el.value) {
            if (!el.value.includes(value)) el.value += '，' + value;
        } else {
            if (!el.value) el.value = value;
        }
        return true;
    }
    function appendToScene(val) { safeSetField('scene', val, true) || safeSetField('shot-scene-0', val, true); }
    function appendToSubject(val) { safeSetField('subject', val, true) || safeSetField('shot-subject-0', val, true); }
    function appendToMood(val) { safeSetField('mood', val, true); }
    function appendToCamera(val) { safeSetField('singleCamera', val, true); }

    // ==================== 领域投票核心函数（v8.9 新增） ====================
    function selectBestWordForDomain(domain, wordList, confidenceMap) {
        if (!window.HPDC) return null;
        var HPDC8 = window.HPDC.HPDC8;
        var candidates = [];
        var threshold = HPDC8.fromConfidence(0.2);
        for (var i = 0; i < wordList.length; i++) {
            var word = wordList[i];
            var confObj = confidenceMap.get(word);
            if (!confObj) continue;
            var conf = confObj[domain];
            if (!conf) continue;
            if (HPDC8.compare(conf, threshold) > 0) {
                candidates.push({ word: word, conf: conf });
            }
        }
        if (candidates.length === 0) return null;
        candidates.sort(function(a, b) { return HPDC8.compare(b.conf, a.conf); });
        return candidates[0].word;
    }

    function fillFieldsFromTopDomains(topDomains, wordList, confidenceMap) {
        var usedWords = new Set();
        for (var i = 0; i < topDomains.length; i++) {
            var item = topDomains[i];
            var domain = item.domain;
            var mapping = DOMAIN_FIELD_MAP[domain] || { scene: false, subject: false, mood: false, camera: false };
            if (mapping.scene) {
                var best = selectBestWordForDomain(domain, wordList, confidenceMap);
                if (best && !usedWords.has(best)) { appendToScene(best); usedWords.add(best); }
            }
            if (mapping.subject) {
                var best = selectBestWordForDomain(domain, wordList, confidenceMap);
                if (best && !usedWords.has(best)) { appendToSubject(best); usedWords.add(best); }
            }
            if (mapping.mood) {
                var best = selectBestWordForDomain(domain, wordList, confidenceMap);
                if (best && !usedWords.has(best)) { appendToMood(best); usedWords.add(best); }
            }
            if (mapping.camera) {
                var best = selectBestWordForDomain(domain, wordList, confidenceMap);
                if (best && !usedWords.has(best)) { appendToCamera(best); usedWords.add(best); }
            }
        }
    }

    function legacyFillFromKeywords(keywords) {
        // 旧逻辑：基于一对一映射的简单追加（降级/兼容用）
        var counts = { scene: 0, subject: 0, mood: 0, camera: 0 };
        for (var i = 0; i < keywords.length && i < 10; i++) {
            var word = keywords[i];
            var domain = dict.getDomainForWord(word);
            var mapping = DOMAIN_FIELD_MAP[domain];
            if (!mapping) continue;
            if (mapping.scene && counts.scene < 2) { appendToScene(word); counts.scene++; }
            if (mapping.subject && counts.subject < 2) { appendToSubject(word); counts.subject++; }
            if (mapping.mood && counts.mood < 2) { appendToMood(word); counts.mood++; }
            if (mapping.camera && counts.camera < 2) { appendToCamera(word); counts.camera++; }
        }
    }

    function getExtractMode() { return extractMode; }
    function getReflectStyle() { return reflectStyleValue; }

    let inspectorReady = false;
    function ensureInspectorReady() {
        if (inspectorReady || !FI) return;
        inspectorReady = true;
        FI.registerStep('词库加载', function(ctx) { return !!(ctx.dict && ctx.dict.entityPatterns); });
        FI.registerStep('提取模式', function(ctx) { return ctx.mode === 'standard' || ctx.mode === 'eliza' || ctx.mode === 'composite'; });
        FI.registerStep('提取执行', function(ctx) { return !ctx._extractError; });
        FI.registerStep('提取结果', function(ctx) { return ctx.result && ctx.result.length > 0; });
        FI.registerStep('伏笔扫描', function(ctx) { return !ctx._foreshadowError; });
        FI.registerStep('字数漂移', function(ctx) {
            if (!foreshadowEnabled || !window.ForeshadowEngine) return true;
            var fc = window.ForeshadowEngine.getConfig();
            if (fc.totalCharsRead > ctx._textLength * 3 && ctx._textLength > 0) {
                console.warn('[FlowInspector] ⚠️ 伏笔字数漂移');
                window.ForeshadowEngine.resetPool();
                return false;
            }
            return true;
        });
    }

    function switchExtractMode(mode) {
        if (mode === extractMode) return;
        if (mode === 'composite') {
            if (!window.__ForeshadowIdentityMerger || !window.__ForeshadowContextBridge) {
                alert('综合模式需要完整模块，已保持在 ' + extractMode + ' 模式。');
                return;
            }
            compositeEnabled = true;
            localStorage.setItem('compositeEnabled', 'true');
        } else {
            compositeEnabled = false;
            localStorage.setItem('compositeEnabled', 'false');
        }
        extractMode = mode;
        var stdBtn = document.getElementById('modeStandardBtn');
        var elizaBtn = document.getElementById('modeElizaBtn');
        var compBtn = document.getElementById('modeCompositeBtn');
        if (stdBtn) stdBtn.classList.toggle('active', mode === 'standard');
        if (elizaBtn) elizaBtn.classList.toggle('active', mode === 'eliza');
        if (compBtn) compBtn.classList.toggle('active', mode === 'composite');
        updateUIVisibility();
        extractKeywords();
    }

    function onReflectStyleChange() {
        var slider = document.getElementById('reflectStyleSlider');
        if (slider) reflectStyleValue = parseInt(slider.value);
        var hint = document.getElementById('reflectStyleHint');
        if (reflectStyleValue < 20) hint.textContent = '🌿 白描';
        else if (reflectStyleValue < 40) hint.textContent = '🌤️ 偏白描';
        else if (reflectStyleValue < 60) hint.textContent = '⚖️ 均衡';
        else if (reflectStyleValue < 80) hint.textContent = '✨ 偏文丑';
        else hint.textContent = '💎 文丑';
        if (extractMode === 'eliza' || extractMode === 'composite') extractKeywords();
    }

    function applyReflectStyle(phrase) {
        if (!phrase || phrase.length < 2) return phrase;
        var val = reflectStyleValue;
        if (val < 20) {
            return phrase.replace(/的瞬间$/, '').replace(/的刹那.*$/, '').replace(/——.*$/, '').replace(/的凝视$/, '').trim() || phrase;
        }
        if (val < 40) return phrase;
        if (val < 60) return phrase;
        if (val < 80) {
            const lightEmb = ['流转', '弥散', '晶莹', '斑驳', '晕染'];
            for (let e of lightEmb) {
                if (!phrase.includes(e) && phrase.length < 15) return phrase + '·' + e;
            }
            return phrase;
        }
        const heavyEmb = ['刹那', '流转', '弥散', '晶莹', '斑驳', '氤氲', '剪影', '流转的', '晕染的', '浸透的'];
        for (let e of heavyEmb) {
            if (!phrase.includes(e)) return phrase + '·' + e;
        }
        return phrase;
    }

    function updateUIVisibility() {
        if (!EC) return;
        var reflectGroup = document.getElementById('reflectStyleGroup');
        if (reflectGroup) reflectGroup.style.display = (EC.isEnabled('eliza') && (extractMode === 'eliza' || extractMode === 'composite')) ? 'flex' : 'none';
        var customRuleSection = document.getElementById('customRuleSection');
        if (customRuleSection) customRuleSection.style.display = (EC.isEnabled('eliza') && (extractMode === 'eliza' || extractMode === 'composite')) ? 'block' : 'none';
        var foreshadowSection = document.getElementById('foreshadowSection');
        if (foreshadowSection) foreshadowSection.style.display = EC.isEnabled('foreshadow') ? 'block' : 'none';
        var styleSection = document.getElementById('styleSection');
        if (styleSection) styleSection.style.display = EC.isPanelVisible('styleTags') ? 'block' : 'none';
        var sceneTemplateBtn = document.getElementById('sceneTemplateBtn');
        if (sceneTemplateBtn) sceneTemplateBtn.style.display = EC.isPanelVisible('sceneTemplate') ? '' : 'none';
        var negSection = document.getElementById('negSection');
        if (negSection) negSection.style.display = EC.isPanelVisible('negativePanel') ? 'block' : 'none';
        var historySection = document.getElementById('historySection');
        if (historySection) historySection.style.display = EC.isPanelVisible('history') ? 'block' : 'none';
    }

    // ==================== 提取主逻辑（含 try-finally 保护） ====================
    function extractKeywords() {
        const text = document.getElementById('referenceText').value.trim();
        const container = document.getElementById('extractedKeywords');
        if (!text) { container.innerHTML = ''; return; }
        performExtract(text, container);
    }

    function extractFromContent(text, fileName, callback) {
        const container = document.getElementById('extractedKeywords');
        performExtract(text, container, fileName, callback);
    }

    function performExtract(text, container, sourceName, callback) {
        var context = { text: text, mode: extractMode, dict: dict, result: [], foreshadowResult: [], allTags: [], _textLength: text.length, _extractError: false, _foreshadowError: false };
        try {
            ensureInspectorReady();

            const words = standardExtract(text);
            var standardResult = words.map(w => ({ text: w, type: 'single' }));

            // === v8.9 领域投票自动填充（HC+level） ===
            if (EC && typeof EC.isEnabled === 'function' && EC.isEnabled('domainVoter') && window.DomainVoter && window.HPDC) {
                try {
                    const wordConfMap = new Map();
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i];
                        if (dict.getDomainConfidence) {
                            const conf = dict.getDomainConfidence(word);
                            if (conf && Object.keys(conf).length) wordConfMap.set(word, conf);
                        }
                    }
                    if (wordConfMap.size > 0) {
                        const voter = new DomainVoter({ mode: 'HC_ONLY', saturate: true });
                        for (const [word, confMap] of wordConfMap.entries()) {
                            voter.addVoteMap(confMap);
                        }
                        const topDomains = voter.getTopDomains(2);
                        if (topDomains.length) {
                            fillFieldsFromTopDomains(topDomains, words, wordConfMap);
                        } else {
                            legacyFillFromKeywords(words);
                        }
                    } else {
                        legacyFillFromKeywords(words);
                    }
                } catch(e) {
                    console.warn('[ExtractManager] 领域投票失败，降级到旧逻辑:', e);
                    legacyFillFromKeywords(words);
                }
            } else {
                legacyFillFromKeywords(words);
            }

            // 综合模式核心逻辑（保持原样）
            if (extractMode === 'composite' && compositeEnabled && EC && EC.isEnabled('eliza') && EC.isEnabled('foreshadow')) {
                var profiles = [];
                if (window.__ForeshadowProtagonistDetector && window.__ForeshadowProtagonistDetector.detectIdentityProfiles) {
                    try { profiles = window.__ForeshadowProtagonistDetector.detectIdentityProfiles(text); } catch(e) { console.error(e); }
                }
                var elizaRes = { items: [], directed: [] };
                var mainProfile = profiles.length > 0 ? profiles[0] : null;
                if (mainProfile) {
                    var protagonistContext = {
                        name: mainProfile.name,
                        species: mainProfile.species,
                        powerLevel: mainProfile.powerLevel,
                        evolutionStage: mainProfile.evolutionChain && mainProfile.evolutionChain.length > 0 ? mainProfile.evolutionChain[mainProfile.evolutionChain.length - 1] : mainProfile.name,
                        acquisitionTotalWeight: mainProfile.acquisitionTotalWeight || 0
                    };
                    try { elizaRes = er.extractWithContext(text, protagonistContext); } catch(e) { elizaRes = { items: [], directed: [] }; }
                } else {
                    try { var tmp = er.extract(text); elizaRes = { items: tmp.items, directed: [] }; } catch(e) {}
                }
                elizaRes.items = elizaRes.items.map(it => ({ ...it, text: applyReflectStyle(it.text) }));
                elizaRes.directed = elizaRes.directed.map(it => ({ ...it, text: applyReflectStyle(it.text) }));

                var transitionPhrases = [];
                if (window.__ForeshadowTransitionEngine && EC.getConfig().engines.foreshadow.subFeatures.transitionEngine) {
                    var allSentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 3);
                    var usedSet = new Set();
                    elizaRes.items.forEach(it => usedSet.add(it.text));
                    standardResult.forEach(it => usedSet.add(it.text));
                    var unused = allSentences.filter(s => !usedSet.has(s.trim()));
                    transitionPhrases = window.__ForeshadowTransitionEngine.filterByVisualHint(unused);
                }

                var coreItems = (elizaRes.directed || []).concat(elizaRes.items || []).slice(0, 20);
                var outputStructure = coreItems.map(function(it, idx) {
                    var pos = text.indexOf(it.text);
                    return { text: it.text, type: 'core', position: pos >= 0 ? pos : idx * 100 };
                });
                if (transitionPhrases.length > 0 && window.__ForeshadowTransitionEngine) {
                    outputStructure = window.__ForeshadowTransitionEngine.insertIntoOutput(outputStructure, transitionPhrases);
                }
                context.allTags = outputStructure.map(item => {
                    var tagType = item.type === 'core' ? (elizaRes.directed && elizaRes.directed.some(d => d.text === item.text) ? 'directed' : 'eliza') : 'transition';
                    return { text: item.text, type: tagType, source: 'extract' };
                });
            } else if (extractMode === 'eliza' && (!EC || EC.isEnabled('eliza'))) {
                try {
                    var raw = er.extract(text);
                    context.result = raw.items.map(item => ({ text: applyReflectStyle(item.text), type: item.type || 'single' }));
                } catch(e) { context.result = standardResult; }
                context.allTags = context.result.map(item => ({ text: item.text, type: item.type || 'single', source: 'extract' }));
            } else {
                context.result = standardResult;
                context.allTags = standardResult.map(item => ({ text: item.text, type: item.type || 'single', source: 'extract' }));
            }

            if ((!EC || EC.isEnabled('foreshadow')) && foreshadowEnabled && window.ForeshadowEngine) {
                try {
                    context.foreshadowResult = window.ForeshadowEngine.scan(text, { mood: document.getElementById('mood') ? document.getElementById('mood').value : '' });
                    context.foreshadowResult.forEach(fs => {
                        context.allTags.push({ text: fs.message || fs.word, type: fs.type || 'foreshadow_signal', source: 'foreshadow' });
                    });
                } catch(e) { context._foreshadowError = true; }
            }

            renderTags(context.allTags);
            renderForeshadowPanel();
            renderProtagonistPanel();
            if (FI) {
                var inspection = FI.run(context);
                if (!inspection.passed) console.warn('[ExtractManager] 流程检测未通过: ' + inspection.failedStep, inspection.errors);
            }
            updateUIVisibility();
            applyLightingToMood();
        } finally {
            // ★ 确保回调始终执行
            if (typeof callback === 'function') {
                try { callback(context.allTags); } catch(e) { console.error(e); }
            }
        }
    }

    function standardExtract(text) {
        const found = new Set();
        if (dict && dict.entityPatterns) {
            dict.entityPatterns.forEach(p => { p.lastIndex = 0; let m; while ((m = p.exec(text)) !== null) found.add(m[0]); });
        }
        if (found.size < 8) {
            const sentences = text.split(/[。！？；\n，,、\s]+/).filter(s => s.length >= 2);
            sentences.forEach(s => {
                const raw = s.replace(/[，,；;：:。！？\?！、\s]+/g, ' ').trim();
                (raw.match(/[\u4e00-\u9fff]{2,4}/g) || []).forEach(t => {
                    if (dict && dict.stopWords && !dict.stopWords.has(t) && found.size < 15) found.add(t);
                });
                let m; const deP = /[\u4e00-\u9fff]{2,3}的[\u4e00-\u9fff]{2,3}/g;
                while ((m = deP.exec(s)) !== null) {
                    if (dict && dict.stopWords && !dict.stopWords.has(m[0]) && found.size < 18) found.add(m[0]);
                }
            });
        }
        return [...found].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 20);
    }

    function applyLightingToMood() {
        const moodInput = document.getElementById('mood');
        if (!moodInput) return;
        const moodVal = moodInput.value;
        for (const [keyword, lighting] of Object.entries(sp.moodLightingMap)) {
            if (moodVal.includes(keyword) && !moodVal.includes(lighting.substring(0, 4))) {
                moodInput.value = moodVal + '；' + lighting;
                break;
            }
        }
    }

    function renderTags(allTags) {
        const container = document.getElementById('extractedKeywords');
        if (!container) return;
        if (!allTags.length) { container.innerHTML = '<span style="font-size:0.8rem;color:#888;">未提取到关键词</span>'; return; }
        const isComposite = extractMode === 'composite';
        const prefix = isComposite ? '🔀 综合：' : (extractMode === 'eliza' ? '🪞 反射：' : '🔍 关键词：');
        container.innerHTML = '<span class="tag-section-label">' + prefix + '</span>' + allTags.map(item => {
            let cls = '';
            if (item.source === 'foreshadow') {
                cls = ' foreshadow-tag';
                if (item.type === 'foreshadow_long') cls += ' long-term';
                else if (item.type === 'foreshadow_short') cls += ' short-term';
                else if (item.type === 'foreshadow_manual') cls += ' manual';
            } else if (item.type === 'directed') {
                cls = ' reflected-context';
            } else if (item.type === 'transition') {
                cls = ' reflected-transition';
            } else if (isComposite || extractMode === 'eliza') {
                if (reflectStyleValue < 20) cls = ' reflected-plain';
                else if (reflectStyleValue > 80) cls = ' reflected-rich';
                else cls = ' reflected';
            }
            var click = (item.source === 'foreshadow' || item.type === 'transition') ? '' : 'onclick="window.ExtractManager.showTagMenu(event, \'' + item.text.replace(/'/g, "\\'") + '\')"';
            return '<span class="extracted-tag' + cls + '" ' + click + '>' + item.text + '</span>';
        }).join('');
        container.style.maxHeight = '200px'; container.style.overflowY = 'auto';
    }

    // 空方法实现（原有占位）
    function showTagMenu(event, word) { /* 省略实现，可根据需要实现 */ }
    function fillField(word, target) { /* 省略 */ }

    function renderCustomRules() {
        var list = document.getElementById('customRuleList');
        if (!list) return;
        var rules = er.getUserRules ? er.getUserRules() : [];
        list.innerHTML = rules.map(function(r, i) {
            return '<div class="custom-rule-item">' + r.pattern.source + ' → ' + (typeof r.reflect === 'function' ? r.reflect.toString().substring(0,20)+'...' : '') + ' <button onclick="window.ExtractManager.removeCustomRule('+i+')">×</button></div>';
        }).join('');
    }
    function addCustomRule() {
        var patternStr = document.getElementById('customRulePattern').value.trim();
        var result = document.getElementById('customRuleResult').value.trim();
        var priority = parseInt(document.getElementById('customRulePriority').value) || 4;
        if (!patternStr || !result) { alert('请输入正则和结果'); return; }
        try { var regex = new RegExp(patternStr); } catch(e) { alert('正则无效'); return; }
        er.addUserRule(regex, function() { return result; }, priority);
        renderCustomRules();
        extractKeywords();
    }
    function removeCustomRule(index) {
        var rules = er.getUserRules ? er.getUserRules() : [];
        rules.splice(index, 1);
        er.saveUserRules();
        renderCustomRules();
    }

    function autoFillCamera() {
        var action = document.getElementById('singleAction').value;
        var camInput = document.getElementById('singleCamera');
        if (!camInput || camInput.value) return;
        var cam = sp.autoMatchCamera(action);
        if (cam) camInput.value = cam;
    }

    // ========== 7 个空方法实现 ==========
    function toggleForeshadow() {
        foreshadowEnabled = !foreshadowEnabled;
        localStorage.setItem('foreshadowEnabled', foreshadowEnabled);
        var btn = document.getElementById('foreshadowToggleBtn');
        if (btn) btn.textContent = '📌 伏笔：' + (foreshadowEnabled ? '开' : '关');
        extractKeywords();
    }

    function addManualForeshadow() {
        if (!window.ForeshadowEngine) { alert('伏笔引擎不可用'); return; }
        var word = prompt('请输入要添加的伏笔词：');
        if (!word) return;
        var sentence = prompt('请输入包含该词的句子（可选）：');
        var result = window.ForeshadowEngine.addManual(word, sentence || word);
        if (result.success) {
            U.showToast('已添加伏笔词：' + word);
            renderForeshadowPanel();
            extractKeywords();
        } else {
            alert('添加失败：' + (result.reason || '未知错误'));
        }
    }

    function setForeshadowLimit(limit) {
        limit = parseInt(limit) || 50;
        if (window.ForeshadowEngine) window.ForeshadowEngine.setMaxItems(limit);
        localStorage.setItem('foreshadowLimit', limit);
    }

    function resetForeshadowPool() {
        if (!window.ForeshadowEngine) return;
        if (confirm('确定重置伏笔词库吗？所有自动检测的伏笔将被清除。')) {
            window.ForeshadowEngine.resetPool();
            renderForeshadowPanel();
            extractKeywords();
        }
    }

    function renderForeshadowPanel() {
        var container = document.getElementById('foreshadowPoolList');
        if (!container || !window.ForeshadowEngine) return;
        var pool = window.ForeshadowEngine.getPool();
        if (pool.length === 0) {
            container.innerHTML = '<div style="color:#888;font-size:0.8rem;">暂无伏笔词，输入文本自动检测</div>';
            return;
        }
        container.innerHTML = pool.map(function(entry) {
            var a = entry.anomalyScore;
            var pct = 0;
            if (typeof a === 'number') pct = a;
            else if (a && typeof a.toConfidence === 'function') pct = a.toConfidence();
            else if (a && typeof a.toNumber === 'function') pct = a.toNumber() / 256;
            pct = Math.max(0, Math.min(1, pct));
            return '<div class="foreshadow-pool-item"><b>' + entry.word + '</b> 首次出现: ' + entry.firstSentence.substring(0,30) + '... 异常度: ' + Math.round(pct * 100) + '%</div>';
        }).join('');
    }

    function renderProtagonistPanel() {
        var container = document.getElementById('protagonistPanel');
        if (!container || !window.__ForeshadowProtagonistTracker) return;
        var report = window.__ForeshadowProtagonistTracker.getReport();
        if (!report.longTermProtagonist && report.chapterProtagonists.length === 0) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#888;">尚未检测到主角</div>';
            return;
        }
        var html = '';
        if (report.longTermProtagonist) {
            var lp = report.longTermProtagonist;
            html += '<div style="font-weight:600;">长期主角：' + lp.name + '（稳定性：' + Math.round(lp.stabilityScore) + '）</div>';
        }
        for (var i=0; i<<report.chapterProtagonists.length; i++) {
            var cp = report.chapterProtagonists[i];
            html += '<div>章节主角：' + cp.name + '（活跃窗口：' + cp.activeWindows + '）</div>';
        }
        container.innerHTML = html;
    }

    function initForeshadowConfig() {
        if (EC) {
            var sub = EC.getConfig().engines.foreshadow.subFeatures;
            // 同步子开关状态到 foreshadowEnabled 及相关标志（简化，仅用总开关）
        }
        renderForeshadowPanel();
    }

    // 公开接口
    return {
        getExtractMode, getReflectStyle,
        switchExtractMode, onReflectStyleChange, extractKeywords, extractFromContent,
        showTagMenu, fillField,
        renderCustomRules, addCustomRule, removeCustomRule,
        autoFillCamera,
        toggleForeshadow, addManualForeshadow, setForeshadowLimit,
        resetForeshadowPool, renderForeshadowPanel, initForeshadowConfig,
        updateUIVisibility
    };
})();
