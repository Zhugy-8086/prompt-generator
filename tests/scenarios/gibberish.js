// tests/scenarios/gibberish.js
// 乱码规则测试用例
// 挂载 window.__TestScenarios_gibberish

window.__TestScenarios_gibberish = [
    { name: '乱码 · 克苏鲁精神错乱',
        mode: 'eliza',
      input: '调查员: æøåˆ´©ƒ∂ß∂ƒ©˙∆˚¬Ω≈ç√\n克苏鲁的低语在脑海中回荡。',
      check: function(items) { return items.some(function(i) { return /理智|疯狂|乱码|san值|古神/.test(i.text||''); }); } },
    { name: '乱码 · 赛博朋克数据损坏',
        mode: 'eliza',
      input: '黑客: #$%^&@!\n数据流被未知算法劫持。',
      check: function(items) { return items.some(function(i) { return /数据|损坏|乱码|脑机|植入体|通讯|劫持/.test(i.text||''); }); } },
    { name: '乱码 · 恐怖灵异方块',
        mode: 'eliza',
      input: '记者: ████████\n这是灵异事件。',
      check: function(items) { return items.some(function(i) { return /涂黑|抹去|方块|污染|古神/.test(i.text||''); }); } },
    { name: '乱码 · 十六进制错误码',
        mode: 'eliza',
      input: '0xDEADBEEF\n系统内存转储完成。',
      check: function(items) { return items.some(function(i) { return /内存|错误码|十六进制|堆栈/.test(i.text||''); }); } },
    { name: '乱码 · 全大写报错',
        mode: 'eliza',
      input: 'CRITICAL: 数据损坏严重\n系统发生致命错误。',
      check: function(items) { return items.some(function(i) { return /异常|未捕获|CRITICAL|系统/.test(i.text||''); }); } },
    { name: '乱码 · 二进制数据流出',
        mode: 'eliza',
      input: '01001101011000010111001001101001\n防火墙被攻破。',
      check: function(items) { return items.some(function(i) { return /防火墙|二进制|攻破|离线/.test(i.text||''); }); } },
    { name: '乱码 · 纯乱码静默',
        mode: 'eliza',
      input: 'asdfghjkl123456\n后面是正常文本。',
      check: function(items) { return !items.some(function(i) { return /乱码|十六进制|san值|数据|防火墙/.test(i.text||''); }); } },
    { name: '乱码 · 双乱码（赛博朋克）',
        mode: 'eliza',
      input: 'æøåˆ´©ƒ∂ß\n∂ƒ©˙∆˚¬Ω≈\n数据流被未知算法劫持。',
      check: function(items) { return items.some(function(i) { return /劫持|异界|崩溃|中断/.test(i.text||''); }); } }
];