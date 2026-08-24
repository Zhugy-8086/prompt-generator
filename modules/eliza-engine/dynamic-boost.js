// ==================== 动态优先级加权模块 (dynamic-boost.js) ====================
// 挂载到 window.__ElizaDynamicBoost
// 根据全文主题检测结果，计算各规则产出的动态优先级加成值

window.__ElizaDynamicBoost = (function() {

    const themeDetector = window.__ElizaThemeDetector;

    function calculateDynamicBoost(text) {
        var themes = themeDetector.detectTheme(text);
        var boost = {};

        if (themes.cthulhu) {
            boost['cthulhuBoost'] = 2;
        }
        if (themes.cyberpunk) {
            boost['cyberBoost'] = 2;
        }
        if (themes.horror) {
            boost['horrorBoost'] = 1;
        }
        if (themes.systemError) {
            boost['systemErrorBoost'] = 1;
        }

        return boost;
    }

    return {
        calculate: calculateDynamicBoost
    };

})();