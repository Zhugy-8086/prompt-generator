// tests/scenarios/standard.js
// 标准提取测试用例
// 挂载 window.__TestScenarios_standard

window.__TestScenarios_standard = [
    { name: '标准 · 基本场景',
        mode: 'standard',
      input: '雨夜街道，霓虹灯闪烁，一个孤独的身影站在天桥下。',
      check: function(items) { return items.some(function(i) { return /霓虹灯/.test(i.text||''); }) && items.some(function(i) { return /天桥/.test(i.text||''); }); } },
    { name: '标准 · 系统错误词汇',
        mode: 'standard',
      input: '系统崩溃，内存溢出，堆栈错误。',
      check: function(items) { return items.some(function(i) { return /系统|崩溃/.test(i.text||''); }) && items.some(function(i) { return /内存|堆栈/.test(i.text||''); }); } },
    { name: '标准 · 赛博朋克词条',
        mode: 'standard',
      input: '黑客入侵了脑机接口，数据流被未知算法劫持。',
      check: function(items) { return items.some(function(i) { return /黑客|脑机/.test(i.text||''); }); } },
    { name: '标准 · 古风场景',
        mode: 'standard',
      input: '大殿上文武分列，龙椅高置，青年官员手持笏板跪于殿中。',
      check: function(items) { return items.some(function(i) { return /大殿|龙椅/.test(i.text||''); }) || items.some(function(i) { return /官员/.test(i.text||''); }); } },
    { name: '标准 · 克苏鲁词条',
        mode: 'standard',
      input: '不可名状的恐惧笼罩着调查员，古神的低语在脑海中回荡。',
      check: function(items) { return items.some(function(i) { return /不可名状|古神|低语/.test(i.text||''); }); } }
];