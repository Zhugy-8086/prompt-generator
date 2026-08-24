// ==================== 分册化词库 (发射引擎智能匹配专用) ====================
// 挂载到 window.Dictionaries 和 window.__DictionariesDomain (兼容新旧引用)
// v8.9-P1：集成 HC+level 数值体系，新增置信度向量与领域投票接口

window.__DictionariesDomain = (function() {
    
    // --- 分册定义 (V9 核心架构) ---
    const DOMAINS = {
        FANTASY_EPIC: "奇幻史诗",
        XIANXIA_XUANHUAN: "仙武玄幻",
        SCIFI_CYBER: "现代科幻",
        ANCIENT_OFFICIAL: "古代官场",
        ATMOSPHERE: "意境氛围",
        CHARACTER_ID: "人物身份",
        SPACE_LOCATION: "空间地名",
        AUDIOVISUAL: "视听叙事",
        CTHULHU_HORROR: "克苏鲁恐怖",
        MODERN_LIFE: "现代生活",
        GENERAL: "通用高频"
    };

    // --- 原始词库 + 领域映射 (一对一，向后兼容) ---
    const rawDomainMap = {
        // ================= 奇幻史诗 =================
        "巨龙": DOMAINS.FANTASY_EPIC, "魔法": DOMAINS.FANTASY_EPIC,
        "骑士": DOMAINS.FANTASY_EPIC, "精灵": DOMAINS.FANTASY_EPIC,
        "矮人": DOMAINS.FANTASY_EPIC, "兽人": DOMAINS.FANTASY_EPIC,
        "哥布林": DOMAINS.FANTASY_EPIC, "城堡": DOMAINS.FANTASY_EPIC,
        "王座": DOMAINS.FANTASY_EPIC, "骑士团": DOMAINS.FANTASY_EPIC,
        "龙骑士": DOMAINS.FANTASY_EPIC, "魔导师": DOMAINS.FANTASY_EPIC,
        "剑与魔法": DOMAINS.FANTASY_EPIC,

        // ================= 仙武玄幻 =================
        "道士": DOMAINS.XIANXIA_XUANHUAN, "真元": DOMAINS.XIANXIA_XUANHUAN,
        "元婴": DOMAINS.XIANXIA_XUANHUAN, "金丹": DOMAINS.XIANXIA_XUANHUAN,
        "渡劫": DOMAINS.XIANXIA_XUANHUAN, "飞升": DOMAINS.XIANXIA_XUANHUAN,
        "灵脉": DOMAINS.XIANXIA_XUANHUAN, "仙尊": DOMAINS.XIANXIA_XUANHUAN,
        "魔尊": DOMAINS.XIANXIA_XUANHUAN, "法器": DOMAINS.XIANXIA_XUANHUAN,
        "丹药": DOMAINS.XIANXIA_XUANHUAN, "功法": DOMAINS.XIANXIA_XUANHUAN,
        "剑修": DOMAINS.XIANXIA_XUANHUAN, "符师": DOMAINS.XIANXIA_XUANHUAN,
        "阵盘": DOMAINS.XIANXIA_XUANHUAN, "储物袋": DOMAINS.XIANXIA_XUANHUAN,
        "灵兽": DOMAINS.XIANXIA_XUANHUAN, "修炼": DOMAINS.XIANXIA_XUANHUAN,
        "御剑飞行": DOMAINS.XIANXIA_XUANHUAN, "神识": DOMAINS.XIANXIA_XUANHUAN,
        "内丹": DOMAINS.XIANXIA_XUANHUAN,
        "仙草": DOMAINS.XIANXIA_XUANHUAN, "秘宝": DOMAINS.XIANXIA_XUANHUAN,
        "拂尘": DOMAINS.XIANXIA_XUANHUAN, "念珠": DOMAINS.XIANXIA_XUANHUAN,
        "木鱼": DOMAINS.XIANXIA_XUANHUAN, "香炉": DOMAINS.XIANXIA_XUANHUAN,
        "招魂幡": DOMAINS.XIANXIA_XUANHUAN, "定魂珠": DOMAINS.XIANXIA_XUANHUAN,

        // ================= 现代科幻 / 赛博朋克 =================
        "赛博格": DOMAINS.SCIFI_CYBER, "仿生人": DOMAINS.SCIFI_CYBER,
        "AI": DOMAINS.SCIFI_CYBER, "全息投影": DOMAINS.SCIFI_CYBER,
        "脑机接口": DOMAINS.SCIFI_CYBER, "数据流": DOMAINS.SCIFI_CYBER,
        "黑客工具": DOMAINS.SCIFI_CYBER, "网络病毒": DOMAINS.SCIFI_CYBER,
        "等离子步枪": DOMAINS.SCIFI_CYBER, "能量护盾": DOMAINS.SCIFI_CYBER,
        "纳米机器人": DOMAINS.SCIFI_CYBER, "记忆芯片": DOMAINS.SCIFI_CYBER,
        "增强义眼": DOMAINS.SCIFI_CYBER, "外骨骼装甲": DOMAINS.SCIFI_CYBER,
        "义体": DOMAINS.SCIFI_CYBER, "植入体": DOMAINS.SCIFI_CYBER,
        "义体维修店": DOMAINS.SCIFI_CYBER, "地下黑市": DOMAINS.SCIFI_CYBER,
        "服务器机房": DOMAINS.SCIFI_CYBER, "数据中心": DOMAINS.SCIFI_CYBER,
        "数据海": DOMAINS.SCIFI_CYBER, "反乌托邦都市": DOMAINS.SCIFI_CYBER,
        "赛博空间": DOMAINS.SCIFI_CYBER, "增强现实广告牌": DOMAINS.SCIFI_CYBER,
        "无人机港口": DOMAINS.SCIFI_CYBER, "光缆通道": DOMAINS.SCIFI_CYBER,
        "基因改造诊所": DOMAINS.SCIFI_CYBER,
        // ★ 新增：系统错误/技术故障高频词汇
        "系统": DOMAINS.SCIFI_CYBER, "错误": DOMAINS.SCIFI_CYBER,
        "崩溃": DOMAINS.SCIFI_CYBER, "内存": DOMAINS.SCIFI_CYBER,
        "堆栈": DOMAINS.SCIFI_CYBER, "溢出": DOMAINS.SCIFI_CYBER,
        "蓝屏": DOMAINS.SCIFI_CYBER, "死机": DOMAINS.SCIFI_CYBER,
        "故障": DOMAINS.SCIFI_CYBER, "异常": DOMAINS.SCIFI_CYBER,
        "日志": DOMAINS.SCIFI_CYBER, "宕机": DOMAINS.SCIFI_CYBER,
        "重启": DOMAINS.SCIFI_CYBER, "备份": DOMAINS.SCIFI_CYBER,
        "恢复": DOMAINS.SCIFI_CYBER, "数据损坏": DOMAINS.SCIFI_CYBER,
        "信号干扰": DOMAINS.SCIFI_CYBER, "程序崩溃": DOMAINS.SCIFI_CYBER,

        // ================= 古代官场 =================
        "锦衣卫": DOMAINS.ANCIENT_OFFICIAL, "东厂": DOMAINS.ANCIENT_OFFICIAL,
        "军机处": DOMAINS.ANCIENT_OFFICIAL, "太极殿": DOMAINS.ANCIENT_OFFICIAL,
        "钦差": DOMAINS.ANCIENT_OFFICIAL, "知府": DOMAINS.ANCIENT_OFFICIAL,
        "县令": DOMAINS.ANCIENT_OFFICIAL, "科举": DOMAINS.ANCIENT_OFFICIAL,
        "奏折": DOMAINS.ANCIENT_OFFICIAL, "太监": DOMAINS.ANCIENT_OFFICIAL,
        "宫女": DOMAINS.ANCIENT_OFFICIAL, "嬷嬷": DOMAINS.ANCIENT_OFFICIAL,
        "圣旨": DOMAINS.ANCIENT_OFFICIAL, "官银": DOMAINS.ANCIENT_OFFICIAL,
        "邸报": DOMAINS.ANCIENT_OFFICIAL,
        "将军": DOMAINS.ANCIENT_OFFICIAL, "元帅": DOMAINS.ANCIENT_OFFICIAL,
        "都督": DOMAINS.ANCIENT_OFFICIAL, "宰相": DOMAINS.ANCIENT_OFFICIAL,
        "首辅": DOMAINS.ANCIENT_OFFICIAL, "大学士": DOMAINS.ANCIENT_OFFICIAL,
        "尚书": DOMAINS.ANCIENT_OFFICIAL, "秀才": DOMAINS.ANCIENT_OFFICIAL,
        "举人": DOMAINS.ANCIENT_OFFICIAL, "进士": DOMAINS.ANCIENT_OFFICIAL,

        // ================= 意境氛围 =================
        "晨曦": DOMAINS.ATMOSPHERE, "暮色": DOMAINS.ATMOSPHERE,
        "孤独": DOMAINS.ATMOSPHERE, "绝望": DOMAINS.ATMOSPHERE,
        "温暖": DOMAINS.ATMOSPHERE, "压抑": DOMAINS.ATMOSPHERE,
        "治愈": DOMAINS.ATMOSPHERE, "救赎": DOMAINS.ATMOSPHERE,
        "静谧": DOMAINS.ATMOSPHERE, "喧嚣": DOMAINS.ATMOSPHERE,
        "冷清": DOMAINS.ATMOSPHERE, "肃穆": DOMAINS.ATMOSPHERE,
        "光晕": DOMAINS.ATMOSPHERE, "逆光": DOMAINS.ATMOSPHERE,
        "柔光": DOMAINS.ATMOSPHERE, "硬光": DOMAINS.ATMOSPHERE,
        "冷光": DOMAINS.ATMOSPHERE, "暖光": DOMAINS.ATMOSPHERE,
        "烛光": DOMAINS.ATMOSPHERE, "月光": DOMAINS.ATMOSPHERE,

        // ================= 人物身份 =================
        "主播": DOMAINS.CHARACTER_ID, "网红": DOMAINS.CHARACTER_ID,
        "社畜": DOMAINS.CHARACTER_ID, "实习生": DOMAINS.CHARACTER_ID,
        "总裁": DOMAINS.CHARACTER_ID, "助理": DOMAINS.CHARACTER_ID,
        "刺客": DOMAINS.CHARACTER_ID, "法师": DOMAINS.CHARACTER_ID,
        "游侠": DOMAINS.CHARACTER_ID, "商人": DOMAINS.CHARACTER_ID,
        "剑客": DOMAINS.CHARACTER_ID,
        "炼丹师": DOMAINS.CHARACTER_ID, "阵法师": DOMAINS.CHARACTER_ID,
        "驭兽师": DOMAINS.CHARACTER_ID, "散修": DOMAINS.CHARACTER_ID,
        "圣女": DOMAINS.CHARACTER_ID,
        "网络黑客": DOMAINS.CHARACTER_ID, "赏金猎人": DOMAINS.CHARACTER_ID,
        "雇佣兵": DOMAINS.CHARACTER_ID, "特工": DOMAINS.CHARACTER_ID,
        "技术员": DOMAINS.CHARACTER_ID, "流浪佣兵": DOMAINS.CHARACTER_ID,

        // ================= 空间地名 =================
        "深渊": DOMAINS.SPACE_LOCATION, "悬崖": DOMAINS.SPACE_LOCATION,
        "洞穴": DOMAINS.SPACE_LOCATION, "城堡": DOMAINS.SPACE_LOCATION,
        "云端": DOMAINS.SPACE_LOCATION, "峡谷": DOMAINS.SPACE_LOCATION,
        "市舶司": DOMAINS.SPACE_LOCATION, "醉仙楼": DOMAINS.SPACE_LOCATION,
        "聚义厅": DOMAINS.SPACE_LOCATION, "演武场": DOMAINS.SPACE_LOCATION,
        "藏经阁": DOMAINS.SPACE_LOCATION, "炼丹房": DOMAINS.SPACE_LOCATION,

        // ================= 视听叙事 =================
        "慢镜头": DOMAINS.AUDIOVISUAL, "特写": DOMAINS.AUDIOVISUAL,
        "定帧": DOMAINS.AUDIOVISUAL, "画外音": DOMAINS.AUDIOVISUAL,
        "闪回": DOMAINS.AUDIOVISUAL, "航拍": DOMAINS.AUDIOVISUAL,
        "长镜头": DOMAINS.AUDIOVISUAL,

        // ================= 克苏鲁/恐怖 =================
        "克苏鲁": DOMAINS.CTHULHU_HORROR, "古神": DOMAINS.CTHULHU_HORROR,
        "旧日": DOMAINS.CTHULHU_HORROR, "支配者": DOMAINS.CTHULHU_HORROR,
        "不可名状": DOMAINS.CTHULHU_HORROR, "san值": DOMAINS.CTHULHU_HORROR,
        "疯狂": DOMAINS.CTHULHU_HORROR, "低语": DOMAINS.CTHULHU_HORROR,
        "呓语": DOMAINS.CTHULUU_HORROR, "触手": DOMAINS.CTHULHU_HORROR,
        "黏液": DOMAINS.CTHULHU_HORROR, "畸变": DOMAINS.CTHULHU_HORROR,
        "拉莱耶": DOMAINS.CTHULHU_HORROR, "印斯茅斯": DOMAINS.CTHULHU_HORROR,

        // ================= 现代生活 =================
        "加班": DOMAINS.MODERN_LIFE, "裸辞": DOMAINS.MODERN_LIFE,
        "996": DOMAINS.MODERN_LIFE, "摸鱼": DOMAINS.MODERN_LIFE,
        "内卷": DOMAINS.MODERN_LIFE, "躺平": DOMAINS.MODERN_LIFE,
        "外卖": DOMAINS.MODERN_LIFE, "咖啡": DOMAINS.MODERN_LIFE,
        "便利店": DOMAINS.MODERN_LIFE, "地铁站": DOMAINS.MODERN_LIFE,
    };

    // 短词边界检测
    function addBoundaryForShortPatterns(patterns) {
        return patterns.map(function(p) {
            var src = p.source;
            var hanChars = src.match(/[\u4e00-\u9fff]/g);
            var hanLen = hanChars ? hanChars.length : 0;
            if (hanLen === 2 && !src.startsWith('(?<!')) {
                var newSrc = '(?<![\u4e00-\u9fff])' + src + '(?![\u4e00-\u9fff])';
                return new RegExp(newSrc, p.flags);
            }
            return p;
        });
    }

    const entityPatterns = addBoundaryForShortPatterns(
        Object.keys(rawDomainMap).map(function(word) {
            return new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        })
    );

    const stopWords = new Set([
        '一个','这个','那个','他们','没有','什么','自己','还是','不过','可以',
        '然后','之后','已经','忽然','觉得','刚才','现在','最后','只是','一样',
        '着','了','过','的','是','在','被','让','把','从','给','对','啊','吧','呢','吗','哦','嗯',
        '并不','也不','还没','就是','还有','不是','只是','这也是','那也是','这才','才是',
        '这是','那是','俺','俺爹','俺娘','你们','他们','咱们','大哥','二哥','小弟',
        '笑道','说道','骂','问道','喊道','叫道','答道','回道','怒道',
    ]);

    /**
     * @deprecated 保留旧接口，直接查一对一映射。新代码建议使用 getTopDomain()。
     */
    function getDomainForWord(word) {
        return rawDomainMap[word] || DOMAINS.GENERAL;
    }

    function getWordListForDomain(domain) {
        return Object.keys(rawDomainMap).filter(function(w) {
            return rawDomainMap[w] === domain;
        });
    }

    // ============================================================
    // HC+level 数值体系集成 (v8.9 新增)
    // ============================================================
    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);

    // --- 手动标注的高频词置信度向量（示例起点，逐步扩展至全部词条） ---
    var wordConfidenceMap = {};
    if (HPDC_AVAILABLE) {
        var HPDC8 = window.HPDC.HPDC8;
        wordConfidenceMap = {
            "巨龙": {
                [DOMAINS.FANTASY_EPIC]: HPDC8.fromConfidence(0.95),
                [DOMAINS.XIANXIA_XUANHUAN]: HPDC8.fromConfidence(0.30),
                [DOMAINS.GENERAL]: HPDC8.fromConfidence(0.10)
            },
            "道士": {
                [DOMAINS.XIANXIA_XUANHUAN]: HPDC8.fromConfidence(0.90),
                [DOMAINS.FANTASY_EPIC]: HPDC8.fromConfidence(0.15),
                [DOMAINS.ANCIENT_OFFICIAL]: HPDC8.fromConfidence(0.10)
            },
            "城堡": {
                [DOMAINS.FANTASY_EPIC]: HPDC8.fromConfidence(0.90),
                [DOMAINS.SPACE_LOCATION]: HPDC8.fromConfidence(0.40)
            },
            "将军": {
                [DOMAINS.ANCIENT_OFFICIAL]: HPDC8.fromConfidence(0.85),
                [DOMAINS.CHARACTER_ID]: HPDC8.fromConfidence(0.60)
            },
            "主播": {
                [DOMAINS.CHARACTER_ID]: HPDC8.fromConfidence(0.90),
                [DOMAINS.MODERN_LIFE]: HPDC8.fromConfidence(0.70)
            },
            "赛博格": {
                [DOMAINS.SCIFI_CYBER]: HPDC8.fromConfidence(0.95),
                [DOMAINS.CHARACTER_ID]: HPDC8.fromConfidence(0.30)
            },
            "克苏鲁": {
                [DOMAINS.CTHULHU_HORROR]: HPDC8.fromConfidence(0.98),
                [DOMAINS.GENERAL]: HPDC8.fromConfidence(0.05)
            }
        };
    }

    // 缓存：word -> { domainName: HPDC8 }
    var confidenceCache = new Map();

    /**
     * 根据词长和领域特性生成默认置信度（仅 HC 模式）。
     * 用于尚未手动标注的词条。
     */
    function generateDefaultConfidence(word, domain) {
        if (!HPDC_AVAILABLE) return null;
        var len = word.length;
        var base = 0.60;
        if (len >= 4) base = 0.90;
        else if (len === 3) base = 0.80;
        else if (len === 2) base = 0.70;
        if (domain === DOMAINS.GENERAL) base = 0.30;
        return window.HPDC.HPDC8.fromConfidence(Math.min(base, 1.0));
    }

    /**
     * 获取单个词的多领域置信度映射。
     * @param {string} word
     * @returns {Object} { domainName: HPDC8, ... }，若 HPDC 未加载则抛错。
     */
    function getDomainConfidence(word) {
        if (!HPDC_AVAILABLE) {
            throw new Error('[Dictionaries] HPDC8 not available. Load hpdc-core.js before dictionaries.js.');
        }
        if (confidenceCache.has(word)) {
            var cached = confidenceCache.get(word);
            var out = {};
            for (var d in cached) out[d] = cached[d].clone();
            return out;
        }

        var source = {};
        if (wordConfidenceMap.hasOwnProperty(word)) {
            var map = wordConfidenceMap[word];
            for (var d in map) source[d] = map[d];
        } else {
            var domain = rawDomainMap[word];
            if (domain) {
                source[domain] = generateDefaultConfidence(word, domain);
            } else {
                source[DOMAINS.GENERAL] = generateDefaultConfidence(word, DOMAINS.GENERAL);
            }
        }

        confidenceCache.set(word, source);
        // 返回深拷贝（clone HPDC8），防止外部修改缓存
        var result = {};
        for (var d in source) result[d] = source[d].clone();
        return result;
    }

    /**
     * 获取置信度最高的单一领域（快速辅助）。
     * @param {string} word
     * @returns {{domain:string, confidence:HPDC8}|null}
     */
    function getTopDomain(word) {
        if (!HPDC_AVAILABLE) return null;
        var conf = getDomainConfidence(word);
        var domains = Object.keys(conf);
        if (domains.length === 0) return null;

        var bestDomain = domains[0];
        var bestConf = conf[bestDomain];
        for (var i = 1; i < domains.length; i++) {
            var d = domains[i];
            var c = conf[d];
            if (window.HPDC.HPDC8.compare(c, bestConf) > 0) {
                bestDomain = d;
                bestConf = c;
            }
        }
        return { domain: bestDomain, confidence: bestConf };
    }

    /**
     * 合并多个词的领域置信度（投票累加）。
     * @param {string[]} wordList
     * @param {Object} options
     *   @param {boolean} options.saturate - 是否使用仅 HC 饱和加法，默认 true
     *   @param {number} options.topN - 返回前 N 个领域，默认 2
     * @returns {Array<{domain:string, confidence:HPDC8}>}
     */
    function mergeDomainConfidences(wordList, options) {
        if (!HPDC_AVAILABLE) {
            throw new Error('[Dictionaries] HPDC8 not available. Load hpdc-core.js before dictionaries.js.');
        }
        options = options || {};
        var saturate = options.saturate !== false; // 默认 true
        var topN = options.topN || 2;

        var accumulator = new Map(); // domain -> HPDC8

        for (var i = 0; i < wordList.length; i++) {
            var word = wordList[i];
            var confMap = getDomainConfidence(word);
            for (var domain in confMap) {
                var hpdc = confMap[domain];
                if (!accumulator.has(domain)) {
                    accumulator.set(domain, hpdc.clone());
                } else {
                    var old = accumulator.get(domain);
                    var newVal;
                    if (saturate) {
                        newVal = window.HPDC.HPDC8.addHCOnly(old, hpdc);
                    } else {
                        newVal = window.HPDC.HPDC8.addLeveled(old, hpdc);
                    }
                    accumulator.set(domain, newVal);
                }
            }
        }

        var entries = Array.from(accumulator.entries());
        entries.sort(function(a, b) {
            var cmp = window.HPDC.HPDC8.compare(b[1], a[1]); // 降序
            if (cmp !== 0) return cmp;
            return a[0].localeCompare(b[0]); // 平局时按领域名字母序，确保确定性
        });

        return entries.slice(0, topN).map(function(item) {
            return { domain: item[0], confidence: item[1] };
        });
    }

    // ============================================================
    // 导出对象
    // ============================================================
    var exportObj = {
        // --- 旧接口（完全保留，向后兼容） ---
        rawDomainMap: rawDomainMap,
        entityPatterns: entityPatterns,
        stopWords: stopWords,
        getDomainForWord: getDomainForWord,
        getWordListForDomain: getWordListForDomain,
        DOMAINS: DOMAINS,

        // --- 新增接口（v8.9 HC+level） ---
        getDomainConfidence: getDomainConfidence,
        getTopDomain: getTopDomain,
        mergeDomainConfidences: mergeDomainConfidences,

        // --- 元信息 ---
        __HPDC_ENABLED: HPDC_AVAILABLE,
        __version: '8.9-p1'
    };

    // ★ 同时挂载到 window.Dictionaries（兼容旧引用）和 window.__DictionariesDomain（新引用）
    window.Dictionaries = exportObj;
    return exportObj;
})();
