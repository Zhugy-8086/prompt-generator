// tests/lib/module-checker.js
// 模块完整性检测器
// 检查 window 上预期挂载点是否存在，输出缺件/多件报告

window.ModuleChecker = (function() {

    /**
     * 执行模块检测
     * @param {Array}  expectedModules - [{ name: '挂载点名称', file: '文件路径' }, ...]
     * @returns {Object} - { missing: [...], extra: [...], totalExpected: number, totalLoaded: number }
     */
    function run(expectedModules) {
        var report = {
            missing: [],       // 预期有但没加载的
            extra: [],         // window 上有但清单里没有的（可能是新增模块）
            totalExpected: expectedModules.length,
            totalLoaded: 0,
            allOk: true
        };

        // 收集清单中的挂载名
        var expectedNames = {};
        for (var i = 0; i < expectedModules.length; i++) {
            var m = expectedModules[i];
            expectedNames[m.name] = true;

            if (typeof window[m.name] === 'undefined') {
                report.missing.push({ name: m.name, file: m.file });
                report.allOk = false;
            } else {
                report.totalLoaded++;
            }
        }

        // 反向检查：只关注已知前缀的模块
        var knownPrefixes = ['__Eliza', '__Foreshadow', 'HPDC', 'DomainVoter'];
        for (var key in window) {
            if (expectedNames[key]) continue;
            var isKnown = knownPrefixes.some(function(prefix) { return key.indexOf(prefix) === 0; });
            if (isKnown && typeof window[key] !== 'undefined') {
                report.extra.push(key);
                report.allOk = false;
            }
        }

        return report;
    }

    /**
     * 在页面上渲染检测横幅
     * @param {Object} report - run() 的返回值
     * @returns {string} HTML 字符串
     */
    function renderBanner(report) {
        if (report.allOk) {
            return '<div style="background:#d4edda;border:1px solid #c3e6cb;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#155724;">✅ 所有模块加载正常（' + report.totalLoaded + '/' + report.totalExpected + '）</div>';
        }

        var html = '<div style="background:#f8d7da;border:1px solid #f5c6cb;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#721c24;">';
        html += '<strong>⚠️ 模块加载异常</strong>（已加载 ' + report.totalLoaded + '/' + report.totalExpected + '）<br>';

        if (report.missing.length > 0) {
            html += '<span>缺失模块：</span>';
            var missingNames = [];
            for (var i = 0; i < report.missing.length; i++) {
                missingNames.push(report.missing[i].file);
            }
            html += '<span style="font-weight:600;">' + missingNames.join('、') + '</span>';
            html += '<br><span style="font-size:0.75rem;color:#888;">请确保所有模块文件都在正确路径下。</span>';
        }

        if (report.extra.length > 0) {
            html += '<span>新增模块（清单未记录）：</span>';
            var extraNames = [];
            for (var j = 0; j < report.extra.length; j++) {
                extraNames.push(report.extra[j]);
            }
            html += '<span style="font-weight:600;">' + extraNames.join('、') + '</span>';
            html += '<br><span style="font-size:0.75rem;color:#888;">请更新 EXPECTED_MODULES 清单。</span>';
        }

        html += '</div>';
        return html;
    }

    return {
        run: run,
        renderBanner: renderBanner
    };

})();