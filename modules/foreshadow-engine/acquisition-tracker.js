// modules/foreshadow-engine/acquisition-tracker.js
// 获取物追踪器 —— 追踪“谁获得了最重要的东西”
// 挂载到 window.__ForeshadowAcquisitionTracker
// 依赖：identity-dictionary.js 获取物维度 + 进化关键词

(function() {

    const dict = window.__ForeshadowIdentityDict;
    if (!dict) {
        window.__ForeshadowAcquisitionTracker = {
            scan: function() { return []; },
            getStatsByActor: function() { return {}; },
            reset: function() {},
            setEnabled: function() {}
        };
        return;
    }

    // 触发动词（计划书 2.2）
    const ACQUISITION_VERBS = [
        '获得','得到','获取','捡到','发现','继承','觉醒','绑定','开启','激活',
        '接收','传承','融合','契约','认主','降服','收服','炼化','吞噬','吞食'
    ];

    // 物品分级权重（计划书 2.4）
    const ITEM_WEIGHT_MAP = {
        '系统': 10, '金手指': 10, '修改器': 10, '主神空间': 10, '聊天群': 10,
        '游戏面板': 10, '属性面板': 10, '任务面板': 10, '商城': 10, '兑换系统': 10,

        '血脉': 8, '传承': 8, '神体': 8, '圣体': 8, '道体': 8, '异能': 8,
        '天赋': 8, '武魂': 8, '灵根': 8, '道种': 8,

        '神器': 6, '圣器': 6, '仙器': 6, '帝兵': 6, '道器': 6, '鸿蒙至宝': 6,
        '混沌至宝': 6, '天阶功法': 6, '圣阶功法': 6, '神阶功法': 6,
        '失传绝学': 6, '禁术': 6, '领域': 6,

        '储物戒': 3, '储物袋': 3, '空间戒指': 3, '灵药': 3, '法宝': 3,
        '秘籍': 3, '灵宠': 3, '魂兽': 3, '战宠': 3,

        '武器': 1, '丹药': 1, '护甲': 1, '灵石': 1, '金币': 1, '功法': 1
    };

    const evolutionKeywords = new Set(dict.getEvolutionKeywords());

    let enabled = true;
    let events = [];           // 存储 { actor, item, weight, position }
    let actorStats = {};       // actor -> totalWeight

    // 利用正则提取获取事件
    function extractAcquisitionEvents(text) {
        const results = [];
        // 构建正则：动词 + 了/的/到? + 物品（物品截到下一个标点为止）
        const verbPattern = ACQUISITION_VERBS.join('|');
        const pattern = new RegExp(`(${verbPattern})\\s*(?:了|的|到)?\\s*([^，。！？、；：]{1,15})`, 'g');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const verb = match[1];
            const rawItem = match[2].trim();
            // 简单清理：去除非物品描述
            if (rawItem.length === 0 || rawItem.length > 15) continue;
            if (/^[的地得着了过]/.test(rawItem)) continue;
            results.push({
                verb,
                item: rawItem,
                position: match.index
            });
        }
        return results;
    }

    // 在原始物品文本中解析已知物品并取权重（支持“传说中的神剑”这类包裹写法）
    function resolveItemWeight(rawItem) {
        if (ITEM_WEIGHT_MAP[rawItem]) return ITEM_WEIGHT_MAP[rawItem];
        for (const key in ITEM_WEIGHT_MAP) {
            if (rawItem.indexOf(key) !== -1) return ITEM_WEIGHT_MAP[key];
        }
        return 1;
    }

    // 归属推断（计划书 2.3）
    function inferActor(event, text, candidatePool) {
        const { position, item } = event;
        const textBefore = text.substring(Math.max(0, position - 30), position);

        // 1. 近距离身份标签匹配
        for (const cand of candidatePool) {
            const name = cand.name || cand.label; // 支持人名和物种身份标签
            if (name && textBefore.includes(name)) {
                return name;
            }
        }

        // 2. 段落主语延续（简化：如果有上一句检测到的主语）
        // 这里简单返回最近的已发现 actor，可由外部维护
        // 若无法判定，返回 'unknown'
        return 'unknown';
    }

    // 主扫描：记录窗口内获取事件
    function scan(text, candidatePool) {
        if (!enabled || !text) return [];
        const rawEvents = extractAcquisitionEvents(text);
        const windowEvents = [];

        for (const evt of rawEvents) {
            const actor = inferActor(evt, text, candidatePool || []);
            const weight = resolveItemWeight(evt.item);
            windowEvents.push({
                actor,
                item: evt.item,
                weight,
                position: evt.position
            });
            // 存储全局事件
            events.push({ actor, item: evt.item, weight, position: evt.position });
            // 更新归属统计
            if (actor !== 'unknown') {
                if (!actorStats[actor]) actorStats[actor] = 0;
                actorStats[actor] += weight;
            }
        }

        return windowEvents;
    }

    // 获取按归属者汇总的获取物总权重
    function getStatsByActor() {
        return JSON.parse(JSON.stringify(actorStats));
    }

    function reset() {
        events = [];
        actorStats = {};
    }

    function setEnabled(flag) { enabled = flag; }

    window.__ForeshadowAcquisitionTracker = {
        scan,
        getStatsByActor,
        reset,
        setEnabled
    };

})();