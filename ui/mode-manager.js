// ui/mode-manager.js
// 模式切换、多镜头管理、镜头卡片渲染，挂载 window.ModeManager

window.ModeManager = (function() {
    const U = window.UiUtils;
    const sp = window.StylePresets;
    const pa = window.PlatformAdapters;

    let currentMode = 'single';
    let shots = [];
    let draggedIndex = -1;

    function getMode() { return currentMode; }
    function getShots() { return shots; }

    function switchMode(mode) {
        if (mode === currentMode) return;
        if (mode === 'single' && currentMode === 'multi') {
            pa.Snapshot.save({ version: 1, shots: JSON.parse(JSON.stringify(shots)) }); // ★ 增加 version
        }
        currentMode = mode;
        document.getElementById('singleModePanel').style.display = mode === 'single' ? 'block' : 'none';
        document.getElementById('multiModePanel').style.display = mode === 'multi' ? 'block' : 'none';
        document.getElementById('modeSingleBtn').style.background = mode === 'single' ? 'var(--accent)' : '';
        document.getElementById('modeMultiBtn').style.background = mode === 'multi' ? 'var(--accent)' : '';
        if (mode === 'multi') {
            if (pa.Snapshot.has()) {
                const snap = pa.Snapshot.get();
                if (snap && snap.shots && snap.shots.length > 0) {
                    if (confirm('检测到之前的多镜头数据，是否恢复？')) { shots = snap.shots; }
                    else { pa.Snapshot.clear(); if (shots.length === 0) addShot(); }
                } else { if (shots.length === 0) addShot(); }
                pa.Snapshot.clear();
            } else { if (shots.length === 0) addShot(); }
            renderShots();
            updateTotalDuration();
        }
        document.getElementById('undoBatchBtn').style.display = 'none';
    }

    function addShot() {
        shots.push({ camera: '', action: '', duration: 5, overrideScene: '', overrideSubject: '', overrideMood: '' });
        renderShots();
        updateTotalDuration();
    }
    function removeShot(index) {
        shots.splice(index, 1);
        if (shots.length === 0) addShot();
        renderShots();
        updateTotalDuration();
    }
    function duplicateShot(index) {
        const clone = JSON.parse(JSON.stringify(shots[index]));
        shots.splice(index + 1, 0, clone);
        renderShots();
        updateTotalDuration();
    }
    function moveShotUp(index) {
        if (index > 0) { [shots[index], shots[index-1]] = [shots[index-1], shots[index]]; renderShots(); }
    }
    function moveShotDown(index) {
        if (index < shots.length - 1) { [shots[index], shots[index+1]] = [shots[index+1], shots[index]]; renderShots(); }
    }
    function updateShotField(index, field, value) {
        shots[index][field] = value;
        if (field === 'duration') updateTotalDuration();
    }

    function batchSetDuration() {
        pa.Snapshot.save({ version: 1, shots: JSON.parse(JSON.stringify(shots)) }); // ★ 增加 version
        document.getElementById('undoBatchBtn').style.display = 'inline-block';
        const val = parseInt(document.getElementById('batchDuration').value) || 5;
        shots.forEach(s => s.duration = val);
        renderShots();
        updateTotalDuration();
    }
    function undoBatchSet() {
        const snap = pa.Snapshot.get();
        if (snap && snap.shots) {
            shots = snap.shots;
            renderShots();
            updateTotalDuration();
            pa.Snapshot.clear();
            document.getElementById('undoBatchBtn').style.display = 'none';
        }
    }

    function handleDragStart(e, index) {
        draggedIndex = index;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    function handleDrop(e, index) {
        e.preventDefault();
        if (draggedIndex === index) return;
        const item = shots.splice(draggedIndex, 1)[0];
        shots.splice(index, 0, item);
        draggedIndex = -1;
        renderShots();
        updateTotalDuration();
    }
    function handleDragEnd(e) { e.target.classList.remove('dragging'); }

    function renderShots() {
        document.getElementById('shotsContainer').innerHTML = shots.map((shot, i) => {
            const hasOverride = shot.overrideScene || shot.overrideSubject || shot.overrideMood;
            return `<div class="shot-card${hasOverride ? ' shot-override' : ''}" draggable="true"
                 ondragstart="window.ModeManager.handleDragStart(event,${i})"
                 ondragover="window.ModeManager.handleDragOver(event)"
                 ondrop="window.ModeManager.handleDrop(event,${i})"
                 ondragend="window.ModeManager.handleDragEnd(event)">
                <div class="shot-header">
                    <span class="shot-number">🎬 镜头 ${i+1} ${hasOverride ? '<span class="shot-override-dot" title="有覆盖值"></span>' : ''}</span>
                    <div style="display:flex;gap:4px;">
                        <button class="btn-small" onclick="window.ModeManager.moveShotUp(${i})">↑</button>
                        <button class="btn-small" onclick="window.ModeManager.moveShotDown(${i})">↓</button>
                        <button class="btn-small" onclick="window.ModeManager.duplicateShot(${i})" title="复制">📋</button>
                        <button class="btn-small btn-danger" onclick="window.ModeManager.removeShot(${i})">✕</button>
                    </div>
                </div>
                <div class="shot-grid">
                    <div class="form-group shot-full">
                        <label>🎥 运镜</label>
                        <div style="display:flex;gap:4px;">
                            <input type="text" value="${U.escapeHtml(shot.camera)}" onchange="window.ModeManager.updateShotField(${i},'camera',this.value)" placeholder="缓慢推近…" style="flex:1;">
                            <select onchange="this.parentElement.querySelector('input').value=this.value; window.ModeManager.updateShotField(${i},'camera',this.value)" style="width:auto;">
                                <option value="">模板</option>
                                ${sp.shotTemplates.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group shot-full"><label>🤸 动作</label><input type="text" value="${U.escapeHtml(shot.action)}" onchange="window.ModeManager.updateShotField(${i},'action',this.value)" placeholder="缓缓转身，抬手接住树叶"></div>
                    <div class="form-group"><label>⏱️ 时长(秒)</label><input type="number" value="${shot.duration}" min="1" max="30" step="1" onchange="window.ModeManager.updateShotField(${i},'duration',parseInt(this.value)||5)"></div>
                    <div class="form-group"><label>🏞️ 覆盖场景</label><input type="text" value="${U.escapeHtml(shot.overrideScene||'')}" onchange="window.ModeManager.updateShotField(${i},'overrideScene',this.value)" placeholder="留空继承"></div>
                    <div class="form-group"><label>🧑 覆盖主体</label><input type="text" value="${U.escapeHtml(shot.overrideSubject||'')}" onchange="window.ModeManager.updateShotField(${i},'overrideSubject',this.value)" placeholder="留空继承"></div>
                    <div class="form-group"><label>💡 覆盖氛围</label><input type="text" value="${U.escapeHtml(shot.overrideMood||'')}" onchange="window.ModeManager.updateShotField(${i},'overrideMood',this.value)" placeholder="留空继承"></div>
                </div>
            </div>`;
        }).join('');
    }

    function updateTotalDuration() {
        const total = shots.reduce((sum, s) => sum + (parseInt(s.duration) || 5), 0);
        let hint = `总时长：${total}秒 `;
        const warnings = Object.entries(sp.toolLimits).filter(([, max]) => total > max).map(([t]) => t);
        hint += warnings.length ? `<span class="warning-text">⚠️ 超过 ${warnings.join('、')} 上限</span>` : '✅ 稳定时长内';
        document.getElementById('totalDurationHint').innerHTML = hint;
    }

    function onMediaChange() {
        const type = document.getElementById('mediaType').value;
        document.getElementById('singleCameraGroup').style.display = type === 'video' ? 'block' : 'none';
        if (type === 'image' && currentMode === 'multi') {
            switchMode('single');
            alert('多镜头仅适用于视频');
        }
    }

    return {
        getMode, getShots, switchMode, addShot, removeShot, duplicateShot,
        moveShotUp, moveShotDown, updateShotField,
        batchSetDuration, undoBatchSet,
        handleDragStart, handleDragOver, handleDrop, handleDragEnd,
        renderShots, updateTotalDuration, onMediaChange
    };
})();