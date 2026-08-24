// tests/scenarios/protagonist.js
// 主角检测与追踪测试用例
// 挂载 window.__TestScenarios_protagonist

window.__TestScenarios_protagonist = [
    {
        name: '主角 · 姓名检测（高频+心理描写）',
        mode: 'protagonist',
        input: '叶凡走进大殿。叶凡心想：终于到了。',
        check: function(items, input) {
            if (!window.__ForeshadowProtagonistDetector) return false;
            var name = window.__ForeshadowProtagonistDetector.detect(input);
            return name === '叶凡';
        }
    },
    {
        name: '主角 · detectAll 返回多个候选人',
        mode: 'protagonist',
        input: '叶凡和姬紫月并肩而立。叶凡道："走吧。"姬紫月微微一笑。',
        check: function(items, input) {
            if (!window.__ForeshadowProtagonistDetector) return false;
            var all = window.__ForeshadowProtagonistDetector.detectAll(input);
            return all.length >= 2 && all.some(function(c) { return c.name === '叶凡'; }) && all.some(function(c) { return c.name === '姬紫月'; });
        }
    },
    {
        name: '主角 · 追踪器跨窗口稳定性',
        mode: 'protagonist',
        input: '叶凡推开门。外面下雨了。',
        check: function(items, input) {
            if (!window.__ForeshadowProtagonistTracker) return false;
            var tracker = window.__ForeshadowProtagonistTracker;
            tracker.reset();
            tracker.recordScan([{ name: '叶凡', score: 10, freq: 3 }], 5000, input);
            tracker.recordScan([{ name: '叶凡', score: 8, freq: 2 }], 15000, '叶凡继续走着。');
            var report = tracker.getReport();
            return report.longTermProtagonist && report.longTermProtagonist.name === '叶凡';
        }
    },
    {
        name: '主角 · 身份档案综合检测（detectIdentityProfiles）',
        mode: 'protagonist',
        input: '【名称：噬魂蚁】叶凡获得系统。他突破了练气期。',
        check: function(items, input) {
            if (!window.__ForeshadowProtagonistDetector || !window.__ForeshadowProtagonistDetector.detectIdentityProfiles) return false;
            var profiles = window.__ForeshadowProtagonistDetector.detectIdentityProfiles(input);
            return profiles.length > 0 && profiles[0].name && profiles[0].species && profiles[0].powerLevel;
        }
    }
];