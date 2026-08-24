// ==================== 同义词组模块 (synonym-groups.js) ====================
// 挂载到 window.__ElizaSynonymGroups
// 供 eliza-rules.js 索引文件组装使用

window.__ElizaSynonymGroups = (function() {

    const synonymGroups = [
        ['泪', '眼泪', '泪水', '泪珠', '泪光', '含泪', '泪眼'],
        ['微笑', '笑容', '笑意', '含笑', '笑'],
        ['凝视', '注视', '望着', '凝望', '眺望', '望向'],
        ['孤独', '独自', '孤单', '寂寞', '孑然'],
        ['黄昏', '暮色', '日落', '傍晚', '夕阳'],
        ['清晨', '黎明', '拂晓', '晨曦', '破晓'],
        ['恐惧', '骇然', '惊恐', '大吃一惊'],
        ['紧张', '紧绷', '戒备', '警觉'],
        ['安静', '寂静', '肃静', '落针可闻', '鸦雀无声'],
        ['突然', '忽然', '蓦地', '猛然', '陡然'],
    ];

    function getSynonymRep(word) {
        for (const group of synonymGroups) {
            for (const member of group) {
                if (word.includes(member) || member.includes(word)) return group[0];
            }
        }
        return word;
    }

    function findSynonymCandidates(word) {
        for (const group of synonymGroups) {
            for (const member of group) {
                if (word.includes(member) || member.includes(word)) return [...group];
            }
        }
        return [word];
    }

    return {
        synonymGroups: synonymGroups,
        getSynonymRep: getSynonymRep,
        findSynonymCandidates: findSynonymCandidates
    };

})();