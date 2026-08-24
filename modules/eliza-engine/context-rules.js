// ==================== 句间上下文规则模块 (context-rules.js) ====================
// 挂载到 window.__ElizaContextRules
// v8.9-P5：上下文规则 priority 迁移至 HPDC8

window.__ElizaContextRules = (function() {

    const themeDetector = window.__ElizaThemeDetector;
    const HPDC_AVAILABLE = !!(window.HPDC && window.HPDC.HPDC8);
    const HPDC8 = HPDC_AVAILABLE ? window.HPDC.HPDC8 : null;

    function P(n) {
        return HPDC_AVAILABLE ? HPDC8.fromNumber(n) : n;
    }

    // 判断一句话是否是正常说话（而非无语/省略号场景）
    function isNormalSpeech(text) {
        if (/[\u4e00-\u9fff]{4,}/.test(text) && !/[.。]{3,}|…{2,}/.test(text)) {
            return true;
        }
        return false;
    }

    function extractName(text) {
        var match = text.match(/^([\u4e00-\u9fff]{1,6})\s*[：:]\s*$/);
        if (match) return match[1];
        match = text.match(/^([\u4e00-\u9fff]{1,6})(?:[.。]{3,}|…{2,})$/);
        if (match) return match[1];
        return null;
    }

    function endsWithEllipsis(text) {
        return /(?:[.。]{3,}|…{2,})$/.test(text.trim());
    }

    const contextRules = [
        // ---------- 原有五条上下文规则 ----------
        {
            patternA: /(?:推门|踹门|撞门|闯入|踏入|步入|走进)(?:了|来|去|在|到)?/,
            patternB: /(?:目光|齐刷刷|看去|望来|转头|回|齐|全|都|皆)/,
            priority: P(8),
            reflect: function(sentA, sentB) {
                const actorMatch = sentA.match(/[\u4e00-\u9fff]{2,3}(?=推门|踹门|撞门|闯入|踏入|步入|走进)/);
                const actor = actorMatch ? actorMatch[0] : '他';
                return actor + '推门而入的瞬间——承受所有人的目光';
            }
        },
        {
            patternA: /(?:回眸|回头|转身)(?:一|看|望|来|去)?/,
            patternB: /(?:正好|恰好|撞上|对上了|迎上)(?:了|的|那|他|她)?(?:目光|视线|眼睛)/,
            priority: P(7),
            reflect: function(sentA, sentB) {
                return '回眸的刹那，视线撞上的定格';
            }
        },
        {
            patternA: /(?:跪下|叩首|磕头|跪伏|俯身)(?:了|在|于|的)?/,
            patternB: /(?:俯视|居高临下|高高在上|龙椅|宝座|上方)/,
            priority: P(7),
            reflect: function(sentA, sentB) {
                return '俯身跪下的身影同高处俯视者的对比镜头';
            }
        },
        {
            patternA: /(?:拔剑|拔刀|拔|抽出|亮出)(?:了|的|那把|腰间)?/,
            patternB: /(?:后退|退后|哗然|惊呼|倒吸|骚动)/,
            priority: P(8),
            reflect: function(sentA, sentB) {
                return '拔剑的刹那——人群后退的涟漪';
            }
        },
        {
            patternA: /(?:沉默|寂静|鸦雀无声|落针可闻|屏息)(?:了|的|着|许久)?/,
            patternB: /(?:突然|忽然|猛地|一声|响起|传来|打破)/,
            priority: P(6),
            reflect: function(sentA, sentB) {
                return '寂静被打破的瞬间';
            }
        },

        // 鸦雀无声 + 句号/省略号
        {
            patternA: /(?:沉默|寂静|鸦雀无声|落针可闻|屏息|安静).*/,
            patternB: /^(?:[.。]{3,}|…{2,})$/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.horror) return '死寂中无人敢开口——恐惧扼住了所有人的喉咙';
                if (themes.cthulhu) return '古神的低语填满了沉默——任何言语都显得多余';
                return '沉默之后仍是沉默——连句号都在表达无语';
            }
        },
        {
            patternA: /(?:沉默|寂静|鸦雀无声|落针可闻|屏息).*/,
            patternB: /[\u4e00-\u9fff]{4,}/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var speakerMatch = sentB.match(/^([\u4e00-\u9fff]{1,6})[：:]/);
                var speaker = speakerMatch ? speakerMatch[1] : '有人';
                if (isNormalSpeech(sentB)) {
                    return '沉默之后——' + speaker + '率先开口，打破了凝固的空气';
                }
                return null;
            }
        },

        // ========== 省略号 / 句号无语规则 ==========
        {
            patternA: /^[\u4e00-\u9fff]{1,6}\s*[：:]\s*(?:[.。]{3,}|…{2,})$|^[\u4e00-\u9fff]{1,6}(?:[.。]{3,}|…{2,})$/,
            patternB: /^[\u4e00-\u9fff]{1,6}\s*[：:]\s*(?:[.。]{3,}|…{2,})$|^[\u4e00-\u9fff]{1,6}(?:[.。]{3,}|…{2,})$/,
            priority: P(8),
            reflect: function(sentA, sentB, fullText) {
                var nameA = extractName(sentA) || '某人';
                var nameB = extractName(sentB) || '某人';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) return nameA + '与' + nameB + '在古神的低语中失去了言语——疯狂吞噬了交流';
                if (themes.cyberpunk) return nameA + '与' + nameB + '的通讯频道只剩白噪音——信号丢失';
                if (themes.horror) return nameA + '与' + nameB + '同时沉默了——有什么东西让他们不敢开口';
                if (nameA === nameB) return nameA + '连说了两次"……"——欲言又止的沉默';
                return nameA + '与' + nameB + '相对无言——彼此都用省略号代替了回答';
            }
        },
        {
            patternA: /^(?:[.。]{3,}|…{2,})$/,
            patternB: /^[\u4e00-\u9fff]{1,6}\s*[：:]\s*(?:[.。]{3,}|…{2,})$|^[\u4e00-\u9fff]{1,6}(?:[.。]{3,}|…{2,})$/,
            priority: P(8),
            reflect: function(sentA, sentB, fullText) {
                var nameB = extractName(sentB) || '某人';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) return '古神的低语中——' + nameB + '失去了回应的能力';
                if (themes.cyberpunk) return '频段静默——' + nameB + '的终端没有响应';
                if (themes.horror) return '无声的恐惧中——' + nameB + '只能用省略号代替回答';
                return nameB + '用省略号回应了沉默';
            }
        },
        {
            patternA: /^[\u4e00-\u9fff]{1,6}\s*[：:]\s*(?:[.。]{3,}|…{2,})$|^[\u4e00-\u9fff]{1,6}(?:[.。]{3,}|…{2,})$/,
            patternB: /^(?:[.。]{3,}|…{2,})$/,
            priority: P(8),
            reflect: function(sentA, sentB, fullText) {
                var nameA = extractName(sentA) || '某人';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) return nameA + '的回应被古神呓语吞噬——只留下省略号';
                if (themes.cyberpunk) return nameA + '的信号在端口断开——省略号填满了通讯日志';
                return nameA + '说完之后——只剩下省略号在回应';
            }
        },
        {
            patternA: /^[\u4e00-\u9fff]{1,6}\s*[：:]\s*(?:[.。]{6,}|…{4,})$|^[\u4e00-\u9fff]{1,6}(?:[.。]{6,}|…{4,})$/,
            patternB: /.*/,
            priority: P(8),
            reflect: function(sentA, sentB, fullText) {
                var nameA = extractName(sentA) || '某人';
                if (isNormalSpeech(sentB)) return null;
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cyberpunk) return nameA + '的神经接口过载——输出了一串空白数据';
                if (themes.horror) return nameA + '张了张嘴，却发不出任何声音——极度的恐惧';
                return nameA + '打出了一串句号——彻底的无语';
            }
        },
        {
            patternA: /^[\u4e00-\u9fff]{1,6}\s*[：:]\s*[。]{6,}$|^[\u4e00-\u9fff]{1,6}[。]{6,}$/,
            patternB: /.*/,
            priority: P(8),
            reflect: function(sentA, sentB, fullText) {
                var nameA = extractName(sentA) || '某人';
                if (isNormalSpeech(sentB)) return null;
                return nameA + '打出了一串句号——彻底的无语';
            }
        },
        {
            patternA: /^(?:[.。]{3,}|…{2,})$/,
            patternB: /^(?:[.。]{3,}|…{2,})$/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) return '古神的低语填满了所有频道——人类语言已经失效';
                if (themes.cyberpunk) return '全频段信号干扰——所有通讯都变成了点状噪音';
                if (themes.systemError) return '系统日志被省略号填满——错误信息已丢失';
                return '连续的省略号填满了对话——空气中弥漫着说不出口的话';
            }
        },
        {
            patternA: /^(?:[.。]{3,}|…{2,})$/,
            patternB: /[\u4e00-\u9fff]/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                if (/^(?:[.。]{3,}|…{2,})/.test(sentB) || /(?:[.。]{6,}|…{4,})/.test(sentB)) return null;
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) return '在疯狂的间隙中找回了一丝理智——开口说话';
                if (themes.cyberpunk) return '信号短暂恢复——通讯器中传来断断续续的声音';
                return '沉默良久后终于开口——打破寂静的那句话';
            }
        },
        {
            patternA: /[\u4e00-\u9fff]/,
            patternB: /^(?:[.。]{3,}|…{2,})$/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                if (isNormalSpeech(sentA)) {
                    var themes = themeDetector.detectTheme(fullText || '');
                    if (themes.horror) return '话说到一半戛然而止——黑暗中有什么东西在靠近';
                    if (themes.cthulhu) return '言语坠入了虚无——不可名状之物夺走了所有的词汇';
                    return '说完之后只剩下省略号——话已说尽，再无可言';
                }
                return null;
            }
        },

        // ========== 乱码规则 ==========
        {
            patternA: /[\u4e00-\u9fff]{1,6}[：:]\s*[▇▆▅▄▃▂▁█▉▊▋▌▍▎▏]{4,}$/,
            patternB: /.*/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var nameA = (sentA.match(/^([\u4e00-\u9fff]{1,6})[：:]/) || [])[1] || '某人';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.horror) {
                    var horrorPool = [
                        '记录被黑色方块覆盖——' + nameA + '的话语被未知力量抹去了',
                        '文档中出现大片涂黑——' + nameA + '说出的内容被审查了',
                        nameA + '的名字后面全是黑色方块——信息被灵异力量污染'
                    ];
                    return horrorPool[Math.floor(Math.random() * horrorPool.length)];
                }
                if (themes.cthulhu) return nameA + '的发言被古神抹除——黑色方块代替了文字';
                return nameA + '说话的内容被涂黑了——未知原因';
            }
        },
        {
            patternA: /[\u4e00-\u9fff]{1,6}[：:]\s*[#&%\$@!]{4,}$/,
            patternB: /.*/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var nameA = (sentA.match(/^([\u4e00-\u9fff]{1,6})[：:]/) || [])[1] || '用户';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cyberpunk) {
                    var cyberPool = [
                        nameA + '的脑机接口遭到入侵——输出的全是损坏的数据包',
                        nameA + '的神经链路被干扰——文字变成了乱码',
                        nameA + '的植入体程序崩溃——通讯模块输出异常'
                    ];
                    return cyberPool[Math.floor(Math.random() * cyberPool.length)];
                }
                if (themes.systemError) return nameA + '的终端出现致命错误——数据流中断';
                if (themes.cthulhu) return nameA + '的精神被撕裂——输出的符号无法解读';
                return nameA + '发送了一串特殊符号——通讯故障';
            }
        },
        {
            patternA: /[\u4e00-\u9fff]{1,6}[：:]\s*[^\u4e00-\u9fff]{6,}$/,
            patternB: /.*/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var nameA = (sentA.match(/^([\u4e00-\u9fff]{1,6})[：:]/) || [])[1] || '某人';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) {
                    var cthulhuPool = [
                        nameA + '的理智被古神呓语撕裂——输出的文字变成了不可辨认的乱码',
                        nameA + '在疯狂中敲下了一串无法解读的符号——san值归零',
                        nameA + '的大脑被异界低语侵入——语言系统崩溃'
                    ];
                    return cthulhuPool[Math.floor(Math.random() * cthulhuPool.length)];
                }
                if (themes.cyberpunk) return nameA + '的植入体输出异常——数据包损坏';
                return nameA + '发出了一串无法辨认的乱码';
            }
        },
        {
            patternA: /^[A-Z]{4,}\s*[:：]\s*.+/,
            patternB: /.*/,
            priority: P(6),
            reflect: function(sentA, sentB, fullText) {
                var errorType = (sentA.match(/^([A-Z]{4,})/) || [])[1] || 'ERROR';
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.systemError || themes.cyberpunk) {
                    return errorType + '——系统出现未捕获的异常';
                }
                return null;
            }
        },
        {
            patternA: /^0x[0-9A-Fa-f]{8,}$/,
            patternB: /.*/,
            priority: P(6),
            reflect: function(sentA, sentB, fullText) {
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cyberpunk) return '内存转储——十六进制错误码背后的真相被掩盖';
                if (themes.systemError) return '堆栈溢出——系统日志被十六进制错误码填满';
                return null;
            }
        },
        {
            patternA: /^[^\u4e00-\u9fff]{6,}$/,
            patternB: /.*/,
            priority: P(6),
            reflect: function(sentA, sentB, fullText) {
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cthulhu) return '屏幕上出现了不应存在于世间的符号——旧日支配者的语言';
                if (themes.cyberpunk) return '数据流被未知算法劫持——显示的全是加密乱码';
                if (themes.systemError) return '系统输出了一串无法解析的十六进制错误码';
                return null;
            }
        },
        {
            patternA: /^[01]{16,}$/,
            patternB: /.*/,
            priority: P(6),
            reflect: function(sentA, sentB, fullText) {
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cyberpunk) return '原始二进制数据流出——防火墙已被攻破';
                if (themes.systemError) return '机器直接输出了二进制——自然语言处理模块离线';
                return null;
            }
        },
        {
            patternA: /^[^\u4e00-\u9fff]{6,}$/,
            patternB: /^[^\u4e00-\u9fff]{6,}$/,
            priority: P(7),
            reflect: function(sentA, sentB, fullText) {
                var themes = themeDetector.detectTheme(fullText || '');
                if (themes.cyberpunk) return '双方的数据传输都变成了乱码——网络已被劫持';
                if (themes.cthulhu) return '两个灵魂同时堕入疯狂——他们正用异界的语言对话';
                if (themes.systemError) return '主从节点同时报错——分布式系统崩溃的瞬间';
                return '通讯彻底中断——双方都只能看到乱码';
            }
        },
        {
            patternA: /^[^\u4e00-\u9fff]{6,}$/,
            patternB: /.*/,
            priority: P(1),
            reflect: function() { return null; }
        },
        {
            patternA: /^[。]{6,}$/,
            patternB: /.*/,
            priority: P(2),
            reflect: function() { return null; }
        },

        // ========== 伏笔前置信号规则 ==========
        {
            patternA: /(?:谁也没注意到|没人发现|没有人看到|不曾有人|没人注意|无人察觉|无人发现)[\u4e00-\u9fff]{0,2}(?:的)?([\u4e00-\u9fff]{2,8}(?:的)?[\u4e00-\u9fff]{2,12})/,
            patternB: /.*/,
            priority: P(5),
            reflect: function(sentA) {
                var match = sentA.match(/(?:谁也没注意到|没人发现|没有人看到|不曾有人|没人注意|无人察觉|无人发现)[\u4e00-\u9fff]{0,2}(?:的)?([\u4e00-\u9fff]{2,8}(?:的)?[\u4e00-\u9fff]{2,12})/);
                var target = match ? match[1] : '';
                if (target && target.length >= 3) {
                    return '伏笔信号：叙述者刻意聚焦——"' + target + '"被悄悄放在了画面角落';
                }
                return null;
            }
        },
        {
            patternA: /(?:如果有人回头|如果有人看见|如果有人注意到|如果有人发现|假如有人留意)[\u4e00-\u9fff]{0,2}(?:的)?([\u4e00-\u9fff]{2,8}(?:的)?[\u4e00-\u9fff]{2,12})/,
            patternB: /.*/,
            priority: P(5),
            reflect: function(sentA) {
                var match = sentA.match(/(?:如果有人回头|如果有人看见|如果有人注意到|如果有人发现|假如有人留意)[\u4e00-\u9fff]{0,2}(?:的)?([\u4e00-\u9fff]{2,8}(?:的)?[\u4e00-\u9fff]{2,12})/);
                var target = match ? match[1] : '';
                if (target && target.length >= 3) {
                    return '伏笔信号：条件假设中的暗示——"' + target + '"的异样被悬置了';
                }
                return null;
            }
        },
        {
            patternA: /(?:殊不知|他不知道的是|他没想到的是|他不知|她不知道|谁也不知道的是)[\u4e00-\u9fff]{0,2}([\u4e00-\u9fff]{2,12})/,
            patternB: /.*/,
            priority: P(5),
            reflect: function(sentA) {
                var match = sentA.match(/(?:殊不知|他不知道的是|他没想到的是|他不知|她不知道|谁也不知道的是)[\u4e00-\u9fff]{0,2}([\u4e00-\u9fff]{2,12})/);
                var target = match ? match[1] : '';
                if (target && target.length >= 2) {
                    return '伏笔信号：叙述者揭露信息差——"' + target + '"被刻意隐瞒了';
                }
                return null;
            }
        },
        {
            patternA: /(?:后来的事实证明|事后证实|后来的事情证明|后来证实|结果证明|后证实)[\u4e00-\u9fff]{0,2}([\u4e00-\u9fff]{2,12})/,
            patternB: /.*/,
            priority: P(5),
            reflect: function(sentA) {
                var match = sentA.match(/(?:后来的事实证明|事后证实|后来的事情证明|后来证实|结果证明|后证实)[\u4e00-\u9fff]{0,2}([\u4e00-\u9fff]{2,12})/);
                var target = match ? match[1] : '';
                if (target && target.length >= 2) {
                    return '伏笔信号：明示伏笔——"' + target + '"在之后会变得重要';
                }
                return null;
            }
        },
        {
            patternA: /(?:怪异|诡异|莫名|奇怪|异样|不对劲|不知为何|说不出的|无法形容的|不曾有过的|罕见的|特别地|异常地|异乎寻常的)(?:的|地|得|之)?([\u4e00-\u9fff]{2,12})/,
            patternB: /.*/,
            priority: P(4),
            reflect: function(sentA) {
                var match = sentA.match(/(?:怪异|诡异|莫名|奇怪|异样|不对劲|不知为何|说不出的|无法形容的|不曾有过的|罕见的|特别地|异常地|异乎寻常的)(?:的|地|得|之)?([\u4e00-\u9fff]{2,12})/);
                var target = match ? match[1] : '';
                if (target && target.length >= 2) {
                    return '伏笔信号：异常修饰——"' + target + '"被过度强调了';
                }
                return null;
            }
        }
    ];

    return {
        contextRules: contextRules,
        __LEGACY: !HPDC_AVAILABLE
    };

})();
