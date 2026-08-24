// ui/module-loader.js
// 模块加载监控器：全量监控 + 无 break 统计 + modulesReady 事件

(function() {
    var MIN_DISPLAY_TIME = 1000;
    var CHECK_INTERVAL = 200;
    var TIMEOUT = 30000;

    var startTime = Date.now();
    var progressTimer = null;
    var checkTimer = null;
    var timeoutTimer = null;
    var completed = false;

    // ★ 扩展为全量关键模块（30个）
    var criticalModules = [
        { name: 'Dictionaries', file: 'dictionaries.js' },
        { name: 'EngineConfig', file: 'engine-config.js' },
        { name: '__ElizaSynonymGroups', file: 'synonym-groups.js' },
        { name: '__ElizaUtils', file: 'utils.js' },
        { name: '__ElizaPoolManager', file: 'pool-manager.js (eliza)' },
        { name: '__ElizaThemeDetector', file: 'theme-detector.js' },
        { name: '__ElizaDynamicBoost', file: 'dynamic-boost.js' },
        { name: '__ElizaBuiltinRules', file: 'builtin-rules.js' },
        { name: '__ElizaContextRules', file: 'context-rules.js' },
        { name: 'ElizaRules', file: 'eliza-rules.js' },
        { name: '__ForeshadowTokenUtils', file: 'token-utils.js' },
        { name: '__ForeshadowAnomalyScorer', file: 'anomaly-scorer.js' },
        { name: '__ForeshadowNoiseFilter', file: 'noise-filter.js' },
        { name: '__ForeshadowIdentityDict', file: 'identity-dictionary.js' },
        { name: '__ForeshadowSpeciesDetector', file: 'species-detector.js' },
        { name: '__ForeshadowPowerLevelDetector', file: 'power-level-detector.js' },
        { name: '__ForeshadowAcquisitionTracker', file: 'acquisition-tracker.js' },
        { name: '__ForeshadowIdentityMerger', file: 'identity-merger.js' },
        { name: '__ForeshadowProtagonistDetector', file: 'protagonist-detector.js' },
        { name: '__ForeshadowProtagonistTracker', file: 'protagonist-tracker.js' },
        { name: '__ForeshadowPoolManager', file: 'foreshadow-pool-manager.js' }, // 已改名
        { name: '__ForeshadowContextBridge', file: 'context-bridge.js' },
        { name: '__ForeshadowTransitionEngine', file: 'transition-engine.js' },
        { name: 'ForeshadowEngine', file: 'foreshadow-engine.js' },
        { name: 'StylePresets', file: 'style-presets.js' },
        { name: 'PlatformAdapters', file: 'platform-adapters.js' },
        { name: 'UiUtils', file: 'ui-utils.js' },
        { name: 'ModeManager', file: 'mode-manager.js' },
        { name: 'ExtractManager', file: 'extract-manager.js' },
        { name: 'FormBindings', file: 'form-bindings.js' },
        { name: 'NegativePanel', file: 'negative-panel.js' },
        { name: 'OutputPanel', file: 'output-panel.js' }
    ];

    var totalModules = criticalModules.length;
    var loadedCount = 0;

    function getLoadedCount() {
        var count = 0;
        for (var i = 0; i < criticalModules.length; i++) {
            if (typeof window[criticalModules[i].name] !== 'undefined') {
                count++;
            }
            // ★ 不再 break，全量遍历
        }
        return count;
    }

    function getMissingNames() {
        var missing = [];
        for (var i = 0; i < criticalModules.length; i++) {
            if (typeof window[criticalModules[i].name] === 'undefined') {
                missing.push(criticalModules[i].name);
            }
        }
        return missing;
    }

    function renderLoading(percent, statusText) {
        var root = document.getElementById('app-root');
        if (!root) return;
        root.innerHTML =
            '<div style="padding:40px;text-align:center;font-family:sans-serif;">' +
            '<h2 style="color:#4a90d9;margin-bottom:16px;">引擎加载中...</h2>' +
            '<div style="background:#e8e8e8;border-radius:10px;height:12px;max-width:400px;margin:0 auto 12px;overflow:hidden;">' +
            '<div id="loadingProgressBar" style="background:linear-gradient(90deg, #4a90d9, #6ea8fe);height:100%;width:' + percent + '%;transition:width 0.3s;"></div>' +
            '</div>' +
            '<div id="loadingStatus" style="font-size:0.85rem;color:#888;">' + (statusText || '正在初始化...') + '</div>' +
            '</div>';
    }

    function updateUI(realCount, total, moduleName) {
        var percent = Math.floor((realCount / total) * 100);
        var bar = document.getElementById('loadingProgressBar');
        var status = document.getElementById('loadingStatus');
        if (bar) bar.style.width = percent + '%';
        if (status) {
            if (moduleName) {
                status.textContent = '✓ ' + moduleName + ' (' + realCount + '/' + total + ')';
            } else {
                status.textContent = '正在加载模块... (' + realCount + '/' + total + ')';
            }
        }
    }

    function redirectToError(missingNames) {
        var missingParam = missingNames.join(',');
        var root = document.getElementById('app-root');
        if (root) {
            root.innerHTML =
                '<div style="padding:30px;max-width:520px;margin:40px auto;font-family:sans-serif;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">' +
                '<h2 style="color:#c0392b;margin-bottom:10px;">加载超时</h2>' +
                '<p style="margin-bottom:8px;">部分模块未能在 30 秒内加载完成。</p>' +
                '<p style="font-size:13px;color:#888;margin-bottom:6px;">缺失：' + missingNames.join('、') + '</p>' +
                '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                '<a href="tests/engine-test-v8.7.html?from=error&missing=' + missingParam + '" style="display:inline-block;padding:10px 20px;background:#4a90d9;color:#fff;border-radius:8px;text-decoration:none;font-size:0.9rem;">进入检测工具</a>' +
                '<a href="tests/eliza-ie11.html?mode=fallback" style="display:inline-block;padding:10px 20px;background:#888;color:#fff;border-radius:8px;text-decoration:none;font-size:0.9rem;">进入精简版</a>' +
                '</div>' +
                '</div>';
        }
    }

    function onTimeout() {
        if (completed) return;
        completed = true;
        if (progressTimer) clearInterval(progressTimer);
        if (checkTimer) clearInterval(checkTimer);
        var missing = getMissingNames();
        if (missing.length > 0) {
            redirectToError(missing);
        }
    }

    function onComplete() {
        if (completed) return;
        completed = true;
        if (progressTimer) clearInterval(progressTimer);
        if (checkTimer) clearInterval(checkTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        updateUI(totalModules, totalModules, '完成');
        // ★ 派发事件，通知 init.js 可以初始化了
        window.modulesReady = true;
        try {
            window.dispatchEvent(new CustomEvent('modulesReady'));
        } catch(e) {
            // IE11 兼容降级：直接设置全局标志，init.js 会轮询检测
            console.warn('[ModuleLoader] CustomEvent 不支持，使用标志位降级', e);
        }
    }

    function startRealCheck() {
        checkTimer = setInterval(function() {
            if (completed) {
                clearInterval(checkTimer);
                return;
            }
            var newCount = getLoadedCount();
            if (newCount > loadedCount) {
                loadedCount = newCount;
                var mod = criticalModules[loadedCount - 1];
                if (mod) updateUI(loadedCount, totalModules, mod.file);
            }
            if (loadedCount === totalModules) {
                clearInterval(checkTimer);
                var elapsed = Date.now() - startTime;
                var remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);
                setTimeout(onComplete, remaining);
            }
        }, CHECK_INTERVAL);
    }

    function init() {
        renderLoading(0, '正在初始化... (0/' + totalModules + ')');
        timeoutTimer = setTimeout(onTimeout, TIMEOUT);
        startRealCheck();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();