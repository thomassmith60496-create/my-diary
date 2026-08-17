// ============================================
// 📅 УТИЛИТЫ — ФУНКЦИИ РАБОТЫ С ДАТАМИ
// ============================================
"use strict";

/**
 * Экранирует HTML-спецсимволы для безопасной вставки в innerHTML/атрибуты
 * Экранирует: & < > " ' `
 */
window.esc = function(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&apos;')
        .replace(/`/g, '&#96;');
};

/**
 * Возвращает локальную дату в формате YYYY-MM-DD (для input[type=date])
 * Не использует toISOString() чтобы избежать смещения UTC
 */
window.getLocalDateStr = function(date) {
    if (!date) date = new Date();
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Форматирует дату в короткий формат "DD.MM.YYYY" (например, "15.03.2026")
 */
window.formatDateShort = function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear().toString().slice(2)}`;
};

window.formatDateWithYear = function(dateStr) {
    return window.formatDateShort(dateStr);
};

window.formatDateFull = function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
};

window.formatDateShortRussian = function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear().toString().slice(2)}`;
};

