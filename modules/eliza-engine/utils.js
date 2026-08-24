// ==================== 工具函数模块 (utils.js) ====================
// 挂载到 window.__ElizaUtils
// 供 eliza-rules.js 索引文件组装使用

window.__ElizaUtils = (function() {

    const synonymGroups = window.__ElizaSynonymGroups;

    function extractAfter(text, keyword, maxLen) {
        const idx = text.indexOf(keyword);
        if (idx === -1) return '';
        const after = text.substring(idx + keyword.length).trim();
        const cleaned = after.replace(/[，。！？、；：""''「」『』\s]/g, '');
        return cleaned.length > 0 ? cleaned.substring(0, Math.min(cleaned.length, maxLen)) : '';
    }

    function extractBeforeOrAfter(text, keyword, maxLen) {
        const idx = text.indexOf(keyword);
        if (idx === -1) return '';
        const before = text.substring(Math.max(0, idx - maxLen), idx).replace(/[，。！？、；：""''「」『』\s]/g, '');
        if (before.length >= 2) return before;
        return extractAfter(text, keyword, maxLen);
    }

    function getItemText(item) {
        return typeof item === 'string' ? item : (item.text || '');
    }

    function addWithDedup(set, item) {
        const str = getItemText(item);
        if (!str || str.length < 2) return null;
        const cleaned = str.replace(/^\s+|\s+$/g, '');
        if (cleaned.length < 2) return null;
        const rep = synonymGroups.getSynonymRep(cleaned);
        for (const existing of set) {
            if (getItemText(existing) === cleaned) {
                return {
                    conflict: true,
                    existing: getItemText(existing),
                    incoming: cleaned,
                    candidates: synonymGroups.findSynonymCandidates(cleaned)
                };
            }
        }
        set.add(item);
        return { conflict: false, added: cleaned };
    }

    return {
        extractAfter: extractAfter,
        extractBeforeOrAfter: extractBeforeOrAfter,
        getItemText: getItemText,
        addWithDedup: addWithDedup
    };

})();