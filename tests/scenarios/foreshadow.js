// tests/scenarios/foreshadow.js
// 伏笔检测测试用例
// 挂载 window.__TestScenarios_foreshadow

window.__TestScenarios_foreshadow = [
    { name: '伏笔 · 视角切换聚焦',
        mode: 'eliza',
      input: '谁也没注意到角落里那把银色的打火机。',
      check: function(items) { return items.some(function(i) { return /伏笔信号|聚焦|角落/.test(i.text||''); }); } },
    { name: '伏笔 · 信息差揭露',
        mode: 'eliza',
      input: '殊不知这把钥匙正是打开封印的关键。',
      check: function(items) { return items.some(function(i) { return /伏笔信号|信息差|隐瞒/.test(i.text||''); }); } },
    { name: '伏笔 · 明示伏笔',
        mode: 'eliza',
      input: '后来的事实证明，那封信改变了一切。',
      check: function(items) { return items.some(function(i) { return /伏笔信号|变得重要/.test(i.text||''); }); } },
    { name: '伏笔 · 过度修饰信号',
        mode: 'eliza',
      input: '她总觉得这枚戒指透着一股说不出的诡异。',
      check: function(items) { return items.some(function(i) { return /伏笔信号|异常修饰|过度强调/.test(i.text||''); }); } },
    { name: '伏笔 · 引擎扫描引号包裹词',
        mode: 'eliza',
      input: '他说了一句："九月十三日"。然后转身走了。',
      check: function(items, input) { if (!window.ForeshadowEngine) return false; return window.ForeshadowEngine.scan(input, {mood:''}).length > 0; } },
    { name: '伏笔 · 手动添加验证',
        mode: 'eliza',
      input: '',
      check: function() { if (!window.ForeshadowEngine) return false; var b = window.ForeshadowEngine.getPool().length; var r = window.ForeshadowEngine.addManual('黑猫','黑猫蹲在墙角'); return r.success && window.ForeshadowEngine.getPool().length > b; } }
];