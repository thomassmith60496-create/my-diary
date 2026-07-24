// ============================================
// 🔥 FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDvOH_VAzHBJKeXiZ8adIHsaJ6C3aGurcE",
  authDomain: "diary-51564.firebaseapp.com",
  projectId: "diary-51564",
  storageBucket: "diary-51564.firebasestorage.app",
  messagingSenderId: "1021457298792",
  appId: "1:1021457298792:web:650fe99ac0b7ba234992dd",
  measurementId: "G-CYSH82Z6YJ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const diaryRef = db.ref('lera_diary_v1');
const financeRef = db.ref('lera_finance_v1');

// Global data stores
let nutritionData = { weeks: [], currentWeekId: null };
let workouts = [];
let editingWorkoutId = null;
let currentKbjuMetric = 'cal';
let currentTrainMetric = 'weight';
const formStarsData = {};

let syncTimeout = null;
let isInitialLoad = true;
let financeData = {
    transactions: [],
    savings: [],
    planned: [],
    categories: [
        { id: 'cat-food', name: 'Еда', type: 'expense', limit: 20000, subcategories: ['Продукты', 'Доставка', 'Фастфуд', 'Кафе'], subcategoryLimits: {} },
        { id: 'cat-transport', name: 'Транспорт', type: 'expense', limit: 3000, subcategories: ['Такси', 'Общественный транспорт', 'Бензин'], subcategoryLimits: {} },
        { id: 'cat-connection', name: 'Связь', type: 'expense', limit: 1000, subcategories: ['Интернет', 'Мобильная связь'], subcategoryLimits: {} },
        { id: 'cat-marketplace', name: 'Маркетплейсы', type: 'expense', limit: 5000, subcategories: ['ВБ', 'Озон', 'Яндекс Маркет'], subcategoryLimits: {} },
        { id: 'cat-sport', name: 'Спорт', type: 'expense', limit: 5000, subcategories: ['Тренер', 'Абонемент', 'Экипировка'], subcategoryLimits: {} },
        { id: 'cat-education', name: 'Обучение', type: 'expense', limit: 15000, subcategories: ['Автошкола', 'Курсы', 'Книги'], subcategoryLimits: {} },
        { id: 'cat-tech', name: 'Техника', type: 'expense', limit: 0, subcategories: ['Телефон', 'Ноутбук', 'Аксессуары'], subcategoryLimits: {} }
    ]
};
let financeSelectedMonth = 'all';

const mealIcons = {
    breakfast:"З", lunch:"О", dinner:"У", snack:"П", snack1:"П1", snack2:"П2",
    preworkout:"💪", postworkout:"💪"
};
const typeLabels = {
    strength: '💪 Силовая', cardio: '🏃 Кардио', hiit: '🔥 ВИИТ', flex: '🧘 Растяжка', mix: '🔄 Микс'
};

// ============ AUTH GLOBALS ============
let currentUser = null;
let currentUserRole = 'admin';
let currentUserId = null;
let isReadOnlyMode = false;
let viewingUserId = null;
const usersRef = firebase.database().ref('lera_diary_users');
// ======================================

