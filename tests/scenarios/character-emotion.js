// tests/scenarios/character-emotion.js
// 角色复杂情绪与微表情测试
// 挂载 window.__TestScenarios_emotion

window.__TestScenarios_emotion = [
    {
        name: '情绪 · 强忍泪水',
        mode: 'eliza',
        input: '他咬着嘴唇，努力不让眼泪掉下来。',
        check: function(items) {
            return items.some(i => /强忍|嘴唇|眼泪|不掉/.test(i.text || ''));
        }
    },
    {
        name: '情绪 · 喜极而泣',
        mode: 'eliza',
        input: '听到消息，她先是一愣，然后眼泪夺眶而出，嘴角却上扬。',
        check: function(items) {
            return items.some(i => /喜极而泣|眼泪|嘴角/.test(i.text || ''));
        }
    },
    {
        name: '情绪 · 愤怒到颤抖',
        mode: 'eliza',
        input: '他握紧拳头，全身颤抖，青筋暴起。',
        check: function(items) {
            return items.some(i => /颤抖|青筋|愤怒|拳头/.test(i.text || ''));
        }
    },
    {
        name: '情绪 · 绝望的微笑',
        mode: 'eliza',
        input: '她露出一丝绝望的微笑，转身跳下悬崖。',
        check: function(items) {
            return items.some(i => /绝望|微笑|转身|悬崖/.test(i.text || ''));
        }
    },
    {
        name: '情绪 · 惊恐呆滞',
        mode: 'eliza',
        input: '他瞪大眼睛，嘴巴微张，整个人僵在原地。',
        check: function(items) {
            return items.some(i => /惊恐|瞪大|僵住|呆滞/.test(i.text || ''));
        }
    },
    {
        name: '情绪 · 内疚低头',
        mode: 'eliza',
        input: '他低下头，不敢看任何人的眼睛。',
        check: function(items) {
            return items.some(i => /低头|内疚|不敢|躲闪/.test(i.text || ''));
        }
    },
    {
        name: '情绪 · 释然长叹',
        mode: 'eliza',
        input: '他终于放下了所有，长长地叹了口气，脸上露出轻松。',
        check: function(items) {
            return items.some(i => /释然|长叹|放下|轻松/.test(i.text || ''));
        }
    }
];