// ============================================
// 🪟 CUSTOM MODALS - ЗАМЕНА ALERT/CONFIRM/PROMPT
// ============================================
"use strict";

let customModalCallback = null;

// === ОТОБРАЖЕНИЕ МОДАЛКИ ===

window.showCustomModal = function(options) {
    const {
        title = 'Уведомление',
        message = '',
        inputPlaceholder = '',
        inputValue = '',
        showInput = false,
        confirmText = 'OK',
        cancelText = 'Отмена',
        type = 'info' // info, warning, danger, success
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay visible';
    overlay.id = 'custom-modal-overlay';

    const colors = {
        info: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        warning: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)',
        danger: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        success: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
    };

    let html = `
        <div class="custom-modal">
            <div class="custom-modal-header" style="background: ${colors[type] || colors.info}">
                <h3>${escapeHtml(title)}</h3>
            </div>
            <div class="custom-modal-body">
                <div class="custom-modal-message">${message}</div>
                ${showInput ? `<input type="text" class="custom-modal-input" id="custom-modal-input" placeholder="${escapeHtml(inputPlaceholder)}" value="${escapeHtml(inputValue)}">` : ''}
            </div>
            <div class="custom-modal-footer">
                ${cancelText ? `<button class="btn" onclick="closeCustomModal(false)">${escapeHtml(cancelText)}</button>` : ''}
                <button class="btn primary" onclick="confirmCustomModal()">${escapeHtml(confirmText)}</button>
            </div>
        </div>
    `;

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Фокус на инпут если есть
    if (showInput) {
        setTimeout(() => {
            const input = document.getElementById('custom-modal-input');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    // Закрытие по клику на оверлей
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeCustomModal(null);
        }
    });

    // Закрытие по Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeCustomModal(null);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// === ЗАКРЫТИЕ МОДАЛКИ ===

window.closeCustomModal = function(result) {
    const overlay = document.getElementById('custom-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    if (customModalCallback) {
        const callback = customModalCallback;
        customModalCallback = null;
        callback(result);
    }
};

window.confirmCustomModal = function() {
    const input = document.getElementById('custom-modal-input');
    const value = input ? input.value : true;
    closeCustomModal(value);
};

// === УТИЛИТЫ ДЛЯ ЗАМЕНЫ ALERT/CONFIRM/PROMPT ===

window.customAlert = function(message, title = 'Уведомление') {
    return new Promise((resolve) => {
        customModalCallback = resolve;
        showCustomModal({
            title,
            message,
            confirmText: 'OK',
            cancelText: null,
            type: 'info'
        });
    });
};

window.customConfirm = function(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
        customModalCallback = resolve;
        showCustomModal({
            title,
            message,
            confirmText: 'Да',
            cancelText: 'Нет',
            type: 'warning'
        });
    });
};

window.customPrompt = function(message, placeholder = '', defaultValue = '', title = 'Ввод данных') {
    return new Promise((resolve) => {
        customModalCallback = resolve;
        showCustomModal({
            title,
            message,
            inputPlaceholder: placeholder,
            inputValue: defaultValue,
            showInput: true,
            confirmText: 'OK',
            cancelText: 'Отмена',
            type: 'info'
        });
    });
};

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ===

window.escapeHtml = function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}