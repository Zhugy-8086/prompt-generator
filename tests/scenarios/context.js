// tests/scenarios/context.js
// 上下文规则测试用例
// 挂载 window.__TestScenarios_context

window.__TestScenarios_context = [
    { name: '上下文 · 推门→众人目光',
        mode: 'context',
      input: '他推开门走进大殿。群臣的目光齐刷刷看了过来。',
      check: function(items) { return items.some(function(i) { return /推门|目光|承受/.test(i.text||'') && i.type === 'context'; }); } },
    { name: '上下文 · 回眸→对视',
        mode: 'context',
      input: '她转身回眸。正好撞上了他的视线。',
      check: function(items) { return items.some(function(i) { return /回眸|视线|撞上|定格/.test(i.text||''); }); } },
    { name: '上下文 · 跪下→俯视',
        mode: 'context',
      input: '他跪在龙椅前叩首。皇帝居高临下地俯视着他。',
      check: function(items) { return items.some(function(i) { return /跪下|俯视|对比/.test(i.text||''); }); } },
    { name: '上下文 · 拔剑→后退',
        mode: 'context',
      input: '他拔出长剑。周围的人齐齐后退了一步。',
      check: function(items) { return items.some(function(i) { return /拔剑|后退|涟漪/.test(i.text||''); }); } },
    { name: '上下文 · 寂静→打破',
        mode: 'context',
      input: '大厅里鸦雀无声。突然一声尖叫打破了沉默。',
      check: function(items) { return items.some(function(i) { return /寂静|打破/.test(i.text||''); }); } },
    { name: '上下文 · 鸦雀无声后有人开口',
        mode: 'context',
      input: '殿内落针可闻。大臣开口道："臣有本奏。"',
      check: function(items) { return items.some(function(i) { return /沉默之后|开口|打破/.test(i.text||''); }); } },
    { name: '上下文 · 不匹配时不产出伪结果',
        mode: 'context',
      input: '他推开门。外面下雨了。',
      check: function(items) { return !items.some(function(i) { return i.type === 'context'; }); } }
];