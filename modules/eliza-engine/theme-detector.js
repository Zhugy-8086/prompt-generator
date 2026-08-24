// ==================== 主题检测模块 (theme-detector.js) ====================
// 挂载到 window.__ElizaThemeDetector
// 检测文本是否包含克苏鲁/赛博朋克/恐怖/系统错误等主题关键词
// 供省略号、乱码规则和动态优先级加权使用

window.__ElizaThemeDetector = (function() {

    function detectTheme(text) {
        const themes = {
            cthulhu: /克苏鲁|旧日支配者|不可名状|深潜者|拉莱耶|黄衣之王|奈亚|阿撒托斯|疯狂山脉|印斯茅斯|异界|触手|黏液|眼球|畸变|扭曲|腐化|低语|呓语|幻象|发狂|理智|san值|古神|外神|旧神/g,
            cyberpunk: /赛博朋克|霓虹|义体|植入体|黑客|数据流|全息|虚拟|AI|人工智能|芯片|脑机|网络|终端|防火墙|破解|加密|脉冲|电击|义眼|机械臂|机甲|改造人|生化/g,
            horror: /恐怖|鬼|魂|诅咒|附身|闹鬼|阴森|棺材|灵异|超自然|异象|失踪|诡|怖/g,
            systemError: /系统错误|数据损坏|信号干扰|程序崩溃|蓝屏|死机|报错|故障|掉线|日志异常|内存溢出|堆栈|cpu|gpu|磁盘|扇区/g
        };
        const detected = {};
        for (const [key, pattern] of Object.entries(themes)) {
            detected[key] = pattern.test(text);
        }
        return detected;
    }

    return {
        detectTheme: detectTheme
    };

})();