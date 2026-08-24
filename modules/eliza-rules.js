// ==================== ELIZA反射规则引擎 (eliza-rules.js) ====================
// 挂载到 window.ElizaRules
// v8.9-P5：规则优先级迁移至 HPDC8，动态加成使用合体加法，排序使用超度量比较

window.ElizaRules = (function() {

    const synonymGroups = window.__ElizaSynonymGroups;
    const utils = window.__ElizaUtils;
    const poolManager = window.__ElizaPoolManager;
    const themeDetector = window.__ElizaThemeDetector;
    const dynamicBoost = window.__ElizaDynamicBoost;
    const builtinRules = window.__ElizaBuiltinRules.builtinRules;
    const contextRules = window.__ElizaContextRules.contextRules;

    let userRules = [];

    // ========== HC+level 数值体系集成 (v8.9 新增) ==========
    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);
    const HPDC8 = HPDC_AVAILABLE ? window.HPDC.HPDC8 : null;
    const LEGACY = !HPDC_AVAILABLE;
    if (LEGACY) {
        console.warn('[ElizaRules] HPDC8 not available. Running in legacy number priority mode.');
    }

    /**
     * 将数字/对象/HPDC8 统一转换为 HPDC8 优先级实例。
     * 向后兼容：旧 localStorage 中的数字、已序列化的 HPDC8 对象、HPDC8 实例均可处理。
     */
    function toHPDCPriority(value) {
        if (LEGACY) {
            return (typeof value === 'number') ? value : (Number(value) || 0);
        }
        if (value instanceof HPDC8) return value.clone();
        if (typeof value === 'number') return HPDC8.fromNumber(value);
        if (value && typeof value === 'object' && value.level !== undefined) {
            return HPDC8.fromObject(value);
        }
        return HPDC8.fromNumber(0);
    }

    // ========== 原有：解析函数字符串 ==========
    function parseFunctionString(fnStr) {
        if (!fnStr || typeof fnStr !== 'string') return null;
        var match = fnStr.match(/^\s*function\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/);
        if (match) {
            var args = match[1].split(',').map(function(a) { return a.trim(); });
            var body = match[2].trim();
            if (!/^\s*return\b/.test(body)) body = 'return ' + body;
            try { return new Function(args[0] || 's', args[1] || 'm', body); }
            catch(e) { return null; }
        }
        if (fnStr.indexOf('function') === -1) {
            try { return new Function('s', 'm', 'return (' + fnStr + ')'); }
            catch(e) { return null; }
        }
        return null;
    }

    // ========== 用户规则管理（含 HPDC8 序列化） ==========
    function loadUserRules() {
        try {
            const saved = localStorage.getItem('elizaUserRules');
            if (saved) {
                const parsed = JSON.parse(saved);
                userRules = parsed.map(function(r) {
                    const flags = r.flags || 'g';
                    var fn = parseFunctionString(r.reflectBody);
                    if (!fn) fn = function() { return ''; };

                    // v8.9：支持旧格式数字 priority 和新的 HPDC8 序列化对象
                    var priorityHpdc;
                    if (r.priority && typeof r.priority === 'object' && r._hpdcVersion) {
                        priorityHpdc = HPDC8.fromObject(r.priority);
                    } else {
                        priorityHpdc = toHPDCPriority(r.priority);
                    }

                    return { pattern: new RegExp(r.source, flags), reflect: fn, priority: priorityHpdc };
                });
            }
        } catch(e) { userRules = []; }
    }

    function saveUserRules() {
        try {
            const serializable = userRules.map(function(r) {
                var p;
                if (!LEGACY && r.priority instanceof HPDC8) {
                    p = r.priority.serialize();
                } else {
                    p = r.priority;
                }
                return {
                    source: r.pattern.source,
                    flags: r.pattern.flags,
                    reflectBody: r.reflect.toString(),
                    priority: p,
                    _hpdcVersion: LEGACY ? undefined : '1.0'
                };
            });
            localStorage.setItem('elizaUserRules', JSON.stringify(serializable));
        } catch(e) {}
    }

    function addUserRule(pattern, reflectFn, priority) {
        var priorityHpdc = toHPDCPriority(priority);
        userRules.push({ pattern: pattern, reflect: reflectFn, priority: priorityHpdc });
        saveUserRules();
    }

    // ========== 规则归一化：确保所有规则的 priority 都是 HPDC8 ==========
    function getAllRules() {
        var all = builtinRules.concat(userRules);
        if (LEGACY) return all;

        return all.map(function(r, idx) {
            if (r.priority instanceof HPDC8) return r;
            // 旧格式（数字）自动转换，输出一次警告
            if (typeof r.priority === 'number' && idx < builtinRules.length) {
                console.warn('[ElizaRules] builtinRules[' + idx + '] uses legacy number priority. Auto-converting to HPDC8.');
            }
            var p = toHPDCPriority(r.priority);
            // 返回浅拷贝，避免修改原始 builtinRules
            return Object.assign({}, r, { priority: p });
        });
    }

    function createRNG(seed) {
        var s = seed | 0;
        return function() {
            s = (s + 0x6D2B79F5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ========== extract 主函数（优先级排序改为 HPDC8.compare） ==========
    function extract(text, options) {
        options = options || {};
        var refreshSeed = options.refreshSeed;
        var keepMultiplier = options.keepMultiplier || 1;

        text = String(text == null ? '' : text)
            .replace(/[。]{2,}/g, '……')
            .replace(/\.{3,}/g, '……');

        const reflected = new Set();
        const conflicts = [];
        const sentences = text.split(/[。！？\n]+/).filter(function(s) { return s.trim().length > 0; });
        const allRules = getAllRules();
        const boost = dynamicBoost.calculate(text);
        var rng = refreshSeed !== undefined ? createRNG(refreshSeed) : null;

        sentences.forEach(function(sentence) {
            const s = sentence.trim();
            if (!s) return;
            let candidates = [];

            allRules.forEach(function(rule, ruleIdx) {
                if (rule.condition && !rule.condition(s)) return;
                const match = s.match(rule.pattern);
                if (match) {
                    let result;
                    if (rule.pool && rule.pool.length > 0) {
                        result = poolManager.pickFromPool(rule, 'builtin_' + ruleIdx);
                    } else if (typeof rule.reflect === 'function') {
                        result = rule.reflect(s, match);
                    } else {
                        result = '';
                    }
                    if (result && result.length >= 2) {
                        // v8.9：finalPriority 改为 HPDC8 实例
                        var finalPriority = toHPDCPriority(rule.priority);

                        if (boost) {
                            let boostValue = LEGACY ? 0 : HPDC8.fromNumber(0);
                            if (boost.cthulhuBoost && /古神|触手|低语|疯狂|不可名状|san值/.test(result)) {
                                boostValue = LEGACY ? (boostValue + boost.cthulhuBoost) : HPDC8.addLeveled(boostValue, HPDC8.fromNumber(boost.cthulhuBoost));
                            }
                            if (boost.cyberBoost && /数据|乱码|信号|黑客|植入体|脑机/.test(result)) {
                                boostValue = LEGACY ? (boostValue + boost.cyberBoost) : HPDC8.addLeveled(boostValue, HPDC8.fromNumber(boost.cyberBoost));
                            }
                            if (boost.horrorBoost && /恐怖|鬼|诅咒|灵异|阴森/.test(result)) {
                                boostValue = LEGACY ? (boostValue + boost.horrorBoost) : HPDC8.addLeveled(boostValue, HPDC8.fromNumber(boost.horrorBoost));
                            }
                            if (boost.systemErrorBoost && /错误|崩溃|宕机|故障|异常/.test(result)) {
                                boostValue = LEGACY ? (boostValue + boost.systemErrorBoost) : HPDC8.addLeveled(boostValue, HPDC8.fromNumber(boost.systemErrorBoost));
                            }
                            if (!LEGACY && boostValue.toNumber() !== 0) {
                                finalPriority = HPDC8.addLeveled(finalPriority, boostValue);
                            } else if (LEGACY && boostValue !== 0) {
                                finalPriority += boostValue;
                            }
                        }

                        // 随机扰动：HPDC 模式下转换为极小值以保持确定性语义
                        if (rng) {
                            var jitterVal = (rng() - 0.5) * 0.8;
                            if (LEGACY) {
                                finalPriority += jitterVal;
                            } else {
                                finalPriority = HPDC8.addLeveled(finalPriority, HPDC8.fromNumber(jitterVal));
                            }
                        }

                        candidates.push({ text: result, priority: finalPriority, type: 'single' });
                    }
                }
            });

            // v8.9：排序改为 HPDC8.compare（降序）
            candidates.sort(function(a, b) {
                if (LEGACY) return b.priority - a.priority;
                return HPDC8.compare(b.priority, a.priority);
            });

            var baseKeep = s.length > 30 ? 5 : (s.length > 12 ? 4 : 3);
            var keepCount = Math.max(baseKeep, Math.floor(baseKeep * keepMultiplier));
            if (rng && candidates.length > keepCount) {
                var selected = candidates.slice(0, keepCount);
                for (var ci = keepCount; ci < candidates.length; ci++) { if (rng() < 0.25) selected.push(candidates[ci]); }
                candidates = selected;
            } else {
                candidates = candidates.slice(0, keepCount);
            }

            candidates.forEach(function(item) { utils.addWithDedup(reflected, item); });
        });

        // 上下文规则：遍历所有句对（含非相邻），每条规则独立判定
        for (let i = 0; i < sentences.length; i++) {
            const sentA = sentences[i].trim();
            if (!sentA) continue;
            for (let j = i + 1; j < sentences.length; j++) {
                const sentB = sentences[j].trim();
                if (!sentB) continue;
                for (const rule of contextRules) {
                    if (rule.patternA.test(sentA) && rule.patternB.test(sentB)) {
                        const result = rule.reflect(sentA, sentB, text);
                        if (result && result.length >= 2) utils.addWithDedup(reflected, { text: result, type: 'context' });
                    }
                }
            }
        }

        const items = [...reflected].map(item => typeof item === 'string' ? { text: item, type: 'single' } : item).slice(0, 30);
        return { items: items, conflicts: conflicts.slice(0, 10) };
    }

    function refreshExtract(text, maxRefreshes) {
        maxRefreshes = Math.min(maxRefreshes || 3, 10);
        var allItems = {};
        var baseResult = extract(text);
        for (var i = 0; i < baseResult.items.length; i++) {
            var item = baseResult.items[i], key = item.text;
            if (!allItems[key]) allItems[key] = { text: item.text, type: item.type, count: 1 };
            allItems[key].count++;
        }
        for (var refresh = 0; refresh < maxRefreshes; refresh++) {
            var seed = Date.now() + refresh * 7919;
            var result = extract(text, { refreshSeed: seed, keepMultiplier: 1.5 + refresh * 0.3 });
            for (var j = 0; j < result.items.length; j++) {
                var item2 = result.items[j], key2 = item2.text;
                if (!allItems[key2]) allItems[key2] = { text: item2.text, type: item2.type, count: 0 };
                allItems[key2].count++;
            }
        }
        var sortedItems = Object.values(allItems).sort(function(a, b) { return b.count - a.count; }).slice(0, 25);
        return { items: sortedItems.map(function(e) { return { text: e.text, type: e.type, refreshCount: e.count }; }), conflicts: baseResult.conflicts };
    }

    // ========== V8.8 新增：定向反射规则（priority 改为 HPDC8） ==========
    const directedRules = (function() {
        if (LEGACY) {
            return [
                { pattern: /突破|晋升|进阶|升级/, priority: 9, reflect: function(s, ctx) { return ctx.powerLevel ? ctx.name + '突破' + ctx.powerLevel + '的瞬间' : null; } },
                { pattern: /凝视|注视|望着|凝望/, condition: function(s, ctx) { return !!ctx.species; }, priority: 8, reflect: function(s, ctx) { return ctx.species + '的凝视'; } },
                { pattern: /进化|蜕变/, condition: function(s, ctx) { return !!ctx.evolutionStage; }, priority: 9, reflect: function(s, ctx) { return ctx.name + '蜕变为' + ctx.evolutionStage + '的刹那'; } },
                { pattern: /说|道|问|答|开口|发言/, condition: function(s, ctx) { return !!ctx.name; }, priority: 6, reflect: function(s, ctx) { return ctx.name + '开口的瞬间'; } },
                { pattern: /获得|得到|获取|觉醒|绑定|开启|激活/, condition: function(s, ctx) { return ctx.acquisitionTotalWeight > 0; }, priority: 7, reflect: function(s, ctx) { return ctx.name + '获得力量的瞬间——面板浮现'; } }
            ];
        }
        return [
            { pattern: /突破|晋升|进阶|升级/, priority: HPDC8.fromNumber(9), reflect: function(s, ctx) { return ctx.powerLevel ? ctx.name + '突破' + ctx.powerLevel + '的瞬间' : null; } },
            { pattern: /凝视|注视|望着|凝望/, condition: function(s, ctx) { return !!ctx.species; }, priority: HPDC8.fromNumber(8), reflect: function(s, ctx) { return ctx.species + '的凝视'; } },
            { pattern: /进化|蜕变/, condition: function(s, ctx) { return !!ctx.evolutionStage; }, priority: HPDC8.fromNumber(9), reflect: function(s, ctx) { return ctx.name + '蜕变为' + ctx.evolutionStage + '的刹那'; } },
            { pattern: /说|道|问|答|开口|发言/, condition: function(s, ctx) { return !!ctx.name; }, priority: HPDC8.fromNumber(6), reflect: function(s, ctx) { return ctx.name + '开口的瞬间'; } },
            { pattern: /获得|得到|获取|觉醒|绑定|开启|激活/, condition: function(s, ctx) { return ctx.acquisitionTotalWeight > 0; }, priority: HPDC8.fromNumber(7), reflect: function(s, ctx) { return ctx.name + '获得力量的瞬间——面板浮现'; } }
        ];
    })();

    function _applyDirectedRules(text, protagonistContext) {
        const sentences = text.split(/[。！？\n]+/).filter(function(s) { return s.trim().length > 0; });
        const results = [];
        for (let i = 0; i < sentences.length; i++) {
            const s = sentences[i].trim();
            if (!s) continue;
            for (const rule of directedRules) {
                if (rule.condition && !rule.condition(s, protagonistContext)) continue;
                if (rule.pattern.test(s)) {
                    const r = rule.reflect(s, protagonistContext);
                    if (r && r.length >= 2) results.push({ text: r, type: 'directed', priority: rule.priority });
                }
            }
        }
        const seen = new Set();
        return results.filter(function(r) { if (seen.has(r.text)) return false; seen.add(r.text); return true; });
    }

    // ========== V8.8 新增：extractWithContext ==========
    function extractWithContext(text, protagonistContext) {
        if (!protagonistContext || !protagonistContext.name) {
            var fallback = extract(text);
            return { items: fallback.items, directed: [], conflicts: fallback.conflicts };
        }

        var injectedText = text;
        if (window.__ForeshadowContextBridge) {
            injectedText = window.__ForeshadowContextBridge.injectContext(text, protagonistContext);
        } else {
            var ctxStr = '[主角:' + protagonistContext.name + ']';
            if (protagonistContext.species) ctxStr += '[种族:' + protagonistContext.species + ']';
            if (protagonistContext.powerLevel) ctxStr += '[等级:' + protagonistContext.powerLevel + ']';
            injectedText = ctxStr + '\n' + text;
        }

        var baseResult = extract(injectedText);
        var directedItems = _applyDirectedRules(injectedText, protagonistContext);

        var allItems = directedItems.concat(baseResult.items);
        var seen = new Set();
        var finalItems = [];
        for (var i = 0; i < allItems.length; i++) {
            var t = typeof allItems[i] === 'string' ? allItems[i] : allItems[i].text;
            if (!seen.has(t)) { seen.add(t); finalItems.push(typeof allItems[i] === 'string' ? { text: allItems[i], type: 'single' } : allItems[i]); }
        }

        return { items: finalItems.slice(0, 30), directed: directedItems, conflicts: baseResult.conflicts };
    }

    // ========== 初始化 ==========
    loadUserRules();

    return {
        extract: extract,
        refreshExtract: refreshExtract,
        extractWithContext: extractWithContext,
        synonymGroups: synonymGroups.synonymGroups,
        builtinRules: builtinRules,
        contextRules: contextRules,
        addUserRule: addUserRule,
        getUserRules: function() { return userRules; },
        saveUserRules: saveUserRules,
        findSynonymCandidates: synonymGroups.findSynonymCandidates,
        detectTheme: themeDetector.detectTheme,
        // v8.9 暴露降级标志，供外部检测
        __LEGACY_PRIORITY: LEGACY
    };
})();
