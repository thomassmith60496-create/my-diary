// ============================================
// 📅 УТИЛИТЫ — ФУНКЦИИ РАБОТЫ С ДАТАМИ
// ============================================
"use strict";

/**
 * Форматирует дату в короткий формат "DD.MM.YYYY" (например, "15.03.2026")
 */
window.formatDateShort = function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
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
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
};

