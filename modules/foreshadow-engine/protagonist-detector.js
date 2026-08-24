// ==================== 伏笔引擎 - 主角检测器 (protagonist-detector.js) ====================
// 挂载到 window.__ForeshadowProtagonistDetector
// 基于出场、发言、内心描写等权重推定主角名
// v8.8：新增 detectIdentityProfiles() 方法，集成身份合并引擎

window.__ForeshadowProtagonistDetector = (function() {

    // ---------- 依赖引用 ----------
    function getSpeciesDetector() {
        return window.__ForeshadowSpeciesDetector || null;
    }
    function getPowerDetector() {
        return window.__ForeshadowPowerLevelDetector || null;
    }
    function getAcquisitionTracker() {
        return window.__ForeshadowAcquisitionTracker || null;
    }
    function getIdentityMerger() {
        return window.__ForeshadowIdentityMerger || null;
    }

    var SURNAME = /^(?:欧阳|司马|上官|东方|诸葛|令狐|皇甫|司徒|宇文|慕容|南宫|拓跋|完颜|独孤|公孙|澹台|钟离|轩辕|西门|长孙|北堂|万俟|闻人|夏侯|赫连|呼延|端木|东郭|公冶|公良|公子|太叔|闾丘|谷梁|梁丘|毌丘|母丘|羊舌|羊角|壶丘|左丘|龙丘|士孙|栗陆|英贤|王|姬|李|张|刘|陈|杨|赵|黄|周|吴|徐|孙|马|胡|朱|郭|何|罗|高|林|郑|梁|谢|宋|唐|许|邓|韩|冯|曹|彭|曾|肖|田|董|潘|袁|蔡|蒋|余|于|杜|叶|程|魏|苏|吕|丁|任|卢|姚|沈|钟|姜|崔|谭|廖|范|汪|陆|金|石|戴|贾|韦|夏|付|方|白|邹|孟|熊|秦|邱|江|尹|薛|闫|段|雷|侯|龙|史|陶|黎|贺|顾|毛|郝|龚|邵|万|钱|严|覃|武|戴|莫|孔|向|汤)/;
    // 仅含复姓的精确判定（用于「复姓第二字不当作新姓氏起点」的防护）
    var TWO_CHAR_SURNAME = /^(?:欧阳|司马|上官|东方|诸葛|令狐|皇甫|司徒|宇文|慕容|南宫|拓跋|完颜|独孤|公孙|澹台|钟离|轩辕|西门|长孙|北堂|万俟|闻人|夏侯|赫连|呼延|端木|东郭|公冶|公良|公子|太叔|闾丘|谷梁|梁丘|毌丘|母丘|羊舌|羊角|壶丘|左丘|龙丘|士孙|栗陆|英贤)/;
    var NOISE_SUFFIX = /(心想|暗道|思忖|心中|心下|暗暗|低声|轻声|叹道|自语|微微一笑|一笑|并肩而立|走了过来|走过来|看向他|望着他|转过身|道|说|问|喊|骂|心里)$/;
    var CONNECTOR = '和与其他对说道的把被给向从到了着过及并跟同走看听问道喊笑跑冲站坐拿握举抬回望拉推打杀战想吃喝觉思瞧';

    // 全局人名识别正则：姓氏（含复姓）+ 1~2 个汉字（名），可在句中任意位置匹配，
    // 避免「X是…」「X与Y…」等结构因整句被跳过或仅取句首而漏掉人名。
    var GIVEN_STOP = /[的是了一着过把被给向从到和与其他对并跟同走看听问道喊笑跑冲站坐拿握举抬回望拉推打杀战想吃喝觉思瞧奔扑瞧相而却就也也都又还很太更才再要会能可该应已且况虽但若如因让叫令使教替将用为在当向到同获得不成作为有以于等之及此那哪个个些中内前后上下里间旁侧左右全整各每任某本这0-9一二三四五六七八九十百千，。！？、；：""''（）…\s]/;
    var NAME_RE = new RegExp(SURNAME.source.replace(/^\^/, '') + '(?:[\\u4e00-\\u9fff]{1,2})', 'g');

    // 复合词条屏蔽域：将已知「体质/种族」复合词条在文本中等长覆盖为空格，
    // 使词条内部的姓氏（如「金刚不坏」之「金」、「龙族」之「龙」）不再被人名正则命中。
    // 这是「评分域融合」的第一域——预处理域；与尾随虚词域（GIVEN_STOP）融合消歧。
    var _compoundTermsCache = null;
    function getCompoundTerms() {
        if (_compoundTermsCache) return _compoundTermsCache;
        var dict = window.__ForeshadowIdentityDict;
        var terms = [];
        if (dict) {
            if (dict.bodyDictionary) dict.bodyDictionary.forEach(function (t) { if (t && t.length >= 2) terms.push(t); });
            if (dict.speciesDictionary) dict.speciesDictionary.forEach(function (t) { if (t && t.length >= 2) terms.push(t); });
        }
        // 长词优先替换，避免短词先替换破坏长词结构
        terms.sort(function (a, b) { return b.length - a.length; });
        _compoundTermsCache = terms;
        return terms;
    }
    function maskCompoundTerms(text, heap) {
        var terms = getCompoundTerms();
        if (!terms.length) return text;
        var out = text;
        for (var i = 0; i < terms.length; i++) {
            var t = terms[i];
            if (t.length < 2) continue;
            var re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            out = out.replace(re, function (match, offset) {
                if (heap) heap.push({ kind: 'compound_anchor', token: t, index: offset, role: 'body_or_species', source: 'mask_domain' });
                return new Array(t.length + 1).join(' ');
            });
        }
        return out;
    }

    // 前置类别词域：若人名候选紧邻其前的「类别词」（神器/宝物/法宝…）命中，
    // 则该候选更可能是该类别下的「物/名号」而非人物，予以排除（多信号融合的上下文域）。
    var CATEGORY_WORDS = ['神器', '宝物', '武器', '法宝', '灵器', '法器', '圣物', '宝剑', '神剑',
        '神兵', '名剑', '重宝', '异宝', '仙器', '魔器', '鬼器', '妖器', '古宝', '战兵', '灵宝',
        '道器', '神物', '奇物', '秘宝', '后天灵宝', '先天灵宝', '太古神兵', '上古神兵'];
    function precededByCategory(text, idx) {
        for (var i = 0; i < CATEGORY_WORDS.length; i++) {
            var w = CATEGORY_WORDS[i];
            if (idx >= w.length && text.substr(idx - w.length, w.length) === w) return true;
        }
        return false;
    }

    // 姓氏前缀判定（兼容复姓）：候选首 1~2 字构成姓氏即可
    function isSurnamePrefix(s) {
        if (s.length >= 2 && SURNAME.test(s.substr(0, 2))) return true;
        return SURNAME.test(s.substr(0, 1));
    }

    // 贪心多取防护：名字末字与紧邻其后的字相同（如 李四默←默默、王平平←平平）则回退末字；
    // 回退后仅剩姓氏（无名字）或命中明确动词/术语碰撞（如 张望）则丢弃。
    function isHanzi(ch) { return ch && ch.length === 1 && /[一-鿿]/.test(ch); }
    var NAME_DENY = /^(?:张望|张罗|陈说|王道|李代|王法)$/;
    function trimOverGrab(name, text, start, heap) {
        var w = name;
        while (w.length > 1) {
            var nxt = text.charAt(start + w.length);
            if (isHanzi(nxt) && nxt === w.charAt(w.length - 1)) {
                if (heap) heap.push({ kind: 'rejected_name', token: name, trimmedTo: w.slice(0, -1), index: start, reason: 'reduplication_overlap', source: 'overgrab_domain' });
                w = w.slice(0, -1);
                continue;
            }
            break;
        }
        if (w.length < 2) { if (heap) heap.push({ kind: 'rejected_name', token: name, index: start, reason: 'over_grab_surname_only', source: 'overgrab_domain' }); return null; }
        if (NAME_DENY.test(w)) { if (heap) heap.push({ kind: 'rejected_name', token: w, index: start, reason: 'verb_collision', source: 'overgrab_domain' }); return null; }
        return w;
    }

    // ---------- 信息模块：单字词典 → 子串拼接枚举 → 评分 → 线剪枝 ----------
    // 作为更通用的名字发现机制，复用共享拒绝域（noiseFilter / 废弃词堆 / 前置类别词 / GIVEN_STOP），
    // 候选汇入统一的 wordFreq 池，由下游共享打分（引用/内心/代词等）计算最终分。
    function generateNameCandidates(text, scanText, heap) {
        var noiseFilter = window.__ForeshadowNoiseFilter;
        if (!scanText) return [];
        var cands = {}; // 最终名 -> {freq, pos:[]}
        for (var i = 0; i < scanText.length; i++) {
            for (var L = 2; L <= 3; L++) {
                var s = scanText.substr(i, L);
                if (!/^[一-鿿]+$/.test(s)) continue;
                // 复姓第二字不当作新姓氏起点（避免 司马→马青衫 之类碎片）
                if (i > 0 && TWO_CHAR_SURNAME.test(scanText.substr(i - 1, 2))) continue;
                if (!isSurnamePrefix(s)) continue;
                if (precededByCategory(text, i)) {
                    if (heap) heap.push({ kind: 'object_anchor', token: s, index: i, reason: 'preceded_by_category', source: 'category_domain' });
                    continue;
                }
                if (noiseFilter && typeof noiseFilter.isNoiseWord === 'function' && noiseFilter.isNoiseWord(s)) {
                    if (heap) heap.push({ kind: 'rejected_name', token: s, index: i, reason: 'noise_word', source: 'noise_domain' });
                    continue;
                }
                var w = s;
                while (w.length > 2 && GIVEN_STOP.test(w.charAt(w.length - 1))) {
                    if (heap) heap.push({ kind: 'rejected_name', token: s, trimmedTo: w.slice(0, -1), index: i, reason: 'trailing_function_word', source: 'given_stop_domain' });
                    w = w.slice(0, -1);
                }
                if (w.length < 2) continue;
                if (!SURNAME.test(w)) continue;
                if (noiseFilter && typeof noiseFilter.isNoiseWord === 'function' && noiseFilter.isNoiseWord(w)) continue;
                var og = trimOverGrab(w, text, i, heap);
                if (!og) continue;
                w = og;
                var e = cands[w] || { freq: 0, pos: [] };
                e.freq++; e.pos.push(i); cands[w] = e;
            }
        }
        // 前缀消歧：若短候选是长候选的前缀且共享起点位置，则丢弃短候选（避免 林惊 ⊂ 林惊羽 之类碎片）
        var names = Object.keys(cands);
        for (var a = 0; a < names.length; a++) {
            for (var b = 0; b < names.length; b++) {
                if (a === b) continue;
                var na = names[a], nb = names[b];
                if (nb.indexOf(na) === 0 && nb.length > na.length) {
                    var shared = cands[na].pos.some(function (pp) { return cands[nb].pos.indexOf(pp) >= 0; });
                    if (shared) { cands[na] = null; break; }
                }
            }
        }
        for (var dk in cands) { if (cands[dk] === null) delete cands[dk]; }
        var cue = /[道说问喊与是的是了着]/;
        var scored = [];
        for (var name in cands) {
            var e2 = cands[name];
            var cueBonus = 0;
            for (var p = 0; p < e2.pos.length; p++) {
                var nch = text.charAt(e2.pos[p] + name.length);
                if (cue.test(nch)) cueBonus++;
            }
            var surnameStart = 2;
            var lenBonus = name.length === 2 ? 1 : (name.length === 3 ? 1.5 : 0);
            var score = e2.freq * 1 + surnameStart + cueBonus + lenBonus;
            var LINE = 2.5;
            if (e2.freq >= 1 && score >= LINE) {
                scored.push({ name: name, score: score, freq: e2.freq, position: e2.pos[0] });
            }
        }
        return scored;
    }

    // ---------- 原有：人名检测（保持不变） ----------
    function detectInternal(text) {
        if (!text) return { candidates: [] };
        var tokenUtils = window.__ForeshadowTokenUtils;
        var noiseFilter = window.__ForeshadowNoiseFilter;
        if (!tokenUtils || !noiseFilter) return { candidates: [] };

        var wordFreq = {};
        var firstPos = {};
        var heap = [];
        var scanText = maskCompoundTerms(text, heap);
        NAME_RE.lastIndex = 0;
        var m;
        while ((m = NAME_RE.exec(scanText)) !== null) {
            var w = m[0];
            if (m.index > 0 && precededByCategory(text, m.index)) {
                heap.push({ kind: 'object_anchor', token: w, index: m.index, reason: 'preceded_by_category', source: 'category_domain' });
                continue;
            }
            if (w.length > 4) {
                var _third = w.charAt(2);
                w = (CONNECTOR.indexOf(_third) >= 0) ? w.slice(0, 2) : w.slice(0, 3);
            }
            var _stripped = w.replace(NOISE_SUFFIX, '');
            if (_stripped.length >= 2) w = _stripped;
            while (w.length > 2 && GIVEN_STOP.test(w.charAt(w.length - 1))) {
                heap.push({ kind: 'rejected_name', token: m[0], trimmedTo: w, index: m.index, reason: 'trailing_function_word', source: 'given_stop_domain' });
                w = w.slice(0, -1);
            }
            if (w.length > 4) { heap.push({ kind: 'rejected_name', token: m[0], index: m.index, reason: 'too_long', source: 'length_domain' }); continue; }
            if (!SURNAME.test(w)) { heap.push({ kind: 'rejected_name', token: w, index: m.index, reason: 'not_surname', source: 'surname_domain' }); continue; }
            var og = trimOverGrab(w, text, m.index, heap);
            if (!og) continue;
            w = og;
            if (!firstPos[w]) firstPos[w] = m.index;
            wordFreq[w] = (wordFreq[w] || 0) + 1;
        }

        // 信息模块：生成式候选发现（单字拼接枚举 + 评分线剪枝），并入统一词频池
        var genCands = generateNameCandidates(text, scanText, heap);
        for (var gi = 0; gi < genCands.length; gi++) {
            var gc = genCands[gi];
            if (!wordFreq[gc.name]) {
                wordFreq[gc.name] = gc.freq;
                firstPos[gc.name] = gc.position;
            }
        }

        var candidates = [];
        for (var name in wordFreq) {
            var score = 0;
            score += wordFreq[name] * 1;

            var safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var quotePattern = new RegExp('[""\']\\s*[^""\']*?' + safeName + '[^""\']*?[""\']', 'g');
            var quoteMatches = text.match(quotePattern);
            score += (quoteMatches ? quoteMatches.length : 0) * 2;

            var innerPattern = new RegExp(safeName + '.{0,15}(?:心想|暗道|思忖|心中|心下|暗暗)', 'g');
            var innerMatches = text.match(innerPattern);
            score += (innerMatches ? innerMatches.length : 0) * 3;

            var pronounPattern = new RegExp(safeName + '(?:道|说|问|喊|骂|心里)', 'g');
            var pronounMatches = text.match(pronounPattern);
            score += (pronounMatches ? pronounMatches.length : 0) * 2;

            // 记录首次出现位置
            var pos = (firstPos[name] != null) ? firstPos[name] : text.indexOf(name);
            candidates.push({ name: name, score: score, freq: wordFreq[name], position: pos });
        }

        // 合并后前缀消歧：短候选是长候选前缀且同起点 → 丢弃短候选
        // （覆盖 NAME_RE 与生成器跨源情况，如 司马青⊂司马青衫；也处理 林惊⊂林惊羽 等）
        var merged2 = [];
        for (var ci = 0; ci < candidates.length; ci++) {
            var ca = candidates[ci];
            var subsumed = false;
            for (var cj = 0; cj < candidates.length; cj++) {
                if (ci === cj) continue;
                var cb = candidates[cj];
                if (cb.name.indexOf(ca.name) === 0 && cb.name.length > ca.name.length && ca.position === cb.position) {
                    subsumed = true;
                    break;
                }
            }
            if (!subsumed) merged2.push(ca);
        }
        candidates = merged2;

        candidates.sort(function(a, b) { return b.score - a.score; });

        return { candidates: candidates, heap: heap };
    }

    // ---------- 原有：detect（单个人名） ----------
    function detect(text) {
        var result = detectInternal(text);
        return result.candidates.length > 0 && result.candidates[0].score > 3 ? result.candidates[0].name : null;
    }

    // ---------- 原有：detectAll（前5候选人） ----------
    function detectAll(text) {
        var result = detectInternal(text);
        return result.candidates.slice(0, 5).map(function(c) {
            return { name: c.name, score: c.score, freq: c.freq, position: c.position };
        });
    }

    // ---------- ★ V8.8 新增：输出完整身份档案 ----------
    function detectIdentityProfiles(text) {
        if (!text) return [];

        // 1. 人名检测
        var humanCandidates = detectAll(text);

        // 2. 物种身份检测
        var speciesCandidates = [];
        var speciesDetector = getSpeciesDetector();
        if (speciesDetector) {
            try {
                speciesCandidates = speciesDetector.scan(text) || [];
            } catch(e) {
                console.warn('[ProtagonistDetector] 物种检测异常:', e.message);
            }
        }

        // 3. 等级检测
        var powerLevels = null;
        var powerDetector = getPowerDetector();
        if (powerDetector) {
            try {
                powerLevels = powerDetector.scan(text);
            } catch(e) {
                console.warn('[ProtagonistDetector] 等级检测异常:', e.message);
            }
        }

        // 4. 获取物统计
        var acquisitionStats = null;
        var acquisitionTracker = getAcquisitionTracker();
        if (acquisitionTracker) {
            try {
                // scan 需要候选人池做归属推断，用人名和物种合并
                var allCandidates = humanCandidates.concat(
                    speciesCandidates.map(function(sc) { return { name: sc.label, score: sc.confidence * 10, freq: 1 }; })
                );
                acquisitionTracker.scan(text, allCandidates);
                acquisitionStats = acquisitionTracker.getStatsByActor();
            } catch(e) {
                console.warn('[ProtagonistDetector] 获取物追踪异常:', e.message);
            }
        }

        // 5. 进化链
        var evolutionChains = [];
        if (speciesDetector) {
            try {
                // 使用 detectEvolutionChain 获取真正的链式结构
                evolutionChains = speciesDetector.detectEvolutionChain
                    ? speciesDetector.detectEvolutionChain(text) || []
                    : [];
            } catch(e) {
                console.warn('[ProtagonistDetector] 进化链提取异常:', e.message);
            }
        }

        // 6. 调用身份合并引擎
        var merger = getIdentityMerger();
        if (merger) {
            try {
                var profiles = merger.merge(humanCandidates, speciesCandidates, powerLevels, acquisitionStats, evolutionChains, text);
                return profiles || [];
            } catch(e) {
                console.error('[ProtagonistDetector] 身份合并异常:', e.message);
            }
        }

        // 降级：没有人名和物种时返回空
        if (humanCandidates.length === 0 && speciesCandidates.length === 0) return [];

        // 降级：手动构建简易档案
        var fallbackProfile = {
            entityId: 'entity_fallback',
            labels: [],
            name: humanCandidates.length > 0 ? humanCandidates[0].name : (speciesCandidates.length > 0 ? speciesCandidates[0].label : ''),
            species: speciesCandidates.length > 0 ? speciesCandidates[0].label : null,
            gender: null,
            bodyType: null,
            powerLevel: powerLevels && powerLevels.mainLevels && powerLevels.mainLevels.length > 0 ? powerLevels.mainLevels[0].label : null,
            powerSubLevel: powerLevels && powerLevels.subLevels && powerLevels.subLevels.length > 0 ? powerLevels.subLevels[0] : null,
            acquisitions: [],
            acquisitionTotalWeight: 0,
            evolutionChain: evolutionChains.length > 0 ? evolutionChains[0].labels : [],
            chainLength: evolutionChains.length > 0 ? evolutionChains[0].length : 0,
            chainBonus: 0,
            confidenceScore: humanCandidates.length > 0 ? Math.min(humanCandidates[0].score / 10, 0.9) : 0.3,
            sources: ['fallback']
        };

        return [fallbackProfile];
    }

    // 公开接口（V8.8 新增 detectIdentityProfiles）
    return {
        detect: detect,
        detectAll: detectAll,
        detectInternal: detectInternal,
        detectIdentityProfiles: detectIdentityProfiles
    };

})();
