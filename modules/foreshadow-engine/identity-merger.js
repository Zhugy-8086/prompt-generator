// modules/foreshadow-engine/identity-merger.js
// 身份合并引擎 —— 整合各检测器输出，生成统一主角身份档案
// 挂载到 window.__ForeshadowIdentityMerger
// 依赖：protagonist-detector（人名）、species-detector（种族）、power-level-detector（等级）、acquisition-tracker（获取物）

(function() {

    // 依赖检测
    const hasSpecies = typeof window.__ForeshadowSpeciesDetector !== 'undefined';
    const hasPower = typeof window.__ForeshadowPowerLevelDetector !== 'undefined';
    const hasAcquisition = typeof window.__ForeshadowAcquisitionTracker !== 'undefined';
    const hasProtagonist = typeof window.__ForeshadowProtagonistDetector !== 'undefined';
    const dict = window.__ForeshadowIdentityDict;

    if (!dict) {
        window.__ForeshadowIdentityMerger = {
            merge: function() { return []; },
            reset: function() {},
            setEnabled: function() {}
        };
        return;
    }

    // 性别词典
    const genderDict = new Set(dict.genderDictionary);
    const genderPatterns = dict.genderPatterns || [];
    const evolutionKeywords = new Set(dict.getEvolutionKeywords());

    let enabled = true;

    // ---------- 性别检测辅助 ----------
    function detectGender(text) {
        // 先检查正则骨架
        for (const pat of genderPatterns) {
            const match = text.match(pat);
            if (match) {
                const val = match[1].trim();
                if (genderDict.has(val)) return val;
            }
        }
        // 再检查内置词典高频出现
        for (const gWord of genderDict) {
            if (text.includes(gWord)) return gWord;
        }
        return null;
    }

    // ---------- 位置接近度合并（计划书 6.2） ----------
    // 从句定位：返回位置所属句子/从句序号（。！？；切分），供属性归属做「同句」判定
    function clauseIndexOf(pos, text) {
        if (!text || pos == null || pos < 0) return -1;
        const segs = text.split(/([。！？；])/);
        let off = 0;
        for (let i = 0; i < segs.length; i += 2) {
            const seg = segs[i] + (segs[i + 1] || '');
            const s = off, e = off + seg.length;
            if (pos >= s && pos < e) return Math.floor(i / 2);
            off = e;
        }
        return -1;
    }

    function mergeCandidatesByProximity(candidates, threshold, text) {
        threshold = threshold || 200; // 默认 200 字内视为同一实体
        const merged = [];
        const used = new Set();

        // 从句归属：将位置映射到所属句子/从句（。！？；），用于「同句才合并跨类属性」
        function clauseOf(pos) {
            if (!text) return -1;
            const segs = text.split(/([。！？；])/);
            let off = 0;
            for (let i = 0; i < segs.length; i += 2) {
                const seg = segs[i] + (segs[i + 1] || '');
                const s = off, e = off + seg.length;
                if (pos >= s && pos < e) return Math.floor(i / 2);
                off = e;
            }
            return -1;
        }

        for (let i = 0; i < candidates.length; i++) {
            if (used.has(i)) continue;
            const group = [candidates[i]];
            used.add(i);
            const ci = clauseOf(candidates[i].position || 0);

            for (let j = i + 1; j < candidates.length; j++) {
                if (used.has(j)) continue;
                const cj = clauseOf(candidates[j].position || 0);
                const near = Math.abs((candidates[i].position || 0) - (candidates[j].position || 0)) <= threshold;

                if (ci >= 0 && ci === cj) {
                    // 同句：合并（但同类不同名不合并，避免两个不同人并掉）
                    const typeI = candidates[i].type, typeJ = candidates[j].type;
                    if (typeI && typeJ && typeI === typeJ) {
                        const labelI = candidates[i].name || candidates[i].label;
                        const labelJ = candidates[j].name || candidates[j].label;
                        if (labelI !== labelJ) continue;
                    }
                    group.push(candidates[j]); used.add(j); continue;
                }
                // 跨句：仅同类型且同名（指代同一实体，如名字复现）才合并；
                // 跨句的跨类（人与物种/等级）不合并，各自归属其所在句的人
                if (near && ci !== cj) {
                    const typeI = candidates[i].type, typeJ = candidates[j].type;
                    if (typeI && typeJ && typeI === typeJ) {
                        const labelI = candidates[i].name || candidates[i].label;
                        const labelJ = candidates[j].name || candidates[j].label;
                        if (labelI === labelJ) { group.push(candidates[j]); used.add(j); }
                    }
                }
            }

            merged.push(group);
        }

        return merged;
    }

    // 从一组候选中挑出最有代表性的身份标签（人名优先，避免物种/等级抢占 name）
    function pickBestLabel(group) {
        const systemPanel = group.filter(c => c.source === 'system_panel');
        if (systemPanel.length > 0) return systemPanel[0].label || systemPanel[0].name;

        const humans = group.filter(c => c.type === 'human');
        if (humans.length > 0) {
            humans.sort((a, b) => (b.confidence || b.score || 0) - (a.confidence || a.score || 0));
            return humans[0].name || humans[0].label;
        }
        group.sort((a, b) => (b.confidence || b.score || 0) - (a.confidence || a.score || 0));
        return group[0].label || group[0].name;
    }

    // ---------- 进化链附着（计划书 6.2） ----------
    function attachEvolutionChain(profile, evolutionChains) {
        if (!evolutionChains || evolutionChains.length === 0) return profile;

        // 检查身份标签是否出现在某条进化链中
        for (const chain of evolutionChains) {
            const labels = chain.labels || [];
            const profileLabels = profile.labels || [profile.name];
            for (const label of profileLabels) {
                if (labels.includes(label)) {
                    profile.evolutionChain = labels;
                    profile.chainLength = labels.length;
                    // 链长度加成
                    if (labels.length >= 3) {
                        profile.chainBonus = 30;
                    } else if (labels.length === 2) {
                        profile.chainBonus = 15;
                    } else {
                        profile.chainBonus = 0;
                    }
                    return profile;
                }
            }
        }

        profile.chainBonus = 0;
        return profile;
    }

    // ---------- 主合并函数（计划书 6.1） ----------
    function merge(humanCandidates, speciesCandidates, powerLevels, acquisitionStats, evolutionChains, text) {
        if (!enabled) return [];

        const allCandidates = [];

        // 1. 收集人名候选人（来自 protagonist-detector）
        if (humanCandidates && humanCandidates.length > 0) {
            for (const hc of humanCandidates) {
                allCandidates.push({
                    type: 'human',
                    name: hc.name,
                    score: hc.score,
                    freq: hc.freq,
                    position: hc.position || 0,
                    confidence: hc.score / 10 // 归一化
                });
            }
        }

        // 2. 收集物种身份标签（来自 species-detector）
        if (speciesCandidates && speciesCandidates.length > 0) {
            for (const sc of speciesCandidates) {
                allCandidates.push({
                    type: 'species',
                    label: sc.label,
                    confidence: sc.confidence,
                    source: sc.source,
                    evolutionChain: sc.evolutionChain,
                    chainLength: sc.chainLength,
                    position: sc.position || 0
                });
            }
        }

        if (allCandidates.length === 0) return [];

        // 3. 按位置接近度分组（从句感知：跨类属性仅在同句合并）
        const groups = mergeCandidatesByProximity(allCandidates, 200, text);

        // 4. 为每个组构建身份档案
        const profiles = [];

        for (let idx = 0; idx < groups.length; idx++) {
            const group = groups[idx];
            const profile = {
                entityId: 'entity_' + (idx + 1).toString().padStart(3, '0'),
                labels: [],
                name: '',
                species: null,
                gender: null,
                bodyType: null,
                powerLevel: null,
                powerSubLevel: null,
                acquisitions: [],
                acquisitionTotalWeight: 0,
                evolutionChain: [],
                chainLength: 0,
                chainBonus: 0,
                confidenceScore: 0,
                sources: []
            };

            // 收集所有标签
            const labelsSet = new Set();
            for (const cand of group) {
                const label = cand.name || cand.label;
                if (label) labelsSet.add(label);
                if (cand.source) profile.sources.push(cand.source);
            }
            profile.labels = Array.from(labelsSet);
            profile.name = pickBestLabel(group);

            // 5. 维度填充
            const _humanCand = group.find(c => c.type === 'human');
            const anchorPos = (_humanCand && typeof _humanCand.position === 'number') ? _humanCand.position : (group[0].position || 0);

            // 种族（物种身份标签）—— 从句/近邻归属：同句或极近（跨句代词指代）才归属，避免跨人错配
            const speciesCand = group.find(c => c.type === 'species');
            if (speciesCand) {
                const spPos = (typeof speciesCand.position === 'number' && speciesCand.position >= 0) ? speciesCand.position : (text ? text.indexOf(speciesCand.label) : -1);
                const sameClause = !text || clauseIndexOf(spPos, text) === clauseIndexOf(anchorPos, text) || Math.abs(spPos - anchorPos) <= 40;
                if (sameClause) {
                    profile.species = speciesCand.label;
                    if (speciesCand.evolutionChain) {
                        profile.evolutionChain = speciesCand.evolutionChain;
                        profile.chainLength = speciesCand.chainLength || 0;
                        profile.chainBonus = profile.chainLength >= 3 ? 30 : (profile.chainLength === 2 ? 15 : 0);
                    }
                }
            }

            // 等级 —— 同句/近邻归属（全局 mainLevels[0] 会错配到无关人物）
            if (powerLevels && powerLevels.mainLevels && powerLevels.mainLevels.length > 0) {
                const mainLevel = powerLevels.mainLevels[0];
                const plPos = text ? text.indexOf(mainLevel.label) : -1;
                const sameClause = !text || plPos < 0 || clauseIndexOf(plPos, text) === clauseIndexOf(anchorPos, text) || Math.abs(plPos - anchorPos) <= 40;
                if (sameClause) {
                    profile.powerLevel = mainLevel.label;
                    if (powerLevels.subLevels && powerLevels.subLevels.length > 0) {
                        profile.powerSubLevel = powerLevels.subLevels[0];
                    }
                }
            }

            // 获取物
            if (acquisitionStats && Object.keys(acquisitionStats).length > 0) {
                for (const actor in acquisitionStats) {
                    if (profile.labels.includes(actor) || profile.name === actor) {
                        profile.acquisitionTotalWeight = acquisitionStats[actor];
                        // 从 events 中找物品列表
                        if (window.__ForeshadowAcquisitionTracker) {
                            // 简化：直接记总权重
                        }
                    }
                }
            }

            // 计算该身份的局部文本窗口（避免全文档误判性别/体质）
            let windowText = '';
            if (text) {
                const positions = group.map(function(c) { return c.position || 0; });
                const minPos = Math.min.apply(null, positions);
                const maxPos = Math.max.apply(null, positions);
                windowText = text.substring(Math.max(0, minPos - 30), Math.min(text.length, maxPos + 30));
            }

            // 性别（局部窗口判定）
            if (windowText) {
                const gender = detectGender(windowText);
                if (gender) profile.gender = gender;
            }

            // 体质（从句归属域 + 就近评分域融合）：
            // 1) 优先在「实体所在的句子/从句」内匹配体质词（主体一致性，来自废弃词堆调研：
            //    体质 idiom 是高注意力结构锚点，且通常与其归属人物同句）；
            // 2) 同句无命中再退化为全局就近（兼容长段落/跨句描写）。
            if (text && dict.bodyDictionary) {
                const humanCand = group.find(c => c.type === 'human');
                const _positions = group.map(function (c) { return c.position || 0; });
                const entityPos = (humanCand && typeof humanCand.position === 'number') ? humanCand.position : Math.min.apply(null, _positions);
                const winStart = Math.max(0, Math.min.apply(null, _positions) - 30);

                function pickInScope(scopeText, scopeStart) {
                    const matched = [];
                    for (const term of dict.bodyDictionary) {
                        if (scopeText.indexOf(term) !== -1) matched.push(term);
                    }
                    const sorted = matched.slice().sort(function (a, b) { return b.length - a.length; });
                    const kept = [];
                    for (const term of sorted) {
                        const occ = [];
                        let p = scopeText.indexOf(term);
                        while (p !== -1) { occ.push(p); p = scopeText.indexOf(term, p + term.length); }
                        if (occ.length === 0) continue;
                        const allInside = occ.every(function (start) {
                            return kept.some(function (k) {
                                return k.occ.some(function (ks) {
                                    return start >= ks && start + term.length <= ks + k.term.length;
                                });
                            });
                        });
                        if (!allInside) {
                            let best = Infinity;
                            for (const o of occ) {
                                const d = Math.abs((scopeStart + o) - entityPos);
                                if (d < best) best = d;
                            }
                            kept.push({ term: term, occ: occ, dist: best });
                        }
                    }
                    if (kept.length > 0) {
                        kept.sort(function (a, b) { return a.dist - b.dist || b.term.length - a.term.length; });
                        return kept[0].term;
                    }
                    return null;
                }

                let chosen = null;
                // 1) 从句归属
                const segs = text.split(/([。！？；])/);
                let off = 0, clauseText = '', clauseStart = 0, foundClause = false;
                for (let i = 0; i < segs.length; i += 2) {
                    const seg = segs[i] + (segs[i + 1] || '');
                    const segStart = off;
                    if (entityPos >= segStart && entityPos < segStart + seg.length) { clauseText = seg; clauseStart = segStart; foundClause = true; break; }
                    off += seg.length;
                }
                if (foundClause) chosen = pickInScope(clauseText, clauseStart);
                // 2) 退化：±30 就近窗口
                if (!chosen) chosen = pickInScope(windowText, winStart);
                if (chosen) profile.bodyType = chosen;
            }

            // 6. 进化链附着（全局进化链）
            attachEvolutionChain(profile, evolutionChains);

            // 7. 综合置信度计算（计划书 7.2，简化版）
            let confScore = 0;
            // 人名得分
            const humanCand = group.find(c => c.type === 'human');
            if (humanCand) confScore += (humanCand.confidence || 0) * 2;
            // 物种得分
            if (speciesCand) confScore += speciesCand.confidence || 0;
            // 获取物加成
            confScore += profile.acquisitionTotalWeight * 0.1;
            // 进化链加成
            confScore += profile.chainBonus * 0.01;
            // 等级命中
            if (profile.powerLevel) confScore += 0.5;

            profile.confidenceScore = Math.min(confScore, 1.0);

            profiles.push(profile);
        }

        // 按置信度降序
        profiles.sort((a, b) => b.confidenceScore - a.confidenceScore);

        return profiles;
    }

    function reset() { /* 无状态 */ }
    function setEnabled(flag) { enabled = flag; }

    window.__ForeshadowIdentityMerger = {
        merge,
        mergeCandidatesByProximity,
        attachEvolutionChain,
        reset,
        setEnabled
    };

})();