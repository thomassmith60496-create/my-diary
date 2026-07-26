// ============================================
// 📅 УТИЛИТЫ — ФУНКЦИИ РАБОТЫ С ДАТАМИ
// ============================================
"use strict";

/**
 * Форматирует дату в короткий формат "DD.MM.YYYY" (например, "15.03.2026")
 */
function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

/**
 * Форматирует дату в формат "DD.MM.YYYY" (алиас для formatDateShort, используется в питании)
 */
function formatDateWithYear(dateStr) {
    return formatDateShort(dateStr);
}

/**
 * Форматирует дату в русский формат "D месяц YYYY, день_недели" (например, "15 марта 2026, Вс")
 * Используется в тренировках
 */
function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
}

/**
 * Форматирует дату в короткий русский формат "D месяц" (например, "15 мар")
 * Используется в дашборде
 */
function formatDateShortRussian(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}