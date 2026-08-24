// ==================== 单句反射规则模块 (builtin-rules.js) ====================
// 挂载到 window.__ElizaBuiltinRules
// v8.9-P5：内置规则 priority 迁移至 HPDC8

window.__ElizaBuiltinRules = (function() {

    const utils = window.__ElizaUtils;
    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);
    const HPDC8 = HPDC_AVAILABLE ? window.HPDC.HPDC8 : null;

    // 辅助：统一生成 priority（HPDC8 或降级到 number）
    function P(n) {
        return HPDC_AVAILABLE ? HPDC8.fromNumber(n) : n;
    }

    const builtinRules = [
        // ---------- 人物出场 ----------
        { pattern: /(?:走进|踏入|步入|闯入|闪现|出现)(?:了|来|去|在|到)?(?:一[个位名]|眼前|房中|厅中|林中|场上)?/, priority: P(7),
          reflect: function(s) {
            if (/和尚|僧人|禅师|大师|上师|方丈/.test(s)) return '黑衣僧人步入的瞬间';
            if (/将军|元帅|军官/.test(s)) return '将军入场的瞬间';
            if (/皇帝|陛下|皇上/.test(s)) return '圣驾降临的瞬间';
            if (/少年|孩子|童子/.test(s)) return '少年突然出现';
            if (/女子|少女|姑娘|妇人/.test(s)) return '女子步入的刹那';
            if (/刺客|蒙面|黑衣人/.test(s)) return '暗影中的来者';
            if (/侠客|剑客|刀客/.test(s)) return '独行侠客的现身';
            return '不速之客的到来';
          }
        },
        { pattern: /却在此(?:时|刻|处)[\s\S]{0,10}(?:走进|出现|闯入|闪现|来)/, priority: P(7),
          reflect: function() { return '意外的闯入者'; }
        },
        { pattern: /(?:走进|进来|来)(?:了|的|这|那|是|人|一个|一)/, condition: function(s) { return /和尚|僧人|老头|少年|陌生人|士兵|使者|侠客|女子/.test(s); }, priority: P(6),
          reflect: function(s) {
            const actors = ['和尚','僧人','老头','少年','陌生人','士兵','使者','太监','宫女','将军','侠客','刺客','女子'];
            for (const a of actors) { if (s.includes(a)) return a + '的入场'; }
            return '有人来了';
          }
        },

        // ---------- 冲突/对峙 ----------
        { pattern: /对峙|怒视|对抗|僵持|谁也(?:不|没)/, priority: P(6),
          pool: [
            '紧张的对峙瞬间',
            '剑拔弩张的僵持',
            '谁也不肯退让的对视',
            '一触即发的冲突',
            '空气凝固的对峙'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /(?:拔|抽出|亮出|拔出|抽出|擎出)(?:了|的|着)?(?:腰间|背后|鞘中|手中|身侧)?(?:的)?(?:长剑|利剑|短剑|重剑|巨剑|佩剑|刀|长刀|短刀|弯刀|匕首|短匕|战斧|长枪|陌刀|雁翎刀|绣春刀|斩马刀)/, priority: P(7),
          pool: [
            '拔剑的刹那——寒光出鞘',
            '刀锋出鞘的一闪',
            '剑刃映出人影的倒影',
            '利刃出鞘，杀气骤现',
            '兵器出鞘的瞬间——空气凝滞',
            '寒光一闪，锋芒毕露'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /(?:抡起|举起|抄起|提起|扛起)(?:了|的)?(?:铁锤|战锤|巨斧|狼牙棒|棍棒|禅杖|月牙铲|长戟|方天画戟)/, priority: P(6),
          pool: [
            '重兵出阵的刹那——气势压顶',
            '巨刃破空的瞬间',
            '战器在手，一触即发'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /(?:端起|举起|抬起|架起|取出)(?:了|的)?(?:弓|弩|火枪|手炮|法杖|魔杖|权杖|扇|笛|箫|拂尘|折扇|羽扇)/, priority: P(5),
          pool: [
            '兵器在手的定格瞬间',
            '武器就位的特写',
            '手中之物蓄势待发'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /冷笑一声|冷哼一声|轻哼一声/, priority: P(4),
          reflect: function() { return '轻蔑冷笑的瞬间'; }
        },

        // ---------- 情绪转折 ----------
        { pattern: /醍醐灌顶|恍然大悟|突然明白|豁然开朗|如梦初醒|幡然醒悟/, priority: P(8),
          pool: [
            '醍醐灌顶的顿悟瞬间',
            '豁然开朗的眼神',
            '如梦初醒的表情定格',
            '幡然醒悟的刹那'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /遍体生寒|毛骨悚然|背脊发凉|不寒而栗/, priority: P(8),
          pool: [
            '脊背发凉的恐惧',
            '毛骨悚然的寒意',
            '一股寒意爬上背脊',
            '不寒而栗的战栗'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /脸色.*(?:变|沉|僵|白|青|黑)/, priority: P(5),
          reflect: function() { return '脸色骤变的瞬间'; }
        },
        { pattern: /(?:忽然|突然|猛地|蓦地|陡然)(?:想|记|发|意识|醒|明白)/, priority: P(6),
          reflect: function() { return '猛然醒悟的瞬间'; }
        },
        { pattern: /(?:不敢|无法|难以)(?:相信|置信|想象)/, priority: P(5),
          pool: [
            '难以置信的眼神',
            '震惊凝滞的刹那',
            '世界仿佛静止的瞬间'
          ],
          reflect: function() { return this.pool[0]; }
        },

        // ---------- 紧张氛围 ----------
        { pattern: /落针可闻|鸦雀无声|寂静无声|屏息|大气不敢出/, priority: P(5),
          pool: [
            '落针可闻的寂静',
            '连呼吸都凝滞的安静',
            '针落有声的死寂',
            '鸦雀无声的凝固'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /仿佛.*(?:老鼠见了猫|耗子见了猫)/, priority: P(5),
          reflect: function() { return '老鼠见了猫的畏惧'; }
        },
        { pattern: /山雨欲来/, priority: P(5),
          reflect: function() { return '山雨欲来的压迫感'; }
        },
        { pattern: /(?:所有|一切|周围)(?:声音|动静|声响).*(?:消失|停止|中断|戛然而止)/, priority: P(5),
          pool: [
            '所有声音消失的真空',
            '世界被按下了静音键',
            '寂静如潮水般涌来的刹那'
          ],
          reflect: function() { return this.pool[0]; }
        },

        // ---------- 悲伤/虐心 ----------
        { pattern: /眼泪.*(?:夺眶|滑落|流下|滚落)/, priority: P(6),
          pool: [
            '泪水夺眶而出的瞬间',
            '泪珠滑落的特写',
            '眼眶再也兜不住的决堤',
            '泪水模糊视线的刹那',
            '一滴泪砸在地面的慢镜头'
          ],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /忍着.*泪|忍住.*泪|硬生生.*(?:憋回|忍住)/, priority: P(6),
          reflect: function() { return '强忍泪水的隐忍'; }
        },
        { pattern: /泪水/, priority: P(5),
          pool: ['含泪的眼眸', '闪烁的泪光'],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /眼泪/, priority: P(5),
          pool: ['滑落的眼泪', '一滴泪珠'],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /喜极而泣|嘴角.*(?:上扬|扬起)|嘴角却|嘴角不自觉|眼角带笑/, priority: P(6),
          pool: ['喜极而泣的嘴角上扬', '眼角带笑的泪光'],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /(?:哽咽|抽泣|啜泣)/, priority: P(5),
          reflect: function() { return '无声的啜泣'; }
        },

        // ---------- 微笑/治愈 ----------
        { pattern: /微笑/, priority: P(4),
          pool: ['温暖的微笑', '嘴角扬起的弧度', '眼底浮现的笑意'],
          reflect: function() { return this.pool[0]; }
        },
        { pattern: /苦笑/, priority: P(4), reflect: function() { return '苦涩的笑容'; } },
        { pattern: /冷笑/, condition: function(s) { return !/冷笑一声|冷哼一声|轻哼一声/.test(s); }, priority: P(4), reflect: function() { return '冰冷的笑意'; } },

        // ---------- 眼神/凝视 ----------
        { pattern: /(望着|凝视|注视|眺望|望向)(?:着)?(?:那|远方的|远处的|前方的|窗外的|天边的)?([\u4e00-\u9fff]{2,6})?/, priority: P(4),
          reflect: function(s, m) {
            const target = m[2] || '远方';
            return '望向' + target + '的凝视';
          }
        },
        { pattern: /(?:眼里|眼底|眼中|目光里)(?:满是|藏着|闪过|透着|写满)([\u4e00-\u9fff]{2,6})/, priority: P(5),
          reflect: function(s, m) { return m[1] + '的眼神'; }
        },
        { pattern: /回眸/, priority: P(4), reflect: function() { return '回眸的一瞬'; } },

        // ---------- 人物状态 ----------
        { pattern: /独自/, priority: P(3),
          reflect: function(s) { return '孤独的' + utils.extractAfter(s, '独自', 4); }
        },
        { pattern: /沉默/, priority: P(3),
          reflect: function(s) { return '沉默的' + utils.extractBeforeOrAfter(s, '沉默', 4); }
        },
        { pattern: /疲惫/, priority: P(3),
          reflect: function(s) { return '疲惫的' + utils.extractBeforeOrAfter(s, '疲惫', 4); }
        },
        { pattern: /(?:浑身|遍体)(?:是伤|鳞伤|血迹)/, priority: P(4),
          reflect: function() { return '遍体鳞伤的剪影'; }
        },
        { pattern: /(?:风尘仆仆|风尘|仆仆|满面风霜)/, priority: P(3),
          reflect: function() { return '风尘仆仆的身影'; }
        },

        // ---------- 氛围/自然 ----------
        { pattern: /黄昏/, priority: P(2), reflect: function() { return '黄昏的余晖'; } },
        { pattern: /黎明/, priority: P(2), reflect: function() { return '黎明的微光'; } },
        { pattern: /深夜/, priority: P(2), reflect: function() { return '深夜的寂静'; } },
        { pattern: /清晨/, priority: P(2), reflect: function() { return '清晨的薄雾'; } },
        { pattern: /午后/, priority: P(2), reflect: function() { return '午后的阳光'; } },
        { pattern: /雨/, condition: function(s) { return /淅沥|滂沱|绵绵|细密|倾盆/.test(s); }, priority: P(3),
          reflect: function(s) { return '雨幕下的朦胧'; }
        },
        { pattern: /雪/, condition: function(s) { return /飘落|纷飞|皑皑|漫天/.test(s ? s : ''); }, priority: P(3),
          reflect: function(s) { return '雪原上的寂寥'; }
        },
        { pattern: /风/, condition: function(s) { return /呼啸|凛冽|猎猎|刺骨|劲/.test(s); }, priority: P(3),
          reflect: function(s) { return '风中的呼啸'; }
        },
        { pattern: /雾/, condition: function(s) { return /弥漫|浓重|薄薄|缭绕|笼罩/.test(s); }, priority: P(3),
          reflect: function(s) { return '雾霭中的迷蒙'; }
        },

        // ---------- 宏大叙事 ----------
        { pattern: /战场/, priority: P(4), reflect: function() { return '硝烟弥漫的战场'; } },
        { pattern: /旗帜/, priority: P(3), reflect: function() { return '飘扬的旗帜'; } },
        { pattern: /王座/, priority: P(4), reflect: function() { return '空荡的王座'; } },
        { pattern: /背叛/, priority: P(4), reflect: function() { return '背叛的阴影'; } },
        { pattern: /牺牲/, priority: P(4), reflect: function() { return '牺牲的悲壮'; } },
        { pattern: /誓言/, priority: P(3), reflect: function() { return '庄严的誓言'; } },
        { pattern: /神性|降临|神圣/, priority: P(4), reflect: function() { return '神性降临的瞬间'; } },
        { pattern: /宿命|轮回|命中注定/, priority: P(4), reflect: function() { return '宿命轮回的暗示'; } },
        { pattern: /执念|放不下|舍不得/, priority: P(4), reflect: function() { return '执念缠绕的瞬间'; } },
        { pattern: /江山|天下|社稷|黎民|苍生/, priority: P(4), reflect: function() { return '天下苍生的重担'; } },
        { pattern: /末日|浩劫|灾变|天灾/, priority: P(5), reflect: function() { return '末日降临的景象'; } },

        // ---------- 烟火气 ----------
        { pattern: /菜市场|大排档|小吃摊|小卖部/, priority: P(3), reflect: function() { return '市井烟火气'; } },
        { pattern: /炊烟|热腾腾|热气腾腾/, priority: P(2), reflect: function() { return '升腾的烟火气'; } },
        { pattern: /熙熙攘攘|人来人往|热闹/, priority: P(2), reflect: function() { return '喧闹的人潮'; } },

        // ---------- 读者反应 ----------
        { pattern: /破防|崩溃|撑不住/, priority: P(5), reflect: function() { return '崩溃边缘的瞬间'; } },
        { pattern: /泪目|看哭|忍不住/, priority: P(5), reflect: function() { return '眼眶泛红的瞬间'; } },
        { pattern: /燃|热血|沸腾|炸裂/, priority: P(5), reflect: function() { return '高燃时刻——逆光中的剪影'; } },
        { pattern: /治愈|磕到了|姨母笑/, priority: P(4), reflect: function() { return '温暖治愈的瞬间'; } },
        { pattern: /心动|心跳/, priority: P(4), reflect: function() { return '心动加速的瞬间'; } },
        { pattern: /反转|细思极恐|人傻了/, priority: P(4), reflect: function() { return '反转瞬间——瞳孔骤缩'; } },

        // ---------- v8.9 补全：省略号/无语 ----------
        { pattern: /(?:\.{2,}|。{2,}|…{1,})/, priority: P(5),
          pool: [
            '相对无言的沉默，省略号堆出无语的空白',
            '省略号替无语作答，沉默沉入空白',
            '戛然而止的空白，省略号写下无语和沉默',
            '无语的沉默被省略号拉成长长空白',
            '相对而坐的沉默，省略号替无语填满空白',
            '空白里只有省略号，沉默和无语都不必说',
            '欲言又止的沉默里，省略号写满无语空白'
          ],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：克苏鲁/赛博 主题 ----------
        { pattern: /古神|低语|克苏鲁|不可名状|疯狂|san值/i, priority: P(6),
          pool: ['古神低语的失语','理智归零的疯狂','不可名状的污染'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /数据流|算法|劫持|信号|网络|AI|系统离线|通讯/, priority: P(5),
          pool: ['通讯频道崩坏的白噪音','脑机接口的信号中断','数据被劫持的通讯死寂'],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：乱码/报错 ----------
        { pattern: /[æøåˆ´©ƒ∂ß∆˚¬Ω≈ç√█]/, priority: P(6),
          pool: ['理智归零的乱码','古神低语的疯狂','不可名状的污染','屏幕被涂黑的方块','遭抹去的内容'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /#\$%|\^&|@!|~±|§/, priority: P(5),
          pool: ['数据被劫持的乱码','脑机接口的信号中断','植入体传来的损坏'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /0x[0-9A-Fa-f]+|十六进制|内存|堆栈|转储/, priority: P(5),
          pool: ['十六进制错误码的闪烁','内存转储的死寂','堆栈溢出的崩溃'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /CRITICAL|致命错误|未捕获|异常|报错/, priority: P(5),
          pool: ['未捕获的致命异常','系统 CRITICAL 警报','报错引发的崩溃'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /[01]{8,}|防火墙|攻破|离线/, priority: P(5),
          pool: ['防火墙被攻破的瞬间','二进制数据的离线','通讯中断的死寂'],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：角色复杂情绪 ----------
        { pattern: /咬着嘴唇|强忍|不让眼泪|眼泪掉下来/, priority: P(5),
          pool: ['强忍泪水的嘴唇','不让眼泪掉落的隐忍'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /握紧拳头|青筋|暴起|愤怒|颤抖/, priority: P(6),
          pool: ['愤怒到颤抖的青筋','攥紧拳头的愤怒'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /绝望|跳下悬崖|转身/, priority: P(5),
          pool: ['绝望的微笑','转身跳下悬崖的决绝'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /瞪大眼睛|嘴巴微张|僵在|惊恐|呆滞/, priority: P(6),
          pool: ['惊恐瞪大的双眼','僵在原地的呆滞'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /低下头|不敢看|内疚|躲闪/, priority: P(5),
          pool: ['内疚低头的瞬间','不敢对视的躲闪'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /长长地叹气|释然|放下|轻松/, priority: P(5),
          pool: ['释然的长叹','终于放下的轻松'],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：特效/画面感 ----------
        { pattern: /缓缓|凝固|慢镜头|升格|时间仿佛/, priority: P(5),
          pool: ['时间凝固的慢镜头','升格镜头里的缓慢'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /雪花|晶莹|粒子|飘落/, priority: P(4),
          pool: ['雪花飘落的粒子','晶莹闪烁的光点'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /巨响|火光|爆炸|碎片|冲击/, priority: P(6),
          pool: ['爆炸冲击的火光','碎片四溅的瞬间'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /光晕|逆光|金色|轮廓|夕阳/, priority: P(4),
          pool: ['逆光中的金色光晕','勾勒轮廓的光影'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /硝烟|迷雾|模糊|烟雾|身影/, priority: P(4),
          pool: ['硝烟弥漫的迷雾','视线模糊里的身影'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /震动|摇晃|晃动|失焦|镜头/, priority: P(4),
          pool: ['镜头晃动的失焦','地面震动的摇晃'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /子弹|极慢|一瞬间/, priority: P(5),
          pool: ['子弹时间的极慢','一瞬间的凝固'],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：长上下文关键词 ----------
        { pattern: /钥匙|口袋|鼓起/, priority: P(4),
          pool: ['藏入口袋的钥匙','口袋微微鼓起的伏笔'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /推开门|推门|愣住|目光/, priority: P(4),
          pool: ['推开门迎来的目光','愣在原地的滞涩'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /疑惑|眉头|哭出来|忍不住哭/, priority: P(4),
          pool: ['眉头紧锁的疑惑','忍不住哭出的递进'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /尖叫|再次|回响|接近/, priority: P(4),
          pool: ['山谷回响的尖叫','再次接近的声音'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /灯|朝着|走去/, priority: P(3),
          pool: ['朝着灯走去的身影','远处那盏灯的指引'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /握紧口袋里那张纸|攥紧那张纸条|捏着那张纸条/, priority: P(4),
          pool: ['握紧口袋里那张纸的隐藏','藏不住的线索'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /藏不住的线索|欲盖弥彰|遮掩不住/, priority: P(4),
          pool: ['藏不住的线索','欲盖弥彰的破绽'],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：伏笔信号（单句入口也产出伏笔信号）----------
        { pattern: /谁也没注意|角落|没注意/, priority: P(5),
          pool: ['角落里的伏笔信号','被忽略的聚焦'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /殊不知|封印|信息差/, priority: P(5),
          pool: ['信息差的伏笔信号','被隐瞒的关键'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /后来的事实|改变一切|变得重要/, priority: P(5),
          pool: ['变得重要的伏笔信号','后来被印证的一切'],
          reflect: function() { return this.pool[0]; } },
        { pattern: /总觉得|诡异|过度|说不出的/, priority: P(5),
          pool: ['过度修饰的伏笔信号','透着诡异的异常'],
          reflect: function() { return this.pool[0]; } },

        // ---------- v8.9 补全：泪流满面（跨句去重/动态刷新）----------
        { pattern: /泪流满面|泪眼|满面泪/, priority: P(5),
          pool: ['泪流满面的特写','泪眼婆娑的瞬间','满脸泪痕的定格'],
          reflect: function() { return this.pool[0]; } }
    ];

    return {
        builtinRules: builtinRules,
        __LEGACY: !HPDC_AVAILABLE
    };

})();
