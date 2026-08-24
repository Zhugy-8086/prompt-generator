// ==================== 伏笔引擎 - 文本工具 (token-utils.js) ====================
// 挂载到 window.__ForeshadowTokenUtils
// 提供分词、相似度、句子提取等基础工具

window.__ForeshadowTokenUtils = (function() {

    // 分词
    function tokenize(text) {
        if (!text || text.length === 0) return [];
        return text.split(/[，。！？、；：\s"「」『』“”\n\r]+/).filter(function(w) {
            return w.length > 1;
        });
    }

    // Jaccard 相似度
    function jaccardSimilarity(sentA, sentB) {
        var wordsA = tokenize(sentA);
        var wordsB = tokenize(sentB);
        if (wordsA.length === 0 && wordsB.length === 0) return 0;

        var setA = {};
        var setB = {};
        for (var i = 0; i < wordsA.length; i++) { setA[wordsA[i]] = true; }
        for (var j = 0; j < wordsB.length; j++) { setB[wordsB[j]] = true; }

        var intersection = 0;
        for (var key in setA) {
            if (setB[key]) intersection++;
        }

        var unionKeys = {};
        for (var k in setA) { unionKeys[k] = true; }
        for (var l in setB) { unionKeys[l] = true; }
        var union = Object.keys(unionKeys).length;

        return union === 0 ? 0 : intersection / union;
    }

    // 提取包含指定词的完整句子
    function extractSentence(text, word, position) {
        var idx = text.indexOf(word, Math.max(0, position - 100));
        if (idx === -1) idx = text.indexOf(word);
        if (idx === -1) return '';

        var start = idx;
        var end = idx + word.length;

        var sentenceBreaks = /[。！？\n]{1,2}/g;
        var match;
        while ((match = sentenceBreaks.exec(text)) !== null) {
            if (match.index < idx && match.index > start - 200) {
                start = match.index + match[0].length;
            }
            if (match.index > idx + word.length && match.index < end + 200) {
                end = match.index + match[0].length;
                break;
            }
        }

        var extracted = text.substring(start, end).trim();
        extracted = extracted.replace(/^[，、；：\s]+/, '').replace(/[，、；：\s]+$/, '');
        return extracted.length > 0 ? extracted : text.substring(start, Math.min(start + 100, text.length));
    }

    // 检查文本中是否包含解释性文字
    function hasExplanation(text, word) {
        var explanationPatterns = [
            word + '[是为即指乃].{2,20}',
            '.{2,10}(?:意为|指的是|就是说|换句话说).{0,10}' + word,
            word + '(?:是|指|即|乃|就是|的意思)',
            '(?:这是|那就是|便是|正是)' + word
        ];
        for (var i = 0; i < explanationPatterns.length; i++) {
            if (new RegExp(explanationPatterns[i]).test(text)) return true;
        }
        return false;
    }

    // 提取当前段落的氛围
    function extractMood(text) {
        var moodKeywords = {
            '不安': /不安|忐忑|心悸|发毛|不对劲/g,
            '恐惧': /恐惧|恐怖|害怕|惊恐|骇然|毛骨悚然/g,
            '悲伤': /悲伤|流泪|哭泣|哀伤|难过/g,
            '紧张': /紧张|僵持|一触即发|屏息/g,
            '平静': /平静|安静|宁静|安详|日常/g,
            '诡异': /诡异|奇怪|异样|不对劲|说不出的/g,
            '温暖': /温暖|温馨|柔和|微笑|治愈/g,
            '黑暗': /黑暗|阴森|阴冷|压抑|绝望/g,
            '燃': /热血|燃|沸腾|炸裂|爆发/g
        };
        var scores = {};
        for (var mood in moodKeywords) {
            var matches = text.match(moodKeywords[mood]);
            scores[mood] = matches ? matches.length : 0;
        }
        var bestMood = '平静';
        var bestScore = 0;
        for (var m in scores) {
            if (scores[m] > bestScore) { bestScore = scores[m]; bestMood = m; }
        }
        return bestMood;
    }

    return {
        tokenize: tokenize,
        jaccardSimilarity: jaccardSimilarity,
        extractSentence: extractSentence,
        hasExplanation: hasExplanation,
        extractMood: extractMood
    };
})();