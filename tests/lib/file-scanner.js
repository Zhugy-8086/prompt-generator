// tests/lib/file-scanner.js
// 文件加载完整性检测器
// 扫描 <script> 标签，对比预期文件清单，输出缺件/多件报告

window.FileScanner = (function() {

    /**
     * 扫描已加载的模块文件
     * @returns {Array} - ['modules/dictionaries.js', 'modules/eliza-rules.js', ...]
     */
    function scanLoadedFiles() {
        var scripts = document.querySelectorAll('script[src*="modules/"]');
        var loaded = [];
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src');
            // 去掉 ../ 前缀，统一路径格式
            src = src.replace(/^\.\.\//, '');
            loaded.push(src);
        }
        return loaded;
    }

    /**
     * 对比已加载文件与预期清单
     * @param {Array} expectedFiles - ['modules/dictionaries.js', ...]
     * @returns {Object} - { missing: [...], extra: [...], allOk: boolean }
     */
    function compare(expectedFiles) {
        var loaded = scanLoadedFiles();
        var loadedMap = {};
        for (var i = 0; i < loaded.length; i++) {
            loadedMap[loaded[i]] = true;
        }

        var missing = [];
        for (var j = 0; j < expectedFiles.length; j++) {
            if (!loadedMap[expectedFiles[j]]) {
                missing.push(expectedFiles[j]);
            }
        }

        var expectedMap = {};
        for (var k = 0; k < expectedFiles.length; k++) {
            expectedMap[expectedFiles[k]] = true;
        }

        var extra = [];
        for (var l = 0; l < loaded.length; l++) {
            if (!expectedMap[loaded[l]]) {
                extra.push(loaded[l]);
            }
        }

        return {
            missing: missing,
            extra: extra,
            loadedCount: loaded.length,
            expectedCount: expectedFiles.length,
            allOk: missing.length === 0 && extra.length === 0
        };
    }

    /**
     * 生成检测横幅 HTML
     * @param {Object} report - compare() 的返回值
     * @returns {string}
     */
    function renderBanner(report) {
        if (report.allOk) {
            return '<div style="background:#d4edda;border:1px solid #c3e6cb;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#155724;">' +
                '✅ 文件完整性检测通过（' + report.loadedCount + '/' + report.expectedCount + '）</div>';
        }

        var html = '<div style="background:#f8d7da;border:1px solid #f5c6cb;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#721c24;">';
        html += '<strong>⚠️ 文件完整性异常</strong><br>';

        if (report.missing.length > 0) {
            html += '<span>缺失文件：</span>';
            html += '<span style="font-weight:600;">' + report.missing.join('、') + '</span>';
            html += '<br><span style="font-size:0.75rem;color:#888;">请检查文件是否存在于正确路径。</span>';
        }

        if (report.extra.length > 0) {
            html += '<span>新增文件（未在预期清单中）：</span>';
            html += '<span style="font-weight:600;">' + report.extra.join('、') + '</span>';
            html += '<br><span style="font-size:0.75rem;color:#888;">请更新预期文件清单。</span>';
        }

        html += '</div>';
        return html;
    }

    return {
        scanLoadedFiles: scanLoadedFiles,
        compare: compare,
        renderBanner: renderBanner
    };

})();