// ==================== 变体池管理模块 (pool-manager.js) ====================
// 挂载到 window.__ElizaPoolManager
// 管理变体池使用状态，实现规则变体的轮询去重

window.__ElizaPoolManager = (function() {

    const poolUsage = new Map(); // key: ruleIndex, value: usedIndices[]

    function pickFromPool(rule, ruleIndex) {
        if (!rule.pool || rule.pool.length === 0) {
            return typeof rule.reflect === 'function' ? rule.reflect('', []) : '';
        }
        let used = poolUsage.get(ruleIndex) || [];
        for (let i = 0; i < rule.pool.length; i++) {
            if (!used.includes(i)) {
                used.push(i);
                poolUsage.set(ruleIndex, used);
                return rule.pool[i];
            }
        }
        // 全部轮过，重置
        poolUsage.set(ruleIndex, [0]);
        return rule.pool[0];
    }

    function resetPool() {
        poolUsage.clear();
    }

    return {
        pickFromPool: pickFromPool,
        resetPool: resetPool
    };

})();