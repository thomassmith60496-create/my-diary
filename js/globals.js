// ============================================
// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ
// ============================================
"use strict";

// --- Данные питания ---
let nutritionData = { weeks: [], currentWeekId: null };

// --- Данные тренировок (удалены - будут перестроены заново) ---

// --- Данные финансов ---
let financeData = {
    transactions: [],
    savings: [],
    planned: [],
    mandatoryPayments: [],
    categories: [
        { id: 'cat-food', name: 'Еда', type: 'expense', limit: 20000, subcategories: ['Продукты', 'Доставка', 'Фастфуд', 'Кафе'], subcategoryLimits: {}, color: '#7e22ce' },
        { id: 'cat-transport', name: 'Транспорт', type: 'expense', limit: 3000, subcategories: ['Такси', 'Общественный транспорт', 'Бензин'], subcategoryLimits: {}, color: '#a855f7' },
        { id: 'cat-connection', name: 'Связь', type: 'expense', limit: 1000, subcategories: ['Интернет', 'Мобильная связь'], subcategoryLimits: {}, color: '#c084fc' },
        { id: 'cat-marketplace', name: 'Маркетплейсы', type: 'expense', limit: 5000, subcategories: ['ВБ', 'Озон', 'Яндекс Маркет'], subcategoryLimits: {}, color: '#d8b4fe' },
        { id: 'cat-sport', name: 'Спорт', type: 'expense', limit: 5000, subcategories: ['Тренер', 'Абонемент', 'Экипировка'], subcategoryLimits: {}, color: '#9333ea' },
        { id: 'cat-education', name: 'Обучение', type: 'expense', limit: 15000, subcategories: ['Автошкола', 'Курсы', 'Книги'], subcategoryLimits: {}, color: '#6366f1' },
        { id: 'cat-tech', name: 'Техника', type: 'expense', limit: 0, subcategories: ['Телефон', 'Ноутбук', 'Аксессуары'], subcategoryLimits: {}, color: '#3b82f6' }
    ]
};
let financeSelectedMonth = null;

// --- Данные дашборда ---
let currentKbjuMetric = 'cal';

// --- Форма звёзд ---
const formStarsData = {};

// --- Синхронизация ---
let syncTimeout = null;
let isInitialLoad = true;

// --- Факторы сна (дефолтные) ---
const DEFAULT_SLEEP_FACTORS = [
    { id: 'coffee', label: 'Кофе после 18' },
    { id: 'work', label: 'Работа после 19' },
    { id: 'training', label: 'Тренировка' },
    { id: 'late_food', label: 'Поздний приём пищи' },
    { id: 'ventilation', label: 'Проветривание комнаты' },
];

// --- Константы ---
const mealIcons = {
    breakfast:"З", lunch:"О", dinner:"У", snack:"П", snack1:"П1", snack2:"П2",
    preworkout:"💪", postworkout:"💪"
};


// ============ AUTH GLOBALS ============
let currentUser = null;
let currentUserRole = 'admin';
let currentUserId = null;
let isReadOnlyMode = false;
let viewingUserId = null;
const usersRef = firebase.database().ref('lera_diary_users');
function isReadOnlyActive() {
    return currentUserRole === 'reader' || isReadOnlyMode;
}
// ======================================