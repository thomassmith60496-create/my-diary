// ============================================
// 🏠 ГЛАВНАЯ СТРАНИЦА - ДАШБОРД
// ============================================
"use strict";

// === ГЛАВНАЯ СТРАНИца ===

window.renderHomePage = function() {
    const container = document.getElementById('home-content');
    if(!container) return;
    
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayName = dayNames[today.getDay()];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const formattedDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    
    const userName = currentUser ? currentUser.email.split('@')[0] : 'Пользователь';
    const greeting = getGreeting(today.getHours());
    
    // Получаем данные
    const todayNutrition = getTodayNutrition(dateStr);
    const todayFinance = getTodayFinance(dateStr);
    const recentActivity = getRecentActivity();
    const todayTodo = getTodayTodo(dateStr);
    
    let html = '';
    
    // Приветствие
    html += `
        <header class="home-header">
            <h1>${greeting}, ${userName}! 👋</h1>
            <div class="subtitle">${formattedDate} • ${dayName}</div>
        </header>
    `;
    
    // Быстрые действия
    html += `
        <div class="quick-actions">
            <button class="quick-action-btn nutrition" onclick="switchMainTab('food')">
                <span class="quick-action-icon">📥</span>
                <span class="quick-action-text">Добавить приём пищи</span>
            </button>
            <button class="quick-action-btn expense" onclick="openFinanceModalWithType('expense')">
                <span class="quick-action-icon">📉</span>
                <span class="quick-action-text">Добавить расход</span>
            </button>
            <button class="quick-action-btn income" onclick="openFinanceModalWithType('income')">
                <span class="quick-action-icon">📈</span>
                <span class="quick-action-text">Добавить доход</span>
            </button>
        </div>
    `;
    
    // Карточки в одну колонку
    html += `<div class="home-grid">`;
    
    // Карточка питания
    html += renderNutritionCard(todayNutrition, dateStr);
    
    // Карточка задач
    html += renderTodoCard(todayTodo);
    
    // Карточка финансов (на всю ширину)
    html += renderFinanceCard(todayFinance, dateStr);
    
    // Последняя активность
    html += renderRecentActivity(recentActivity);
    
    html += `</div>`;
    
    container.innerHTML = html;
}

window.getGreeting = function(hour) {
    if(hour >= 5 && hour < 12) return 'Доброе утро';
    if(hour >= 12 && hour < 17) return 'Добрый день';
    if(hour >= 17 && hour < 22) return 'Добрый вечер';
    return 'Доброй ночи';
}

window.openFinanceModalWithType = function(type) {
    openFinanceModal();
    setTimeout(() => {
        const typeSelect = document.getElementById('f-fin-type');
        if(typeSelect) typeSelect.value = type;
        updateFinanceCategoryOptions();
    }, 100);
}

// === КАРТОЧКА ПИТАНИЯ ===

window.renderNutritionCard = function(todayData, dateStr) {
    const hasData = todayData.mealsCount > 0;
    const calProgress = Math.min(100, (todayData.calories / 1300) * 100);
    
    let bodyHtml;
    if (hasData) {
        bodyHtml = `
            <div class="nutrition-stats">
                <div class="nutrition-main">
                    <div class="nutrition-calories">
                        <span class="nutrition-value">${todayData.calories}</span>
                        <span class="nutrition-label">/ 1300 ккал</span>
                    </div>
                    <div class="nutrition-progress-bar">
                        <div class="nutrition-progress-fill" style="width: ${calProgress}%"></div>
                    </div>
                </div>
                <div class="nutrition-macros">
                    <div class="macro-item">
                        <div class="macro-info">
                            <span class="macro-value">${todayData.protein}г</span>
                            <span class="macro-label">Белки</span>
                        </div>
                    </div>
                    <div class="macro-item">
                        <div class="macro-info">
                            <span class="macro-value">${todayData.fat}г</span>
                            <span class="macro-label">Жиры</span>
                        </div>
                        <div class="macro-progress">
                            <div class="macro-progress-fill fat" style="width: ${Math.min(100, (todayData.fat / 55) * 100)}%"></div>
                        </div>
                    </div>
                    <div class="macro-item">
                        <div class="macro-info">
                            <span class="macro-value">${todayData.carbs}г</span>
                            <span class="macro-label">Углеводы</span>
                        </div>
                        <div class="macro-progress">
                            <div class="macro-progress-fill carb" style="width: ${Math.min(100, (todayData.carbs / 100) * 100)}%"></div>
                        </div>
                    </div>
                </div>
                <div class="nutrition-meals">
                    <span class="meals-count">🍽️ ${todayData.mealsCount} приём${getPlural(todayData.mealsCount, ['ов', '', 'а'])} пищи</span>
                </div>
            </div>`;
    } else {
        bodyHtml = `
            <div class="empty-state-mini">
                <div class="empty-state-mini-icon">📘</div>
                <div class="empty-state-mini-text">Сегодня ещё нет приёмов пищи</div>
            </div>`;
    }
    
    return `
        <div class="home-card nutrition-card">
            <div class="home-card-header">
                <h2 class="home-card-title">📘 Сегодня</h2>
                <div class="home-card-badge">Питание</div>
            </div>
            <div class="home-card-body">
                ${bodyHtml}
            </div>
        </div>`;
}

window.getTodayNutrition = function(dateStr) {
    let mealsCount = 0;
    let calories = 0;
    let protein = 0;
    let fat = 0;
    let carbs = 0;
    
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        nutritionData.weeks.forEach((week, weekIndex) => {
            if(week && week.menu) {
                week.menu.forEach((day, dayIndex) => {
                    const normalizedDayDate = normalizeDate(day.date);
                    const normalizedToday = normalizeDate(dateStr);
                    
                    if(normalizedDayDate === normalizedToday && day.meals && day.meals.length > 0) {
                        if(week.data) {
                            day.meals.forEach((meal, mealIndex) => {
                                const calKey = `m-${dayIndex}-${mealIndex}-cal`;
                                const protKey = `m-${dayIndex}-${mealIndex}-prot`;
                                const fatKey = `m-${dayIndex}-${mealIndex}-fat`;
                                const carbKey = `m-${dayIndex}-${mealIndex}-carb`;
                                
                                const calVal = parseFloat(week.data[calKey]);
                                const protVal = parseFloat(week.data[protKey]);
                                const fatVal = parseFloat(week.data[fatKey]);
                                const carbVal = parseFloat(week.data[carbKey]);
                                
                                if(!isNaN(calVal)) {
                                    calories += calVal;
                                    protein += !isNaN(protVal) ? protVal : 0;
                                    fat += !isNaN(fatVal) ? fatVal : 0;
                                    carbs += !isNaN(carbVal) ? carbVal : 0;
                                    mealsCount++;
                                }
                            });
                        }
                    }
                });
            }
        });
    }
    
    return { mealsCount, calories: Math.round(calories), protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs) };
}

window.normalizeDate = function(dateStr) {
    if(!dateStr) return '';
    if(dateStr.includes('-') && dateStr.length === 10) {
        return dateStr;
    }
    if(dateStr.includes('.') && dateStr.length === 10) {
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if(dateStr.includes('.') && dateStr.length === 5) {
        const [day, month] = dateStr.split('.');
        const year = new Date().getFullYear();
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
}

// === КАРТОЧКА ЗАДАЧ ===

window.renderTodoCard = function(todayData) {
    const hasTasks = todayData && todayData.tasks && todayData.tasks.length > 0;
    let bodyHtml;
    if (hasTasks) {
        const todayTasks = todayData.tasks.filter(t => t.date === todayKey()).sort((a, b) => (a.completed - b.completed) || (a.createdAt - b.createdAt));
        const doneCount = todayTasks.filter(t => t.completed).length;
        const totalCount = todayTasks.length;
        const pct = totalCount ? Math.round(doneCount / totalCount * 100) : 0;
        
        let tasksHtml = '<div class="todo-list">';
        todayTasks.forEach((t, index) => {
            const overdue = isOverdue(t);
            const meta = [];
            if(t.deadline){
                meta.push(`<span class="todo-dl${overdue ? ' overdue' : ''}">📅 ${fmtDeadline(t.deadline)}${overdue ? ' · просрочено' : ''}</span>`);
            }
            for(const tag of t.tags) meta.push(`<span class="todo-tag">#${esc(tag)}</span>`);
            tasksHtml += `<div class="todo-item${t.completed ? ' done' : ''}">
                <span class="todo-check${t.completed ? ' checked' : ''}">${t.completed ? '✓' : ''}</span>
                <div class="todo-content">
                    <div class="todo-title">${esc(t.title)}</div>
                    ${t.description ? `<div class="todo-desc">${esc(t.description)}</div>` : ''}
                    ${meta.length ? `<div class="todo-meta">${meta.join('')}</div>` : ''}
                </div>
            </div>`;
        });
        tasksHtml += '</div>';
        
        bodyHtml = `
            <div class="todo-stats">
                <div class="todo-progress">
                    <div class="todo-progress-bar">
                        <div class="todo-progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="todo-progress-text">${doneCount} из ${totalCount} выполнено · ${pct}%</span>
                </div>
            </div>
            ${tasksHtml}`;
    } else {
        bodyHtml = `
            <div class="empty-state-mini">
                <div class="empty-state-mini-icon">📝</div>
                <div class="empty-state-mini-text">Сегодня ещё нет задач</div>
            </div>`;
    }
    
    return `
        <div class="home-card todo-card">
            <div class="home-card-header">
                <h2 class="home-card-title">✅ Задачи</h2>
                <div class="home-card-badge">${hasTasks ? `${todayData.tasks.length} ${todayData.tasks.length === 1 ? 'задача' : todayData.tasks.length < 5 ? 'задачи' : 'задач'}` : 'Нет задач'}</div>
            </div>
            <div class="home-card-body">
                ${bodyHtml}
            </div>
        </div>`;
}

window.getTodayTodo = function(dateStr) {
    let tasks = [];
    const todoState = window.getTodoState ? window.getTodoState() : null;
    if(todoState && todoState.tasks && todoState.tasks.length > 0) {
        todoState.tasks.forEach(t => {
            if(t.date === dateStr) {
                tasks.push({
                    id: t.id,
                    date: t.date,
                    title: t.title,
                    description: t.description,
                    completed: t.completed,
                    deadline: t.deadline,
                    tags: t.tags
                });
            }
        });
    }
    return { tasks };
}

window.isOverdue = function(t) {
    return !!t.deadline && !t.completed && new Date(t.deadline) < new Date();
}

window.fmtDeadline = function(dl){
    if(!dl) return '';
    const [dp, tp] = String(dl).split('T');
    const [y,m,d] = dp.split('-');
    return `${d}.${m}.${y}` + (tp ? ' ' + tp.slice(0,5) : '');
}

window.esc = function(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'\u0026amp;','<':'\u0026lt;','>':'\u0026gt;','"':'\u0026quot;',"'":'&#39;'}[c]));
}

window.todayKey = function() {
    return keyOf(new Date());
}

window.ICON = {
    check:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.6 5.4 11 12 3.6"/></svg>',
    plus:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9"/></svg>',
    pencil:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m11.4 2.4 2.2 2.2-7.8 7.8-2.9.7.7-2.9 7.8-7.8z"/></svg>',
    trash:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 4.3h10.6M6.4 2.3h3.2M4.1 4.3l.7 8.5c0 .5.5.9 1 .9h4.4c.5 0 1-.4 1-.9l.7-8.5M6.6 6.9v3.8M9.4 6.9v3.8"/></svg>',
    x:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m3.2 3.2 7.6 7.6M10.8 3.2l-7.6 7.6"/></svg>',
};

window.keyOf = function(date) {
    const pad = n => String(n).padStart(2,'0');
    const [y,m,day] = [date.getFullYear(), date.getMonth()+1, date.getDate()];
    return `${y}-${pad(m)}-${pad(day)}`;
}

// === КАРТОЧКА ФИНАНСОВ ===

window.renderFinanceCard = function(todayData, dateStr) {
    const hasTransactions = todayData.hasTransactions;
    
    let bodyHtml = '';
    
    if (hasTransactions) {
        bodyHtml += `
            <div class="finance-today">
                <div class="finance-row">
                    <div class="finance-item expense">
                        <span class="finance-label">📉 Расходы</span>
                        <span class="finance-value">${todayData.monthExpense.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div class="finance-item income">
                        <span class="finance-label">📈 Доходы</span>
                        <span class="finance-value">${todayData.monthIncome.toLocaleString('ru-RU')} ₽</span>
                    </div>
                </div>
            </div>`;
    } else {
        bodyHtml += `
            <div class="empty-state-mini">
                <div class="empty-state-mini-icon">💰</div>
                <div class="empty-state-mini-text">Нет операций за этот месяц</div>
            </div>`;
    }
    
    if (todayData.nextPlanned) {
        bodyHtml += `
            <div class="finance-month">
                <div class="month-item">
                    <span class="month-label">📅 Ближайший платёж:</span>
                    <span class="month-value">${todayData.nextPlanned.amount.toLocaleString('ru-RU')} ₽</span>
                    <span class="month-date">${formatDateShortRussian(todayData.nextPlanned.date)}</span>
                </div>
            </div>`;
    }
    
    if (todayData.savingsProgress > 0) {
        bodyHtml += `
            <div class="savings-progress">
                <div class="savings-label">🏦 Накопления: ${todayData.savingsProgress.toLocaleString('ru-RU')} ₽</div>
                <div class="savings-bar">
                    <div class="savings-bar-fill" style="width: ${Math.min(100, todayData.savingsProgress / 100)}%"></div>
                </div>
            </div>`;
    }
    
    return `
        <div class="home-card finance-card">
            <div class="home-card-header">
                <h2 class="home-card-title">💰 Финансы</h2>
                <div class="home-card-badge">${todayData.monthLabel}</div>
            </div>
            <div class="home-card-body">
                ${bodyHtml}
            </div>
        </div>`;
}

window.getTodayFinance = function(dateStr) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTransactions = financeData.transactions.filter(t => t.date && t.date.startsWith(currentMonth));
    const hasTransactions = monthTransactions.length > 0;
    
    const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const nextPlanned = financeData.planned
        .filter(p => !p.done && p.date >= dateStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
    
    const totalSavings = financeData.savings.reduce((s, item) => s + item.amount, 0);
    
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const monthLabel = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    
    return {
        hasTransactions,
        monthExpense: Math.round(monthExpense),
        monthIncome: Math.round(monthIncome),
        monthLabel,
        nextPlanned,
        savingsProgress: Math.round(totalSavings)
    };
}

// === ПОСЛЕДНЯЯ АКТИВНОСТЬ ===

window.renderRecentActivity = function(activity) {
    const hasAnyActivity = activity.lastMeal || activity.lastFinance;
    
    let bodyHtml;
    if(!hasAnyActivity) {
        bodyHtml = `
            <div class="empty-state-mini">
                <div class="empty-state-mini-icon">📋</div>
                <div class="empty-state-mini-text">Пока нет активности</div>
            </div>`;
    } else {
        let itemsHtml = '<div class="activity-list">';
        
        if(activity.lastMeal) {
            itemsHtml += `
                <div class="activity-item">
                    <div class="activity-icon">📘</div>
                    <div class="activity-content">
                        <div class="activity-title">Последний приём пищи</div>
                        <div class="activity-details">${activity.lastMeal.name} • ${formatDateShortRussian(activity.lastMeal.date)}</div>
                        ${activity.lastMeal.calories > 0 ? `<div class="activity-meta">🔥 ${activity.lastMeal.calories} ккал</div>` : ''}
                    </div>
                </div>`;
        }
        
        if(activity.lastFinance) {
            const isExpense = activity.lastFinance.type === 'expense';
            itemsHtml += `
                <div class="activity-item">
                    <div class="activity-icon">${isExpense ? '📉' : '📈'}</div>
                    <div class="activity-content">
                        <div class="activity-title">Последняя операция</div>
                        <div class="activity-details">${isExpense ? 'Расход' : 'Доход'} • ${formatDateShortRussian(activity.lastFinance.date)}</div>
                        <div class="activity-meta">${isExpense ? '−' : '+'}${Math.abs(activity.lastFinance.amount).toLocaleString('ru-RU')} ₽</div>
                    </div>
                </div>`;
        }
        
        itemsHtml += '</div>';
        bodyHtml = itemsHtml;
    }
    
    return `
        <div class="home-card activity-card">
            <div class="home-card-header">
                <h2 class="home-card-title">📋 Последняя активность</h2>
            </div>
            <div class="home-card-body">
                ${bodyHtml}
            </div>
        </div>`;
}

window.getRecentActivity = function() {
    let lastMeal = null;
    let lastFinance = null;
    
    // Последний приём пищи
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        const allMeals = [];
        nutritionData.weeks.forEach(week => {
            if(week.menu) {
                week.menu.forEach((day, dayIndex) => {
                    if(day.meals) {
                        day.meals.forEach((meal, mealIndex) => {
                            if(meal.name) {
                                const calData = week.data ? week.data[`m-${dayIndex}-${mealIndex}-cal`] : undefined;
                                const calVal = calData ? parseFloat(calData) : NaN;
                                allMeals.push({
                                    name: meal.name,
                                    date: normalizeDate(day.date),
                                    calories: !isNaN(calVal) ? calVal : 0
                                });
                            }
                        });
                    }
                });
            }
        });
        if(allMeals.length > 0) {
            allMeals.sort((a, b) => b.date.localeCompare(a.date));
            lastMeal = allMeals[0];
        }
    }
    
    // Последняя финансовая операция
    if(financeData.transactions.length > 0) {
        const sorted = [...financeData.transactions].sort((a, b) => {
            if(a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        lastFinance = sorted[0];
    }
    
    return { lastMeal, lastFinance };
}

// === ДАШБОРД ПИТАНИЯ ===

window.renderDashboard = function() {
    renderWeightChart();
    renderKbjuChart();
    renderWeeklyAvg();
}

window.setKbjuMetric = function(metric) {
    currentKbjuMetric = metric;
    document.querySelectorAll('#sub-tab-dashboard .metric-btn').forEach(b => { 
        b.classList.toggle('active', b.dataset.metric === metric); 
    });
    renderKbjuChart();
}

window.renderWeightChart = function() {
    const container = document.getElementById('weight-chart-container');
    const statsContainer = document.getElementById('weight-stats-container');
    const period = document.getElementById('weight-period').value;
    
    const weightData = [];
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        nutritionData.weeks.forEach(week => {
            if(week.menu) {
                week.menu.forEach((day, dayIndex) => {
                    if(day.date && week.data) {
                        const weight = parseFloat(week.data[`weight-${dayIndex}`]);
                        if(!isNaN(weight) && weight > 0) {
                            weightData.push({ date: normalizeDate(day.date), weight: weight });
                        }
                    }
                });
            }
        });
    }
    
    let filteredData = weightData;
    if(period !== 'all') {
        const weeks = parseInt(period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (weeks * 7));
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        filteredData = weightData.filter(d => d.date >= cutoffStr);
    }
    
    filteredData.sort((a, b) => a.date.localeCompare(b.date));
    
    if(filteredData.length === 0) {
        container.innerHTML = '<div class="chart-empty">Нет данных о весе</div>';
        statsContainer.innerHTML = '';
        return;
    }
    
    filteredData = filteredData.map(d => ({ ...d, date: normalizeDate(d.date) }));
    
    const data = filteredData.map(d => ({ date: normalizeDate(d.date), value: d.weight }));
    container.innerHTML = renderSVGLineChart(data, 'value', 'кг', '#2563eb', 'weightGrad', {
        title: 'Динамика веса',
        textColor: '#065f46',
        titleColor: '#064e3b',
        gridColor: '#a7f3d0'
    });
    
    const values = filteredData.map(d => d.weight);
    const first = values[0] || 0;
    const last = values[values.length - 1] || 0;
    const diff = last - first;
    const trendIcon = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➡️');
    const trendColor = diff > 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#6b7280');
    
    statsContainer.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card"><div class="stat-label">Старт</div><div class="stat-value">${first.toFixed(1)} кг</div><div class="stat-sub">${formatDateShortRussian(filteredData[0].date)}</div>
            <div class="stat-card"><div class="stat-label">Сейчас</div><div class="stat-value">${last.toFixed(1)} кг</div><div class="stat-sub">${formatDateShortRussian(filteredData[filteredData.length - 1].date)}</div>
            <div class="stat-card" style="border-left-color:${trendColor};"><div class="stat-label">Изменение ${trendIcon}</div><div class="stat-value" style="color:${trendColor};">${diff > 0 ? '+' : ''}${diff.toFixed(1)} кг</div><div class="stat-sub">${filteredData.length} измерений</div>
        </div>
    `;
}

window.renderKbjuChart = function() {
    const container = document.getElementById('kbju-chart-container');
    const statsContainer = document.getElementById('kbju-stats-container');
    const period = document.getElementById('kbju-period').value;
    
    const dailyData = [];
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        nutritionData.weeks.forEach(week => {
            if(week.menu) {
                week.menu.forEach((day, dayIndex) => {
                    if(day.date && week.data) {
                        let dayCal = 0, dayProt = 0, dayFat = 0, dayCarb = 0;
                        day.meals.forEach((meal, mealIndex) => {
                            dayCal += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-cal`]) || 0;
                            dayProt += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-prot`]) || 0;
                            dayFat += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-fat`]) || 0;
                            dayCarb += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-carb`]) || 0;
                        });
                        
                        if(dayCal > 0) {
                            dailyData.push({
                                date: normalizeDate(day.date),
                                cal: Math.round(dayCal),
                                prot: Math.round(dayProt),
                                fat: Math.round(dayFat),
                                carb: Math.round(dayCarb)
                            });
                        }
                    }
                });
            }
        });
    }
    
    let filteredData = dailyData;
    if(period !== 'all') {
        const weeks = parseInt(period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (weeks * 7));
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        filteredData = dailyData.filter(d => d.date >= cutoffStr);
    }
    
    filteredData.sort((a, b) => a.date.localeCompare(b.date));
    
    if(filteredData.length === 0) {
        container.innerHTML = '<div class="chart-empty">Нет данных о КБЖУ</div>';
        statsContainer.innerHTML = '';
        return;
    }
    
    filteredData = filteredData.map(d => ({ ...d, date: normalizeDate(d.date) }));
    
    const metric = currentKbjuMetric;
    const metricConfig = {
        cal: { label: 'Калории', unit: 'ккал', color: '#2563eb', field: 'cal' },
        prot: { label: 'Белки', unit: 'г', color: '#16a34a', field: 'prot' },
        fat: { label: 'Жиры', unit: 'г', color: '#ea580c', field: 'fat' },
        carb: { label: 'Углеводы', unit: 'г', color: '#9333ea', field: 'carb' }
    };
    const config = metricConfig[metric];
    
    const data = filteredData.map(d => ({ date: normalizeDate(d.date), value: d[config.field] }));
    container.innerHTML = renderSVGLineChart(data, 'value', config.unit, config.color, 'kbjuGrad', {
        title: config.label + ' по дням',
        textColor: '#065f46',
        titleColor: '#064e3b',
        gridColor: '#a7f3d0'
    });
    
    const values = filteredData.map(d => d[config.field]);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    statsContainer.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card"><div class="stat-label">Среднее</div><div class="stat-value">${Math.round(avg)} ${config.unit}</div><div class="stat-sub">${config.label}</div>
            <div class="stat-card"><div class="stat-label">Макс</div><div class="stat-value">${max} ${config.unit}</div><div class="stat-sub">${config.label}</div>
            <div class="stat-card"><div class="stat-label">Мин</div><div class="stat-value">${min} ${config.unit}</div><div class="stat-sub">${config.label}</div>
        </div>
    `;
}

window.renderWeeklyAvg = function() {
    const container = document.getElementById('weekly-avg-container');
    
    const weeklyData = [];
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        nutritionData.weeks.forEach(week => {
            if(week.menu) {
                let weekCal = 0, weekProt = 0, weekFat = 0, weekCarb = 0;
                let daysWithData = 0;
                
                week.menu.forEach((day, dayIndex) => {
                    if(day.date && week.data) {
                        let dayCal = 0, dayProt = 0, dayFat = 0, dayCarb = 0;
                        day.meals.forEach((meal, mealIndex) => {
                            dayCal += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-cal`]) || 0;
                            dayProt += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-prot`]) || 0;
                            dayFat += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-fat`]) || 0;
                            dayCarb += parseFloat(week.data[`m-${dayIndex}-${mealIndex}-carb`]) || 0;
                        });
                        
                        if(dayCal > 0) {
                            weekCal += dayCal;
                            weekProt += dayProt;
                            weekFat += dayFat;
                            weekCarb += dayCarb;
                            daysWithData++;
                        }
                    }
                });
                
                if(daysWithData > 0) {
                    weeklyData.push({
                        title: week.title,
                        days: daysWithData,
                        cal: Math.round(weekCal / daysWithData),
                        prot: Math.round(weekProt / daysWithData),
                        fat: Math.round(weekFat / daysWithData),
                        carb: Math.round(weekCarb / daysWithData)
                    });
                }
            }
        });
    }
    
    if(weeklyData.length === 0) {
        container.innerHTML = '<div class="chart-empty">Нет данных по неделям</div>';
        return;
    }
    
    let html = '<table class="weekly-table"><thead><tr><th>Неделя</th><th>Дней</th><th class="cal">🔥 Ккал (средн.)</th><th class="prot">Белки</th><th class="fat">Жиры</th><th class="carb">Углеводы</th></tr></thead><tbody>';
    weeklyData.forEach(w => {
        html += `<tr><td>${w.title}</td><td>${w.days}</td><td class="cal">${w.cal}</td><td class="prot">${w.prot}</td><td class="fat">${w.fat}</td><td class="carb">${w.carb}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

window.getPlural = function(count, forms) {
    if(count % 10 === 1 && count % 100 !== 11) return forms[1] || '';
    if(count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return forms[2] || forms[0] || '';
    return forms[0] || '';
}