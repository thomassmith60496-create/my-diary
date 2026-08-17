// ============================================
// 📊 WEEKLY / MONTHLY REVIEW
// ============================================
// Собирает статистику за прошедшую неделю/месяц из всех модулей
// (задачи, тренировки, финансы, питание, сон) и формирует:
//   - карточки метрик
//   - сравнение с предыдущим периодом
//   - авто-факты «Что изменилось?»
//
// Зависит на globals: nutritionData, financeData, TrainingWorkoutAPI,
//   window.getTodoState, window.getTodoSleepAll, window.getTodoDayTasks,
//   normalizeDate, formatDateShortRussian
// ============================================
(function() {
'use strict';

// ============ DATE HELPERS ============

const MONTH_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTH_NORM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function parseYMD(key) {
    const p = String(key).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
}
function keyOfDate(d) {
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function addDays(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
}
function addWeeks(d, n) { return addDays(d, n * 7); }
function addMonths(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setMonth(x.getMonth() + n);
    return x;
}

function dateKey(d) {
    return keyOfDate(d);
}

function normalizeKey(dateStr) {
    if (typeof normalizeDate === 'function') {
        return normalizeDate(dateStr) || '';
    }
    if (!dateStr) return '';
    const s = String(dateStr);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
}

function dateInRange(dateStr, start, end) {
    const k = normalizeKey(dateStr);
    if (!k) return false;
    return k >= start && k <= end;
}

function fmtDM(k) {
    if (!k) return '—';
    const p = k.split('-');
    return p[2] + '.' + p[1];
}

function fmtDateFull(k) {
    const p = String(k).split('-').map(Number);
    return `${p[2]} ${MONTH_GEN[p[1] - 1]} ${p[0]}`;
}

function fmtMonthYear(k) {
    const p = String(k).slice(0, 7).split('-').map(Number);
    return `${MONTH_NORM[p[1] - 1]} ${p[0]}`;
}

function getWeekRange(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0=Sun
    const off = day === 0 ? -6 : 1 - day;
    const monday = addDays(d, off);
    const sunday = addDays(monday, 6);
    return { start: keyOfDate(monday), end: keyOfDate(sunday) };
}

function getMonthRange(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: keyOfDate(d), end: keyOfDate(last) };
}

function getPreviousRange(periodType, start) {
    const d = parseYMD(start);
    if (periodType === 'week') {
        const range = getWeekRange(addDays(d, -7));
        return { start: range.start, end: range.end, label: 'Предыдущая неделя' };
    }
    const range = getMonthRange(addMonths(d, -1));
    return { start: range.start, end: range.end, label: 'Предыдущий месяц' };
}

function getSelectedPeriod(periodType) {
    const today = new Date();
    if (periodType === 'week') {
        const d = window.reviewWeekStart ? parseYMD(window.reviewWeekStart) : today;
        const range = getWeekRange(d);
        return {
            start: range.start, end: range.end,
            label: 'Неделя ' + fmtDM(range.start) + ' – ' + fmtDM(range.end),
            prev: getPreviousRange('week', range.start)
        };
    }
    const d = window.reviewMonthKey ? parseYMD(window.reviewMonthKey + '-01') : today;
    const range = getMonthRange(d);
    return {
        start: range.start, end: range.end,
        label: fmtMonthYear(range.start),
        prev: getPreviousRange('month', range.start)
    };
}

function enumWeeks(count) {
    count = count || 26;
    const today = new Date();
    const weeks = [];
    const cur = getWeekRange(today).start;
    let w = parseYMD(cur);
    for (let i = 0; i < count; i++) {
        const range = getWeekRange(w);
        weeks.push({ value: range.start, label: 'Неделя ' + fmtDM(range.start) + ' – ' + fmtDM(range.end) });
        w = addDays(w, -7);
    }
    return weeks;
}

function enumMonths(count) {
    count = count || 13;
    const today = new Date();
    const months = [];
    const cur = getMonthRange(today).start;
    let m = parseYMD(cur);
    for (let i = 0; i < count; i++) {
        const range = getMonthRange(m);
        months.push({ value: range.start.slice(0, 7), label: fmtMonthYear(range.start) });
        m = addMonths(m, -1);
    }
    return months;
}

// ============ UTILITIES ============

function fmtMoney(v) {
    return Math.round(v).toLocaleString('ru-RU') + ' ₽';
}

function fmtNum(v) {
    return Math.round(v).toLocaleString('ru-RU');
}

function fmtDuration(min) {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h + 'ч ' + (m < 10 ? '0' : '') + m + 'мин';
}

function fmtTimeOfDay(min) {
    if (!min) return '—';
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function fmtSleepHrs(min) {
    const m = Math.round(min);
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return h + 'ч ' + (rest < 10 ? '0' : '') + rest + 'м';
}

function pctChange(oldVal, newVal) {
    if (oldVal === 0 && newVal === 0) return 0;
    if (oldVal === 0) return null;
    return Math.round(((newVal - oldVal) / oldVal) * 100);
}

function plural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============ DATA COLLECTION ============

function collectNutrition(start, end) {
    const result = { days: 0, calories: 0, protein: 0, fat: 0, carbs: 0, weight: [] };
    if (typeof nutritionData === 'undefined' || !nutritionData.weeks) return result;

    nutritionData.weeks.forEach(week => {
        if (!week || !week.menu) return;
        week.menu.forEach((day, di) => {
            if (!day || !day.date) return;
            const dk = normalizeKey(day.date);
            if (!dk || dk < start || dk > end) return;
            if (!day.meals || !day.meals.length) return;

            let dayCal = 0, dayMeals = 0;
            let dayProt = 0, dayFat = 0, dayCarbs = 0;
            day.meals.forEach((meal, mi) => {
                const c = parseFloat(week.data && week.data['m-' + di + '-' + mi + '-cal']);
                if (!isNaN(c) && c > 0) {
                    dayCal += c; dayMeals++;
                    dayProt += parseFloat(week.data && week.data['m-' + di + '-' + mi + '-prot']) || 0;
                    dayFat += parseFloat(week.data && week.data['m-' + di + '-' + mi + '-fat']) || 0;
                    dayCarbs += parseFloat(week.data && week.data['m-' + di + '-' + mi + '-carb']) || 0;
                }
            });

            if (dayMeals > 0) {
                result.days++;
                result.calories += dayCal;
                result.protein += dayProt;
                result.fat += dayFat;
                result.carbs += dayCarbs;

                const w = parseFloat(week.data && week.data['weight-' + di]);
                if (!isNaN(w) && w > 0) result.weight.push({ date: dk, value: w });
            }
        });
    });

    result.calories = Math.round(result.calories);
    result.avgCalories = result.days > 0 ? Math.round(result.calories / result.days) : 0;
    result.weightStart = result.weight.length ? result.weight[0].value : null;
    result.weightEnd = result.weight.length ? result.weight[result.weight.length - 1].value : null;
    return result;
}

function collectTraining(start, end) {
    const result = { workouts: 0, sets: 0, volume: 0, exercises: 0, exerciseIds: new Set() };

    if (typeof TrainingWorkoutAPI !== 'undefined') {
        try {
            const ws = TrainingWorkoutAPI.getWorkouts();
            ws.forEach(w => {
                if (!w || !w.date) return;
                const dk = normalizeKey(w.date);
                if (!dk || dk < start || dk > end) return;
                result.workouts++;
                const exSet = new Set();
                (w.exercises || []).forEach(ex => {
                    exSet.add(ex.variantId);
                    const sets = (ex.sets || []).filter(s => !s.warmup);
                    result.sets += sets.length;
                    sets.forEach(s => {
                        const wt = parseFloat(s.weight) || 0;
                        const rp = parseFloat(s.reps) || 0;
                        if (wt > 0 && rp > 0) result.volume += wt * rp;
                    });
                });
                result.exercises += exSet.size;
                exSet.forEach(id => result.exerciseIds.add(id));
            });
        } catch (e) {}
    }
    result.exercises = result.exerciseIds.size;
    result.volume = Math.round(result.volume);
    return result;
}

function collectFinance(start, end) {
    const result = {
        expense: { total: 0, byCategory: {} },
        income: { total: 0, byCategory: {} },
        savings: { total: 0, byGoal: {} },
        planned: { total: 0, done: 0 },
    };

    if (typeof financeData === 'undefined') return result;

    financeData.transactions.forEach(t => {
        if (!t || !t.date) return;
        const dk = normalizeKey(t.date);
        if (!dk || dk < start || dk > end) return;
        const amt = Math.abs(parseFloat(t.amount) || 0);
        const cat = financeData.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name : (t.category || 'Без категории');
        if (t.type === 'expense') {
            result.expense.total += amt;
            if (!result.expense.byCategory[catName]) result.expense.byCategory[catName] = 0;
            result.expense.byCategory[catName] += amt;
        } else {
            result.income.total += amt;
            if (!result.income.byCategory[catName]) result.income.byCategory[catName] = 0;
            result.income.byCategory[catName] += amt;
        }
    });

    financeData.savings.forEach(s => {
        if (!s || !s.date) return;
        const dk = normalizeKey(s.date);
        if (!dk || dk < start || dk > end) return;
        const amt = parseFloat(s.amount) || 0;
        result.savings.total += amt;
        const goal = s.goal || 'Без цели';
        if (!result.savings.byGoal[goal]) result.savings.byGoal[goal] = 0;
        result.savings.byGoal[goal] += amt;
    });

    financeData.planned.forEach(p => {
        if (!p || !p.date) return;
        const dk = normalizeKey(p.date);
        if (!dk || dk < start || dk > end) return;
        result.planned.total += parseFloat(p.amount) || 0;
        if (p.done) result.planned.done += parseFloat(p.amount) || 0;
    });

    result.expense.total = Math.round(result.expense.total);
    result.income.total = Math.round(result.income.total);
    result.savings.total = Math.round(result.savings.total);
    Object.keys(result.expense.byCategory).forEach(k => result.expense.byCategory[k] = Math.round(result.expense.byCategory[k]));
    Object.keys(result.income.byCategory).forEach(k => result.income.byCategory[k] = Math.round(result.income.byCategory[k]));
    Object.keys(result.savings.byGoal).forEach(k => result.savings.byGoal[k] = Math.round(result.savings.byGoal[k]));
    return result;
}

function collectTodo(start, end) {
    const result = { total: 0, done: 0, byTag: {} };

    if (typeof window.getTodoDayTasks !== 'function') return result;

    let d = parseYMD(start);
    const endDate = parseYMD(end);
    let guard = 0;
    while (keyOfDate(d) <= end && guard < 20000) {
        const k = keyOfDate(d);
        const dayTasks = window.getTodoDayTasks(k) || [];
        dayTasks.forEach(t => {
            result.total++;
            if (t.completed) result.done++;
            const tags = Array.isArray(t.tags) ? t.tags : [];
            tags.forEach(tag => {
                if (!result.byTag[tag]) result.byTag[tag] = { done: 0, total: 0 };
                result.byTag[tag].total++;
                if (t.completed) result.byTag[tag].done++;
            });
        });
        d = addDays(d, 1);
        guard++;
    }
    return result;
}

function collectSleep(start, end) {
    const result = { days: 0, totalDuration: 0, avgDuration: 0, avgBedtime: 0, avgWakeTime: 0, avgHeartRate: 0, factors: {} };

    if (typeof window.getTodoSleepAll !== 'function') return result;
    const all = window.getTodoSleepAll() || {};

    Object.keys(all).forEach(k => {
        if (!dateInRange(k, start, end)) return;
        const s = all[k];
        if (!s || (!s.bedtime && !s.wakeTime && !s.duration)) return;
        result.days++;
        const dur = s.duration || 0;
        result.totalDuration += dur;
        if (s.bedtime) {
            const [h, m] = s.bedtime.split(':').map(Number);
            const mins = h * 60 + m;
            if (mins > 0) result.avgBedtime += mins;
        }
        if (s.wakeTime) {
            const [h, m] = s.wakeTime.split(':').map(Number);
            const mins = h * 60 + m;
            if (mins > 0) result.avgWakeTime += mins;
        }
        if (s.heartRate) result.avgHeartRate += parseFloat(s.heartRate) || 0;
        const facs = [...(s.factors || []), ...(s.customFactors || [])];
        facs.forEach(f => { result.factors[f] = (result.factors[f] || 0) + 1; });
    });

    if (result.days > 0) {
        result.totalDuration = Math.round(result.totalDuration);
        result.avgDuration = Math.round(result.totalDuration / result.days);
        result.avgBedtime = Math.round(result.avgBedtime / result.days);
        result.avgWakeTime = Math.round(result.avgWakeTime / result.days);
        result.avgHeartRate = Math.round(result.avgHeartRate / result.days);
    }
    return result;
}

function collectActiveDays(start, end) {
    const active = new Set();
    let totalDays = 0;

    let d = parseYMD(start);
    const endDate = parseYMD(end);
    let guard = 0;
    while (keyOfDate(d) <= end && guard < 20000) {
        const k = keyOfDate(d);
        totalDays++;
        let dayActive = false;

        if (typeof nutritionData !== 'undefined' && nutritionData.weeks) {
            nutritionData.weeks.forEach(week => {
                if (dayActive) return;
                if (!week || !week.menu) return;
                week.menu.forEach((day, di) => {
                    if (dayActive) return;
                    if (!day || !day.date) return;
                    if (normalizeKey(day.date) !== k) return;
                    if (!day.meals || !day.meals.length) return;
                    day.meals.forEach((meal, mi) => {
                        if (dayActive) return;
                        const c = parseFloat(week.data && week.data['m-' + di + '-' + mi + '-cal']);
                        if (!isNaN(c) && c > 0) dayActive = true;
                    });
                });
            });
        }
        if (!dayActive && typeof TrainingWorkoutAPI !== 'undefined') {
            try {
                const ws = TrainingWorkoutAPI.getWorkouts();
                if (ws.some(w => w && normalizeKey(w.date) === k)) dayActive = true;
            } catch (e) {}
        }
        if (!dayActive && typeof financeData !== 'undefined' && financeData.transactions) {
            if (financeData.transactions.some(t => t && normalizeKey(t.date) === k)) dayActive = true;
        }
        if (!dayActive && typeof window.getTodoDayTasks === 'function') {
            const dt = window.getTodoDayTasks(k) || [];
            if (dt.some(t => t && t.completed)) dayActive = true;
        }
        if (!dayActive && typeof window.getTodoSleepAll === 'function') {
            const sl = window.getTodoSleepAll() || {};
            if (sl[k] && (sl[k].bedtime || sl[k].wakeTime)) dayActive = true;
        }
        if (!dayActive && typeof window.getHabitDayProgress === 'function') {
            const hp = window.getHabitDayProgress(k);
            if (hp && hp.total > 0 && hp.done > 0) dayActive = true;
        }

        if (dayActive) active.add(k);
        d = addDays(d, 1);
        guard++;
    }

    return { count: active.size, total: totalDays, days: Array.from(active).sort() };
}

function collectPeriod(start, end) {
    return {
        dateRange: { start, end },
        tasks: collectTodo(start, end),
        training: collectTraining(start, end),
        finance: collectFinance(start, end),
        nutrition: collectNutrition(start, end),
        sleep: collectSleep(start, end),
        activeDays: collectActiveDays(start, end),
        habits: collectHabits(start, end),
    };
}

function collectHabits(start, end) {
    if (typeof window.getHabitStats === 'function') return window.getHabitStats(start, end);
    return {
        totalHabits: 0, totalCount: 0, doneCount: 0, rate: null, avgDayRate: null,
        doneDays: 0, fullDoneDays: 0, totalDays: 0,
        currentStreak: 0, longestStreak: 0, byHabit: [], bestHabit: null, worstHabit: null
    };
}

function collectDailySeries(start, end) {
    const calByDay = {};
    const weightByDay = {};
    if (typeof nutritionData !== 'undefined' && nutritionData.weeks) {
        nutritionData.weeks.forEach(week => {
            if (!week || !week.menu) return;
            week.menu.forEach((day, di) => {
                if (!day || !day.date) return;
                const dk = normalizeKey(day.date);
                if (!dk || dk < start || dk > end) return;
                if (!day.meals || !day.meals.length) return;
                let dayCal = 0;
                day.meals.forEach((meal, mi) => {
                    const c = parseFloat(week.data && week.data['m-' + di + '-' + mi + '-cal']);
                    if (!isNaN(c) && c > 0) dayCal += c;
                });
                if (dayCal > 0) calByDay[dk] = dayCal;
                const w = parseFloat(week.data && week.data['weight-' + di]);
                if (!isNaN(w) && w > 0) weightByDay[dk] = w;
            });
        });
    }

    const workoutByDay = {};
    if (typeof TrainingWorkoutAPI !== 'undefined') {
        try {
            TrainingWorkoutAPI.getWorkouts().forEach(w => {
                if (!w || !w.date) return;
                const dk = normalizeKey(w.date);
                if (!dk || dk < start || dk > end) return;
                let vol = 0;
                (w.exercises || []).forEach(ex => {
                    (ex.sets || []).forEach(s => {
                        if (s.warmup) return;
                        const wt = parseFloat(s.weight) || 0;
                        const rp = parseFloat(s.reps) || 0;
                        if (wt > 0 && rp > 0) vol += wt * rp;
                    });
                });
                const cur = workoutByDay[dk] || { count: 0, volume: 0 };
                cur.count++;
                cur.volume += vol;
                workoutByDay[dk] = cur;
            });
        } catch (e) {}
    }

    const sleepAll = (typeof window.getTodoSleepAll === 'function') ? (window.getTodoSleepAll() || {}) : {};
    const transactions = (typeof financeData !== 'undefined' && financeData.transactions) ? financeData.transactions : [];

    const series = [];
    let d = parseYMD(start);
    let guard = 0;
    while (keyOfDate(d) <= end && guard < 20000) {
        const k = keyOfDate(d);
        const entry = {
            date: k,
            calories: calByDay[k] || 0,
            weight: weightByDay[k] || null,
            sleepMin: 0,
            expense: 0,
            income: 0,
            tasksDone: 0,
            tasksTotal: 0,
            workoutCount: 0,
            workoutVolume: 0
        };
        const sl = sleepAll[k];
        if (sl && sl.duration) entry.sleepMin = parseFloat(sl.duration) || 0;
        transactions.forEach(t => {
            if (!t || !t.date) return;
            if (normalizeKey(t.date) !== k) return;
            const amt = Math.abs(parseFloat(t.amount) || 0);
            if (t.type === 'expense') entry.expense += amt;
            else entry.income += amt;
        });
        if (typeof window.getTodoDayTasks === 'function') {
            const dt = window.getTodoDayTasks(k) || [];
            entry.tasksTotal = dt.length;
            entry.tasksDone = dt.filter(t => t && t.completed).length;
        }
        const wb = workoutByDay[k];
        if (wb) { entry.workoutCount = wb.count; entry.workoutVolume = Math.round(wb.volume); }
        series.push(entry);
        d = addDays(d, 1);
        guard++;
    }
    return series;
}

// ============ COMPARISON & FACTS ============

function pctLabel(pct) {
    if (pct === null) return 'впервые';
    if (pct === 0) return 'без изменений';
    return (pct > 0 ? '+' : '') + pct + '%';
}

function pctDir(pct) {
    if (pct === null) return 'new';
    if (pct === 0) return 'same';
    return pct > 0 ? 'up' : 'down';
}

// ============ TRENDS / RECORDS / COMPARE HELPERS ============

// Сравнимые метрики для рекордов, отклонений, трендов и Compare Periods.
const REVIEW_METRICS = [
    { key: 'training.workouts', label: 'Тренировки', icon: '🏋️', fmt: v => Math.round(v) + ' шт', higherBetter: true },
    { key: 'training.volume', label: 'Объём', icon: '🏋️', fmt: v => fmtNum(v) + ' кг', higherBetter: true },
    { key: 'training.sets', label: 'Подходы', icon: '💪', fmt: v => Math.round(v) + ' шт', higherBetter: true },
    { key: 'tasks.done', label: 'Задачи', icon: '✅', fmt: v => Math.round(v) + ' шт', higherBetter: true },
    { key: 'sleep.avgDuration', label: 'Сон', icon: '🌙', fmt: v => fmtDuration(v), higherBetter: true },
    { key: 'finance.expense.total', label: 'Расходы', icon: '📉', fmt: v => fmtMoney(v), higherBetter: false, skipRecord: true },
    { key: 'finance.savings.total', label: 'Накопления', icon: '🏦', fmt: v => fmtMoney(v), higherBetter: true },
    { key: 'activeDays.count', label: 'Активные дни', icon: '🔥', fmt: v => Math.round(v) + ' дн', higherBetter: true },
    { key: 'habits.rate', label: 'Привычки', icon: '🎯', fmt: v => Math.round(v) + '%', higherBetter: true },
    { key: 'nutrition.avgCalories', label: 'Средние ккал', icon: '📘', fmt: v => Math.round(v) + ' ккал', higherBetter: true, skipRecord: true, skipTrend: true },
    { key: 'nutrition.weightEnd', label: 'Вес', icon: '⚖️', fmt: v => Math.round(v) + ' кг', higherBetter: false }
];

function getMetric(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Собирает сводки за последние N периодов (текущий + назад).
function collectReviewHistory(periodType) {
    const allCount = periodType === 'week' ? 52 : 24;
    const list = [];
    let ref = getSelectedPeriod(periodType);
    for (let i = 0; i < allCount; i++) {
        list.push({ start: ref.start, end: ref.end, label: ref.label });
        const pr = getPreviousRange(periodType, ref.start);
        ref = { start: pr.start, end: pr.end, label: pr.label };
    }
    list.forEach(p => { p.summary = collectPeriod(p.start, p.end); });
    return list;
}

// Личные рекорды: за всё время и в окне 6 периодов.
function detectRecords(current, history) {
    const facts = [];
    REVIEW_METRICS.forEach(m => {
        if (m.skipRecord) return;
        const cur = getMetric(current, m.key);
        if (cur == null || isNaN(cur) || cur === 0) return;
        const values = history.map(h => getMetric(h.summary, m.key)).filter(v => v != null && !isNaN(v) && v !== 0);
        if (!values.length) return;
        const best = m.higherBetter ? Math.max.apply(null, values) : Math.min.apply(null, values);
        const winValues = history.slice(0, 6).map(h => getMetric(h.summary, m.key)).filter(v => v != null && !isNaN(v) && v !== 0);
        const winBest = winValues.length ? (m.higherBetter ? Math.max.apply(null, winValues) : Math.min.apply(null, winValues)) : null;
        const isAllTime = cur === best;
        const isWindow = winBest != null && cur === winBest && !isAllTime;
        if (isAllTime) {
            facts.push({ icon: '🏆', text: 'Личный рекорд за всё время — ' + m.label + ': ' + m.fmt(cur) + '!', type: 'record', weight: 4, margin: Math.abs(cur - best) });
        } else if (isWindow) {
            facts.push({ icon: '📌', text: 'Рекорд в окне 6 периодов — ' + m.label + ': ' + m.fmt(cur) + '.', type: 'record', weight: 2, margin: 0 });
        }
    });
    facts.sort((a, b) => (b.weight - a.weight) || ((b.margin || 0) - (a.margin || 0)));
    return facts.slice(0, 4);
}

// Заметные отклонения от среднего за предыдущие 6 периодов.
function detectDeviations(current, history) {
    const facts = [];
    const baseline = history.slice(1, 7);
    REVIEW_METRICS.forEach(m => {
        if (m.skipRecord) return;
        const cur = getMetric(current, m.key);
        if (cur == null || isNaN(cur) || cur === 0) return;
        const vals = baseline.map(h => getMetric(h.summary, m.key)).filter(v => v != null && !isNaN(v) && v !== 0);
        if (vals.length < 3) return;
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        if (avg === 0) return;
        const diff = (cur - avg) / avg;
        if (Math.abs(diff) >= 0.35) {
            facts.push({ icon: '⚠️', text: 'Заметное отклонение по «' + m.label + '»: ' + m.fmt(cur) + ' — это ' + (diff > 0 ? '+' : '') + Math.round(diff * 100) + '% к среднему за 6 периодов (' + m.fmt(Math.round(avg)) + ').', type: 'deviation' });
        }
    });
    return facts.slice(0, 3);
}

// Простые устойчивые тренды: направление по крайним точкам окна (старое -> новое),
// устойчивость подтверждается совпадением со сравнением средних половин (без ML).
function computeTrends(history) {
    // history[0] — текущий (самый свежий) период, поэтому разворачиваем в хронологию: старые -> новые.
    const chrono = history.slice(0, 6).map(h => h.summary).reverse();
    const trends = [];
    REVIEW_METRICS.forEach(m => {
        if (m.skipTrend) return;
        const vals = chrono.map(s => { const v = getMetric(s, m.key); return (v == null || isNaN(v)) ? null : v; });
        const present = vals.filter(v => v !== null && v !== 0);
        if (present.length < 4) return;
        const fi = vals.findIndex(v => v !== null);
        const li = vals.length - 1 - [...vals].reverse().findIndex(v => v !== null);
        const half = Math.floor(vals.length / 2);
        const olderHalf = vals.slice(fi, fi + half).filter(v => v !== null);
        const recentHalf = vals.slice(li - half + 1, li + 1).filter(v => v !== null);
        if (!olderHalf.length || !recentHalf.length) return;
        const first = vals[fi];
        const last = vals[li];
        // Направление и % по крайним точкам (чтобы совпадало с показанным диапазоном).
        const ep = Math.abs(first) > 1e-9 ? (last - first) / Math.abs(first) * 100 : null;
        const oAvg = olderHalf.reduce((s, v) => s + v, 0) / olderHalf.length;
        const rAvg = recentHalf.reduce((s, v) => s + v, 0) / recentHalf.length;
        const halfDir = Math.sign(rAvg - oAvg);
        const epDir = ep == null ? 0 : Math.sign(ep);
        // Тренд устойчив, только если половины подтверждают направление крайних точек.
        if (ep != null && halfDir !== 0 && epDir !== 0 && halfDir !== epDir) return;
        const changePct = ep == null
            ? Math.round((rAvg - oAvg) / (Math.abs(oAvg) > 1e-9 ? Math.abs(oAvg) : 1) * 100)
            : Math.round(ep);
        let dir = 'flat';
        if (changePct > 5) dir = 'up';
        else if (changePct < -5) dir = 'down';
        if (dir === 'flat') return;
        trends.push({
            metric: m, dir: dir,
            changePct: changePct,
            first: m.fmt(Math.round(first)),
            last: m.fmt(Math.round(last))
        });
    });
    return trends;
}

function generateFacts(current, prev, periodType, history) {
    const facts = [];

    if (!prev) {
        facts.push({ icon: 'ℹ️', text: 'Данных за предыдущий период нет, чтобы сравнивать.', type: 'info' });
        return facts;
    }

    // --- Тренировки: количество (виртуальная правила) ---
    if (current.training.workouts !== prev.training.workouts) {
        const verb = current.training.workouts > prev.training.workouts ? 'больше' : 'меньше';
        facts.push({
            icon: '🏋️',
            text: 'В этот период ты тренировал' + (current.training.workouts === 0 ? 'а 0 раз' : 'а ' + current.training.workouts + ' ' + plural(current.training.workouts, 'раз', 'раза', 'раз')) + ' ' + verb + ', чем ' + prev.training.workouts + ' ' + plural(prev.training.workouts, 'раз', 'раза', 'раз') + '.',
            type: current.training.workouts > prev.training.workouts ? 'increase' : 'decrease'
        });
    }
    if (current.training.sets !== prev.training.sets) {
        const d = current.training.sets - prev.training.sets;
        facts.push({
            icon: '💪',
            text: 'Количество подходов: ' + current.training.sets + ' (' + (d > 0 ? '+' : '') + d + ' ' + (d > 0 ? 'добавлено' : 'убрано') + ').',
            type: d > 0 ? 'increase' : 'decrease'
        });
    }

    // --- Задачи: общее выполнение ---
    const taskDelta = current.tasks.done - prev.tasks.done;
    if (taskDelta !== 0) {
        facts.push({
            icon: '✅',
            text: 'Выполнено задач: ' + current.tasks.done + ' ' + (taskDelta > 0 ? '(было ' + prev.tasks.done + ', +' + taskDelta + ')' : '(было ' + prev.tasks.done + ', ' + taskDelta + ')') + '.',
            type: taskDelta > 0 ? 'increase' : 'decrease'
        });
    }

    // --- Задачи по тегам (проекты) ---
    const tagFacts = [];
    const allTags = new Set(Object.keys(current.tasks.byTag));
    Object.keys(prev.tasks.byTag).forEach(t => allTags.add(t));
    allTags.forEach(tag => {
        const cp = current.tasks.byTag[tag];
        const pp = prev.tasks.byTag[tag];
        if (!cp || cp.total === 0) return;
        if (!pp || pp.total === 0) return; // skip tags absent in previous (handled as new above)
        const cr = Math.round(cp.done / cp.total * 100);
        const pr = Math.round(pp.done / pp.total * 100);
        if (Math.abs(cr - pr) >= 5) {
            tagFacts.push({
                tag, cur: cr, prev: pr,
                text: 'Выполнение задач по тегу #' + esc(tag) + ' ' + (cr > pr ? 'выросло' : 'упало') + ' с ' + pr + '% до ' + cr + '%.',
                type: cr > pr ? 'increase' : 'decrease'
            });
        }
    });
    tagFacts.sort((a, b) => Math.abs(b.cur - b.prev) - Math.abs(a.cur - a.prev));
    tagFacts.slice(0, 4).forEach(f => facts.push({ icon: '🏷', text: f.text, type: f.type }));

    // tags that are new in current
    Object.keys(current.tasks.byTag).forEach(tag => {
        if (!prev.tasks.byTag[tag]) {
            const cp = current.tasks.byTag[tag];
            const cr = cp.total > 0 ? Math.round(cp.done / cp.total * 100) : 0;
            facts.push({ icon: '🏷', text: 'Новый тег #' + esc(tag) + ': ' + cp.done + ' из ' + cp.total + ' задач выполнено (' + cr + '%).', type: 'new' });
        }
    });

    // tags that disappeared compared to previous period
    Object.keys(prev.tasks.byTag).forEach(tag => {
        if (!current.tasks.byTag[tag]) {
            const pp = prev.tasks.byTag[tag];
            if (pp.total > 0) {
                facts.push({ icon: '🏷', text: 'Тег #' + esc(tag) + ' в этом периоде исчез (было ' + pp.done + '/' + pp.total + ').', type: 'removed' });
            }
        }
    });

    // --- Расходы по категориям ---
    const catFacts = [];
    const allCats = new Set(Object.keys(current.finance.expense.byCategory));
    Object.keys(prev.finance.expense.byCategory).forEach(c => allCats.add(c));
    allCats.forEach(cat => {
        const cc = current.finance.expense.byCategory[cat] || 0;
        const pc = prev.finance.expense.byCategory[cat] || 0;
        if (cc === 0 && pc === 0) return;
        if (cc === 0) {
            catFacts.push({ cat, pct: null, text: 'Расходы на категорию «' + esc(cat) + '» обнулились (было ' + fmtMoney(pc) + ').', type: 'removed' });
            return;
        }
        if (pc === 0) {
            catFacts.push({ cat, pct: null, text: 'Расходы на категорию «' + esc(cat) + '» впервые: ' + fmtMoney(cc) + '.', type: 'new' });
            return;
        }
        const pct = Math.round((cc - pc) / pc * 100);
        if (Math.abs(pct) >= 5) {
            catFacts.push({ cat, pct, text: 'Расходы на категорию «' + esc(cat) + '» ' + (pct > 0 ? 'выросли' : 'упали') + ' на ' + Math.abs(pct) + '%.', type: pct > 0 ? 'decrease' : 'increase' });
        }
    });
    catFacts.sort((a, b) => Math.abs(b.pct === null ? 1000 : b.pct) - Math.abs(a.pct === null ? 1000 : a.pct));
    catFacts.slice(0, 5).forEach(f => facts.push({ icon: '💰', text: f.text, type: f.type }));

    // --- Суммарные расходы / доходы ---
    const expPct = pctChange(prev.finance.expense.total, current.finance.expense.total);
    if (expPct !== 0) {
        facts.push({
            icon: '📉',
            text: 'Общие расходы: ' + fmtMoney(current.finance.expense.total) + ' (' + pctLabel(expPct) + ').',
            type: expPct > 0 ? 'decrease' : (expPct < 0 ? 'increase' : 'same')
        });
    }
    if (periodType !== 'week') {
        const incPct = pctChange(prev.finance.income.total, current.finance.income.total);
        if (incPct !== 0) {
            facts.push({
                icon: '📈',
                text: 'Общие доходы: ' + fmtMoney(current.finance.income.total) + ' (' + pctLabel(incPct) + ').',
                type: incPct > 0 ? 'increase' : (incPct < 0 ? 'decrease' : 'same')
            });
        }
    }

    // --- Накопления ---
    const saveDelta = current.finance.savings.total - prev.finance.savings.total;
    if (saveDelta !== 0) {
        facts.push({
            icon: '🏦',
            text: 'Накопления: ' + fmtMoney(current.finance.savings.total) + ' (' + (saveDelta > 0 ? '+' : '') + fmtMoney(saveDelta) + ').',
            type: saveDelta > 0 ? 'increase' : 'decrease'
        });
    }

    // --- Сон ---
    if (current.sleep.days > 0 && prev.sleep.days > 0) {
        const d = current.sleep.avgDuration - prev.sleep.avgDuration;
        if (Math.abs(d) >= 15) {
            facts.push({
                icon: '🌙',
                text: 'Средний сон: ' + fmtDuration(current.sleep.avgDuration) + ' (' + (d > 0 ? '+' : '') + fmtDuration(d) + ' ' + (d > 0 ? 'дольше' : 'короче') + ').',
                type: d > 0 ? 'increase' : 'decrease'
            });
        }
    }

    // --- Питание ---
    if (current.nutrition.days > 0 && prev.nutrition.days > 0) {
        const d = current.nutrition.avgCalories - prev.nutrition.avgCalories;
        if (Math.abs(d) >= 20) {
            facts.push({
                icon: '📘',
                text: 'Средние ккал: ' + current.nutrition.avgCalories + ' (' + (d > 0 ? '+' : '') + Math.abs(d) + ' ' + (d > 0 ? 'больше' : 'меньше') + ').',
                type: d > 0 ? 'increase' : 'decrease'
            });
        }
    }

    // --- Активных дней ---
    const adDelta = current.activeDays.count - prev.activeDays.count;
    if (adDelta !== 0) {
        facts.push({
            icon: '🔥',
            text: 'Активных дней: ' + current.activeDays.count + ' из ' + current.activeDays.total + ' (' + (adDelta > 0 ? '+' : '') + adDelta + ').',
            type: adDelta > 0 ? 'increase' : 'decrease'
        });
    }

    // --- Привычки ---
    if (current.habits.totalHabits > 0 && prev.habits.totalHabits > 0) {
        const d = current.habits.doneCount - prev.habits.doneCount;
        if (d !== 0) {
            facts.push({
                icon: '🎯',
                text: 'Отметок по привычкам: ' + current.habits.doneCount + ' (' + (d > 0 ? '+' : '') + d + ' к прошлому периоду).',
                type: d > 0 ? 'increase' : 'decrease'
            });
        }
        if (current.habits.rate != null && prev.habits.rate != null) {
            const dr = current.habits.rate - prev.habits.rate;
            if (Math.abs(dr) >= 3) {
                facts.push({
                    icon: '🎯',
                    text: 'Доля выполнения привычек: ' + current.habits.rate + '% (' + (dr > 0 ? '+' : '') + dr + '% к прошлому).',
                    type: dr > 0 ? 'increase' : 'decrease'
                });
            }
        }
    }

    // --- Рекорды (за всё время и в окне 6 периодов) ---
    if (history && history.length) {
        detectRecords(current, history).forEach(r => facts.push(r));
        detectDeviations(current, history).forEach(d => facts.push(d));
    }

    if (facts.length === 0) {
        facts.push({ icon: '📊', text: 'На этот период почти ничего не изменилось — привычка держит ритм.', type: 'same' });
    }

    return facts;
}

// ============ PERIOD SCORE & VERDICT ============

const SCORE_NORMS = {
    trainingWeek: 3,
    trainingMonth: 12,
    idealSleepMin: 450,
    sleepToleranceMin: 90
};

function clampScore(v) {
    return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}

function computePeriodScore(current, prev, periodType) {
    const isWeek = periodType === 'week';
    const parts = [];

    const hasData = !!(current.tasks.total || current.training.workouts || current.sleep.days ||
        current.nutrition.days || current.finance.expense.total || current.finance.income.total ||
        current.finance.savings.total || current.activeDays.count);
    if (!hasData) return { overall: null, parts: [] };

    const taskPct = current.tasks.total > 0 ? current.tasks.done / current.tasks.total : null;
    if (taskPct !== null) {
        parts.push({ key: 'tasks', label: 'Задачи', icon: '✅', score: clampScore(taskPct * 10), weight: 2, note: current.tasks.done + ' из ' + current.tasks.total + ' выполнено' });
    }

    const trainNorm = isWeek ? SCORE_NORMS.trainingWeek : SCORE_NORMS.trainingMonth;
    if (current.training.workouts > 0 || trainNorm > 0) {
        const s = clampScore((current.training.workouts / trainNorm) * 10);
        parts.push({ key: 'training', label: 'Тренировки', icon: '🏋️', score: s, weight: 2, note: current.training.workouts + ' из ' + trainNorm + ' (норма за ' + (isWeek ? 'нед' : 'мес') + ')' });
    }

    if (current.sleep.days > 0) {
        const d = Math.abs(current.sleep.avgDuration - SCORE_NORMS.idealSleepMin);
        const s = clampScore(10 - (d / SCORE_NORMS.sleepToleranceMin) * 10);
        parts.push({ key: 'sleep', label: 'Сон', icon: '🌙', score: s, weight: 2, note: 'в сред. ' + fmtDuration(current.sleep.avgDuration) });
    }

    if (current.activeDays.total > 0) {
        const s = clampScore((current.activeDays.count / current.activeDays.total) * 10);
        parts.push({ key: 'active', label: 'Активность', icon: '🔥', score: s, weight: 1, note: current.activeDays.count + ' из ' + current.activeDays.total + ' дней' });
    }

    if (current.nutrition.avgCalories > 0 && current.activeDays.total > 0) {
        const s = clampScore((current.nutrition.days / current.activeDays.total) * 10);
        parts.push({ key: 'nutrition', label: 'Питание', icon: '📘', score: s, weight: 1, note: current.nutrition.days + ' дней записано' });
    }

    if (current.habits.totalHabits > 0 && current.habits.totalCount > 0) {
        const s = clampScore((current.habits.doneCount / current.habits.totalCount) * 10);
        parts.push({ key: 'habits', label: 'Привычки', icon: '🎯', score: s, weight: 1, note: current.habits.doneCount + ' из ' + current.habits.totalCount + ' отметок (' + current.habits.rate + '%)' });
    }

    if (current.finance.planned.total > 0) {
        const ratio = current.finance.expense.total / current.finance.planned.total;
        const s = clampScore(ratio <= 1 ? 10 : 10 - (ratio - 1) * 10);
        parts.push({ key: 'budget', label: 'Бюджет', icon: '💰', score: s, weight: 1, note: 'расход ' + fmtMoney(current.finance.expense.total) + ' / план ' + fmtMoney(current.finance.planned.total) });
    }

    if (parts.length === 0) return { overall: null, parts: [] };

    let wSum = 0, wTotal = 0;
    parts.forEach(p => { wSum += p.score * p.weight; wTotal += p.weight; });
    const overall = clampScore(wSum / wTotal);
    return { overall: overall, parts: parts };
}

function scoreWord(score) {
    if (score >= 8.5) return 'Отлично';
    if (score >= 7) return 'Хорошо';
    if (score >= 5) return 'Средне';
    if (score >= 3) return 'Слабо';
    return 'Плохо';
}

function scoreAdverb(score) {
    if (score >= 8.5) return 'отлично';
    if (score >= 7) return 'хорошо';
    if (score >= 5) return 'нормально';
    if (score >= 3) return 'непросто';
    return 'тяжело';
}

function formatScoreDelta(d) {
    const abs = Math.abs(d.delta);
    const sign = d.delta > 0 ? '+' : (d.delta < 0 ? '-' : '±');
    return sign + (d.money ? fmtMoney(abs) : abs);
}

function generateVerdict(current, prev, score, periodType) {
    if (!current || score === null) {
        return 'За этот период недостаточно данных для сводки. Записывай задачи, тренировки, питание и финансы — и обзор станет содержательнее.';
    }
    const kind = periodType === 'week' ? 'Неделя' : 'Месяц';
    const open = kind + ' прошла ' + scoreAdverb(score.overall) + ' — рейтинг ' + score.overall + '/10.';

    const deltas = [];
    if (prev) {
        deltas.push({ label: 'выполнение задач', delta: current.tasks.done - prev.tasks.done, good: true, money: false });
        deltas.push({ label: 'количество тренировок', delta: current.training.workouts - prev.training.workouts, good: true, money: false });
        deltas.push({ label: 'активные дни', delta: current.activeDays.count - prev.activeDays.count, good: true, money: false });
        if (periodType !== 'week') {
            deltas.push({ label: 'расходы', delta: current.finance.expense.total - prev.finance.expense.total, good: false, money: true });
            deltas.push({ label: 'доходы', delta: current.finance.income.total - prev.finance.income.total, good: true, money: true });
            deltas.push({ label: 'накопления', delta: current.finance.savings.total - prev.finance.savings.total, good: true, money: true });
        }
    }

    let best = null, worst = null;
    deltas.forEach(d => {
        if (d.delta === 0) return;
        if (d.good) {
            if (!best || d.delta > best.delta) best = d;
            if (d.delta < 0 && (!worst || d.delta < worst.delta)) worst = d;
        } else {
            if (d.delta > 0 && (!worst || d.delta > worst.delta)) worst = d;
            if (d.delta < 0 && (!best || (-d.delta) > best.delta)) best = { label: d.label, delta: -d.delta, good: true, money: d.money };
        }
    });

    let main = '';
    if (best && prev) {
        main += ' Главное улучшение — «' + best.label + '»: ' + formatScoreDelta(best) + ' к прошлому периоду.';
    }
    if (worst && prev) {
        main += ' Обрати внимание на «' + worst.label + '»: ' + formatScoreDelta(worst) + '.';
    }

    const topPart = score.parts.slice().sort((a, b) => b.score - a.score)[0];
    const weakPart = score.parts.slice().sort((a, b) => a.score - b.score)[0];
    let advice = '';
    if (topPart && weakPart && topPart.key !== weakPart.key && weakPart.score < 6) {
        advice = ' Сильнее всего получился блок «' + topPart.label.toLowerCase() + '», а прокачать стоит «' + weakPart.label.toLowerCase() + '».';
    }

    return open + main + advice;
}

function scoreColor(score) {
    if (score === null) return 'var(--color-gray-400)';
    if (score >= 8.5) return '#10b981';
    if (score >= 7) return '#14b8a6';
    if (score >= 5) return '#f59e0b';
    if (score >= 3) return '#f97316';
    return '#ef4444';
}

// ============ RENDER ============

function statCard(icon, title, value, sub, trend) {
    const trendHtml = trend ? '<span class="review-trend trend-' + trend.dir + '">' + trend.label + '</span>' : '';
    const subHtml = Array.isArray(sub)
        ? '<div class="review-stat-sub">' + sub.map(s => '<span class="review-stat-chip">' + esc(s) + '</span>').join('') + '</div>'
        : (sub ? '<div class="review-stat-sub">' + esc(sub) + '</div>' : '');
    return '' +
        '<div class="review-stat-card">' +
            '<div class="review-stat-header">' +
                '<span class="review-stat-icon">' + icon + '</span>' +
                '<span class="review-stat-title">' + esc(title) + '</span>' +
                trendHtml +
            '</div>' +
            '<div class="review-stat-value">' + value + '</div>' +
            subHtml +
        '</div>';
}

function renderStatGrid(current, prev) {
    const cards = [];

    // Задачи
    const taskPct = current.tasks.total > 0 ? Math.round(current.tasks.done / current.tasks.total * 100) : 0;
    let taskTrend = null;
    if (prev && prev.tasks.total >= 0) {
        const p = prev.tasks.total > 0 ? Math.round(prev.tasks.done / prev.tasks.total * 100) : 0;
        const pct = pctChange(p, taskPct);
        taskTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('✅', 'Задачи',
        '<span class="rev-val">' + current.tasks.done + '</span><span class="rev-sep">/</span><span class="rev-val">' + current.tasks.total + '</span><span class="rev-unit"> выполнено</span>',
        [taskPct + '% выполнено'],
        taskTrend));

    // Тренировки
    let trainTrend = null;
    if (prev) {
        const pct = pctChange(prev.training.workouts, current.training.workouts);
        trainTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🏋️', 'Тренировки',
        current.training.workouts > 0 ? (current.training.workouts + ' ' + plural(current.training.workouts, 'тренировка', 'тренировки', 'тренировок')) : '—',
        current.training.sets > 0 ? [current.training.sets + ' подходов', fmtNum(current.training.volume) + ' объёма'] : [],
        trainTrend));

    // Расходы
    const expCats = Object.keys(current.finance.expense.byCategory).sort((a, b) => current.finance.expense.byCategory[b] - current.finance.expense.byCategory[a]);
    let expTrend = null;
    if (prev) {
        const pct = pctChange(prev.finance.expense.total, current.finance.expense.total);
        expTrend = { dir: pct === null ? 'new' : (pct > 0 ? 'down' : (pct < 0 ? 'up' : 'same')), label: pctLabel(pct) };
    }
    cards.push(statCard('📉', 'Расходы',
        current.finance.expense.total > 0 ? fmtMoney(current.finance.expense.total) : '—',
        expCats.length ? expCats.slice(0, 3).map(c => c + ': ' + fmtMoney(current.finance.expense.byCategory[c])) : [],
        expTrend));

    // Доходы
    const incCats = Object.keys(current.finance.income.byCategory).sort((a, b) => current.finance.income.byCategory[b] - current.finance.income.byCategory[a]);
    let incTrend = null;
    if (prev) {
        const pct = pctChange(prev.finance.income.total, current.finance.income.total);
        incTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('📈', 'Доходы',
        current.finance.income.total > 0 ? fmtMoney(current.finance.income.total) : '—',
        incCats.length ? incCats.slice(0, 2).map(c => c + ': ' + fmtMoney(current.finance.income.byCategory[c])) : [],
        incTrend));

    // Накопления
    const goalCats = Object.keys(current.finance.savings.byGoal).sort((a, b) => current.finance.savings.byGoal[b] - current.finance.savings.byGoal[a]);
    let saveTrend = null;
    if (prev) {
        const pct = pctChange(prev.finance.savings.total, current.finance.savings.total);
        saveTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🏦', 'Накопления',
        current.finance.savings.total > 0 ? fmtMoney(current.finance.savings.total) : '—',
        goalCats.length ? goalCats.slice(0, 2).map(g => g + ': ' + fmtMoney(current.finance.savings.byGoal[g])) : [],
        saveTrend));

    // Питание
    let nutTrend = null;
    if (prev && prev.nutrition.avgCalories > 0) {
        const pct = pctChange(prev.nutrition.avgCalories, current.nutrition.avgCalories);
        nutTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('📘', 'Питание',
        current.nutrition.days > 0 ? (current.nutrition.avgCalories + ' ккал') : '—',
        current.nutrition.days > 0 ? [current.nutrition.days + ' дней', current.nutrition.weightStart ? (current.nutrition.weightStart + ' → ' + current.nutrition.weightEnd + ' кг') : 'вес не указан'] : [],
        nutTrend));

    // Активные дни
    let adTrend = null;
    if (prev) {
        const pct = pctChange(prev.activeDays.count, current.activeDays.count);
        adTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🔥', 'Активных дней',
        current.activeDays.total > 0 ? (current.activeDays.count + ' / ' + current.activeDays.total) : '—',
        current.activeDays.total > 0 ? [Math.round(current.activeDays.count / current.activeDays.total * 100) + '% периода'] : [],
        adTrend));

    // Сон
    let sleepTrend = null;
    if (prev && prev.sleep.days > 0 && current.sleep.days > 0) {
        const pct = pctChange(prev.sleep.avgDuration, current.sleep.avgDuration);
        sleepTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🌙', 'Сон',
        current.sleep.days > 0 ? fmtDuration(current.sleep.avgDuration) : '—',
        current.sleep.days > 0 ? [current.sleep.days + ' дней', fmtTimeOfDay(current.sleep.avgBedtime) + ' → ' + fmtTimeOfDay(current.sleep.avgWakeTime)] : [],
        sleepTrend));

    // Привычки
    let habTrend = null;
    if (prev && prev.habits.rate != null && current.habits.rate != null) {
        const pct = pctChange(prev.habits.rate, current.habits.rate);
        habTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🎯', 'Привычки',
        current.habits.doneCount > 0 ? (current.habits.doneCount + '/' + current.habits.totalCount) : '—',
        current.habits.totalHabits > 0 ? [current.habits.rate + '% выполнено', 'серия ' + current.habits.currentStreak + ' дн'] : [],
        habTrend));

    return cards.map(c => c).join('');
}

// ============ HERO SCORE ============

function renderHeroScore(score, current, prev, periodType, firstFact) {
    if (!score || score.overall === null) {
        return '' +
            '<div class="review-hero review-hero-empty">' +
                '<div class="review-hero-verdict">За этот период пока нет данных для рейтинга. Начни записывать задачи, тренировки, питание, сон и финансы.</div>' +
            '</div>';
    }

    const color = scoreColor(score.overall);
    const pct = Math.round(score.overall * 10);
    const badge = firstFact ? '🏆 ' + firstFact.text : '🏆 Главное за период';

    const prevScore = (prev && score) ? computePeriodScore(prev, null, periodType) : null;
    const prevParts = prevScore && prevScore.parts.length ? prevScore.parts : null;

    const partsHtml = score.parts.map(p => {
        let deltaHtml = '';
        if (prevParts) {
            const pp = prevParts.find(x => x.key === p.key);
            if (pp && pp.score !== p.score) {
                const d = Math.round((p.score - pp.score) * 10) / 10;
                const dcls = d > 0 ? 'up' : 'down';
                deltaHtml = '<span class="review-hero-part-delta trend-' + dcls + '">' + (d > 0 ? '+' : '') + d.toFixed(1) + '</span>';
            }
        }
        return '<div class="review-hero-part" title="' + esc(p.note) + '">' +
            '<span class="review-hero-part-icon">' + p.icon + '</span>' +
            '<span class="review-hero-part-label">' + esc(p.label) + '</span>' +
            '<div class="review-hero-part-bar"><i style="width:' + Math.round(p.score * 10) + '%;background:' + scoreColor(p.score) + '"></i></div>' +
            '<span class="review-hero-part-score">' + p.score.toFixed(1) + '</span>' +
            deltaHtml +
        '</div>';
    }).join('');

    let partsNote = '';
    if (prevParts) {
        const contribs = [];
        prevParts.forEach(pp => {
            const cp = score.parts.find(x => x.key === pp.key);
            if (cp) contribs.push({ label: cp.label, c: (cp.score - pp.score) * cp.weight });
        });
        contribs.sort((a, b) => b.c - a.c);
        const raise = contribs.filter(x => x.c > 0.05)[0];
        const lower = contribs.filter(x => x.c < -0.05).sort((a, b) => a.c - b.c)[0];
        if (raise || lower) {
            partsNote = '<div class="review-hero-parts-note">';
            if (raise) partsNote += 'Повысило: <b>' + esc(raise.label) + '</b>';
            if (lower) partsNote += (raise ? ' · ' : '') + 'Понизило: <b>' + esc(lower.label) + '</b>';
            partsNote += '</div>';
        }
    }

    return '' +
        '<div class="review-hero">' +
            '<div class="review-hero-left">' +
                '<div class="review-hero-num" style="color:' + color + '">' + score.overall.toFixed(1) + '<span class="review-hero-outof">/10</span></div>' +
                '<div class="review-hero-scorebar"><i style="width:' + pct + '%;background:' + color + '"></i></div>' +
                '<div class="review-hero-scoreword" style="color:' + color + '">' + scoreWord(score.overall) + '</div>' +
            '</div>' +
            '<div class="review-hero-right">' +
                '<div class="review-hero-verdict">' + esc(generateVerdict(current, prev, score, periodType)) + '</div>' +
                '<div class="review-hero-badge">' + esc(badge) + '</div>' +
                '<div class="review-hero-parts">' + partsHtml + '</div>' +
                partsNote +
            '</div>' +
        '</div>';
}

// ============ CHARTS ============

const CHART_PALETTE = ['#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#8b5cf6', '#ef4444', '#0ea5e9', '#84cc16', '#f97316'];
const CHART_TEXT = { textColor: '#64748b', gridColor: '#e2e8f0', titleColor: '#0f172a' };

function chartCard(icon, title, total, chartHtml, wide) {
    return '' +
        '<div class="review-chart-card' + (wide ? ' review-chart-card-wide' : '') + '">' +
            '<div class="review-chart-head">' +
                '<span class="review-chart-icon">' + icon + '</span>' +
                '<span class="review-chart-title">' + esc(title) + '</span>' +
                '<span class="review-chart-total">' + esc(total) + '</span>' +
            '</div>' +
            '<div class="review-chart-body">' + (chartHtml || '<div class="chart-empty">Нет данных для графика</div>') + '</div>' +
        '</div>';
}

function buildDonutSectors(byCategory) {
    const entries = Object.keys(byCategory)
        .map(name => ({ name: name, value: byCategory[name] }))
        .sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0);
    let acc = 0;
    return entries.map((e, i) => {
        const angle = total > 0 ? (e.value / total) * 360 : 0;
        const s = { name: e.name, value: e.value, color: CHART_PALETTE[i % CHART_PALETTE.length], startAngle: acc, angle: angle };
        acc += angle;
        return s;
    });
}

function renderCharts(series, current, periodType) {
    const cards = [];
    const isWeekly = periodType === 'week';
    const MAX = isWeekly ? 3 : 4;
    const push = html => { if (cards.length < MAX) cards.push(html); };
    const line = (data, field, unit, color, gid, extra) =>
        (typeof window.renderSVGLineChart === 'function') ? window.renderSVGLineChart(data, field, unit, color, gid, Object.assign({}, CHART_TEXT, extra || {})) : '';
    const donut = (sectors, total, center, sub) =>
        (typeof window.renderDonutChart === 'function') ? window.renderDonutChart(sectors, total, center, sub) : '';

    // 1. Вес (ТОЛЬКО месяц)
    const wData = series.filter(d => d.weight !== null).map(d => ({ date: d.date, weight: d.weight }));
    if (!isWeekly && wData.length >= 1) {
        const total = current.nutrition.weightStart ? current.nutrition.weightStart + ' → ' + current.nutrition.weightEnd + ' кг' : '';
        push(chartCard('⚖️', 'Вес', total, line(wData, 'weight', 'кг', '#10b981', 'review-grad-weight'), true));
    }

    // 2. Сон по ночам (приоритет для недельного)
    const sleepData = series.filter(d => d.sleepMin > 0).map(d => ({ date: d.date, sleep: d.sleepMin }));
    if (sleepData.length >= 1) {
        const total = current.sleep.days > 0 ? fmtDuration(current.sleep.avgDuration) + ' в сред.' : '';
        push(chartCard('🌙', 'Сон по ночам', total, line(sleepData, 'sleep', 'мин', '#6366f1', 'review-grad-sleep', { formatValue: fmtSleepHrs })));
    }

    // 3. Расходы по дням (приоритет для недельного)
    const expData = series.filter(d => d.expense > 0).map(d => ({ date: d.date, expense: d.expense }));
    if (expData.length >= 1) {
        const total = current.finance.expense.total > 0 ? fmtMoney(current.finance.expense.total) : '';
        push(chartCard('📉', 'Расходы по дням', total, line(expData, 'expense', '₽', '#f43f5e', 'review-grad-exp')));
    }

    // 4. Калории по дням
    const calData = series.filter(d => d.calories > 0).map(d => ({ date: d.date, cal: d.calories }));
    if (calData.length >= 2) {
        const avg = Math.round(calData.reduce((s, d) => s + d.cal, 0) / calData.length);
        push(chartCard('📘', 'Калории по дням', avg + ' ккал в сред.', line(calData, 'cal', 'ккал', '#f59e0b', 'review-grad-cal'), true));
    }

    // 5. Расходы по категориям
    if (Object.keys(current.finance.expense.byCategory).length > 0) {
        const sectors = buildDonutSectors(current.finance.expense.byCategory);
        push(chartCard('💸', 'Расходы по категориям', fmtMoney(current.finance.expense.total),
            donut(sectors, current.finance.expense.total, fmtMoney(current.finance.expense.total), 'всего расходов'), false));
    }

    // 6. Объём тренировок
    const trData = series.filter(d => d.workoutVolume > 0).map(d => ({ date: d.date, volume: d.workoutVolume }));
    if (trData.length >= 1) {
        const total = current.training.workouts > 0
            ? current.training.workouts + ' ' + plural(current.training.workouts, 'тренировка', 'тренировки', 'тренировок') + ' · ' + fmtNum(current.training.volume)
            : '';
        push(chartCard('🏋️', 'Объём тренировок', total, line(trData, 'volume', 'кг', '#14b8a6', 'review-grad-train'), true));
    }

    // 7. Доходы по категориям (только месяц)
    if (!isWeekly && Object.keys(current.finance.income.byCategory).length > 0) {
        const sectors = buildDonutSectors(current.finance.income.byCategory);
        push(chartCard('📈', 'Доходы по категориям', fmtMoney(current.finance.income.total),
            donut(sectors, current.finance.income.total, fmtMoney(current.finance.income.total), 'всего доходов'), false));
    }

    // 8. Вес (только месяц, если есть место)
    if (!isWeekly && wData.length >= 1) {
        const total = current.nutrition.weightStart ? current.nutrition.weightStart + ' → ' + current.nutrition.weightEnd + ' кг' : '';
        push(chartCard('⚖️', 'Вес', total, line(wData, 'weight', 'кг', '#10b981', 'review-grad-weight'), true));
    }

    if (!cards.length) return '';
    return '' +
        '<h3 class="review-charts-title">📊 Графики за период</h3>' +
        '<div class="review-charts-grid">' + cards.join('') + '</div>';
}

// ============ FACTS GROUPING ============

function renderFactsGrouped(facts) {
    if (!facts.length) return '<div class="review-empty-facts">Нет данных для анализа.</div>';
    const groups = [
        { types: ['record'], title: '🏆 Рекорды' },
        { types: ['increase'], title: '📈 Рост' },
        { types: ['decrease'], title: '📉 Снижение' },
        { types: ['new'], title: '🆕 Новое' },
        { types: ['removed'], title: '🗑 Исчезло' },
        { types: ['deviation'], title: '⚠️ Заметные отклонения' },
        { types: ['same', 'info'], title: 'ℹ️ Прочее' }
    ];
    let html = '';
    groups.forEach(g => {
        const items = facts.filter(f => g.types.indexOf(f.type) >= 0);
        if (!items.length) return;
        html += '<div class="review-fact-group">' +
            '<div class="review-fact-group-title">' + g.title + '</div>' +
            '<div class="review-facts-list">' +
            items.map(f => '<div class="review-fact fact-' + f.type + '">' +
                '<span class="review-fact-icon">' + f.icon + '</span>' +
                '<span class="review-fact-text">' + esc(f.text) + '</span>' +
            '</div>').join('') +
            '</div></div>';
    });
    return html;
}

// ============ TRENDS SECTION ============

function renderTrendsSection(history, periodType) {
    const trends = computeTrends(history);
    if (!trends.length) return '';
    const items = trends.map(t => {
        const arrow = t.dir === 'up' ? '▲' : (t.dir === 'down' ? '▼' : '–');
        const cls = t.dir === 'up' ? 'up' : (t.dir === 'down' ? 'down' : 'same');
        return '<div class="review-trend-item trend-' + cls + '">' +
            '<span class="review-trend-icon">' + t.metric.icon + '</span>' +
            '<span class="review-trend-label">' + esc(t.metric.label) + '</span>' +
            '<span class="review-trend-dir">' + arrow + ' ' + (t.dir === 'up' ? 'растёт' : 'падает') + '</span>' +
            '<span class="review-trend-change">' + (t.changePct > 0 ? '+' : '') + t.changePct + '% за 6 периодов</span>' +
            '<span class="review-trend-range">' + t.first + ' → ' + t.last + '</span>' +
        '</div>';
    }).join('');
    return '<details class="review-section">' +
        '<summary class="review-section-summary">📈 Тенденции <span class="review-section-hint">устойчивые изменения за 6 периодов</span></summary>' +
        '<div class="review-section-body"><div class="review-trends-grid">' + items + '</div>' +
        '<div class="review-trends-note">Рассчитано сравнением среднего первой и второй половин окна без ML.</div>' +
        '</div></details>';
}

// ============ COMPARE PERIODS SECTION ============

function renderCompareSection(current, prev, history, periodType) {
    if (!prev) return '';
    const baseline = history.slice(1, 7);
    function avgMetric(key) {
        const vals = baseline.map(h => getMetric(h.summary, key)).filter(v => v != null && !isNaN(v) && v !== 0);
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }
    const rows = REVIEW_METRICS.filter(m => !m.skipCompare).map(m => {
        const cur = getMetric(current, m.key);
        const pv = getMetric(prev, m.key);
        const av = avgMetric(m.key);
        if ((cur == null || cur === 0 || isNaN(cur)) && (pv == null || pv === 0 || isNaN(pv))) return '';
        const pct = (pv && pv !== 0) ? pctChange(pv, cur) : null;
        const pctCls = pct === null ? 'new' : (pct > 0 ? 'up' : 'down');
        const avTxt = av != null ? m.fmt(Math.round(av)) : '—';
        const curTxt = (cur != null && !isNaN(cur)) ? m.fmt(Math.round(cur)) : '—';
        const pvTxt = (pv != null && !isNaN(pv)) ? m.fmt(Math.round(pv)) : '—';
        return '<tr>' +
            '<td class="rc-name">' + m.icon + ' ' + esc(m.label) + '</td>' +
            '<td class="rc-val">' + curTxt + '</td>' +
            '<td class="rc-val">' + pvTxt + '</td>' +
            '<td class="rc-pct trend-' + pctCls + '">' + (pct === null ? 'впервые' : (pct > 0 ? '+' : '') + pct + '%') + '</td>' +
            '<td class="rc-val rc-avg">' + avTxt + '</td>' +
        '</tr>';
    }).join('');
    return '<details class="review-section">' +
        '<summary class="review-section-summary">🆚 Compare Periods <span class="review-section-hint">текущий vs предыдущий · ср. за 6</span></summary>' +
        '<div class="review-section-body">' +
            '<table class="review-compare-table"><thead><tr><th>Показатель</th><th>Текущий</th><th>Предыдущий</th><th>Δ%</th><th>Среднее за 6</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></details>';
}

function renderReviewHTML(periodType, current, prev) {
    const selectId = periodType === 'week' ? 'review-week-select' : 'review-month-select';
    const enumFn = periodType === 'week' ? enumWeeks : enumMonths;
    const title = periodType === 'week' ? 'Недельный обзор' : 'Месячный обзор';
    const icon = periodType === 'week' ? '📅' : '📆';
    const selectedVal = periodType === 'week'
        ? (window.reviewWeekStart || getWeekRange(new Date()).start)
        : (window.reviewMonthKey || getMonthRange(new Date()).start.slice(0, 7));
    const options = enumFn().map(o => '<option value="' + esc(o.value) + '"' + (o.value === selectedVal ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
    const periodLabel = periodType === 'week'
        ? getSelectedPeriod('week').label
        : getSelectedPeriod('month').label;

    const history = collectReviewHistory(periodType);
    const facts = prev ? generateFacts(current, prev, periodType, history) : generateFacts(current, null, periodType, history);
    const factsHtml = '<h3 class="review-facts-title">🔍 Что изменилось?</h3>' +
        (facts.length ? renderFactsGrouped(facts) : '<div class="review-empty-facts">Нет данных для анализа.</div>');

    const series = (current && current.dateRange) ? collectDailySeries(current.dateRange.start, current.dateRange.end) : [];
    const score = computePeriodScore(current, prev, periodType);
    const heroHtml = renderHeroScore(score, current, prev, periodType, facts.length ? facts[0] : null);
    const chartsHtml = renderCharts(series, current, periodType);

    return '' +
        '<header class="review-header">' +
            '<h1>' + icon + ' ' + title + '</h1>' +
            '<div class="subtitle">' + esc(periodLabel) + '</div>' +
        '</header>' +
        '<div class="review-toolbar">' +
            '<select id="' + selectId + '" class="review-period-select" onchange="switchReviewPeriod(\'' + periodType + '\', this.value)">' + options + '</select>' +
            '<button class="btn" onclick="prevReviewPeriod(\'' + periodType + '\')">← Предыдущий</button>' +
            '<button class="btn" onclick="nextReviewPeriod(\'' + periodType + '\')">Следующий →</button>' +
            '<div class="review-toolbar-spacer"></div>' +
            '<button class="btn" onclick="exportReview(\'' + periodType + '\', \'txt\')">📄 TXT</button>' +
            '<button class="btn primary" onclick="exportReview(\'' + periodType + '\', \'pdf\')">🖨 PDF</button>' +
        '</div>' +
        heroHtml +
        '<div class="review-stat-grid">' + renderStatGrid(current, prev) + '</div>' +
        chartsHtml +
        (prev ? renderTrendsSection(history, periodType) : '') +
        (prev ? renderCompareSection(current, prev, history, periodType) : '') +
        '<div class="review-facts">' + factsHtml + '</div>';
}

// ============ PERIOD NAVIGATION ============

window.switchReviewPeriod = function(periodType, value) {
    if (periodType === 'week') {
        window.reviewWeekStart = value;
    } else {
        window.reviewMonthKey = value;
    }
    if (periodType === 'week') { window.renderWeeklyReview(); }
    else { window.renderMonthlyReview(); }
};

window.prevReviewPeriod = function(periodType) {
    const today = new Date();
    if (periodType === 'week') {
        let base;
        if (window.reviewWeekStart) {
            base = addDays(parseYMD(window.reviewWeekStart), -7);
        } else {
            base = addDays(today, -7);
        }
        window.reviewWeekStart = getWeekRange(base).start;
        window.renderWeeklyReview();
    } else {
        let base;
        if (window.reviewMonthKey) {
            base = addMonths(parseYMD(window.reviewMonthKey + '-01'), -1);
        } else {
            base = addMonths(today, -1);
        }
        window.reviewMonthKey = keyOfDate(getMonthRange(base).start).slice(0, 7);
        window.renderMonthlyReview();
    }
};

window.nextReviewPeriod = function(periodType) {
    const today = new Date();
    const cur = periodType === 'week'
        ? (window.reviewWeekStart ? parseYMD(window.reviewWeekStart) : today)
        : (window.reviewMonthKey ? parseYMD(window.reviewMonthKey + '-01') : today);
    const curEnd = periodType === 'week'
        ? keyOfDate(addDays(cur, 6))
        : keyOfDate(getMonthRange(cur).end);
    if (curEnd >= keyOfDate(today)) {
        if (periodType === 'week') { window.reviewWeekStart = null; window.renderWeeklyReview(); }
        else { window.reviewMonthKey = null; window.renderMonthlyReview(); }
        return;
    }
    if (periodType === 'week') {
        window.reviewWeekStart = keyOfDate(addDays(cur, 7));
        window.renderWeeklyReview();
    } else {
        window.reviewMonthKey = keyOfDate(addMonths(cur, 1)).slice(0, 7);
        window.renderMonthlyReview();
    }
};

// ============ RENDER ENTRY ============

window.renderWeeklyReview = function() {
    const cont = document.getElementById('home-sub-weekly');
    if (!cont) return;
    const p = getSelectedPeriod('week');
    const current = collectPeriod(p.start, p.end);
    let prev = null;
    if (p.prev) {
        const cp = collectPeriod(p.prev.start, p.prev.end);
        const hasData = cp.tasks.total || cp.training.workouts || cp.finance.expense.total || cp.finance.income.total ||
            cp.finance.savings.total || cp.nutrition.days || cp.activeDays.count || cp.sleep.days;
        if (hasData) prev = cp;
    }
    cont.innerHTML = renderReviewHTML('week', current, prev);
};

window.renderMonthlyReview = function() {
    const cont = document.getElementById('home-sub-monthly');
    if (!cont) return;
    const p = getSelectedPeriod('month');
    const current = collectPeriod(p.start, p.end);
    let prev = null;
    if (p.prev) {
        const cp = collectPeriod(p.prev.start, p.prev.end);
        const hasData = cp.tasks.total || cp.training.workouts || cp.finance.expense.total || cp.finance.income.total ||
            cp.finance.savings.total || cp.nutrition.days || cp.activeDays.count || cp.sleep.days;
        if (hasData) prev = cp;
    }
    cont.innerHTML = renderReviewHTML('month', current, prev);
};

// ============ EXPORT ============

function hasAnyData(cp) {
    return !!(cp.tasks.total || cp.training.workouts || cp.finance.expense.total || cp.finance.income.total ||
        cp.finance.savings.total || cp.nutrition.days || cp.activeDays.count || cp.sleep.days);
}

function collectWithPrev(periodType) {
    const p = getSelectedPeriod(periodType);
    const current = collectPeriod(p.start, p.end);
    let prev = null;
    if (p.prev) {
        const cp = collectPeriod(p.prev.start, p.prev.end);
        if (hasAnyData(cp)) prev = cp;
    }
    return { p: p, current: current, prev: prev };
}

window.exportReview = function(periodType, format) {
    format = format || 'txt';
    if (format === 'pdf') {
        exportReviewPDF(periodType);
        return;
    }
    const { p, current, prev } = collectWithPrev(periodType);

    let lines = [];
    lines.push('========== ' + (periodType === 'week' ? 'НЕДЕЛЬНЫЙ ОБЗОР' : 'МЕСЯЧНЫЙ ОБЗОР') + ' ==========');
    lines.push('Период: ' + esc(p.label));
    lines.push('Даты: ' + fmtDateFull(p.start) + ' – ' + fmtDateFull(p.end));
    lines.push('');

    const score = computePeriodScore(current, prev, periodType);
    if (score && score.overall !== null) {
        lines.push('Рейтинг периода: ' + score.overall.toFixed(1) + '/10 (' + scoreWord(score.overall) + ')');
        lines.push('Вердикт: ' + generateVerdict(current, prev, score, periodType));
        lines.push('');
    }

    lines.push('--- Блоки статистики ---');
    lines.push('Задачи: ' + current.tasks.done + ' выполнено из ' + current.tasks.total);
    const taskPct = current.tasks.total > 0 ? Math.round(current.tasks.done / current.tasks.total * 100) : 0;
    lines.push('  Выполнение: ' + taskPct + '%');
    if (Object.keys(current.tasks.byTag).length) {
        lines.push('  По тегам:');
        Object.keys(current.tasks.byTag).forEach(t => {
            const bt = current.tasks.byTag[t];
            lines.push('    #' + t + ': ' + bt.done + '/' + bt.total + ' (' + (bt.total > 0 ? Math.round(bt.done / bt.total * 100) : 0) + '%)');
        });
    }
    lines.push('Тренировки: ' + current.training.workouts + ' тренировок · ' + current.training.sets + ' подходов');
    lines.push('  Объём: ' + fmtNum(current.training.volume));
    lines.push('Расходы: ' + fmtMoney(current.finance.expense.total));
    Object.keys(current.finance.expense.byCategory).forEach(c => {
        lines.push('  ' + c + ': ' + fmtMoney(current.finance.expense.byCategory[c]));
    });
    lines.push('Доходы: ' + fmtMoney(current.finance.income.total));
    Object.keys(current.finance.income.byCategory).forEach(c => {
        lines.push('  ' + c + ': ' + fmtMoney(current.finance.income.byCategory[c]));
    });
    lines.push('Накопления: ' + fmtMoney(current.finance.savings.total));
    Object.keys(current.finance.savings.byGoal).forEach(g => {
        lines.push('  ' + g + ': ' + fmtMoney(current.finance.savings.byGoal[g]));
    });
    lines.push('Питание: ' + current.nutrition.days + ' дней · ' + current.nutrition.avgCalories + ' ккал в сред.');
    if (current.nutrition.weightStart) lines.push('  Вес: ' + current.nutrition.weightStart + ' → ' + current.nutrition.weightEnd + ' кг');
    lines.push('Активных дней: ' + current.activeDays.count + ' из ' + current.activeDays.total);
    lines.push('Сон: ' + fmtDuration(current.sleep.avgDuration) + ' в сред. (' + current.sleep.days + ' дней)');
    lines.push('Привычки: ' + current.habits.doneCount + '/' + current.habits.totalCount + ' отметок · ' + (current.habits.rate != null ? current.habits.rate + '%' : '—'));
    if (current.habits.totalHabits > 0) lines.push('  Серия: ' + current.habits.currentStreak + ' дн · рекорд ' + current.habits.longestStreak + ' дн');

    if (prev) {
        const history = collectReviewHistory(periodType);
        lines.push('');
        lines.push('--- Что изменилось? ---');
        const facts = generateFacts(current, prev, periodType, history);
        facts.forEach(f => lines.push((f.icon || '•') + ' ' + f.text));

        lines.push('');
        lines.push('--- Тенденции (6 периодов) ---');
        const trends = computeTrends(history);
        if (trends.length) {
            trends.forEach(t => lines.push('  ' + t.metric.icon + ' ' + t.metric.label + ': ' + (t.dir === 'up' ? 'растёт' : 'падает') + ' (' + (t.changePct > 0 ? '+' : '') + t.changePct + '%) — ' + t.first + ' → ' + t.last));
        } else {
            lines.push('  Нет устойчивых трендов.');
        }

        lines.push('');
        lines.push('--- Compare Periods (текущий vs предыдущий, ср. за 6) ---');
        REVIEW_METRICS.filter(m => !m.skipCompare).forEach(m => {
            const cur = getMetric(current, m.key);
            const pv = getMetric(prev, m.key);
            if ((cur == null || cur === 0 || isNaN(cur)) && (pv == null || pv === 0 || isNaN(pv))) return;
            const bl = history.slice(1, 7).map(h => getMetric(h.summary, m.key)).filter(v => v != null && !isNaN(v) && v !== 0);
            const av = bl.length ? Math.round(bl.reduce((s, v) => s + v, 0) / bl.length) : null;
            const pct = (pv && pv !== 0) ? pctChange(pv, cur) : null;
            lines.push('  ' + m.label + ': тек ' + (cur != null && !isNaN(cur) ? Math.round(cur) : '—') +
                ' / пред ' + (pv != null && !isNaN(pv) ? Math.round(pv) : '—') +
                ' / Δ ' + (pct === null ? 'впервые' : (pct > 0 ? '+' : '') + pct + '%') +
                ' / ср.6 ' + (av != null ? av : '—'));
        });
    }

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-' + (periodType === 'week' ? 'week' : 'month') + '-' + p.start.replace(/-/g, '') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
};

function exportReviewPDF(periodType) {
    const { p, current, prev } = collectWithPrev(periodType);
    const content = renderReviewHTML(periodType, current, prev).replace(/<details class="review-section">/g, '<details class="review-section" open>');

    const cssPromise = (function() {
        if (typeof fetch === 'function') {
            return fetch('css/styles.css').then(r => r.ok ? r.text() : '').catch(() => '');
        }
        return Promise.resolve('');
    })();

    cssPromise.then(externalCss => {
        let css = externalCss || '';
        if (!css) {
            try {
                css = Array.from(document.styleSheets || []).map(ss => {
                    try { return Array.from(ss.cssRules).map(r => r.cssText).join('\n'); }
                    catch (e) { return ''; }
                }).join('\n');
            } catch (e) {}
        }

        const printCss = '' +
            '@media print {' +
            '  body { margin: 0; }' +
            '  .review-toolbar, .review-header select, .review-toolbar .btn { display: none !important; }' +
            '  .review-chart-card, .review-stat-card, .review-fact { break-inside: avoid; }' +
            '}' +
            '.review-print { max-width: 820px; margin: 0 auto; padding: 24px; font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; }' +
            '.review-print .review-hero { box-shadow: none; border: 1px solid #e2e8f0; }' +
            '.review-print .review-stat-card, .review-print .review-chart-card, .review-print .review-fact { box-shadow: none; border: 1px solid #e2e8f0; }';

        const win = window.open('', '_blank');
        if (!win) {
            if (typeof customAlert === 'function') customAlert('Разрешите всплывающие окна, чтобы экспортировать в PDF.', 'Ошибка');
            return;
        }
        win.document.open();
        win.document.write('' +
            '<!DOCTYPE html><html><head><meta charset="utf-8">' +
            '<title>' + (periodType === 'week' ? 'Недельный обзор' : 'Месячный обзор') + ' — ' + esc(p.label) + '</title>' +
            '<style>' + css + '</style>' +
            '<style>' + printCss + '</style>' +
            '</head><body>' +
            '<div class="review-print">' + content + '</div>' +
            '</body></html>');
        win.document.close();
        win.focus();
        setTimeout(function() { win.print(); }, 400);
    });
}

// ============ INTERNAL EXPORT (for tests / devtools) ============

window.__review = {
    collectPeriod: collectPeriod,
    collectHabits: collectHabits,
    collectDailySeries: collectDailySeries,
    generateFacts: generateFacts,
    computePeriodScore: computePeriodScore,
    generateVerdict: generateVerdict,
    renderReviewHTML: renderReviewHTML,
    renderCharts: renderCharts,
    renderHeroScore: renderHeroScore,
    renderFactsGrouped: renderFactsGrouped,
    renderTrendsSection: renderTrendsSection,
    renderCompareSection: renderCompareSection,
    computeTrends: computeTrends,
    detectRecords: detectRecords,
    detectDeviations: detectDeviations,
    collectReviewHistory: collectReviewHistory,
    buildDonutSectors: buildDonutSectors,
    getSelectedPeriod: getSelectedPeriod,
    getWeekRange: getWeekRange,
    getMonthRange: getMonthRange,
    getPreviousRange: getPreviousRange,
    enumWeeks: enumWeeks,
    enumMonths: enumMonths,
    fmtMoney: fmtMoney,
    fmtNum: fmtNum,
    fmtDuration: fmtDuration,
    pctChange: pctChange,
    pctLabel: pctLabel
};

})();
