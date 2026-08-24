// ==================== 平台适配器模块 (platform-adapters.js) ====================
// 挂载到 window.PlatformAdapters
// v2.0：新增快照管理器（供批量操作撤销使用）

window.PlatformAdapters = (function() {

    const PLATFORM_CONFIGS = {
        kling: {
            name: '可灵',
            cameraFirst: true,
            formatTemplate: function(scene, subject, action, mood, camera, ratio, neg) {
                return '类型：电影感写实\n场景：' + scene + '\n主体：' + subject + '\n动作：' + action + '\n镜头与运镜：' + (camera || '固定机位') + '\n氛围与光线：' + mood + '\n画幅：' + ratio + '\n负面提示：' + neg;
            }
        },
        jimeng: {
            name: '即梦',
            cameraFirst: false,
            formatTemplate: function(scene, subject, action, mood, camera, ratio, neg) {
                return scene + '。' + subject + '，' + action + '。' + (camera || '镜头自然地捕捉着这一切') + '。' + mood + '。画幅比例 ' + ratio + '。\n负面提示词：' + neg;
            }
        },
        runway: {
            name: 'Runway',
            cameraFirst: true,
            formatTemplate: function(scene, subject, action, mood, camera, ratio, neg) {
                return '[Shot Intent]\nCamera: ' + (camera || 'Static shot') + '\nSubject: ' + subject + '\nAction: ' + action + '\nScene: ' + scene + '\nLighting/Mood: ' + mood + '\nAspect Ratio: ' + ratio + '\nNegative: ' + neg;
            }
        },
        pixverse: {
            name: 'PixVerse',
            cameraFirst: true,
            formatTemplate: function(scene, subject, action, mood, camera, ratio, neg) {
                return '主体：' + subject + '\n动作：' + action + '\n场景：' + scene + '\n镜头语言：' + (camera || '固定机位') + '\n视觉风格：' + mood + '\n技术参数：' + ratio + '\n负面：' + neg;
            }
        },
        veo: {
            name: 'Veo',
            cameraFirst: false,
            formatTemplate: function(scene, subject, action, mood, camera, ratio, neg) {
                var camStr = camera ? '镜头' + camera + '。' : '';
                return scene + '。' + subject + '正在' + action + '。' + camStr + '画面萦绕着' + mood + '的氛围。\n负面提示词：' + neg;
            }
        },
        general: {
            name: '通用',
            cameraFirst: true,
            formatTemplate: function(scene, subject, action, mood, camera, ratio, neg) {
                return ratio + '视频。' + scene + '。自然光效。镜头：' + (camera || '固定机位') + '。主体：' + subject + '。动作：' + action + '。氛围：' + mood + '。\n负面提示词：' + neg;
            }
        }
    };

    function formatPromptForPlatform(targetPlatformKey, params) {
        var config = PLATFORM_CONFIGS[targetPlatformKey] || PLATFORM_CONFIGS.general;
        return config.formatTemplate(params.scene, params.subject, params.action, params.mood, params.camera, params.ratio, params.neg);
    }

    // ========== 快照管理器（供批量操作撤销） ==========
    let snapshotData = null;

    function saveSnapshot(data) {
        snapshotData = JSON.parse(JSON.stringify(data));
    }

    function getSnapshot() {
        if (snapshotData === null) return null;
        return JSON.parse(JSON.stringify(snapshotData));
    }

    function hasSnapshot() {
        return snapshotData !== null;
    }

    function clearSnapshot() {
        snapshotData = null;
    }

    return {
        PLATFORM_CONFIGS: PLATFORM_CONFIGS,
        formatPromptForPlatform: formatPromptForPlatform,
        Snapshot: {
            save: saveSnapshot,
            get: getSnapshot,
            has: hasSnapshot,
            clear: clearSnapshot
        }
    };

})();