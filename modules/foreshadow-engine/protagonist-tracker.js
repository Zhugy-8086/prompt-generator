// ==================== 伏笔引擎 - 主角档案追踪器 (protagonist-tracker.js) ====================
// 挂载到 window.__ForeshadowProtagonistTracker
// 管理跨窗口主角稳定性分析，区分长期主角、章节主角、次要人物
// v8.8：新增 recordScanProfiles() 方法，接收完整 protagonistProfile 数组

window.__ForeshadowProtagonistTracker = (function() {

    var WINDOW_SIZE = 30000;
    var MINOR_CHAR_THRESHOLD = 10000;

    var windows = [];
    var currentWindowIndex = -1;
    var longTermProtagonist = null;
    var chapterProtagonists = [];
    var minorCharacters = [];
    var isMultiView = false;
    var cumulativeStats = {};
    var cumulativeProfiles = {}; // ★ 新增：按名字存储档案历史

    function setWindowSize(size) { WINDOW_SIZE = Math.max(5000, Math.min(size, 100000)); }
    function setMinorThreshold(threshold) { MINOR_CHAR_THRESHOLD = Math.max(3000, Math.min(threshold, 50000)); }

    function reset() {
        windows = [];
        currentWindowIndex = -1;
        longTermProtagonist = null;
        chapterProtagonists = [];
        minorCharacters = [];
        cumulativeStats = {};
        cumulativeProfiles = {};
        isMultiView = false;
    }

    function resetButKeepLongTerm() {
        windows = [];
        currentWindowIndex = -1;
        chapterProtagonists = [];
        minorCharacters = [];
        cumulativeStats = {};
        cumulativeProfiles = {};
        isMultiView = false;
    }

    // ---------- ★ V8.8 新增：接收 protagonistProfile 数组 ----------
    function recordScanProfiles(profiles, totalCharsRead, text) {
        if (!profiles || profiles.length === 0) return;

        var windowIdx = Math.floor(totalCharsRead / WINDOW_SIZE);

        if (windowIdx > currentWindowIndex && currentWindowIndex >= 0) {
            closeWindow(currentWindowIndex);
            analyzeProtagonistStability();
        }

        if (windowIdx >= windows.length) {
            for (var i = windows.length; i <= windowIdx; i++) {
                windows.push({
                    windowIndex: i,
                    startCharPos: i * WINDOW_SIZE,
                    endCharPos: (i + 1) * WINDOW_SIZE,
                    candidates: [],
                    profiles: [],    // ★ 新增
                    topNames: [],
                    isClosed: false
                });
            }
        }

        currentWindowIndex = windowIdx;
        var win = windows[windowIdx];

        // 存储完整档案
        for (var p = 0; p < profiles.length; p++) {
            var profile = profiles[p];
            win.profiles.push({
                entityId: profile.entityId,
                name: profile.name,
                labels: profile.labels || [],
                species: profile.species || null,
                powerLevel: profile.powerLevel || null,
                powerSubLevel: profile.powerSubLevel || null,
                acquisitionTotalWeight: profile.acquisitionTotalWeight || 0,
                chainLength: profile.chainLength || 0,
                chainBonus: profile.chainBonus || 0,
                confidenceScore: profile.confidenceScore || 0
            });

            // 同时转为简单候选人格式，兼容原有对账逻辑
            mergeCandidateToWindow(win, {
                name: profile.name,
                score: profile.confidenceScore * 10,
                freq: 1,
                position: totalCharsRead
            }, totalCharsRead, text);

            // ★ 更新累积档案历史
            if (!cumulativeProfiles[profile.name]) {
                cumulativeProfiles[profile.name] = {
                    name: profile.name,
                    speciesHistory: [],
                    powerLevelHistory: [],
                    acquisitionWeightHistory: [],
                    chainLengthHistory: [],
                    confidenceHistory: []
                };
            }
            var cp = cumulativeProfiles[profile.name];
            cp.speciesHistory.push(profile.species);
            cp.powerLevelHistory.push(profile.powerLevel);
            cp.acquisitionWeightHistory.push(profile.acquisitionTotalWeight || 0);
            cp.chainLengthHistory.push(profile.chainLength || 0);
            cp.confidenceHistory.push(profile.confidenceScore || 0);
        }

        analyzeProtagonistStability();
    }

    // ---------- 原有：接收候选人数组（保持兼容） ----------
    function recordScan(candidates, totalCharsRead, text) {
        var windowIdx = Math.floor(totalCharsRead / WINDOW_SIZE);

        if (windowIdx > currentWindowIndex && currentWindowIndex >= 0) {
            closeWindow(currentWindowIndex);
            analyzeProtagonistStability();
        }

        if (windowIdx >= windows.length) {
            for (var i = windows.length; i <= windowIdx; i++) {
                windows.push({
                    windowIndex: i,
                    startCharPos: i * WINDOW_SIZE,
                    endCharPos: (i + 1) * WINDOW_SIZE,
                    candidates: [],
                    profiles: [],
                    topNames: [],
                    isClosed: false
                });
            }
        }

        currentWindowIndex = windowIdx;
        var win = windows[windowIdx];

        if (candidates && candidates.length > 0) {
            for (var j = 0; j < candidates.length; j++) {
                mergeCandidateToWindow(win, candidates[j], totalCharsRead, text);
            }
        }

        analyzeProtagonistStability();
    }

    // ---------- 辅助函数（保持不变） ----------
    function mergeCandidateToWindow(win, candidate, charPos, text) {
        var existing = null;
        for (var i = 0; i < win.candidates.length; i++) {
            if (win.candidates[i].name === candidate.name) {
                existing = win.candidates[i];
                break;
            }
        }

        var span = estimateCharSpan(candidate.name, text, charPos);

        if (existing) {
            existing.score += candidate.score;
            existing.freq += candidate.freq;
            existing.appearances++;
            existing.charSpanStart = Math.min(existing.charSpanStart, span.start);
            existing.charSpanEnd = Math.max(existing.charSpanEnd, span.end);
        } else {
            win.candidates.push({
                name: candidate.name,
                score: candidate.score,
                freq: candidate.freq,
                appearances: 1,
                firstCharPos: charPos,
                charSpanStart: span.start,
                charSpanEnd: span.end
            });
        }
    }

    function estimateCharSpan(name, text, basePos) {
        if (!text || text.length === 0) return { start: basePos, end: basePos + name.length };
        var firstIdx = text.indexOf(name);
        var lastIdx = text.lastIndexOf(name);
        if (firstIdx === -1) return { start: basePos, end: basePos + name.length };
        return {
            start: basePos - text.length + firstIdx,
            end: basePos - text.length + lastIdx + name.length
        };
    }

    function accumulateWindow(win) {
        if (!win || win._accumulated) return;
        win._accumulated = true;

        var windowIndex = win.windowIndex;

        win.candidates.sort(function(a, b) { return b.score - a.score; });

        win.topNames = win.candidates.slice(0, 3).map(function(c) {
            return {
                name: c.name,
                score: c.score,
                spanRange: c.charSpanEnd - c.charSpanStart,
                isConcentrated: (c.charSpanEnd - c.charSpanStart) < MINOR_CHAR_THRESHOLD
            };
        });

        if (win.topNames.length > 0) {
            win.detectedProtagonist = win.topNames[0].name;
        } else {
            win.detectedProtagonist = null;
        }

        for (var i = 0; i < win.candidates.length; i++) {
            var c = win.candidates[i];
            if (!cumulativeStats[c.name]) {
                cumulativeStats[c.name] = {
                    totalScore: 0,
                    windowCount: 0,
                    firstWindow: windowIndex,
                    lastWindow: windowIndex,
                    protagonistCount: 0,
                    topThreeCount: 0,
                    windowScores: {}
                };
            }
            var st = cumulativeStats[c.name];
            st.totalScore += c.score;
            st.windowCount++;
            st.lastWindow = windowIndex;
            st.windowScores[windowIndex] = c.score;
        }

        if (win.detectedProtagonist && cumulativeStats[win.detectedProtagonist]) {
            cumulativeStats[win.detectedProtagonist].protagonistCount++;
        }

        for (var j = 0; j < win.topNames.length; j++) {
            var name = win.topNames[j].name;
            if (cumulativeStats[name]) {
                cumulativeStats[name].topThreeCount++;
            }
        }
    }

    function closeWindow(windowIndex) {
        var win = windows[windowIndex];
        if (!win || win.isClosed) return;
        accumulateWindow(win);
        win.isClosed = true;
    }

    function analyzeProtagonistStability() {
        var openWin = (currentWindowIndex >= 0 && windows[currentWindowIndex] && !windows[currentWindowIndex].isClosed) ? windows[currentWindowIndex] : null;
        if (openWin) accumulateWindow(openWin);

        var totalWindows = windows.filter(function(w) { return w.isClosed; }).length + (openWin ? 1 : 0);
        if (totalWindows < 1) return;

        var nameMetrics = {};
        for (var name in cumulativeStats) {
            if (!cumulativeStats.hasOwnProperty(name)) continue;
            var st = cumulativeStats[name];

            var coverage = st.windowCount / totalWindows;
            var protagonistRate = st.protagonistCount / totalWindows;

            var recentWindows = [];
            var olderWindows = [];
            for (var wi = 0; wi < totalWindows; wi++) {
                if (st.windowScores[wi] !== undefined) {
                    if (wi >= totalWindows - 2) {
                        recentWindows.push(st.windowScores[wi]);
                    } else {
                        olderWindows.push(st.windowScores[wi]);
                    }
                }
            }

            var recentAvg = average(recentWindows);
            var olderAvg = average(olderWindows);
            var trend = 'stable';
            if (olderAvg > 0 && recentAvg / olderAvg < 0.5) {
                trend = 'declining';
            } else if (olderAvg > 0 && recentAvg / olderAvg > 1.5) {
                trend = 'rising';
            }

            // ★ V8.8 新增：获取物趋势
            var acquisitionTrend = 'stable';
            if (cumulativeProfiles[name]) {
                var acqHistory = cumulativeProfiles[name].acquisitionWeightHistory;
                if (acqHistory.length >= 2) {
                    var recentAcq = acqHistory.slice(-2);
                    var olderAcq = acqHistory.slice(0, -2);
                    if (average(recentAcq) > average(olderAcq) * 1.5) acquisitionTrend = 'rising';
                    if (average(recentAcq) < average(olderAcq) * 0.5) acquisitionTrend = 'declining';
                }
            }

            nameMetrics[name] = {
                name: name,
                coverage: coverage,
                protagonistRate: protagonistRate,
                totalScore: st.totalScore,
                windowCount: st.windowCount,
                firstWindow: st.firstWindow,
                lastWindow: st.lastWindow,
                trend: trend,
                acquisitionTrend: acquisitionTrend, // ★ 新增
                recentAvg: recentAvg,
                olderAvg: olderAvg
            };
        }

        var longTermCandidates = [];
        for (var n in nameMetrics) {
            var m = nameMetrics[n];
            // ★ 扩展判定条件：获取物权重持续最高或持续增长
            var hasHighAcquisition = m.acquisitionTrend === 'rising';
            if (m.coverage > 0.6 && m.protagonistRate > 0.5 && m.trend !== 'declining') {
                longTermCandidates.push(m);
            } else if (m.coverage > 0.5 && m.protagonistRate > 0.4 && hasHighAcquisition) {
                // 即使覆盖率稍低，但获取物持续增长，也纳入候选
                longTermCandidates.push(m);
            }
        }

        longTermCandidates.sort(function(a, b) { return b.totalScore - a.totalScore; });

        if (longTermCandidates.length > 0) {
            var newLongTerm = longTermCandidates[0];

            if (longTermProtagonist === null) {
                longTermProtagonist = buildLongTermProfile(newLongTerm, totalWindows);
            } else if (longTermProtagonist.name !== newLongTerm.name) {
                var oldStability = longTermProtagonist.stabilityScore;
                var newStability = calculateStabilityScore(newLongTerm, totalWindows);

                if (newStability > oldStability * 1.3) {
                    var oldProfile = nameMetrics[longTermProtagonist.name];
                    if (oldProfile && oldProfile.coverage < 0.3) {
                        addToChapterProtagonists(longTermProtagonist.name, oldProfile, 'former_long_term');
                    }
                    longTermProtagonist = buildLongTermProfile(newLongTerm, totalWindows);
                }
            } else {
                longTermProtagonist.stabilityScore = calculateStabilityScore(newLongTerm, totalWindows);
                longTermProtagonist.coverage = newLongTerm.coverage;
                longTermProtagonist.trend = newLongTerm.trend;
                // ★ 同步档案
                if (cumulativeProfiles[newLongTerm.name]) {
                    var cp = cumulativeProfiles[newLongTerm.name];
                    longTermProtagonist.species = cp.speciesHistory.filter(Boolean).pop() || null;
                    longTermProtagonist.powerLevel = cp.powerLevelHistory.filter(Boolean).pop() || null;
                    longTermProtagonist.chainLength = cp.chainLengthHistory[cp.chainLengthHistory.length - 1] || 0;
                }
            }
        }

        chapterProtagonists = buildChapterProtagonists(nameMetrics, totalWindows);
        minorCharacters = buildMinorCharacters(nameMetrics, totalWindows);
        isMultiView = checkMultiView(nameMetrics, totalWindows);
    }

    function buildLongTermProfile(newLongTerm, totalWindows) {
        var profile = {
            name: newLongTerm.name,
            firstIdentifiedWindow: newLongTerm.firstWindow,
            totalWindowsAsProtagonist: newLongTerm.windowCount,
            stabilityScore: calculateStabilityScore(newLongTerm, totalWindows),
            coverage: newLongTerm.coverage,
            trend: newLongTerm.trend,
            species: null,
            powerLevel: null,
            chainLength: 0
        };
        // ★ 从累积档案填充
        if (cumulativeProfiles[newLongTerm.name]) {
            var cp = cumulativeProfiles[newLongTerm.name];
            profile.species = cp.speciesHistory.filter(Boolean).pop() || null;
            profile.powerLevel = cp.powerLevelHistory.filter(Boolean).pop() || null;
            profile.chainLength = cp.chainLengthHistory[cp.chainLengthHistory.length - 1] || 0;
        }
        return profile;
    }

    function buildChapterProtagonists(nameMetrics, totalWindows) {
        var result = [];
        for (var nn in nameMetrics) {
            var nm = nameMetrics[nn];
            if (longTermProtagonist && nm.name === longTermProtagonist.name) continue;
            if (nm.coverage < 0.4 && nm.protagonistRate > 0) {
                var contiguousWindows = countContiguousWindows(nn, totalWindows);
                if (contiguousWindows >= 2) {
                    result.push({
                        name: nm.name,
                        activeWindows: nm.windowCount,
                        firstWindow: nm.firstWindow,
                        lastWindow: nm.lastWindow,
                        peakScore: getPeakScore(nn),
                        contiguousWindows: contiguousWindows,
                        trend: nm.trend
                    });
                }
            }
        }
        result.sort(function(a, b) { return b.peakScore - a.peakScore; });
        return result;
    }

    function buildMinorCharacters(nameMetrics, totalWindows) {
        var result = [];
        for (var nnn in nameMetrics) {
            var nm2 = nameMetrics[nnn];
            if (longTermProtagonist && nm2.name === longTermProtagonist.name) continue;
            if (chapterProtagonists.some(function(cp) { return cp.name === nm2.name; })) continue;
            if (nm2.windowCount === 1) {
                var win = windows[nm2.firstWindow];
                if (win) {
                    var candidate = null;
                    for (var ci = 0; ci < win.candidates.length; ci++) {
                        if (win.candidates[ci].name === nm2.name) {
                            candidate = win.candidates[ci];
                            break;
                        }
                    }
                    if (candidate) {
                        var span = candidate.charSpanEnd - candidate.charSpanStart;
                        if (span < MINOR_CHAR_THRESHOLD) {
                            result.push({
                                name: nm2.name,
                                appearedInWindow: nm2.firstWindow,
                                charSpan: span,
                                score: candidate.score
                            });
                        }
                    }
                }
            }
        }
        result.sort(function(a, b) { return b.score - a.score; });
        return result;
    }

    function checkMultiView(nameMetrics, totalWindows) {
        var midRangeNames = [];
        for (var nn2 in nameMetrics) {
            var nm3 = nameMetrics[nn2];
            if (nm3.protagonistRate >= 0.25 && nm3.protagonistRate <= 0.5 && nm3.coverage >= 0.25) {
                midRangeNames.push(nm3);
            }
        }
        if (midRangeNames.length >= 2 && totalWindows >= 3) {
            var alternationCount = 0;
            for (var wi = 1; wi < totalWindows; wi++) {
                var prevProtagonist = getWindowProtagonist(wi - 1);
                var currProtagonist = getWindowProtagonist(wi);
                if (prevProtagonist && currProtagonist && prevProtagonist !== currProtagonist &&
                    midRangeNames.some(function(mr) { return mr.name === prevProtagonist; }) &&
                    midRangeNames.some(function(mr) { return mr.name === currProtagonist; })) {
                    alternationCount++;
                }
            }
            if (alternationCount >= 2) return true;
        }
        return false;
    }

    function getWindowProtagonist(windowIndex) {
        if (windowIndex < 0 || windowIndex >= windows.length) return null;
        var win = windows[windowIndex];
        if (!win || !win.isClosed) return null;
        return win.detectedProtagonist;
    }

    function getPeakScore(name) {
        var st = cumulativeStats[name];
        if (!st) return 0;
        var max = 0;
        for (var wi in st.windowScores) {
            if (st.windowScores.hasOwnProperty(wi)) {
                max = Math.max(max, st.windowScores[wi]);
            }
        }
        return max;
    }

    function countContiguousWindows(name, totalWindows) {
        var st = cumulativeStats[name];
        if (!st) return 0;
        var maxContiguous = 0;
        var current = 0;
        for (var wi = 0; wi < totalWindows; wi++) {
            if (st.windowScores[wi] !== undefined) {
                current++;
                maxContiguous = Math.max(maxContiguous, current);
            } else {
                current = 0;
            }
        }
        return maxContiguous;
    }

    function calculateStabilityScore(metrics, totalWindows) {
        var coverageScore = metrics.coverage * 40;
        var protagonistScore = metrics.protagonistRate * 40;
        var trendScore = metrics.trend === 'stable' ? 20 : (metrics.trend === 'rising' ? 25 : 5);
        return coverageScore + protagonistScore + trendScore;
    }

    function average(arr) {
        if (!arr || arr.length === 0) return 0;
        var sum = 0;
        for (var i = 0; i < arr.length; i++) sum += arr[i];
        return sum / arr.length;
    }

    function addToChapterProtagonists(name, metrics, reason) {
        chapterProtagonists.push({
            name: name,
            activeWindows: metrics.windowCount,
            firstWindow: metrics.firstWindow,
            lastWindow: metrics.lastWindow,
            peakScore: getPeakScore(name),
            contiguousWindows: countContiguousWindows(name, windows.length),
            trend: metrics.trend,
            reason: reason
        });
    }

    function getReport() {
        return {
            totalWindows: windows.filter(function(w) { return w.isClosed; }).length,
            currentWindowIndex: currentWindowIndex,
            longTermProtagonist: longTermProtagonist,
            chapterProtagonists: chapterProtagonists,
            minorCharacters: minorCharacters,
            isMultiView: isMultiView,
            cumulativeStats: cumulativeStats,
            cumulativeProfiles: cumulativeProfiles  // ★ 新增
        };
    }

    function getLongTermProtagonist() {
        return longTermProtagonist ? longTermProtagonist.name : null;
    }

    function getChapterProtagonists() {
        return chapterProtagonists.map(function(cp) { return cp.name; });
    }

    function getIsMultiView() {
        return isMultiView;
    }

    // 公开接口（V8.8 新增 recordScanProfiles）
    return {
        setWindowSize: setWindowSize,
        setMinorThreshold: setMinorThreshold,
        recordScan: recordScan,
        recordScanProfiles: recordScanProfiles,  // ★ 新增
        getReport: getReport,
        getLongTermProtagonist: getLongTermProtagonist,
        getChapterProtagonists: getChapterProtagonists,
        getIsMultiView: getIsMultiView,
        reset: reset,
        resetButKeepLongTerm: resetButKeepLongTerm
    };

})();