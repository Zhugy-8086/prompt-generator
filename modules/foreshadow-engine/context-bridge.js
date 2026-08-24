// modules/foreshadow-engine/context-bridge.js
// 上下文注入器 —— 伏笔引擎 → 反射引擎的桥梁
// 挂载到 window.__ForeshadowContextBridge
// 将主角身份档案转换为反射引擎可识别的上下文声明

(function() {

    let enabled = true;

    // 注入主角上下文到文本头部（计划书 9.2）
    function injectContext(originalText, protagonistProfile) {
        if (!enabled) return originalText;
        if (!protagonistProfile || !protagonistProfile.name) return originalText;
        if (!originalText) return originalText || '';

        const p = protagonistProfile;
        var parts = [];

        if (p.name) parts.push('[主角:' + p.name + ']');
        if (p.species) parts.push('[种族:' + p.species + ']');
        if (p.powerLevel) parts.push('[等级:' + p.powerLevel + ']');
        if (p.evolutionChain && p.evolutionChain.length > 0) {
            parts.push('[当前阶段:' + p.evolutionChain[p.evolutionChain.length - 1] + ']');
        } else if (p.name) {
            parts.push('[当前阶段:' + p.name + ']');
        }

        if (parts.length === 0) return originalText;

        // 注入到文本头部
        return parts.join('') + '\n' + originalText;
    }

    // 提取反射引擎可用的上下文对象（计划书 9.5）
    function extractContextForReflect(protagonistProfile) {
        if (!protagonistProfile || !protagonistProfile.name) return null;

        return {
            name: protagonistProfile.name,
            species: protagonistProfile.species || null,
            powerLevel: protagonistProfile.powerLevel || null,
            evolutionStage: protagonistProfile.evolutionChain && protagonistProfile.evolutionChain.length > 0
                ? protagonistProfile.evolutionChain[protagonistProfile.evolutionChain.length - 1]
                : protagonistProfile.name,
            acquisitionTotalWeight: protagonistProfile.acquisitionTotalWeight || 0,
            chainLength: protagonistProfile.chainLength || 0
        };
    }

    function setEnabled(flag) { enabled = flag; }

    // 公开接口
    window.__ForeshadowContextBridge = {
        injectContext: injectContext,
        extractContextForReflect: extractContextForReflect,
        setEnabled: setEnabled
    };

})();