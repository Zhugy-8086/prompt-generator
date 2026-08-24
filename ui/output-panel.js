// ui/output-panel.js
// 输出面板、复制、历史记录，挂载 window.OutputPanel
// 修复：多镜头复制按钮换行符截断HTML属性 + 多镜头验证失败不阻止生成

window.OutputPanel = (function() {
    const U = window.UiUtils;
    const MM = window.ModeManager;
    const pa = window.PlatformAdapters;
    const sp = window.StylePresets;

    // ★ 将文本安全地嵌入 HTML 属性值（处理换行符和引号）
    function safeAttr(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '&#10;')
            .replace(/\r/g, '');
    }

    function generatePrompt() {
        const type = document.getElementById('mediaType').value;
        const ratio = document.getElementById('ratio').value;
        const scene = document.getElementById('scene').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const mood = document.getElementById('mood').value.trim();
        const errorDiv = document.getElementById('errorMsg');
        if (!scene || !subject || !mood) { errorDiv.textContent = '⚠️ 请填写场景、主体、氛围。'; return; }
        errorDiv.textContent = '';
        const neg = window.NegativePanel.getSelectedNegatives() || (type === 'image' ? '多余手指，面部崩坏' : '多余手指，滑步漂移');
        const targetPlatform = document.getElementById('targetPlatform').value || 'general';
        let outputHtml = '', plainText = '';

        if (MM.getMode() === 'single') {
            let action = document.getElementById('singleAction').value.trim();
            let camera = document.getElementById('singleCamera').value.trim();
            if (type === 'video' && !action) { errorDiv.textContent = '⚠️ 视频必须填写动作'; return; }
            if (!camera && action) {
                const autoCam = sp.autoMatchCamera(action);
                if (autoCam) { camera = autoCam; document.getElementById('singleCamera').value = autoCam; }
            }
            const promptText = pa.formatPromptForPlatform(targetPlatform, { scene, subject, action, mood, camera, ratio, neg });
            outputHtml = `<pre>${U.escapeHtml(promptText)}</pre>`;
            plainText = promptText;
        } else {
            if (type === 'image') { errorDiv.textContent = '多镜头仅支持视频'; return; }

            const shots = MM.getShots();
            const partsHtml = [], partsPlain = [];

            // ★ 修复 Bug5：先验证所有镜头，再生成（避免 return 只跳出循环的问题）
            for (let i = 0; i < shots.length; i++) {
                const shot = shots[i];
                const act = shot.action.trim();
                if (!act) {
                    errorDiv.textContent = `⚠️ 镜头 ${i+1} 缺少动作`;
                    return; // 跳出整个函数
                }
            }

            // 验证通过，开始生成
            for (let i = 0; i < shots.length; i++) {
                const shot = shots[i];
                const s = shot.overrideScene || scene;
                const sub = shot.overrideSubject || subject;
                const m = shot.overrideMood || mood;
                const act = shot.action.trim();
                let cam = shot.camera.trim();
                if (!cam) cam = sp.autoMatchCamera(act);

                const shotPrompt = pa.formatPromptForPlatform(targetPlatform, { scene: s, subject: sub, action: act, mood: m, camera: cam, ratio, neg });
                const header = `【镜头${i+1} · ${shot.duration||5}秒】`;
                partsPlain.push(`${header}\n${shotPrompt}`);

                // ★ 修复 Bug4：使用 safeAttr 处理复制文本，防止换行/引号破坏 HTML
                partsHtml.push(
                    `<div class="shot-output-block">` +
                    `<div class="shot-output-header">` +
                    `<span class="shot-number">${header}</span>` +
                    `<button class="btn-small copy-btn" onclick="window.OutputPanel.copyPartial('${safeAttr(shotPrompt)}')">📋 复制本段</button>` +
                    `</div>` +
                    `<pre>${U.escapeHtml(shotPrompt)}</pre>` +
                    `</div>`
                );
            }

            outputHtml = partsHtml.join('');
            plainText = partsPlain.join('\n\n');
        }

        document.getElementById('outputText').innerHTML = outputHtml;
        document.getElementById('outputText').dataset.plainText = plainText;
        document.getElementById('outputSection').style.display = 'block';
        document.getElementById('copyStatus').textContent = '';
        saveToHistory(plainText);
    }

    function copyToClipboard() {
        const plainText = document.getElementById('outputText').dataset.plainText || document.getElementById('outputText').textContent;
        U.copyTextToClipboard(plainText).then(() => {
            document.getElementById('copyStatus').textContent = '✅ 已复制';
            setTimeout(() => document.getElementById('copyStatus').textContent = '', 2000);
        }).catch(() => {
            document.getElementById('copyStatus').textContent = '❌ 复制失败';
            setTimeout(() => document.getElementById('copyStatus').textContent = '', 2000);
        });
    }

    function copyPartial(htmlEscaped) {
        // 解码 HTML 属性中编码的换行符
        const text = htmlEscaped.replace(/&#10;/g, '\n').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        U.copyTextToClipboard(text);
    }

    function saveToHistory(text) {
        let history = JSON.parse(localStorage.getItem('promptHistory') || '[]');
        history.unshift({ text, time: new Date().toLocaleString() });
        if (history.length > 5) history = history.slice(0, 5);
        localStorage.setItem('promptHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('promptHistory') || '[]');
        const container = document.getElementById('historyList');
        if (!history.length) container.innerHTML = '<span class="no-history">暂无记录</span>';
        else container.innerHTML = history.map((h, i) => `<div onclick="window.OutputPanel.loadHistory(${i})" style="cursor:pointer;padding:4px;border-bottom:1px solid var(--border);"><span style="color:#888;font-size:0.7rem;">${h.time}</span> ${h.text.substring(0,50)}...</div>`).join('');
    }

    function loadHistory(i) {
        const history = JSON.parse(localStorage.getItem('promptHistory') || '[]');
        if (history[i]) {
            document.getElementById('outputText').textContent = history[i].text;
            document.getElementById('outputText').dataset.plainText = history[i].text;
            document.getElementById('outputSection').style.display = 'block';
        }
    }

    function clearHistory() { localStorage.removeItem('promptHistory'); renderHistory(); }

    return { generatePrompt, copyToClipboard, copyPartial, renderHistory, loadHistory, clearHistory };
})();