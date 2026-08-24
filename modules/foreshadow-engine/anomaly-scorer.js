// ==================== 伏笔引擎 - 异常评分器 (anomaly-scorer.js) ====================
// 挂载到 window.__ForeshadowAnomalyScorer
// v8.9-P6：异常评分迁移至 HPDC8 仅 HC 饱和模式，阈值比较使用超度量比较
// 保留旧浮点逻辑作为降级路径

window.__ForeshadowAnomalyScorer = (function() {

    /* ============================================================
       HC+level 数值体系集成 (v8.9 新增)
       ============================================================ */
    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);
    const USE_HPDC = window.FORESHADOW_USE_HPDC !== false; // 默认 true（若 HPDC 可用）
    const LEGACY = !HPDC_AVAILABLE || !USE_HPDC;

    const HPDC8 = HPDC_AVAILABLE ? window.HPDC.HPDC8 : null;

    // 预定义加分项常量（仅 HC 模式，置信度映射到 [0,1]）
    const BOOST_QUOTED       = LEGACY ? 0.10 : HPDC8.fromConfidence(0.10);
    const BOOST_OVERMODIFIED = LEGACY ? 0.25 : HPDC8.fromConfidence(0.25);
    const BOOST_PRECISE      = LEGACY ? 0.15 : HPDC8.fromConfidence(0.15);
    const BOOST_PERSPECTIVE  = LEGACY ? 0.20 : HPDC8.fromConfidence(0.20);
    const BOOST_CONDITIONAL  = LEGACY ? 0.15 : HPDC8.fromConfidence(0.15);
    const BOOST_UNEXPLAINED  = LEGACY ? 0.20 : HPDC8.fromConfidence(0.20);

    const THRESHOLD_ENTER = LEGACY ? 0.45 : HPDC8.fromConfidence(0.45);

    if (!LEGACY) {
        console.log('[AnomalyScorer] HPDC8 mode enabled. Anomaly scores use HC-only saturated addition.');
    }

    /* ============================================================
       原有检测函数（不涉及数值，保持不变）
       ============================================================ */
    function isQuoted(text, word) {
        var safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var quotedPatterns = [
            new RegExp('[""][^""]*' + safeWord + '[^""]*[""]'),
            new RegExp('[\u201c][^\u201d]*' + safeWord + '[^\u201d]*[\u201d]'),
            new RegExp('[\u300c][^\u300d]*' + safeWord + '[^\u300d]*[\u300d]'),
            new RegExp('[\u300e][^\u300f]*' + safeWord + '[^\u300f]*[\u300f]')
        ];
        for (var i = 0; i < quotedPatterns.length; i++) {
            if (quotedPatterns[i].test(text)) return true;
        }
        return false;
    }

    function isOverModified(text, word) {
        var overModifiers = /诡异|莫名|奇怪|说不出|异样|不对劲|不知为何|总觉得|隐约|莫名地|不曾有过的|罕见的|特别的|异乎寻常/;
        var idx = text.indexOf(word);
        if (idx === -1) return false;
        var windowStart = Math.max(0, idx - 15);
        var windowEnd = Math.min(text.length, idx + word.length + 15);
        var windowText = text.substring(windowStart, windowEnd);
        return overModifiers.test(windowText);
    }

    function isPreciseTimeOrNumber(word) {
        return /第[一二三四五六七八九十\d]+[个把次]/.test(word) ||
               /\d+[月号日年时分秒]/.test(word) ||
               /[一二三四五六七八九十]+[月号日年]/.test(word) ||
               /第\d+[个把次]/.test(word);
    }

    function windowAround(text, word, wordIndex) {
        if (wordIndex === undefined || wordIndex < 0) return text;
        var start = Math.max(0, wordIndex - 20);
        var end = Math.min(text.length, wordIndex + (word ? word.length : 0) + 20);
        return text.substring(start, end);
    }

    function isPerspectiveFocus(text, word, wordIndex) {
        var w = windowAround(text, word, wordIndex);
        return /谁也没注意到|没人发现|没有人看到|不曾有人|如果有人回头|殊不知|他不知道的是|他没想到|如果他知道|后来的事实证明/.test(w);
    }

    function isConditionalHint(text, word, wordIndex) {
        var w = windowAround(text, word, wordIndex);
        return /如果.{2,10}(?:知道|明白|想|回忆|记).{2,20}/.test(w) ||
               /.{2,10}(?:还不知道|没想到|没发现|没注意).{2,20}/.test(w);
    }

    /* ============================================================
       新版：calculateAnomalyScore（HPDC8 仅 HC 饱和累加）
       ============================================================ */
    function calculateAnomalyScore(word, text, wordIndex) {
        if (LEGACY) return calculateAnomalyScoreLegacy(word, text, wordIndex);

        var score = HPDC8.fromConfidence(0);
        var reasons = [];

        if (isQuoted(text, word)) {
            score = HPDC8.addHCOnly(score, BOOST_QUOTED);
            reasons.push('引号包裹');
        }
        if (isOverModified(text, word)) {
            score = HPDC8.addHCOnly(score, BOOST_OVERMODIFIED);
            reasons.push('过度修饰');
        }
        if (isPreciseTimeOrNumber(word)) {
            score = HPDC8.addHCOnly(score, BOOST_PRECISE);
            reasons.push('精确数字/日期');
        }
        if (isPerspectiveFocus(text, word, wordIndex)) {
            score = HPDC8.addHCOnly(score, BOOST_PERSPECTIVE);
            reasons.push('视角切换聚焦');
        }
        if (isConditionalHint(text, word, wordIndex)) {
            score = HPDC8.addHCOnly(score, BOOST_CONDITIONAL);
            reasons.push('条件暗示句');
        }
        if (window.__ForeshadowTokenUtils && !window.__ForeshadowTokenUtils.hasExplanation(text, word)) {
            score = HPDC8.addHCOnly(score, BOOST_UNEXPLAINED);
            reasons.push('未解释');
        }

        return { score: score, reasons: reasons };
    }

    /* ============================================================
       新版：shouldEnterPool（HPDC8 阈值比较）
       ============================================================ */
    function shouldEnterPool(word, text, position) {
        if (LEGACY) return shouldEnterPoolLegacy(word, text, position);

        if (window.__ForeshadowNoiseFilter && window.__ForeshadowNoiseFilter.isNoiseWord(word)) {
            return {
                enter: false,
                anomaly: { score: HPDC8.fromConfidence(0), reasons: ['噪音词'] }
            };
        }
        var anomaly = calculateAnomalyScore(word, text, position);
        var enter = HPDC8.compare(anomaly.score, THRESHOLD_ENTER) >= 0;
        return { enter: enter, anomaly: anomaly };
    }

    /* ============================================================
       旧版：calculateAnomalyScoreLegacy（保留，降级用）
       ============================================================ */
    function calculateAnomalyScoreLegacy(word, text, wordIndex) {
        var score = 0;
        var reasons = [];
        if (isQuoted(text, word)) { score += 0.1; reasons.push('引号包裹'); }
        if (isOverModified(text, word)) { score += 0.25; reasons.push('过度修饰'); }
        if (isPreciseTimeOrNumber(word)) { score += 0.15; reasons.push('精确数字/日期'); }
        if (isPerspectiveFocus(text)) { score += 0.2; reasons.push('视角切换聚焦'); }
        if (isConditionalHint(text)) { score += 0.15; reasons.push('条件暗示句'); }
        if (window.__ForeshadowTokenUtils && !window.__ForeshadowTokenUtils.hasExplanation(text, word)) {
            score += 0.2; reasons.push('未解释');
        }
        return { score: Math.min(score, 1.0), reasons: reasons };
    }

    /* ============================================================
       旧版：shouldEnterPoolLegacy（保留，降级用）
       ============================================================ */
    function shouldEnterPoolLegacy(word, text, position) {
        if (window.__ForeshadowNoiseFilter && window.__ForeshadowNoiseFilter.isNoiseWord(word)) {
            return { enter: false, anomaly: { score: 0, reasons: ['噪音词'] } };
        }
        var anomaly = calculateAnomalyScoreLegacy(word, text, position);
        var enter = anomaly.score >= 0.45;
        return { enter: enter, anomaly: anomaly };
    }

    return {
        calculateAnomalyScore: calculateAnomalyScore,
        shouldEnterPool: shouldEnterPool,
        isQuoted: isQuoted,
        isOverModified: isOverModified,
        isPerspectiveFocus: isPerspectiveFocus,
        isConditionalHint: isConditionalHint,
        isPreciseTimeOrNumber: isPreciseTimeOrNumber,
        // v8.9 暴露降级标志和旧函数，供外部调用
        __LEGACY: LEGACY,
        calculateAnomalyScoreLegacy: calculateAnomalyScoreLegacy,
        shouldEnterPoolLegacy: shouldEnterPoolLegacy
    };
})();
