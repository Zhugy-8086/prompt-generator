// ui/init.js
// 初始化入口 —— 模块就绪检测与协调
// 等待 modulesReady 事件或轮询，然后调用 AppSkeleton.render() 渲染界面
// v8.9-P7：集成 HC+level 数值体系全局配置 UI 与持久化

// ============================================================
// ★ 重要：以下代码在 init.js 顶部立即执行，作为 HPDC_CONFIG 的安全网。
//   但 init.js 若为 defer 加载，仍可能晚于 hpdc-core.js。
//   强烈建议在 prompt-tool-v8.8.1.html 的 <head> 中、所有模块之前，
//   插入一段内联脚本（见本文档末尾注释），确保配置最先就绪。
// ============================================================
(function() {
    var defaultConfig = { fracLayers: 6, mode: 'hybrid', saturation: true };
    try {
        var saved = localStorage.getItem('hpdcConfig');
        if (saved) {
            var parsed = JSON.parse(saved);
            window.HPDC_CONFIG = Object.assign({}, defaultConfig, parsed);
        } else {
            window.HPDC_CONFIG = defaultConfig;
        }
    } catch(e) {
        window.HPDC_CONFIG = Object.assign({}, defaultConfig);
    }
})();

(function() {
    // 预期的关键模块列表（用于降级检测）
    var requiredModules = [
        'Dictionaries',
        'ElizaRules',
        'StylePresets',
        'PlatformAdapters',
        'UiUtils',
        'ModeManager',
        'ExtractManager',
        'FormBindings',
        'NegativePanel',
        'OutputPanel',
        'EngineConfig',
        'AppSkeleton'
    ];

    function checkAllReady() {
        for (var i = 0; i < requiredModules.length; i++) {
            if (typeof window[requiredModules[i]] === 'undefined') {
                return false;
            }
        }
        return true;
    }

    function getMissingModules() {
        var missing = [];
        for (var i = 0; i < requiredModules.length; i++) {
            if (typeof window[requiredModules[i]] === 'undefined') {
                missing.push(requiredModules[i]);
            }
        }
        return missing;
    }

    // ========== v8.9 新增：HC 配置持久化与刷新 ==========
    function applyHPDCConfigAndReload(newConfig) {
        try {
            localStorage.setItem('hpdcConfig', JSON.stringify(newConfig));
        } catch(e) {
            console.error('[init] localStorage 写入失败', e);
            return;
        }
        if (confirm('HC 数值配置已修改，需要刷新页面才能生效。是否立即刷新？')) {
            window.location.reload();
        }
    }

    // ========== v8.9 新增：HC 设置面板 UI ==========
    function initHPDCSettingsUI() {
        var config = window.HPDC_CONFIG;
        if (!config) return;

        // 尝试找到引擎设置面板容器，否则在 app-root 顶部插入
        var container = document.getElementById('hpdc-settings');
        var anchor = document.getElementById('engine-settings') || document.getElementById('app-root');
        if (!container && anchor) {
            container = document.createElement('div');
            container.id = 'hpdc-settings';
            container.className = 'hpdc-settings-panel';
            container.style.cssText = 'margin:10px 0;padding:10px;border:1px solid #ddd;border-radius:4px;background:#fafafa;';
            anchor.insertBefore(container, anchor.firstChild);
        }
        if (!container) {
            console.warn('[init] 找不到挂载点，HC 设置面板未渲染');
            return;
        }

        // 防止重复初始化
        if (container.getAttribute('data-hpdc-initialized')) return;
        container.setAttribute('data-hpdc-initialized', 'true');

        // 标题（可折叠）
        var title = document.createElement('div');
        title.textContent = '🔢 HC+level 数值体系配置';
        title.style.cssText = 'font-weight:600;margin-bottom:8px;cursor:pointer;user-select:none;';
        container.appendChild(title);

        var body = document.createElement('div');
        body.style.display = 'block';
        container.appendChild(body);

        title.onclick = function() {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        };

        // 小数层数选择
        var layerLabel = document.createElement('label');
        layerLabel.textContent = '小数层数（精度）: ';
        layerLabel.style.cssText = 'display:block;margin:6px 0;font-size:0.9rem;';
        body.appendChild(layerLabel);

        var layerSelect = document.createElement('select');
        layerSelect.style.cssText = 'margin-left:4px;';
        [2, 4, 6].forEach(function(l) {
            var opt = document.createElement('option');
            opt.value = l;
            var label = l + ' 层';
            if (l === 2) label += '（快速，精度 2⁻¹⁶）';
            else if (l === 4) label += '（标准，精度 2⁻³²）';
            else label += '（高精度，精度 2⁻⁴⁸）';
            opt.textContent = label;
            if (config.fracLayers === l) opt.selected = true;
            layerSelect.appendChild(opt);
        });
        layerSelect.addEventListener('change', function(e) {
            var newConfig = Object.assign({}, config, { fracLayers: parseInt(e.target.value) });
            applyHPDCConfigAndReload(newConfig);
        });
        body.appendChild(layerSelect);

        // 模式选择
        var modeLabel = document.createElement('label');
        modeLabel.textContent = '默认模式: ';
        modeLabel.style.cssText = 'display:block;margin:6px 0;font-size:0.9rem;';
        body.appendChild(modeLabel);

        var modeSelect = document.createElement('select');
        modeSelect.style.cssText = 'margin-left:4px;';
        var modes = [
            { value: 'hc_only', label: '仅 HC（局部特征，饱和加法）' },
            { value: 'level_only', label: '仅 level（整数计数）' },
            { value: 'hybrid', label: '合体（大范围+高精度，完整进位）' }
        ];
        modes.forEach(function(m) {
            var opt = document.createElement('option');
            opt.value = m.value;
            opt.textContent = m.label;
            if (config.mode === m.value) opt.selected = true;
            modeSelect.appendChild(opt);
        });
        modeSelect.addEventListener('change', function(e) {
            var newConfig = Object.assign({}, config, { mode: e.target.value });
            applyHPDCConfigAndReload(newConfig);
        });
        body.appendChild(modeSelect);

        // 饱和开关
        var satWrap = document.createElement('label');
        satWrap.style.cssText = 'display:block;margin:6px 0;font-size:0.9rem;cursor:pointer;';
        var satCheckbox = document.createElement('input');
        satCheckbox.type = 'checkbox';
        satCheckbox.checked = config.saturation;
        satCheckbox.style.cssText = 'margin-right:4px;vertical-align:middle;';
        satCheckbox.addEventListener('change', function(e) {
            var newConfig = Object.assign({}, config, { saturation: e.target.checked });
            applyHPDCConfigAndReload(newConfig);
        });
        satWrap.appendChild(satCheckbox);
        satWrap.appendChild(document.createTextNode('仅 HC 模式：int_part 溢出时饱和（否则模 256 回绕）'));
        body.appendChild(satWrap);

        // 说明文字
        var hint = document.createElement('div');
        hint.textContent = '修改后需刷新页面生效。当前配置已持久化到 localStorage。';
        hint.style.cssText = 'font-size:0.75rem;color:#888;margin-top:8px;';
        body.appendChild(hint);
    }

    function initializeApp() {
        if (!checkAllReady()) {
            var missing = getMissingModules();
            console.error('[init] 模块缺失: ' + missing.join(', '));
            var root = document.getElementById('app-root');
            if (root) {
                root.innerHTML = '<div style="padding:40px;text-align:center;color:red;">核心模块缺失，请检查文件完整性</div>';
            }
            return;
        }

        // 调用骨架渲染器生成界面
        if (window.AppSkeleton && typeof window.AppSkeleton.render === 'function') {
            var ok = window.AppSkeleton.render();
            if (ok) {
                console.log('[init] 应用初始化成功 (V8.9-P7)');
                // v8.9：渲染成功后初始化 HC 设置面板
                initHPDCSettingsUI();
            } else {
                console.error('[init] 界面渲染失败');
            }
        } else {
            console.error('[init] AppSkeleton 模块不可用');
        }
    }

    function waitForModules() {
        // 如果已经就绪，直接初始化
        if (checkAllReady()) {
            initializeApp();
            return;
        }

        // 否则轮询等待（兼容 IE11 无 CustomEvent）
        var attempts = 0;
        var maxAttempts = 300; // 30秒
        var interval = setInterval(function() {
            attempts++;
            if (checkAllReady() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (checkAllReady()) {
                    initializeApp();
                } else {
                    var missing = getMissingModules();
                    console.error('[init] 模块加载超时，缺失: ' + missing.join(', '));
                    var root = document.getElementById('app-root');
                    if (root) {
                        root.innerHTML = '<div style="padding:40px;text-align:center;color:red;">模块加载超时，请刷新页面或检查文件完整性</div>';
                    }
                }
            }
        }, 100);
    }

    // 优先监听 modulesReady 事件（由 module-loader 派发）
    function setupListener() {
        if (window.modulesReady) {
            // 事件已经派发过，直接等待模块就绪
            waitForModules();
        } else if (typeof window.CustomEvent !== 'undefined') {
            window.addEventListener('modulesReady', function() {
                waitForModules();
            });
        } else {
            // 降级：直接开始轮询
            waitForModules();
        }
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupListener);
    } else {
        setupListener();
    }
})();

/*
================================================================================
【部署建议】为了确保 HPDC_CONFIG 在 hpdc-core.js 加载前就已就绪，
请在 prompt-tool-v8.8.1.html 的 <head> 中、所有外部模块脚本之前，
插入以下内联脚本（不依赖任何文件）：

<script>
(function() {
    var defaultConfig = { fracLayers: 6, mode: 'hybrid', saturation: true };
    try {
        var saved = localStorage.getItem('hpdcConfig');
        window.HPDC_CONFIG = saved ? JSON.parse(saved) : defaultConfig;
    } catch(e) {
        window.HPDC_CONFIG = defaultConfig;
    }
})();
</script>

这样可彻底避免加载顺序导致的默认值覆盖问题。
================================================================================
*/
