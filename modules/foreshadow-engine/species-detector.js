// modules/foreshadow-engine/species-detector.js
// 物种身份检测器 —— 识别非人主角、物品主角、进化文
// 挂载到 window.__ForeshadowSpeciesDetector
// 依赖：identity-dictionary.js 的种族/体质维度 + 进化关键词 + 净化规则

(function() {

    // 依赖检测（降级为空对象，避免外部报错）
    const dict = window.__ForeshadowIdentityDict;
    if (!dict) {
        window.__ForeshadowSpeciesDetector = {
            scan: function() { return []; },
            reset: function() {},
            setEnabled: function() {}
        };
        return;
    }

    // ---------- 内部常量 ----------
    // 常见动物/种族尾部单字（用于复合词保护）
    const ANIMAL_SUFFIXES = new Set([
        '龙','凤','虎','狼','蛇','狐','鹰','熊','象','猿',
        '蛛','鹿','马','牛','羊','鱼','虫','鸟','雀','鹤',
        '龟','蟾','鳄','鲨','鲸','蚁','蜂','蝶','蝎','鼠',
        '犬','猫','猪','鸡','鸭','鹅'
    ]);

    // 进化触发词（计划书 5.1）
    const EVOLUTION_VERBS = new Set(dict.getEvolutionKeywords());

    // 获取净化规则
    const purificationRules = dict.getPurificationRules();

    // ---------- 内部状态 ----------
    let enabled = true;
    let lastScannedText = '';
    let evolutionChainCache = [];

    // ---------- 净化函数 ----------
    function purifyText(text) {
        let purified = text;
        for (const rule of purificationRules) {
            purified = purified.replace(rule, '');
        }
        return purified;
    }

    // ---------- 复合词保护 ----------
    // 判断一个词是否为带前缀的复合种族（如“暗影暴龙”），而非独立单字动物
    function isCompoundSpecies(label) {
        if (label.length < 2) return false;
        const lastChar = label[label.length - 1];
        // 如果末尾字是动物后缀，且整个词不在内置词典中，视为可能的复合物种
        if (ANIMAL_SUFFIXES.has(lastChar)) {
            const speciesDict = new Set(dict.speciesDictionary);
            if (!speciesDict.has(label)) {
                return true;
            }
        }
        return false;
    }

    // 检查单字动物名（猫、狗、马、蛇等）
    function isSingleCharAnimal(label) {
        if (label.length !== 1) return false;
        return ANIMAL_SUFFIXES.has(label) || /^[猫狗马蛇兔鼠鸡鸭鹅猪牛羊]$/.test(label);
    }

    // 检查双字动物名（野狼、黑猫等）
    function isDoubleCharAnimal(label) {
        if (label.length !== 2) return false;
        const lastChar = label[1];
        return ANIMAL_SUFFIXES.has(lastChar) || /^[猫狗马蛇兔鼠鸡鸭鹅猪牛羊]$/.test(lastChar);
    }

    // ---------- 提取函数 ----------

    // 1. 系统面板格式 【名称：噬魂蚁】 置信度 1.0
    function extractSystemPanelDeclarations(text) {
        const results = [];
        const pattern = /【(?:名称|种族|形态|物种|类别|等阶)[：:]\s*([^】]+)】/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const label = match[1].trim();
            if (label.length >= 1 && label.length <= 15) {
                results.push({ label, confidence: 2.0, source: 'system_panel' }); // 2.0 权重，根据计划书会跳过去噪
            }
        }
        return results;
    }

    // 2. 种族/形态/等阶声明 置信度 1.0
    function extractIdentityDeclarations(text) {
        const results = [];
        const pattern = /(?:种族|形态|等阶|物种|类别)[：:]\s*(.{1,15})/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const label = match[1].trim();
            if (label.length >= 2 && !/[，。！？；]/.test(label)) {
                results.push({ label, confidence: 1.0, source: 'declaration' });
            }
        }
        return results;
    }

    // 3. 归属声明 “作为一只黑猫” 置信度 0.5
    function extractBelongingDeclarations(text) {
        const results = [];
        const pattern = /(?:作为|身为|是)(?:一[只把个条头匹])\s*(.{1,15})/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const label = match[1].trim();
            if (label.length >= 2) {
                results.push({ label, confidence: 0.5, source: 'belonging' });
            }
        }
        return results;
    }

    // 4. 命名行为 “他叫它小黑”、 “这把剑被称为噬魂” 置信度 0.6
    function extractNamingActs(text) {
        const results = [];
        // 匹配：叫/称/唤/命名/起名 + (它/其/他/她)? + (为/做/作)? + 名称
        const pattern = /(?:叫|称|唤|命名|起名)(?:它|其|他|她)?(?:为|做|作)?\s*(.{1,10})/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const label = match[1].trim();
            if (label.length >= 2 && !/[，。！？；：\s]/.test(label)) {
                results.push({ label, confidence: 0.6, source: 'naming' });
            }
        }
        return results;
    }

    // 5. 进化/蜕变目标 置信度 0.5
    function detectEvolutionTargets(text) {
        const results = [];
        // 进化/蜕变/晋升/突破/觉醒 + (为/成/至/到了) + 目标形态
        const pattern = /(?:进化|蜕变|晋升|突破|觉醒)(?:为|成|至|到了)\s*(.{1,15})/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const label = match[1].trim();
            if (label.length >= 2 && !/[，。！？；]/.test(label)) {
                results.push({ label, confidence: 0.5, source: 'evolution_target' });
            }
        }
        return results;
    }

    // 6. 格式特征兜底（直接匹配词典词条，避免「.+X」把整句吞入标签） 置信度 0.7
    function extractByPatterns(text) {
        const results = [];
        const speciesDict = new Set(dict.speciesDictionary);
        const matched = [];
        for (const term of speciesDict) {
            if (term.length >= 2 && text.indexOf(term) !== -1) {
                matched.push(term);
            }
        }
        for (const term of dedupeSubstringTerms(matched, text)) {
            results.push({ label: term, confidence: 0.7, source: 'pattern_feature' });
        }
        return results;
    }

    // 去除「被更长词条完整包含」的短词条（如「兽人族」存在时，仅作为子串出现的「人族」应剔除；
    // 但若「人族」另有独立出现，则保留）。仅当短词条的所有出现都落在更长词条出现范围内才剔除。
    function dedupeSubstringTerms(terms, text) {
        const sorted = terms.slice().sort(function (a, b) { return b.length - a.length; });
        const kept = [];
        for (const term of sorted) {
            const occ = [];
            let p = text.indexOf(term);
            while (p !== -1) { occ.push(p); p = text.indexOf(term, p + term.length); }
            if (occ.length === 0) continue;
            const allInside = occ.every(function (start) {
                return kept.some(function (k) {
                    return k.occ.some(function (ks) {
                        return start >= ks && start + term.length <= ks + k.term.length;
                    });
                });
            });
            if (!allInside) kept.push({ term: term, occ: occ });
        }
        return kept.map(function (k) { return k.term; });
    }

    // 提取进化链（独立方法）
    function detectEvolutionChain(text) {
        const targets = detectEvolutionTargets(text).map(t => t.label);
        if (targets.length === 0) return [];

        // 按在文本中的位置排序（基于 indexOf，但不求绝对，用位置数组）
        const positions = [];
        for (const target of targets) {
            let pos = text.indexOf(target);
            while (pos !== -1) {
                positions.push({ label: target, pos });
                pos = text.indexOf(target, pos + 1);
            }
        }
        positions.sort((a, b) => a.pos - b.pos);

        // 去重相邻相同标签
        const uniqueTargets = [];
        for (const p of positions) {
            if (uniqueTargets.length === 0 || uniqueTargets[uniqueTargets.length - 1].label !== p.label) {
                uniqueTargets.push(p);
            }
        }

        // 链式合并：相邻形态前缀/后缀重叠度 > 0.5 则合并
        const chains = [];
        let currentChain = [];
        for (let i = 0; i < uniqueTargets.length; i++) {
            if (currentChain.length === 0) {
                currentChain.push(uniqueTargets[i]);
            } else {
                const prev = currentChain[currentChain.length - 1].label;
                const curr = uniqueTargets[i].label;
                const overlap = calculateOverlap(prev, curr);
                if (overlap > 0.5) {
                    currentChain.push(uniqueTargets[i]);
                } else {
                    if (currentChain.length > 1) {
                        chains.push([...currentChain]);
                    }
                    currentChain = [uniqueTargets[i]];
                }
            }
        }
        if (currentChain.length > 1) chains.push([...currentChain]);

        // 转换输出格式
        return chains.map(chain => ({
            labels: chain.map(c => c.label),
            startPosition: chain[0].pos,
            length: chain.length
        }));
    }

    // 计算两个字符串的前缀/后缀重叠度 (Jaccard-like for morph overlap)
    function calculateOverlap(a, b) {
        if (a === b) return 1;
        // 检查 a 是 b 的前缀 或 b 是 a 的前缀
        if (a.startsWith(b) || b.startsWith(a)) return 0.75;
        // 检查共同前缀长度
        const minLen = Math.min(a.length, b.length);
        let commonPrefix = 0;
        for (let i = 0; i < minLen; i++) {
            if (a[i] === b[i]) commonPrefix++;
            else break;
        }
        const prefixRatio = commonPrefix / minLen;
        // 检查共同后缀
        let commonSuffix = 0;
        for (let i = 1; i <= minLen; i++) {
            if (a[a.length - i] === b[b.length - i]) commonSuffix++;
            else break;
        }
        const suffixRatio = commonSuffix / minLen;
        return Math.max(prefixRatio, suffixRatio);
    }

    // ---------- 去噪加权 ----------
    function adjustConfidence(candidate, text) {
        const label = candidate.label;

        // 系统面板提取的直接给满，不降权
        if (candidate.source === 'system_panel') return candidate.confidence;

        // 复合词保护：带前缀的动物名，视为整体种族
        if (isCompoundSpecies(label)) {
            return candidate.confidence * 1.0; // 保持原有权重
        }

        // 单字动物名降低
        if (isSingleCharAnimal(label)) {
            // 检查是否有进化关联或命名行为
            const hasEvolution = EVOLUTION_VERBS.size > 0 && new RegExp(Array.from(EVOLUTION_VERBS).join('|')).test(text);
            const hasNaming = /(?:叫|称|唤|命名|起名).{0,5}${label}/.test(text);
            const isSystem = /【名称[：:]\s*${label}】/.test(text);
            if (!hasEvolution && !hasNaming && !isSystem) {
                return candidate.confidence * 0.2;
            }
        }

        // 双字动物名降低（除非有进化/种族声明）
        if (isDoubleCharAnimal(label)) {
            const hasEvolutionOrDeclaration = /进化|蜕变|种族|形态|等阶/.test(text);
            if (!hasEvolutionOrDeclaration) {
                return candidate.confidence * 0.5;
            }
        }

        return candidate.confidence;
    }

    // ---------- 主逻辑 ----------
    function scan(text) {
        if (!enabled || !text) return [];

        const purified = purifyText(text);

        // 收集所有候选
        const rawCandidates = [
            ...extractSystemPanelDeclarations(purified),
            ...extractIdentityDeclarations(purified),
            ...extractBelongingDeclarations(purified),
            ...extractNamingActs(purified),
            ...detectEvolutionTargets(purified),
            ...extractByPatterns(purified)
        ];

        // 去重：按 label 合并，取最高置信度，并记录多个来源
        const mergedMap = new Map();
        for (const c of rawCandidates) {
            const existing = mergedMap.get(c.label);
            if (!existing || c.confidence > existing.confidence) {
                mergedMap.set(c.label, { ...c });
            } else if (c.confidence === existing.confidence) {
                // 合并不同来源
                if (!existing.sources) existing.sources = [existing.source];
                existing.sources.push(c.source);
            }
        }

        // 应用去噪权重
        const finalCandidates = [];
        for (const [label, cand] of mergedMap.entries()) {
            if (label.length < 1 || label.length > 15) continue;
            let finalConf = adjustConfidence(cand, text);
            finalCandidates.push({
                label,
                confidence: finalConf,
                source: cand.source,
                allSources: cand.sources || [cand.source],
                position: text.indexOf(label)
            });
        }

        // 按置信度降序
        finalCandidates.sort((a, b) => b.confidence - a.confidence);

        // 附加进化链信息（如果该候选出现在进化链中）
        const chains = detectEvolutionChain(text);
        for (const cand of finalCandidates) {
            for (const chain of chains) {
                if (chain.labels.includes(cand.label)) {
                    cand.evolutionChain = chain.labels;
                    cand.chainLength = chain.length;
                    // 进化链首位可能获得额外权重，但这里只做标记，不做分数修改（由 merger 处理）
                    break;
                }
            }
        }

        return finalCandidates;
    }

    function reset() {
        evolutionChainCache = [];
        lastScannedText = '';
    }

    function setEnabled(flag) {
        enabled = flag;
    }

    // 公开接口
    window.__ForeshadowSpeciesDetector = {
        scan,
        detectIdentityDeclarations: extractIdentityDeclarations,
        detectEvolutionTargets,
        reset,
        setEnabled
    };

})();