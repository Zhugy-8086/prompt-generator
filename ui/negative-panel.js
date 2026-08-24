// ui/negative-panel.js
// 负面提示词面板，挂载 window.NegativePanel

window.NegativePanel = (function() {
    let customNegatives = [];

    const baseNegCategories = {
        'A·人物': ['多余手指', '面部崩坏', '眼睛大小不一', '关节反向', '肢体扭曲'],
        'B·物体空间': ['物体凭空出现', '形态跳变', '违反透视', '主体出框', '比例失衡'],
        'C·运动': ['滑步漂移', '运动形变', '动作冻结', '动作跳跃'],
        'D·风格': ['光效闪烁', '滤镜感过重', '色彩随机偏移', '过度锐化']
    };

    function loadCustomNegatives() {
        try { customNegatives = JSON.parse(localStorage.getItem('customNegatives') || '[]'); } catch(e) { customNegatives = []; }
    }
    function saveCustomNegatives() { localStorage.setItem('customNegatives', JSON.stringify(customNegatives)); }
    function addCustomNeg() {
        const input = document.getElementById('customNegInput');
        const word = input.value.trim();
        if (!word || customNegatives.includes(word)) { input.value = ''; return; }
        customNegatives.push(word);
        saveCustomNegatives();
        renderCustomNegList();
        input.value = '';
        renderNegChecklist();
    }
    function removeCustomNeg(word) {
        customNegatives = customNegatives.filter(w => w !== word);
        saveCustomNegatives();
        renderCustomNegList();
        renderNegChecklist();
    }
    function renderCustomNegList() {
        const container = document.getElementById('customNegList');
        if (!customNegatives.length) { container.innerHTML = ''; return; }
        container.innerHTML = customNegatives.map(w => `<div class="neg-custom-item">${w} <button onclick="window.NegativePanel.removeCustomNeg('${w.replace(/'/g, "\\'")}')">×</button></div>`).join('');
    }
    function renderNegChecklist() {
        let html = '';
        Object.entries(baseNegCategories).forEach(([cat, items]) => {
            html += `<div class="neg-category"><div class="neg-cat-title">${cat}</div>`;
            items.forEach(item => { html += `<label><input type="checkbox" value="${item}" class="neg-check" checked> ${item}</label>`; });
            html += `</div>`;
        });
        if (customNegatives.length > 0) {
            html += `<div class="neg-category"><div class="neg-cat-title">E·自定义</div>`;
            customNegatives.forEach(item => { html += `<label><input type="checkbox" value="${item}" class="neg-check" checked> ${item}</label>`; });
            html += `</div>`;
        }
        document.getElementById('negChecklist').innerHTML = html;
    }
    function getSelectedNegatives() {
        return Array.from(document.querySelectorAll('.neg-check:checked')).map(cb => cb.value).join('，');
    }
    function negSelectAll() { document.querySelectorAll('.neg-check').forEach(cb => cb.checked = true); }
    function negClearAll() { document.querySelectorAll('.neg-check').forEach(cb => cb.checked = false); }
    function negInvert() { document.querySelectorAll('.neg-check').forEach(cb => cb.checked = !cb.checked); }

    return {
        loadCustomNegatives, addCustomNeg, removeCustomNeg,
        renderCustomNegList, renderNegChecklist, getSelectedNegatives,
        negSelectAll, negClearAll, negInvert
    };
})();