// tests/scenarios/special-effects.js
// 特效与画面感测试（慢镜头、粒子、光效、爆炸等）
// 挂载 window.__TestScenarios_special

window.__TestScenarios_special = [
    {
        name: '特效 · 慢镜头',
        mode: 'eliza',
        input: '他缓缓地拔出了剑，时间仿佛凝固。',
        check: function(items) {
            return items.some(i => /慢镜头|凝固|缓慢|升格/.test(i.text || ''));
        }
    },
    {
        name: '特效 · 粒子效果',
        mode: 'eliza',
        input: '雪花在空中飘落，闪着晶莹的光。',
        check: function(items) {
            return items.some(i => /雪花|晶莹|粒子|飘落/.test(i.text || ''));
        }
    },
    {
        name: '特效 · 爆炸冲击',
        mode: 'eliza',
        input: '一声巨响，火光冲天，碎片四溅。',
        check: function(items) {
            return items.some(i => /爆炸|火光|冲击|碎片/.test(i.text || ''));
        }
    },
    {
        name: '特效 · 光晕与逆光',
        mode: 'eliza',
        input: '夕阳的光晕在他身后散开，形成一圈金色的轮廓。',
        check: function(items) {
            return items.some(i => /光晕|逆光|金色|轮廓/.test(i.text || ''));
        }
    },
    {
        name: '特效 · 烟雾弥漫',
        mode: 'eliza',
        input: '硝烟弥漫，视线模糊，只有隐约的身影。',
        check: function(items) {
            return items.some(i => /硝烟|迷雾|模糊|身影/.test(i.text || ''));
        }
    },
    {
        name: '特效 · 镜头晃动',
        mode: 'eliza',
        input: '地面震动，镜头剧烈摇晃，画面失焦。',
        check: function(items) {
            return items.some(i => /晃动|失焦|震动/.test(i.text || ''));
        }
    },
    {
        name: '特效 · 子弹时间',
        mode: 'eliza',
        input: '子弹擦过脸颊，一切都在一瞬间变得极慢。',
        check: function(items) {
            return items.some(i => /子弹时间|极慢|瞬间/.test(i.text || ''));
        }
    }
];