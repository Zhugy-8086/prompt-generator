// modules/foreshadow-engine/power-level-detector.js
// 等级后缀字频检测器 —— 自动发现任何世界观的等级体系
// 挂载到 window.__ForeshadowPowerLevelDetector
// 依赖：identity-dictionary.js 的等级维度 + 净化规则

(function() {

    const dict = window.__ForeshadowIdentityDict;
    if (!dict) {
        window.__ForeshadowPowerLevelDetector = {
            scan: function() { return { mainLevels: [], subLevels: [], system: null }; },
            reset: function() {},
            setEnabled: function() {}
        };
        return;
    }

    // 已知后缀特征字（计划书 4.1）
    const SUFFIX_CHARS = new Set([
        '期','阶','级','层','重','星','段','品','流','劫','境','天'
    ]);

    // 子等级词（会被拆分的部分）
    const SUB_LEVEL_WORDS = new Set([
        '初期','中期','后期','巅峰','圆满','大成','小成','入门','精通','化境'
    ]);

    const purificationRules = dict.getPurificationRules();

    let enabled = true;

    // 净化
    function purify(text) {
        let out = text;
        for (const rule of purificationRules) {
            out = out.replace(rule, '');
        }
        return out;
    }

    // 步骤 1a：直接匹配已知等级词典词条（最可靠，避免前缀把整句吞入标签）
    function extractKnownLevels(text) {
        const known = new Set(dict.powerDictionary);
        const result = [];
        for (const term of known) {
            // 跳过单字后缀词条（期/阶/级…），它们过于宽泛，由后缀特征法另行发现
            if (term.length >= 2 && text.indexOf(term) !== -1) {
                result.push(term);
            }
        }
        return result;
    }

    // 步骤 1b：后缀特征自动发现（受限前缀：最多 2 个汉字 + 后缀字，总长 <=3，
    // 避免把动词前缀（是/到/至/成…）一并吞入等级词，如「是练气期」→ 仅匹配「练气期」）
    function extractSuffixCandidates(text) {
        const pattern = /[一-鿿]{1,2}[期阶级层重星段品流劫境天]/g;
        const out = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[0].length <= 3) out.push(match[0]);
        }
        return out;
    }

    // 步骤 2：后缀字频统计
    function getSuffixFrequency(candidates) {
        const freqMap = {};
        for (const word of candidates) {
            const suffix = word[word.length - 1];
            if (!SUFFIX_CHARS.has(suffix)) continue;
            if (!freqMap[suffix]) {
                freqMap[suffix] = { count: 0, prefixes: new Set() };
            }
            freqMap[suffix].count++;
            const prefix = word.slice(0, -1);
            if (prefix.length > 0) freqMap[suffix].prefixes.add(prefix);
        }
        // 过滤出现次数 < 3 的后缀
        const filtered = {};
        for (const key in freqMap) {
            if (freqMap[key].count >= 3) {
                filtered[key] = {
                    count: freqMap[key].count,
                    prefixes: Array.from(freqMap[key].prefixes)
                };
            }
        }
        return filtered;
    }

    // 步骤 3：前缀多样性验证（重复率 < 30% 确定为等级系统）
    function validateDiversity(prefixes) {
        if (prefixes.length < 3) return false;
        const unique = new Set(prefixes);
        return (unique.size / prefixes.length) > 0.7; // 计划书是重复率<30%，即多样性>70%
    }

    // 步骤 4：多位置感知 —— 检查开头字高频前缀（如 Lv）
    function detectLvPrefixes(text) {
        const lvPattern = /Lv\.?\s*\d+/gi;
        return text.match(lvPattern) || [];
    }

    // 子等级拆分
    function splitMainSubLevel(levelStr) {
        // 以最后一个后缀字为界，之前的是主等级，之后紧跟的是子等级
        const mainEnd = levelStr.search(/[期阶阶级层重星段品流劫境天](?!.*[期阶阶级层重星段品流劫境天])/);
        if (mainEnd === -1) return { main: levelStr, sub: '' };
        const main = levelStr.substring(0, mainEnd + 1);
        const rest = levelStr.substring(mainEnd + 1);
        // 检查 rest 是否属于子等级词
        if (SUB_LEVEL_WORDS.has(rest)) {
            return { main, sub: rest };
        }
        return { main: levelStr, sub: '' };
    }

    // 主扫描函数
    function scan(text) {
        if (!enabled || !text) return { mainLevels: [], subLevels: [], system: null };

        const purified = purify(text);
        const knownLevels = extractKnownLevels(purified);
        const suffixCands = extractSuffixCandidates(purified);

        // 后缀频统计（仅基于受限的后缀候选）
        const suffixFreq = getSuffixFrequency(suffixCands);

        // 确定等级体系
        let detectedSystem = null;
        const mainLevelMap = new Map();   // label -> { label, confidence }，按 label 去重保留最高置信度
        const subLevelSet = new Set();

        function addMain(label, confidence, sub) {
            const ex = mainLevelMap.get(label);
            if (!ex || confidence > ex.confidence) {
                mainLevelMap.set(label, { label: label, confidence: confidence });
            }
            if (sub) subLevelSet.add(sub);
        }

        // 内置词表交叉验证
        const builtInPower = new Set(dict.powerDictionary);

        // 已知等级词条：直接采信
        for (const word of knownLevels) {
            const { main, sub } = splitMainSubLevel(word);
            let confidence = 0.5;
            if (builtInPower.has(word) || builtInPower.has(main)) {
                confidence += 0.3;
            }
            addMain(main, confidence, sub);
        }

        // 后缀自动发现：仅当某后缀构成可靠的等级体系（前缀多样且出现 >=3 次）时才采信
        for (const suffixKey in suffixFreq) {
            const { prefixes } = suffixFreq[suffixKey];
            if (validateDiversity(prefixes)) {
                if (!detectedSystem) detectedSystem = suffixKey;
                for (const prefix of prefixes) {
                    const lvl = prefix + suffixKey;
                    const { main, sub } = splitMainSubLevel(lvl);
                    let confidence = 0.7;
                    if (builtInPower.has(lvl) || builtInPower.has(main)) confidence += 0.3;
                    addMain(main, confidence, sub);
                }
            }
        }

        // 附加 Lv 前缀
        const lvMatches = detectLvPrefixes(text);
        for (const lv of lvMatches) {
            addMain(lv, 0.6, '');
            if (!detectedSystem) detectedSystem = 'Lv';
        }

        const mainLevels = Array.from(mainLevelMap.values()).sort((a, b) => b.confidence - a.confidence);
        const subLevels = Array.from(subLevelSet);

        return {
            mainLevels,
            subLevels,
            system: detectedSystem
        };
    }

    function reset() { /* 无状态 */ }
    function setEnabled(flag) { enabled = flag; }

    window.__ForeshadowPowerLevelDetector = {
        scan,
        getSuffixFrequency: function(text) { return getSuffixFrequency(extractSuffixCandidates(purify(text))); },
        splitMainSubLevel,
        detectPowerSystem: function(text) { return scan(text).system; },
        reset,
        setEnabled
    };

})();