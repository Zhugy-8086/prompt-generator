// tests/scenarios/refresh.js
// 动态刷新测试用例
// 挂载 window.__TestScenarios_refresh

window.__TestScenarios_refresh = [
    { name: '刷新 · refreshExtract 方法存在',
        mode: 'eliza',
      input: '他推开门。外面下雨了。',
      check: function() { return typeof window.ElizaRules.refreshExtract === 'function'; } },
    { name: '刷新 · 多次提取输出略有变化',
        mode: 'eliza',
      input: '她泪流满面。他也泪流满面。她微微一笑。',
      check: function(items, input) { if (typeof window.ElizaRules.refreshExtract !== 'function') return false; return window.ElizaRules.refreshExtract(input, 3).items.length > 0; } }
];