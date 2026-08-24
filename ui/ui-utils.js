// ui/ui-utils.js
// 通用 DOM 工具，挂载 window.UiUtils

window.UiUtils = (function() {
    function toggleSection(id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('hidden');
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
    }
    
    function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(textarea);
        textarea.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok ? Promise.resolve() : Promise.reject();
    }
    
    function showToast(message) {
        var existing = document.getElementById('globalToast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:8px;z-index:99999;font-size:0.85rem;';
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 2000);
    }
    
    return {
        toggleSection: toggleSection,
        escapeHtml: escapeHtml,
        copyTextToClipboard: copyTextToClipboard,
        showToast: showToast
    };
})();