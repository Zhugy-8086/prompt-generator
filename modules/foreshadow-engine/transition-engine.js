// modules/foreshadow-engine/transition-engine.js
// 过渡引擎 —— 屏蔽词反向回收，填充输出结构空缺
// 挂载到 window.__ForeshadowTransitionEngine
// 计划书第十章

(function() {

    let enabled = true;

    // ---------- 收集两个引擎的屏蔽词 ----------
    function collectFilteredWords(foreshadowFiltered, elizaFiltered) {
        var all = [];

        // 伏笔引擎屏蔽词
        if (foreshadowFiltered && foreshadowFiltered.length) {
            for (var i = 0; i < foreshadowFiltered.length; i++) {
                var f = foreshadowFiltered[i];
                if (f && f.word) {
                    all.push({
                        text: f.word,
                        position: f.position || 0,
                        reason: f.reason || '伏笔过滤',
                        source: 'foreshadow'
                    });
                }
            }
        }

        // 反射引擎屏蔽词
        if (elizaFiltered && elizaFiltered.length) {
            for (var j = 0; j < elizaFiltered.length; j++) {
                var e = elizaFiltered[j];
                if (e && e.text) {
                    all.push({
                        text: e.text,
                        position: e.position || 0,
                        reason: e.reason || '反射过滤',
                        source: 'eliza'
                    });
                }
            }
        }

        // 按位置排序
        all.sort(function(a, b) { return a.position - b.position; });

        return all;
    }

    // ---------- 定位核心短语之间的空缺区域 ----------
    function locateGaps(corePhrases, textLength) {
        if (!corePhrases || corePhrases.length < 1) return [];

        var gaps = [];

        // 假设 corePhrases 是按原文位置排序的
        var sorted = corePhrases.slice().sort(function(a, b) {
            return (a.position || 0) - (b.position || 0);
        });

        // 开头空缺（文本开头到第一个短语）
        if (sorted[0].position > 0) {
            gaps.push({
                start: 0,
                end: sorted[0].position,
                beforePhrase: null,
                afterPhrase: sorted[0].text || sorted[0]
            });
        }

        // 中间空缺
        for (var i = 0; i < sorted.length - 1; i++) {
            var currentEnd = (sorted[i].position || 0) + (sorted[i].text ? sorted[i].text.length : 4);
            var nextStart = sorted[i + 1].position || 0;
            if (nextStart > currentEnd + 5) { // 至少 5 字才算有效空缺
                gaps.push({
                    start: currentEnd,
                    end: nextStart,
                    beforePhrase: sorted[i].text || sorted[i],
                    afterPhrase: sorted[i + 1].text || sorted[i + 1]
                });
            }
        }

        // 结尾空缺
        var lastPhrase = sorted[sorted.length - 1];
        var lastEnd = (lastPhrase.position || 0) + (lastPhrase.text ? lastPhrase.text.length : 4);
        if (textLength && lastEnd < textLength) {
            gaps.push({
                start: lastEnd,
                end: textLength,
                beforePhrase: lastPhrase.text || lastPhrase,
                afterPhrase: null
            });
        }

        return gaps;
    }

    // ---------- 从原文本中提取空缺区域的过渡性内容 ----------
    function extractTransitionText(originalText, gapRegions, filteredWords) {
        if (!originalText || !gapRegions || gapRegions.length === 0) return [];

        var transitionPhrases = [];

        for (var g = 0; g < gapRegions.length; g++) {
            var gap = gapRegions[g];
            var gapText = originalText.substring(gap.start, Math.min(gap.end, originalText.length));

            // 按句末标点拆分为短句
            var segments = gapText.split(/[。！？\n]+/);

            for (var s = 0; s < segments.length; s++) {
                var seg = segments[s].trim();
                if (seg.length < 3 || seg.length > 80) continue;

                // 检查是否在屏蔽词列表中
                var isFiltered = false;
                if (filteredWords) {
                    for (var f = 0; f < filteredWords.length; f++) {
                        if (seg.indexOf(filteredWords[f].text) !== -1) {
                            isFiltered = true;
                            break;
                        }
                    }
                }

                // 只保留有画面暗示的过渡句
                if (isFiltered && !hasVisualHint(seg)) {
                    continue; // 纯功能性过渡，丢弃
                }

                if (hasVisualHint(seg)) {
                    transitionPhrases.push({
                        text: seg,
                        position: gap.start + gapText.indexOf(seg),
                        source: 'transition'
                    });
                }
            }
        }

        return transitionPhrases;
    }

    // ---------- 画面暗示过滤（计划书 10.4） ----------
    function hasVisualHint(text) {
        if (!text || text.length < 2) return false;

        // 纯功能性过渡的直接丢弃
        var pureTransition = /^(?:站起身来|走了过去|与此同时|过了片刻|紧接着|他心里觉得有些奇怪|他推开椅子|天色渐渐暗了|他站了起来|过了片刻|过了|等了)/;
        if (pureTransition.test(text)) return false;

        // 检查是否包含具象名词（身体部位、自然物、物品）
        var concreteNouns = /手|眼|瞳|眉|唇|发|肩|背|胸|腰|腿|脚|指|拳|掌|臂|颈|额|颊|泪|血|汗|风|雨|雪|雾|光|影|火|水|石|木|金|铁|剑|刀|枪|箭|弓|盾|门|窗|桌|椅|灯|烛|书|纸|笔|墨|茶|酒|花|草|树|叶|云|星|月|日|天|地|山|河|海|路|桥|城|墙|屋|殿|楼|阁|庭|院/;
        if (!concreteNouns.test(text)) return false;

        // 检查是否包含动作动词
        var actionVerbs = /握|抓|按|推|拉|扯|撕|折|挥|舞|甩|扔|抛|接|托|举|抬|低|转|侧|回|望|看|盯|瞪|闭|睁|眨|流|滴|落|飘|飞|走|跑|跳|跃|冲|撞|退|进|出|入|上|下|起|坐|站|跪|躺|倒|翻|滚|爬|缩|伸|展|颤|抖|震|动|摇|晃|摆|停|顿|凝|滞/;
        if (!actionVerbs.test(text)) return false;

        return true;
    }

    // ---------- 按画面暗示过滤（对外接口） ----------
    function filterByVisualHint(phrases) {
        if (!phrases || !phrases.length) return [];
        return phrases.filter(function(p) {
            var txt = typeof p === 'string' ? p : (p.text || '');
            return hasVisualHint(txt);
        });
    }

    // ---------- 插入输出结构（计划书 10.3 步骤5） ----------
    function insertIntoOutput(corePhrases, transitionPhrases) {
        if (!corePhrases || corePhrases.length === 0) {
            return transitionPhrases.slice();
        }

        var output = [];
        var tIdx = 0;

        // 交替插入：核心 → 过渡 → 核心 → 过渡 ...
        for (var i = 0; i < corePhrases.length; i++) {
            output.push({
                text: typeof corePhrases[i] === 'string' ? corePhrases[i] : (corePhrases[i].text || ''),
                type: 'core',
                position: typeof corePhrases[i] === 'object' ? corePhrases[i].position : undefined
            });

            // 在两个核心短语之间插入一个过渡短语（如果有）
            if (tIdx < transitionPhrases.length && i < corePhrases.length - 1) {
                output.push({
                    text: typeof transitionPhrases[tIdx] === 'string' ? transitionPhrases[tIdx] : (transitionPhrases[tIdx].text || ''),
                    type: 'transition',
                    position: typeof transitionPhrases[tIdx] === 'object' ? transitionPhrases[tIdx].position : undefined
                });
                tIdx++;
            }
        }

        // 剩余过渡短语追加到末尾
        while (tIdx < transitionPhrases.length) {
            output.push({
                text: typeof transitionPhrases[tIdx] === 'string' ? transitionPhrases[tIdx] : (transitionPhrases[tIdx].text || ''),
                type: 'transition',
                position: typeof transitionPhrases[tIdx] === 'object' ? transitionPhrases[tIdx].position : undefined
            });
            tIdx++;
        }

        return output;
    }

    function reset() { /* 无状态 */ }
    function setEnabled(flag) { enabled = flag; }

    // 公开接口
    window.__ForeshadowTransitionEngine = {
        collectFilteredWords: collectFilteredWords,
        locateGaps: locateGaps,
        extractTransitionText: extractTransitionText,
        filterByVisualHint: filterByVisualHint,
        insertIntoOutput: insertIntoOutput,
        reset: reset,
        setEnabled: setEnabled
    };

})();