// ==================== 伏笔引擎 - 词库管理器 (pool-manager.js) ====================
// 挂载到 window.__ForeshadowPoolManager
// v8.9-P6：兼容 HPDC8 anomalyScore（比较/淘汰/上限）

window.__ForeshadowPoolManager = (function() {

    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);
    const HPDC8 = HPDC_AVAILABLE ? window.HPDC.HPDC8 : null;

    var fsPool = [];
    var fsTotalCharsRead = 0;
    var fsLastScannedText = '';

    function setCharState(totalChars, lastText) {
        fsTotalCharsRead = totalChars;
        fsLastScannedText = lastText;
    }

    // 辅助：比较异常分（兼容 number 和 HPDC8）
    function anomalyLessThan(a, b) {
        if (HPDC_AVAILABLE && a instanceof HPDC8 && b instanceof HPDC8) {
            return HPDC8.compare(a, b) < 0;
        }
        return a < b;
    }

    // 辅助：取异常分最大值（兼容 number 和 HPDC8）
    function anomalyMax(a, b) {
        if (HPDC_AVAILABLE && a instanceof HPDC8 && b instanceof HPDC8) {
            return HPDC8.compare(a, b) >= 0 ? a : b;
        }
        return Math.max(a, b);
    }

    // 辅助：异常分加法（兼容 number 和 HPDC8）
    function anomalyAdd(a, delta) {
        if (HPDC_AVAILABLE && a instanceof HPDC8) {
            return HPDC8.addHCOnly(a, HPDC8.fromConfidence(delta));
        }
        return a + delta;
    }

    function addToPool(word, sentence, position, mood, quoted, anomalyScore, source, maxItems) {
        for (var i = 0; i < fsPool.length; i++) {
            if (fsPool[i].word === word) return false;
        }
        // 上限管理：池满时只接受严格优于当前最低分的条目，避免低分挤走高分类
        if (fsPool.length >= maxItems) {
            var minIdx = 0, minScore = fsPool[0].anomalyScore;
            for (var j = 1; j < fsPool.length; j++) {
                if (anomalyLessThan(fsPool[j].anomalyScore, minScore)) {
                    minScore = fsPool[j].anomalyScore; minIdx = j;
                }
            }
            if (!anomalyLessThan(minScore, anomalyScore)) return false;
            fsPool.splice(minIdx, 1);
        }
        var entry = {
            word: word, firstSentence: sentence, firstPosition: position,
            firstMood: mood, firstQuoted: quoted,
            occurrences: [ { pos: position, sentence: sentence } ],
            anomalyScore: anomalyScore, source: source || 'auto',
            status: 'active', lastSimilarity: null, createdAt: Date.now()
        };
        fsPool.push(entry);
        return true;
    }

    function addManual(word, sentence, maxItems) {
        if (!word || !sentence) return { success: false, reason: '词和句子不能为空' };
        var exists = false;
        for (var i = 0; i < fsPool.length; i++) {
            if (fsPool[i].word === word) {
                exists = true;
                fsPool[i].occurrences.push({
                    pos: fsTotalCharsRead, sentence: sentence, manual: true
                });
                fsPool[i].source = 'manual';
                // v8.9：兼容 HPDC8 的 max 操作
                var oneScore = HPDC_AVAILABLE ? HPDC8.fromConfidence(1.0) : 1.0;
                fsPool[i].anomalyScore = anomalyMax(fsPool[i].anomalyScore, oneScore);
                break;
            }
        }
        if (!exists) {
            var manualScore = HPDC_AVAILABLE ? HPDC8.fromConfidence(1.0) : 1.0;
            addToPool(word, sentence, fsTotalCharsRead, '未知', false, manualScore, 'manual', maxItems);
        }
        return { success: true };
    }

    function checkAndCompare(word, text, position, similarityHigh, similarityMid) {
        var tokenUtils = window.__ForeshadowTokenUtils;
        var results = [];
        var seen = {}; // 同场景去重：避免一个重复场景按词刷出多条相同告警
        for (var i = 0; i < fsPool.length; i++) {
            var entry = fsPool[i];
            if (entry.word === word && entry.status !== 'recycled') {
                var currentSentence = tokenUtils.extractSentence(text, word, position);
                var similarity = tokenUtils.jaccardSimilarity(entry.firstSentence, currentSentence);
                var distance = position - entry.firstPosition;
                // 防御：同一文本被再次 scan 而未重置池/计数时，会产生跨扫描偏移的「自身重复」误报。
                // 单次正向扫描内 distance 必 ≤ text.length，超出即重扫伪匹配，跳过。
                if (distance > text.length) continue;
                var currentMood = tokenUtils.extractMood(text);
                if (similarity >= similarityMid) {
                    entry.occurrences.push({ pos: position, sentence: currentSentence, similarity: similarity });
                    entry.lastSimilarity = similarity;
                    entry.lastPosition = position;
                }
                var result = {
                    word: word, type: 'foreshadow_signal',
                    originalSentence: entry.firstSentence, currentSentence: currentSentence,
                    similarity: similarity, distance: distance,
                    firstMood: entry.firstMood, currentMood: currentMood,
                    occurrences: entry.occurrences.length, source: entry.source
                };
                if (similarity >= similarityHigh) {
                    result.type = distance > 3000 ? 'foreshadow_long' : 'foreshadow_short';
                    var sameDegree = similarity >= 0.999 ? '完全相同' : '高度相似';
                    result.message = (distance > 3000 ? '【长期伏笔】' : '【短期伏笔】') +
                        '与第' + entry.firstPosition + '字处的描述' + sameDegree + '(' + Math.round(similarity * 100) + '%)——' +
                        (distance > 3000 ? '跨越' + distance + '字后' + sameDegree + '的场景再次出现' : '同一场景的强化铺垫');
                    var violentMoods = ['恐惧', '黑暗', '燃', '紧张'];
                    var calmMoods = ['平静', '温暖'];
                    if (calmMoods.indexOf(entry.firstMood) !== -1 && violentMoods.indexOf(currentMood) !== -1) {
                        result.moodShift = true;
                        result.message += '。氛围从"' + entry.firstMood + '"剧变为"' + currentMood + '"——戏剧张力升级';
                    }
                } else if (similarity >= similarityMid) {
                    result.type = 'foreshadow_suspected';
                    result.message = '【疑似伏笔】与第' + entry.firstPosition + '字处的描述相似度' + Math.round(similarity * 100) + '%——同一词出现在不同场景中';
                }
                if (result.type !== 'foreshadow_signal') {
                    var dedupeKey = entry.firstSentence + '|' + currentSentence;
                    if (!seen[dedupeKey]) {
                        seen[dedupeKey] = true;
                        results.push(result);
                    }
                }
            }
        }
        return results;
    }

    function getPool() {
        return JSON.parse(JSON.stringify(fsPool, function(k, v) {
            if (typeof v === 'bigint') return v.toString() + 'n';
            if (HPDC8 && v instanceof HPDC8) return v.toConfidence();
            return v;
        }));
    }
    function resetPool() { fsPool = []; fsTotalCharsRead = 0; fsLastScannedText = ''; }

    function setMaxItems(n) {
        while (fsPool.length > n) {
            var minIdx = 0, minScore = fsPool[0].anomalyScore;
            for (var j = 1; j < fsPool.length; j++) {
                if (anomalyLessThan(fsPool[j].anomalyScore, minScore)) {
                    minScore = fsPool[j].anomalyScore; minIdx = j;
                }
            }
            fsPool.splice(minIdx, 1);
        }
    }

    return {
        addToPool: addToPool,
        addManual: addManual,
        checkAndCompare: checkAndCompare,
        getPool: getPool,
        resetPool: resetPool,
        setMaxItems: setMaxItems,
        setCharState: setCharState
    };
})();
