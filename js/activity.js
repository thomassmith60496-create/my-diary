// ============================================
// 🔥 АКТИВНОСТЬ - ХИТМАПЫ И СТРИКИ
// ============================================
// Собирает активность по всем модулям (питание, тренировки,
// финансы, задачи) и отрисовывает GitHub-style хитмапы и
// счётчики стриков. Без внешних библиотек.
// ============================================
(function() {
'use strict';

const MODULE_COLORS = {
    nutrition: '#22c55e',
    training:  '#3b82f6',
    finance:   '#ef4444',
    todo:      '#8b5cf6',
    habits:    '#f59e0b',
    overall:   '#14b8a6'
};

const MODULE_LABELS = {
    nutrition: 'Питание',
    training:  'Тренировки',
    finance:   'Финансы',
    todo:      'Задачи',
    habits:    'Привычки',
    overall:   'Всего'
};

const MODULE_ICONS = {
    nutrition: '📘',
    training:  '🏋️',
    finance:   '💰',
    todo:      '✅',
    habits:    '🎯',
    overall:   '🔥'
};

const MONTHS_SHORT = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

const pad = n => String(n).padStart(2, '0');
function keyOfDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseKey(k) { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
function dayDiff(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }

function hexToRgb(hex) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixWhite(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const w = 255;
    const c = x => Math.round(x + (w - x) * amt).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
}
function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================
// СБОР ДАННЫХ
// ============================================

function initEntry(map, k) {
    if (!map[k]) {
        map[k] = {
            nutrition: { cal: 0, meals: 0 },
            training:  { sets: 0, workouts: 0 },
            finance:   { expense: 0, income: 0, count: 0 },
            todo:      { done: 0, total: 0 },
            habits:    { done: 0, total: 0 },
            active: false
        };
    }
    return map[k];
}

/**
 * Собрать карту активности дата → статистика за диапазон.
 * @param {string} startKey 'YYYY-MM-DD'
 * @param {string} endKey   'YYYY-MM-DD'
 */
function buildMap(startKey, endKey) {
    const map = {};

    // --- Питание ---
    try {
        if (typeof nutritionData !== 'undefined' && nutritionData.weeks) {
            nutritionData.weeks.forEach(week => {
                if (!week || !week.menu) return;
                week.menu.forEach((day, di) => {
                    if (!day || !day.date) return;
                    const d = typeof normalizeDate === 'function' ? normalizeDate(day.date) : day.date;
                    if (d < startKey || d > endKey) return;
                    if (!day.meals || !day.meals.length) return;
                    let cal = 0, meals = 0;
                    day.meals.forEach((meal, mi) => {
                        const c = parseFloat(week.data && week.data['m-' + di + '-' + mi + '-cal']);
                        if (!isNaN(c) && c > 0) { cal += c; meals++; }
                    });
                    if (meals > 0) {
                        const e = initEntry(map, d);
                        e.nutrition.cal = Math.round(cal);
                        e.nutrition.meals = meals;
                        e.active = true;
                    }
                });
            });
        }
    } catch (err) {}

    // --- Тренировки ---
    try {
        if (typeof TrainingWorkoutAPI !== 'undefined') {
            const ws = TrainingWorkoutAPI.getWorkouts();
            ws.forEach(w => {
                if (!w || !w.date) return;
                if (w.date < startKey || w.date > endKey) return;
                const e = initEntry(map, w.date);
                e.training.workouts++;
                let sets = 0;
                (w.exercises || []).forEach(ex => { sets += (ex.sets || []).length; });
                e.training.sets += sets;
                e.active = true;
            });
        }
    } catch (err) {}

    // --- Финансы ---
    try {
        if (typeof financeData !== 'undefined' && financeData.transactions) {
            financeData.transactions.forEach(t => {
                if (!t || !t.date) return;
                if (t.date < startKey || t.date > endKey) return;
                const e = initEntry(map, t.date);
                e.finance.count++;
                const amt = Math.abs(parseFloat(t.amount) || 0);
                if (t.type === 'expense') e.finance.expense += amt;
                else if (t.type === 'income') e.finance.income += amt;
                e.active = true;
            });
        }
    } catch (err) {}

    // --- Задачи (обычные) ---
    try {
        if (typeof window.getTodoState === 'function') {
            const st = window.getTodoState();
            if (st && Array.isArray(st.tasks)) {
                st.tasks.forEach(t => {
                    if (!t || !t.date) return;
                    if (t.date < startKey || t.date > endKey) return;
                    const e = initEntry(map, t.date);
                    e.todo.total++;
                    if (t.completed) { e.todo.done++; e.active = true; }
                });
            }
        }
    } catch (err) {}

    // --- Задачи (регулярные) ---
    try {
        if (typeof window.getTodoDayTasks === 'function') {
            let d = parseKey(startKey);
            let guard = 0;
            while (keyOfDate(d) <= endKey && guard < 20000) {
                const k = keyOfDate(d);
                const dayTasks = window.getTodoDayTasks(k);
                if (dayTasks && dayTasks.length) {
                    const e = initEntry(map, k);
                    dayTasks.forEach(t => {
                        if (t && t.recId) {
                            e.todo.total++;
                            if (t.completed) { e.todo.done++; e.active = true; }
                        }
                    });
                }
                d = addDays(d, 1);
                guard++;
            }
        }
    } catch (err) {}

    // --- Привычки ---
    try {
        if (typeof window.getHabitDayProgress === 'function') {
            let d = parseKey(startKey);
            let guard = 0;
            while (keyOfDate(d) <= endKey && guard < 20000) {
                const k = keyOfDate(d);
                const p = window.getHabitDayProgress(k);
                if (p && p.total > 0) {
                    const e = initEntry(map, k);
                    e.habits.done = p.done;
                    e.habits.total = p.total;
                    if (p.done > 0) e.active = true;
                }
                d = addDays(d, 1);
                guard++;
            }
        }
    } catch (err) {}

    return map;
}

function moduleValue(entry, module) {
    if (!entry) return 0;
    switch (module) {
        case 'nutrition': return entry.nutrition.cal;
        case 'training':  return entry.training.sets;
        case 'finance':   return Math.round(entry.finance.expense);
        case 'todo':      return entry.todo.done;
        case 'habits':    return entry.habits.done;
        case 'overall':   return entry.active ? 1 : 0;
    }
    return 0;
}

function moduleActive(entry, module) {
    if (!entry) return false;
    switch (module) {
        case 'nutrition': return entry.nutrition.meals > 0;
        case 'training':  return entry.training.workouts > 0;
        case 'finance':   return entry.finance.count > 0;
        case 'todo':      return entry.todo.done > 0;
        case 'habits':    return entry.habits.done > 0;
        case 'overall':   return entry.active;
    }
    return false;
}

function tooltipText(date, entry, module) {
    const p = date.split('-');
    const label = p[2] + '.' + p[1] + '.' + p[0];
    if (!entry) return label;
    switch (module) {
        case 'nutrition':
            return label + ' · ' + entry.nutrition.cal.toLocaleString('ru-RU') + ' ккал · ' + entry.nutrition.meals + ' приёмов';
        case 'training':
            return label + ' · ' + entry.training.sets + ' подходов · ' + entry.training.workouts + ' тренировок';
        case 'finance':
            return label + ' · расход ' + Math.round(entry.finance.expense).toLocaleString('ru-RU') + ' ₽ · ' + entry.finance.count + ' операций';
        case 'todo':
            return label + ' · выполнено ' + entry.todo.done + ' из ' + entry.todo.total;
        case 'habits':
            return label + ' · выполнено ' + entry.habits.done + ' из ' + entry.habits.total;
        case 'overall':
            return entry.active ? label + ' · активный день' : label;
    }
    return label;
}

// ============================================
// ХИТМАП
// ============================================

const CELL = 12, GAP = 3, STEP = CELL + GAP;
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function cellColor(v, max, base) {
    if (v <= 0) return '#ebedf0';
    const r = max > 0 ? v / max : 1;
    if (r <= 0.25) return mixWhite(base, 0.7);
    if (r <= 0.5) return mixWhite(base, 0.45);
    if (r <= 0.75) return mixWhite(base, 0.2);
    return base;
}

let tipEl = null;
function getTip() {
    if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'hm-tooltip';
        document.body.appendChild(tipEl);
    }
    return tipEl;
}
function hideTip() {
    if (tipEl) tipEl.style.display = 'none';
}

/**
 * Отрисовать GitHub-style хитмап.
 * @param {Element} container
 * @param {string} module - 'nutrition'|'training'|'finance'|'todo'|'overall'
 * @param {Object} opts - { onDayClick(date) }
 */
window.renderActivityHeatmap = function(container, module, opts) {
    if (!container) return;
    opts = opts || {};

    const today = new Date();
    const endKey = keyOfDate(today);
    const start = addDays(today, -364);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7); // к понедельнику
    const startKey = keyOfDate(start);

    const map = buildMap(startKey, endKey);

    const weeks = [];
    let d = new Date(start);
    while (keyOfDate(d) <= endKey) {
        const col = [];
        for (let i = 0; i < 7; i++) {
            const k = keyOfDate(d);
            col.push({ date: k, entry: map[k] || null, future: k > endKey });
            d = addDays(d, 1);
        }
        weeks.push(col);
    }

    let max = 0;
    weeks.forEach(col => col.forEach(c => {
        if (c.entry) { const v = moduleValue(c.entry, module); if (v > max) max = v; }
    }));

    const base = MODULE_COLORS[module] || '#14b8a6';

    // Подписи месяцев
    let monthsHtml = '';
    weeks.forEach((col, i) => {
        const mon = col[0].date.slice(5, 7);
        const prevMon = i > 0 ? weeks[i - 1][0].date.slice(5, 7) : null;
        if (prevMon !== mon) {
            monthsHtml += '<span class="hm-month" style="left:' + (i * STEP) + 'px">' + MONTHS_SHORT[parseInt(mon, 10) - 1] + '</span>';
        }
    });

    // Ячейки
    let cellsHtml = '';
    weeks.forEach(col => {
        col.forEach(c => {
            const v = c.entry ? moduleValue(c.entry, module) : 0;
            const bg = c.future ? 'transparent' : cellColor(v, max, base);
            const tip = tooltipText(c.date, c.entry, module);
            const extra = c.date === endKey ? ' hm-today' : '';
            cellsHtml += '<button type="button" class="hm-cell' + extra + '" data-date="' + c.date + '" data-tip="' + escAttr(tip) + '"' +
                (c.future ? ' disabled' : '') + ' style="background:' + bg + '"></button>';
        });
    });

    const gridWidth = weeks.length * STEP - GAP;

    container.innerHTML =
        '<div class="hm">' +
            '<div class="hm-months" style="width:' + gridWidth + 'px">' + monthsHtml + '</div>' +
            '<div class="hm-body">' +
                '<div class="hm-daylabels">' + DAY_LABELS.map(l => '<span>' + l + '</span>').join('') + '</div>' +
                '<div class="hm-grid" style="grid-template-columns:repeat(' + weeks.length + ',' + CELL + 'px);grid-template-rows:repeat(7,' + CELL + 'px);width:' + gridWidth + 'px">' + cellsHtml + '</div>' +
            '</div>' +
            '<div class="hm-legend">Меньше' +
                '<span class="hm-cell" style="background:#ebedf0"></span>' +
                '<span class="hm-cell" style="background:' + mixWhite(base, 0.7) + '"></span>' +
                '<span class="hm-cell" style="background:' + mixWhite(base, 0.45) + '"></span>' +
                '<span class="hm-cell" style="background:' + mixWhite(base, 0.2) + '"></span>' +
                '<span class="hm-cell" style="background:' + base + '"></span>' +
                'Больше</div>' +
        '</div>';

    container._hmOpts = opts;

    if (!container.dataset.hmBound) {
        container.dataset.hmBound = '1';
        container.addEventListener('mouseover', e => {
            const cell = e.target.closest('.hm-cell');
            if (!cell || cell.disabled || !cell.dataset.tip) return;
            const tip = getTip();
            tip.textContent = cell.dataset.tip;
            tip.style.display = 'block';
            const r = cell.getBoundingClientRect();
            tip.style.left = Math.round(r.left + r.width / 2) + 'px';
            tip.style.top = Math.round(r.top - 8) + 'px';
        });
        container.addEventListener('mouseleave', hideTip);
        container.addEventListener('click', e => {
            const cell = e.target.closest('.hm-cell');
            if (!cell || cell.disabled) return;
            const optsNow = container._hmOpts || {};
            if (typeof optsNow.onDayClick === 'function') optsNow.onDayClick(cell.dataset.date);
        });
    }
};

// ============================================
// СТРИКИ
// ============================================

function currentStreak(activeSet, endKey) {
    let d = parseKey(endKey);
    if (!activeSet.has(keyOfDate(d))) d = addDays(d, -1);
    let streak = 0;
    while (activeSet.has(keyOfDate(d))) {
        streak++;
        d = addDays(d, -1);
        if (streak > 10000) break;
    }
    return streak;
}

function bestStreak(activeSet) {
    const keys = Array.from(activeSet).sort();
    let best = 0, cur = 0, prev = null;
    keys.forEach(k => {
        if (prev !== null && dayDiff(prev, k) === 1) cur++;
        else cur = 1;
        if (cur > best) best = cur;
        prev = k;
    });
    return best;
}

function pluralDay(n) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return 'день';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'дня';
    return 'дней';
}

/**
 * Отрисовать карточки стриков.
 * @param {Element} container
 * @param {Object} opts - { only: ['nutrition'] } - ограничить список модулей
 */
window.renderActivityStreaks = function(container, opts) {
    if (!container) return;
    opts = opts || {};

    const today = keyOfDate(new Date());
    const map = buildMap('2000-01-01', today);

    const list = (opts.only && opts.only.length) ? opts.only : ['overall', 'nutrition', 'training', 'finance', 'todo', 'habits'];

    const html = list.map(module => {
        const activeSet = new Set();
        Object.keys(map).forEach(k => { if (moduleActive(map[k], module)) activeSet.add(k); });
        const cur = currentStreak(activeSet, today);
        const best = bestStreak(activeSet);
        const icon = MODULE_ICONS[module] || '🔥';
        const label = MODULE_LABELS[module] || module;
        return '<div class="hs-card">' +
            '<div class="hs-icon">' + icon + '</div>' +
            '<div class="hs-info">' +
                '<div class="hs-label">' + label + '</div>' +
                '<div class="hs-current' + (cur > 0 ? ' on' : '') + '">' + (cur > 0 ? '🔥 ' + cur + ' ' + pluralDay(cur) + ' подряд' : 'Стрика нет') + '</div>' +
                '<div class="hs-best">Рекорд: ' + best + ' ' + pluralDay(best) + '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    container.innerHTML = '<div class="hs-wrap">' + html + '</div>';
};

// ============================================
// НАВИГАЦИЯ ПО КЛИКУ
// ============================================

function switchFinanceSubTabSafe(tab) {
    const fin = document.getElementById('main-tab-finance');
    if (!fin) return;
    fin.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    fin.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
    const btn = fin.querySelector('.sub-tab-btn[onclick*="' + tab + '"]');
    if (btn) btn.classList.add('active');
    const content = document.getElementById('fin-sub-' + tab);
    if (content) content.classList.add('active');
    if (tab === 'transactions' && typeof window.renderFinanceTransactions === 'function') {
        window.renderFinanceTransactions();
    }
}

function activityOpenNutritionDay(date) {
    let week = null, dayIdx = -1;
    try {
        if (typeof nutritionData !== 'undefined' && nutritionData.weeks) {
            for (const w of nutritionData.weeks) {
                if (!w || !w.menu) continue;
                const idx = w.menu.findIndex(dd => dd && dd.date && normalizeDate(dd.date) === date);
                if (idx >= 0) { week = w; dayIdx = idx; break; }
            }
        }
    } catch (err) {}
    if (week && week.id) nutritionData.currentWeekId = week.id;
    if (typeof switchMainTab === 'function') switchMainTab('food');
    setTimeout(() => {
        if (typeof renderNutritionAll === 'function') renderNutritionAll();
        if (dayIdx >= 0 && typeof scrollToDay === 'function') {
            setTimeout(() => scrollToDay(dayIdx), 60);
        }
    }, 120);
}

function activityOpenTrainingDay(date) {
    try {
        if (typeof workoutsUIState !== 'undefined' && workoutsUIState) {
            workoutsUIState.viewingWorkoutId = null;
            workoutsUIState.editingWorkoutId = null;
        }
    } catch (err) {}
    window.trainingSelectedDate = date;
    if (typeof switchTrainingSubTab === 'function') switchTrainingSubTab('workouts');
}

function activityOpenFinanceDay(date) {
    window.financeSelectedDate = date;
    switchFinanceSubTabSafe('transactions');
}

function activityOpenTodoDay(date) {
    if (typeof switchMainTab === 'function') switchMainTab('todo');
    if (typeof window.todoSelectDate === 'function') {
        setTimeout(() => window.todoSelectDate(date), 60);
    }
    if (typeof window.closeTodoStats === 'function') window.closeTodoStats();
}

/**
 * Открыть модуль на конкретный день.
 * @param {string} module
 * @param {string} date 'YYYY-MM-DD'
 */
window.activityNavigate = function(module, date) {
    if (module === 'overall') {
        const map = buildMap(keyOfDate(addDays(new Date(), -364)), keyOfDate(new Date()));
        const entry = map[date];
        const order = ['nutrition', 'training', 'finance', 'todo'];
        for (const m of order) {
            if (moduleActive(entry, m)) { module = m; break; }
        }
        if (module === 'overall') module = 'todo';
    }
    if (module === 'nutrition') activityOpenNutritionDay(date);
    else if (module === 'training') activityOpenTrainingDay(date);
    else if (module === 'finance') activityOpenFinanceDay(date);
    else if (module === 'todo') activityOpenTodoDay(date);
    else if (module === 'habits') activityOpenHabitsDay(date);
};

function activityOpenHabitsDay(date) {
    if (typeof window.habitOpenDate === 'function') {
        setTimeout(() => window.habitOpenDate(date), 80);
    } else if (typeof switchMainTab === 'function') {
        switchMainTab('todo');
    }
}

})();