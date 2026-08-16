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
    };
}

// ============ COMPARISON & FACTS ============

function generateComparison(current, prev) {
    const cards = [];

    if (current.finance.expense.total > 0 || (prev && prev.finance.expense.total > 0)) {
        const pct = pctChange(prev.finance.expense.total, current.finance.expense.total);
        cards.push({ icon: '📉', label: 'Расходы', cur: fmtMoney(current.finance.expense.total), sub: fmtMoney(prev.finance.expense.total), pct: pct, unit: '' });
    }
    if (current.finance.income.total > 0 || (prev && prev.finance.income.total > 0)) {
        const pct = pctChange(prev.finance.income.total, current.finance.income.total);
        cards.push({ icon: '📈', label: 'Доходы', cur: fmtMoney(current.finance.income.total), sub: fmtMoney(prev.finance.income.total), pct: pct, unit: '' });
    }
    const taskDelta = current.tasks.done - prev.tasks.done;
    cards.push({ icon: '✅', label: 'Выполненные задачи', cur: current.tasks.done + ' шт', sub: prev.tasks.done + ' шт', pct: taskDelta, unit: 'abs' });
    const trDelta = current.training.workouts - prev.training.workouts;
    cards.push({ icon: '🏋️', label: 'Тренировки', cur: current.training.workouts + ' ' + plural(current.training.workouts, 'раз', 'раза', 'раз'), sub: prev.training.workouts + ' ' + plural(prev.training.workouts, 'раз', 'раза', 'раз'), pct: trDelta, unit: 'abs' });
    const sdDelta = current.activeDays.count - prev.activeDays.count;
    cards.push({ icon: '🔥', label: 'Активных дней', cur: current.activeDays.count + ' / ' + current.activeDays.total, sub: prev.activeDays.count + ' / ' + prev.activeDays.total, pct: sdDelta, unit: 'abs' });

    return cards;
}

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

function generateFacts(current, prev) {
    const facts = [];

    if (!prev) {
        facts.push({ icon: 'ℹ️', text: 'Данных за предыдущий период нет, чтобы сравнивать.', type: 'info' });
        return facts;
    }

    // --- Тренировки: количество (виртуальная правила) ---
    if (current.training.workouts !== prev.training.workouts) {
        const verb = current.training.workouts > prev.training.workouts ? 'вместо' : 'вместо';
        facts.push({
            icon: '🏋️',
            text: 'В этот период ты тренировал' + (current.training.workouts === 0 ? 'а 0 раз' : 'а ' + current.training.workouts + ' ' + plural(current.training.workouts, 'раз', 'раза', 'раз')) + ' ' + verb + ' ' + prev.training.workouts + ' ' + plural(prev.training.workouts, 'раз', 'раза', 'раз') + '.',
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
                text: 'Выполнение задач по тегу #' + tag + ' ' + (cr > pr ? 'выросло' : 'упало') + ' с ' + pr + '% до ' + cr + '%.',
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
            facts.push({ icon: '🏷', text: 'Новый тег #' + tag + ': ' + cp.done + ' из ' + cp.total + ' задач выполнено (' + cr + '%).', type: 'new' });
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
            catFacts.push({ cat, pct: null, text: 'Расходы на категорию «' + cat + '» обнулились (было ' + fmtMoney(pc) + ').', type: 'decrease' });
            return;
        }
        if (pc === 0) {
            catFacts.push({ cat, pct: null, text: 'Расходы на категорию «' + cat + '» впервые: ' + fmtMoney(cc) + '.', type: 'new' });
            return;
        }
        const pct = Math.round((cc - pc) / pc * 100);
        if (Math.abs(pct) >= 5) {
            catFacts.push({ cat, pct, text: 'Расходы на категорию «' + cat + '» ' + (pct > 0 ? 'выросли' : 'упали') + ' на ' + Math.abs(pct) + '%.', type: pct > 0 ? 'increase' : 'decrease' });
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
            type: expPct > 0 ? 'increase' : (expPct < 0 ? 'decrease' : 'same')
        });
    }
    const incPct = pctChange(prev.finance.income.total, current.finance.income.total);
    if (incPct !== 0) {
        facts.push({
            icon: '📈',
            text: 'Общие доходы: ' + fmtMoney(current.finance.income.total) + ' (' + pctLabel(incPct) + ').',
            type: incPct > 0 ? 'increase' : (incPct < 0 ? 'decrease' : 'same')
        });
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

    if (facts.length === 0) {
        facts.push({ icon: '📊', text: 'На этот период почти ничего не изменилось — привычка держит ритм.', type: 'same' });
    }

    return facts;
}

// ============ RENDER ============

function statCard(icon, title, value, sub, trend) {
    const trendHtml = trend ? '<span class="review-trend trend-' + trend.dir + '">' + trend.label + '</span>' : '';
    return '' +
        '<div class="review-stat-card">' +
            '<div class="review-stat-header">' +
                '<span class="review-stat-icon">' + icon + '</span>' +
                '<span class="review-stat-title">' + esc(title) + '</span>' +
                trendHtml +
            '</div>' +
            '<div class="review-stat-value">' + value + '</div>' +
            sub ? '<div class="review-stat-sub">' + sub + '</div>' : '' +
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
        taskPct + '% выполнено',
        taskTrend));

    // Тренировки
    let trainTrend = null;
    if (prev) {
        const pct = pctChange(prev.training.workouts, current.training.workouts);
        trainTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🏋️', 'Тренировки',
        current.training.workouts > 0 ? (current.training.workouts + ' ' + plural(current.training.workouts, 'тренировка', 'тренировки', 'тренировок')) : '—',
        current.training.sets > 0 ? current.training.sets + ' подходов · ' + fmtMoney(current.training.volume) + ' объёма' : '',
        trainTrend));

    // Расходы
    const expCats = Object.keys(current.finance.expense.byCategory).sort((a, b) => current.finance.expense.byCategory[b] - current.finance.expense.byCategory[a]);
    let expTrend = null;
    if (prev) {
        const pct = pctChange(prev.finance.expense.total, current.finance.expense.total);
        expTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('📉', 'Расходы',
        current.finance.expense.total > 0 ? fmtMoney(current.finance.expense.total) : '—',
        expCats.length ? expCats.slice(0, 3).map(c => c + ': ' + fmtMoney(current.finance.expense.byCategory[c])).join(' · ') : '',
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
        incCats.length ? incCats.slice(0, 2).map(c => c + ': ' + fmtMoney(current.finance.income.byCategory[c])).join(' · ') : '',
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
        goalCats.length ? goalCats.slice(0, 2).map(g => g + ': ' + fmtMoney(current.finance.savings.byGoal[g])).join(' · ') : '',
        saveTrend));

    // Питание
    let nutTrend = null;
    if (prev && prev.nutrition.avgCalories > 0) {
        const pct = pctChange(prev.nutrition.avgCalories, current.nutrition.avgCalories);
        nutTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('📘', 'Питание',
        current.nutrition.days > 0 ? (current.nutrition.avgCalories + ' ккал') : '—',
        current.nutrition.days > 0 ? current.nutrition.days + ' дней · ' + (current.nutrition.weightStart ? (current.nutrition.weightStart + '→' + current.nutrition.weightEnd + ' кг') : 'вес не указан') : '',
        nutTrend));

    // Активные дни
    let adTrend = null;
    if (prev) {
        const pct = pctChange(prev.activeDays.count, current.activeDays.count);
        adTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🔥', 'Активных дней',
        current.activeDays.total > 0 ? (current.activeDays.count + ' / ' + current.activeDays.total) : '—',
        current.activeDays.total > 0 ? Math.round(current.activeDays.count / current.activeDays.total * 100) + '% периода' : '',
        adTrend));

    // Сон
    let sleepTrend = null;
    if (prev && prev.sleep.days > 0 && current.sleep.days > 0) {
        const pct = pctChange(prev.sleep.avgDuration, current.sleep.avgDuration);
        sleepTrend = { dir: pctDir(pct), label: pctLabel(pct) };
    }
    cards.push(statCard('🌙', 'Сон',
        current.sleep.days > 0 ? fmtDuration(current.sleep.avgDuration) : '—',
        current.sleep.days > 0 ? current.sleep.days + ' дней · ' + fmtTimeOfDay(current.sleep.avgBedtime) + ' → ' + fmtTimeOfDay(current.sleep.avgWakeTime) : '',
        sleepTrend));

    return cards.map(c => c).join('');
}

function renderReviewHTML(periodType, current, prev) {
    const selectId = periodType === 'week' ? 'review-week-select' : 'review-month-select';
    const enumFn = periodType === 'week' ? enumWeeks : enumMonths;
    const title = periodType === 'week' ? 'Недельный обзор' : 'Месячный обзор';
    const icon = periodType === 'week' ? '📅' : '📆';
    const exportFn = 'exportReview(\'' + periodType + '\')';
    const options = enumFn().map(o => '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>').join('');
    const selectedVal = periodType === 'week'
        ? (window.reviewWeekStart || getWeekRange(new Date()).start)
        : (window.reviewMonthKey || getMonthRange(new Date()).start.slice(0, 7));
    const periodLabel = periodType === 'week'
        ? getSelectedPeriod('week').label
        : getSelectedPeriod('month').label;

    const comparison = prev ? generateComparison(current, prev) : null;
    const comparisonHtml = comparison && comparison.length
        ? '<div class="review-comparison-bar">' +
            comparison.map(c => {
                let trendTxt, trendCls;
                if (c.unit === 'abs') {
                    if (c.pct === 0) { trendTxt = 'без изменений'; trendCls = 'same'; }
                    else { trendTxt = (c.pct > 0 ? '+' : '') + c.pct; trendCls = c.pct > 0 ? 'up' : 'down'; }
                } else {
                    trendTxt = pctLabel(c.pct); trendCls = pctDir(c.pct);
                }
                return '<div class="comparison-card">' +
                    '<span class="comparison-icon">' + c.icon + '</span>' +
                    '<span class="comparison-label">' + esc(c.label) + '</span>' +
                    '<span class="comparison-cur">' + c.cur + '</span>' +
                    '<span class="comparison-prev">' + c.sub + '</span>' +
                    '<span class="comparison-trend trend-' + trendCls + '">' + trendTxt + '</span>' +
                '</div>';
            }).join('') +
          '</div>'
        : '';

    const facts = prev ? generateFacts(current, prev) : generateFacts(current, null);
    const factsHtml = '<h3 class="review-facts-title">🔍 Что изменилось?</h3>' +
        (facts.length ? '<div class="review-facts-list">' +
            facts.map(f =>
                '<div class="review-fact fact-' + f.type + '">' +
                    '<span class="review-fact-icon">' + f.icon + '</span>' +
                    '<span class="review-fact-text">' + f.text + '</span>' +
                '</div>').join('') +
            '</div>'
        : '<div class="review-empty-facts">Нет данных для анализа.</div>');

    return '' +
        '<header class="review-header">' +
            '<h1>' + icon + ' ' + title + '</h1>' +
            '<div class="subtitle">' + esc(periodLabel) + '</div>' +
        '</header>' +
        '<div class="review-toolbar">' +
            '<select id="' + selectId + '" onchange="switchReviewPeriod(\'' + periodType + '\', this.value)">' + options + '</select>' +
            '<button class="btn" onclick="prevReviewPeriod(\'' + periodType + '\')">← Предыдущий</button>' +
            '<button class="btn" onclick="nextReviewPeriod(\'' + periodType + '\')">Следующий →</button>' +
            '<div class="review-toolbar-spacer"></div>' +
            '<button class="btn primary" onclick="' + exportFn + '">📄 Экспорт</button>' +
        '</div>' +
        '<div class="review-stat-grid">' + renderStatGrid(current, prev) + '</div>' +
        comparisonHtml +
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

window.exportReview = function(periodType) {
    const p = getSelectedPeriod(periodType);
    const current = collectPeriod(p.start, p.end);
    const prev = (p.prev && p.prev) ? collectPeriod(p.prev.start, p.prev.end) : null;

    let lines = [];
    lines.push('========== ' + (periodType === 'week' ? 'НЕДЕЛЬНЫЙ ОБЗОР' : 'МЕСЯЧНЫЙ ОБЗОР') + ' ==========');
    lines.push('Период: ' + esc(p.label));
    lines.push('Даты: ' + fmtDateFull(p.start) + ' – ' + fmtDateFull(p.end));
    lines.push('');
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
    lines.push('  Объём: ' + fmtMoney(current.training.volume));
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

    if (prev) {
        lines.push('');
        lines.push('--- Сравнение с ' + (periodType === 'week' ? 'предыдущей неделей' : 'предыдущим месяцем') + ' ---');
        const cmp = generateComparison(current, prev);
        cmp.forEach(c => {
            lines.push(c.icon + ' ' + c.label + ': ' + c.cur + ' (было ' + c.sub + ', ' + pctLabel(c.pct) + ')');
        });
        lines.push('');
        lines.push('--- Что изменилось? ---');
        const facts = generateFacts(current, prev);
        facts.forEach(f => lines.push((f.icon || '•') + ' ' + f.text));
    } else {
        lines.push('');
        lines.push('--- Сравнение ---');
        lines.push('Данных за предыдущий период нет.');
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

// ============ INTERNAL EXPORT (for tests / devtools) ============

window.__review = {
    collectPeriod: collectPeriod,
    generateComparison: generateComparison,
    generateFacts: generateFacts,
    renderReviewHTML: renderReviewHTML,
    getSelectedPeriod: getSelectedPeriod,
    getWeekRange: getWeekRange,
    getMonthRange: getMonthRange,
    getPreviousRange: getPreviousRange,
    enumWeeks: enumWeeks,
    enumMonths: enumMonths,
    fmtMoney: fmtMoney,
    fmtDuration: fmtDuration,
    pctChange: pctChange,
    pctLabel: pctLabel
};

})();
