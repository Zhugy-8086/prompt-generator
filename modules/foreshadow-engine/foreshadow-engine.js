// ==================== 伏笔识别引擎 (foreshadow-engine.js) ====================
// 挂载到 window.ForeshadowEngine
// v8.9-P6：兼容 HPDC8 anomalyScore 加法

window.ForeshadowEngine = (function() {

    if (!window.__ForeshadowTokenUtils || !window.__ForeshadowAnomalyScorer || 
        !window.__ForeshadowNoiseFilter || !window.__ForeshadowPoolManager ||
        !window.__ForeshadowProtagonistDetector || !window.__ForeshadowProtagonistTracker) {
        console.error('[ForeshadowEngine] 依赖缺失，降级为空引擎');
        window.ForeshadowEngine = {
            scan: function() { return []; },
            getPool: function() { return []; },
            addManual: function() { return { success: false, reason: '引擎未就绪' }; },
            getProtagonistName: function() { return null; },
            resetPool: function() {},
            setMaxItems: function() {},
            setEnabled: function() {},
            getConfig: function() { return { maxItems: 50, enabled: false, poolSize: 0, totalCharsRead: 0, protagonistName: null, isAvailable: false }; },
            getTotalChars: function() { return 0; },
            isAvailable: false
        };
        return;
    }

    const tokenUtils = window.__ForeshadowTokenUtils;
    const anomalyScorer = window.__ForeshadowAnomalyScorer;
    const noiseFilter = window.__ForeshadowNoiseFilter;
    const poolManager = window.__ForeshadowPoolManager;
    const protagonistDetector = window.__ForeshadowProtagonistDetector;
    const tracker = window.__ForeshadowProtagonistTracker;

    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);
    const HPDC8 = HPDC_AVAILABLE ? window.HPDC.HPDC8 : null;

    let config = {
        maxItems: 50,
        similarityHigh: 0.6,
        similarityMid: 0.3,
        enabled: true
    };

    let totalCharsRead = 0;
    let lastScannedText = '';
    let protagonistName = null;

    function syncCharState() {
        poolManager.setCharState(totalCharsRead, lastScannedText);
    }

    function scan(text, context) {
        if (!config.enabled) return [];

        if (text !== lastScannedText) {
            totalCharsRead = 0;
            lastScannedText = text;
        }

        totalCharsRead += text.length;
        syncCharState();

        var results = [];

        protagonistName = protagonistDetector.detect(text);

        if (tracker) {
            var candidates = protagonistDetector.detectAll(text);
            if (candidates.length === 0 && protagonistName) {
                candidates = [{ name: protagonistName, score: 3, freq: 1 }];
            }
            tracker.recordScan(candidates, totalCharsRead, text);

            var trackedLongTerm = tracker.getLongTermProtagonist();
            if (trackedLongTerm) {
                protagonistName = trackedLongTerm;
            }
        }

        var words = tokenUtils.tokenize(text);
        var uniqueWords = {};
        for (var i = 0; i < words.length; i++) {
            uniqueWords[words[i]] = true;
        }

        for (var word in uniqueWords) {
            if (word.length < 2) continue;

            var searchFrom = 0;
            var wordPosition;
            while ((wordPosition = text.indexOf(word, searchFrom)) !== -1) {
                var absolutePosition = totalCharsRead - text.length + wordPosition;

                var entryCheck = anomalyScorer.shouldEnterPool(word, text, wordPosition);
                    if (entryCheck.enter) {
                    var sentence = tokenUtils.extractSentence(text, word, wordPosition);
                    var mood = (context && context.mood) ? context.mood : tokenUtils.extractMood(text);
                    var quoted = anomalyScorer.isQuoted(text, word);
                    poolManager.addToPool(word, sentence, absolutePosition, mood, quoted, entryCheck.anomaly.score, 'auto', config.maxItems);
                }

                var compareResults = poolManager.checkAndCompare(word, text, absolutePosition, config.similarityHigh, config.similarityMid);
                for (var j = 0; j < compareResults.length; j++) {
                    results.push(compareResults[j]);
                }

                searchFrom = wordPosition + word.length;
                if (searchFrom >= text.length) break;
            }
        }

        if (anomalyScorer.isPerspectiveFocus(text)) {
            var focusMatch = text.match(/(?:谁也没注意到|没人发现|没有人看到|不曾有人|如果有人回头|殊不知|他不知道的是|他没想到|后来的事实证明)[\u4e00-\u9fff\s]{0,30}/g);
            if (focusMatch) {
                for (var k = 0; k < focusMatch.length; k++) {
                    var focusWords = tokenUtils.tokenize(focusMatch[k]);
                    for (var l = 0; l < focusWords.length; l++) {
                        if (focusWords[l].length >= 2) {
                            var focusEntry = anomalyScorer.shouldEnterPool(focusWords[l], text, text.indexOf(focusWords[l]));
                            if (focusEntry.enter) {
                                var focusSentence = tokenUtils.extractSentence(text, focusWords[l], text.indexOf(focusWords[l]));
                                // v8.9：兼容 HPDC8 加法
                                var boostedScore = focusEntry.anomaly.score;
                                if (HPDC_AVAILABLE && boostedScore instanceof HPDC8) {
                                    boostedScore = HPDC8.addHCOnly(boostedScore, HPDC8.fromConfidence(0.1));
                                } else {
                                    boostedScore = boostedScore + 0.1;
                                }
                                poolManager.addToPool(focusWords[l], focusSentence, totalCharsRead - text.length + text.indexOf(focusWords[l]),
                                    '伏笔信号', false, boostedScore, 'auto', config.maxItems);
                            }
                        }
                    }
                }
            }
        }

        // 按 (原句|现句) 去重：同一重复场景会被多个关键词各自触发，
        // 此处合并为一条，避免刷屏式重复告警。
        // 归一化：去掉首尾标点/空白，避免“寒光，剑刃，黑夜。”与“寒光，剑刃，黑夜”被视为不同。
        function normSentence(s) {
            if (!s) return '';
            return s.replace(/^[\s，。！？、；：""''「」『』（）\n\r]+/, '')
                   .replace(/[\s，。！？、；：""''「」『』（）\n\r]+$/, '');
        }
        var deduped = [];
        var dseen = {};
        for (var d = 0; d < results.length; d++) {
            var r = results[d];
            var key = normSentence(r.originalSentence) + '|' + normSentence(r.currentSentence);
            if (!dseen[key]) {
                dseen[key] = true;
                deduped.push(r);
            }
        }

        return deduped;
    }

    function getPool() { return poolManager.getPool(); }
    function getProtagonistName() { return protagonistName; }
    function resetPool() { 
        poolManager.resetPool(); 
        totalCharsRead = 0; 
        lastScannedText = ''; 
        protagonistName = null;
        syncCharState();
    }
    function setMaxItems(n) { config.maxItems = Math.max(10, Math.min(n, 500)); poolManager.setMaxItems(config.maxItems); }
    function setEnabled(enabled) { config.enabled = enabled; if (!enabled) resetPool(); }
    function getConfig() {
        return { maxItems: config.maxItems, enabled: config.enabled, poolSize: poolManager.getPool().length, totalCharsRead: totalCharsRead, protagonistName: protagonistName, isAvailable: true };
    }
    function getTotalChars() { return totalCharsRead; }

    syncCharState();

    return {
        scan: scan,
        addManual: function(word, sentence) { return poolManager.addManual(word, sentence, config.maxItems); },
        getPool: getPool,
        getProtagonistName: getProtagonistName,
        resetPool: resetPool,
        setMaxItems: setMaxItems,
        setEnabled: setEnabled,
        getConfig: getConfig,
        getTotalChars: getTotalChars,
        isAvailable: true
    };
})();
