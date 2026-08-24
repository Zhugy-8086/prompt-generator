// modules/engine-config.js
// 引擎配置管理器，挂载 window.EngineConfig
// v8.9-P7：新增 domainVoter 开关；修复旧配置加载时新字段丢失问题

window.EngineConfig = (function() {
    const DEFAULT_CONFIG = {
        engines: {
            eliza: {
                enabled: true,
                subFeatures: { customRules: true, reflectSlider: true }
            },
            foreshadow: {
                enabled: true,
                subFeatures: {
                    autoDetect: true,
                    manualAdd: true,
                    speciesDetection: false,
                    powerLevelDetection: true,
                    acquisitionTracking: true,
                    contextInjection: true,
                    transitionEngine: true
                }
            },
            standardExtract: { enabled: true },
            // ★ v8.9 新增：领域投票器开关（默认关闭，待充分测试后开启）
            domainVoter: { enabled: false }
        },
        panels: {
            styleTags: true, sceneTemplate: true,
            negativePanel: true, history: true, multiShotMode: true
        }
    };

    let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    /* ============================================================
       深合并工具：加载旧配置时自动补全新增字段
       ============================================================ */
    function deepMerge(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                var srcVal = source[key];
                if (typeof srcVal === 'object' && srcVal !== null && !Array.isArray(srcVal)) {
                    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                    deepMerge(target[key], srcVal);
                } else {
                    if (target[key] === undefined) target[key] = srcVal;
                }
            }
        }
        return target;
    }

    function load() {
        try {
            const saved = localStorage.getItem('engineConfig_v87');
            if (saved) {
                var parsed = JSON.parse(saved);
                // v8.9 修复：深合并而非直接替换，确保新增字段（如 domainVoter）不会丢失
                config = deepMerge(parsed, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
            }
        } catch(e) {
            console.warn('[EngineConfig] localStorage 数据损坏，已使用默认配置', e);
            config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            try { localStorage.removeItem('engineConfig_v87'); } catch(clearErr) {}
        }
    }

    function save() {
        try {
            localStorage.setItem('engineConfig_v87', JSON.stringify(config));
        } catch(e) {
            console.warn('[EngineConfig] 保存配置失败', e);
        }
    }

    function isEnabled(engine) {
        return config.engines && config.engines[engine] ? (config.engines[engine].enabled ?? false) : false;
    }

    function isPanelVisible(panel) {
        return config.panels ? (config.panels[panel] ?? true) : true;
    }

    function setEngine(engine, enabled) {
        if (!config.engines) config.engines = {};
        if (!config.engines[engine]) config.engines[engine] = { enabled: enabled };
        config.engines[engine].enabled = enabled;
        save();
    }

    function setPanel(panel, visible) {
        if (!config.panels) config.panels = {};
        config.panels[panel] = visible;
        save();
    }

    // ========== v8.9 新增：子功能开关读取/设置 ==========
    function isSubFeatureEnabled(engine, subFeature) {
        if (!config.engines || !config.engines[engine]) return false;
        var sub = config.engines[engine].subFeatures;
        if (!sub) return false;
        return sub[subFeature] ?? false;
    }

    function setSubFeature(engine, subFeature, enabled) {
        if (!config.engines) config.engines = {};
        if (!config.engines[engine]) config.engines[engine] = { enabled: true };
        if (!config.engines[engine].subFeatures) config.engines[engine].subFeatures = {};
        config.engines[engine].subFeatures[subFeature] = enabled;
        save();
    }

    function reset() {
        config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        save();
    }

    function getConfig() { return config; }

    load();

    return {
        isEnabled,
        isPanelVisible,
        isSubFeatureEnabled,
        setEngine,
        setPanel,
        setSubFeature,
        reset,
        getConfig
    };
})();
