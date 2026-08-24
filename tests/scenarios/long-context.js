// tests/scenarios/long-context.js
// 长距离上下文依赖测试（跨越多个句子或段落的伏笔/动作）
// 挂载 window.__TestScenarios_longcontext

window.__TestScenarios_longcontext = [
    {
        name: '长上下文 · 跨越三句的伏笔',
        mode: 'eliza',
        input: '他偷偷把一把钥匙放进口袋。\n然后若无其事地走开。\n没有人注意到那个口袋微微鼓起。',
        check: function(items) {
            return items.some(i => /钥匙|口袋|鼓起|伏笔/.test(i.text || ''));
        }
    },
    {
        name: '长上下文 · 动作因果关系',
        mode: 'eliza',
        input: '他推开门。\n屋子里所有人都看向他。\n他愣在原地。',
        check: function(items) {
            return items.some(i => /推门|目光|愣住/.test(i.text || ''));
        }
    },
    {
        name: '长上下文 · 情绪递进',
        mode: 'eliza',
        input: '她先是疑惑，随后眉头紧锁，最后忍不住哭了出来。',
        check: function(items) {
            return items.some(i => /疑惑|眉头|哭|递进/.test(i.text || ''));
        }
    },
    {
        name: '长上下文 · 环境与回响',
        mode: 'eliza',
        input: '山谷里传来一声尖叫。\n几分钟后，同样的声音再次响起，但这次更近了。',
        check: function(items) {
            return items.some(i => /尖叫|再次|接近|回响/.test(i.text || ''));
        }
    },
    {
        name: '长上下文 · 跨越段落的指示',
        mode: 'eliza',
        input: '远处有一盏灯。\n……（中间省略）……\n他朝着那盏灯走去。',
        check: function(items) {
            // 需要引擎识别“灯”的重复
            return items.some(i => /灯|朝着|走去/.test(i.text || ''));
        }
    },
    {
        name: '长上下文 · 对话中的隐藏线索',
        mode: 'eliza',
        input: '“你真的确定吗？”\n“我……我不知道。”\n他握紧了口袋里的那张纸。',
        check: function(items) {
            return items.some(i => /握紧|口袋|纸|隐藏/.test(i.text || ''));
        }
    }
];