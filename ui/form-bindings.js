// ui/form-bindings.js
// 风格标签、场景模板、主题切换、清空、多文件批量处理，挂载 window.FormBindings

window.FormBindings = (function() {
    const sp = window.StylePresets;
    const EM = window.ExtractManager;
    const MM = window.ModeManager;

    let activeStyles = [];
    let currentFileList = [];      // 存储排序后的文件对象数组
    let batchInProgress = false;

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    function renderStyleTags() {
        const container = document.getElementById('styleTags');
        if (!container) return;
        container.innerHTML = sp.styleTags.map(s => {
            const active = activeStyles.includes(s.label);
            return `<span class="style-tag${active ? ' active' : ''}" onclick="window.FormBindings.toggleStyle('${s.label}')">${s.label}</span>`;
        }).join('');
    }
    function toggleStyle(label) {
        if (activeStyles.includes(label)) {
            activeStyles = activeStyles.filter(s => s !== label);
            removeStyleFromMood(label);
        } else {
            activeStyles.push(label);
            if (activeStyles.length > 3) {
                const removed = activeStyles.shift();
                removeStyleFromMood(removed);
            }
        }
        renderStyleTags();
        injectStyleToMood();
    }
    function injectStyleToMood() {
        const moodInput = document.getElementById('mood');
        if (!moodInput) return;
        let base = moodInput.value.replace(/[，,]\s*$/, '').trim();
        const injected = activeStyles.map(l => {
            const p = sp.styleTags.find(s => s.label === l);
            return p ? p.value : '';
        }).filter(Boolean).join('；');
        if (injected && !base.includes(injected)) {
            moodInput.value = base ? base + '；' + injected : injected;
        }
    }
    function removeStyleFromMood(label) {
        const moodInput = document.getElementById('mood');
        if (!moodInput) return;
        const p = sp.styleTags.find(s => s.label === label);
        if (p && moodInput.value.includes(p.value)) {
            moodInput.value = moodInput.value.replace(p.value, '').replace(/；；/g, '；').replace(/^；|；$/g, '');
        }
    }

    function renderTemplatePanel() {
        const container = document.getElementById('templateList');
        if (!container) return;
        container.innerHTML = sp.sceneTemplates.map(tpl =>
            `<div class="template-item" onclick="window.FormBindings.loadTemplate('${tpl.name.replace(/'/g, "\\'")}')"><strong>${tpl.name}</strong><span class="template-desc">${tpl.description}</span></div>`
        ).join('');
    }
    function openTemplatePanel() {
        document.getElementById('templatePanel').style.display = 'flex';
        setTimeout(() => document.addEventListener('click', handleClickOutsideTemplate), 0);
    }
    function closeTemplatePanel() {
        document.getElementById('templatePanel').style.display = 'none';
        document.removeEventListener('click', handleClickOutsideTemplate);
    }
    function handleClickOutsideTemplate(e) {
        const panel = document.getElementById('templatePanel');
        const btn = document.getElementById('sceneTemplateBtn');
        if (!panel.contains(e.target) && e.target !== btn) closeTemplatePanel();
    }
    function loadTemplate(name) {
        const tpl = sp.getTemplateByName(name);
        if (!tpl) { document.getElementById('errorMsg').textContent = '模板加载失败'; return; }
        document.getElementById('scene').value = tpl.scene || '';
        document.getElementById('subject').value = tpl.subject || '';
        document.getElementById('mood').value = tpl.mood || '';
        if (MM.getMode() === 'single') {
            document.getElementById('singleAction').value = tpl.action || '';
            document.getElementById('singleCamera').value = tpl.camera || '';
        } else {
            const shots = MM.getShots();
            if (shots.length > 0) {
                shots[0].action = tpl.action || '';
                shots[0].camera = tpl.camera || '';
                MM.renderShots();
            }
        }
        closeTemplatePanel();
        document.getElementById('errorMsg').textContent = '';
        if (document.getElementById('referenceText').value.trim()) EM.extractKeywords();
    }

    // ========== 多文件处理 ==========
    function handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (!files.length) return;
        // 自然排序
        const sorted = naturalSortFiles(files);
        currentFileList = sorted;
        displayFileList(sorted);
        // 清空原有文本域内容，显示第一个文件内容（可选）
        if (sorted.length > 0) {
            readFirstFileContent(sorted[0]);
        }
    }

    function naturalSortFiles(files) {
        return files.sort((a, b) => {
            const numA = extractChapterNumber(a.name);
            const numB = extractChapterNumber(b.name);
            if (numA !== null && numB !== null) return numA - numB;
            return a.name.localeCompare(b.name, 'zh', { numeric: true });
        });
    }

    function extractChapterNumber(filename) {
        // 匹配 “第1章”、“第一章”、“第10节”、“第一百零八章” 等
        const match = filename.match(/第\s*([一二三四五六七八九十百千万\d]+)\s*[章节篇回]/);
        if (!match) return null;
        const numStr = match[1];
        if (/^\d+$/.test(numStr)) return parseInt(numStr, 10);
        return chineseToNumber(numStr);
    }

    function chineseToNumber(chStr) {
        const chnNumMap = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
        const unitMap = { '十':10, '百':100, '千':1000, '万':10000 };
        let result = 0;
        let temp = 0;
        for (let i = 0; i < chStr.length; i++) {
            const ch = chStr[i];
            if (chnNumMap[ch]) {
                temp = chnNumMap[ch];
            } else if (unitMap[ch]) {
                if (temp === 0) temp = 1;
                result += temp * unitMap[ch];
                temp = 0;
            } else {
                // 无法识别的字符，直接跳过
                result += temp;
                temp = 0;
            }
        }
        result += temp;
        return result;
    }

    function displayFileList(files) {
        const container = document.getElementById('fileListContainer');
        if (!container) return;
        if (files.length === 0) {
            container.innerHTML = '<span style="color:#888;">未选择文件</span>';
            return;
        }
        container.innerHTML = files.map((f, idx) => `<div class="file-item" data-idx="${idx}">${idx+1}. ${f.name}</div>`).join('');
    }

    function readFirstFileContent(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('referenceText').value = e.target.result;
            EM.extractKeywords();
        };
        reader.onerror = function() {
            document.getElementById('referenceText').value = '[读取失败]';
        };
        reader.readAsText(file, 'UTF-8');
    }

    async function startBatchProcess() {
        if (batchInProgress) { alert('批量处理进行中，请稍后'); return; }
        if (!currentFileList.length) { alert('请先上传文件'); return; }
        batchInProgress = true;
        const progressBar = document.getElementById('batchProgressBar');
        const progressText = document.getElementById('batchProgressText');
        const batchResultDiv = document.getElementById('batchResult');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.innerText = '0 / ' + currentFileList.length;
        if (batchResultDiv) batchResultDiv.innerHTML = '';

        let allOutputs = [];
        for (let i = 0; i < currentFileList.length; i++) {
            const file = currentFileList[i];
            const content = await readFileContent(file);
            if (content === null) {
                if (batchResultDiv) batchResultDiv.innerHTML += `<div>❌ 读取失败: ${file.name}</div>`;
                continue;
            }
            // 更新界面预览（可选）
            document.getElementById('referenceText').value = content;
            // 调用提取，但不刷新界面太快，可以静默收集结果，或者直接触发一次提取并等待
            // 为了顺序，我们等待提取完成（通过回调）
            await new Promise((resolve) => {
                EM.extractFromContent(content, file.name, (tags) => {
                    if (batchResultDiv) {
                        batchResultDiv.innerHTML += `<div><strong>${file.name}</strong><br>提取词: ${tags.map(t=>t.text).join(', ').substring(0,100)}</div><hr>`;
                    }
                    resolve();
                });
            });
            const percent = Math.floor(((i+1) / currentFileList.length) * 100);
            if (progressBar) progressBar.style.width = percent + '%';
            if (progressText) progressText.innerText = (i+1) + ' / ' + currentFileList.length;
        }
        if (batchResultDiv) batchResultDiv.innerHTML += '<div>✅ 批量处理完成</div>';
        batchInProgress = false;
    }

    function readFileContent(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsText(file, 'UTF-8');
        });
    }

    function clearAll() {
        ['scene', 'subject', 'mood', 'singleAction', 'singleCamera', 'referenceText'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('extractedKeywords').innerHTML = '';
        document.getElementById('errorMsg').textContent = '';
        document.getElementById('outputSection').style.display = 'none';
        activeStyles = [];
        renderStyleTags();
        const shots = MM.getShots();
        shots.length = 0;
        if (MM.getMode() === 'multi') { MM.addShot(); MM.renderShots(); MM.updateTotalDuration(); }
        document.getElementById('undoBatchBtn').style.display = 'none';
        window.PlatformAdapters.Snapshot.clear();
        currentFileList = [];
        const fileListContainer = document.getElementById('fileListContainer');
        if (fileListContainer) fileListContainer.innerHTML = '';
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
    }

    return {
        toggleTheme, renderStyleTags, toggleStyle,
        renderTemplatePanel, openTemplatePanel, closeTemplatePanel, loadTemplate,
        handleFileUpload, startBatchProcess,
        clearAll
    };
})();