// ============================================
// 🏠 ГЛАВНАЯ СТРАНИЦА - ДАШБОРД
// ============================================

// === ГЛАВНАЯ СТРАНИЦА ===

function renderHomePage() {
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
    const todayWorkout = getTodayWorkout(dateStr);
    const todayFinance = getTodayFinance(dateStr);
    const recentActivity = getRecentActivity();
    
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
            <button class="quick-action-btn workout" onclick="openTrainModal()">
                <span class="quick-action-icon">🏋️</span>
                <span class="quick-action-text">Добавить тренировку</span>
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
    
    // Карточки в две колонки
    html += `<div class="home-grid">`;
    
    // Карточка питания
    html += renderNutritionCard(todayNutrition, dateStr);
    
    // Карточка тренировок
    html += renderWorkoutCard(todayWorkout, dateStr);
    
    html += `</div>`;
    
    // Карточка финансов (на всю ширину)
    html += renderFinanceCard(todayFinance, dateStr);
    
    // Последняя активность
    html += renderRecentActivity(recentActivity);
    
    container.innerHTML = html;
}

function getGreeting(hour) {
    if(hour >= 5 && hour < 12) return 'Доброе утро';
    if(hour >= 12 && hour < 17) return 'Добрый день';
    if(hour >= 17 && hour < 22) return 'Добрый вечер';
    return 'Доброй ночи';
}

// === БЫСТРЫЕ ДЕЙСТВИЯ ===

function renderQuickActions() {
    return `
        <div class="quick-actions">
            <button class="quick-action-btn nutrition" onclick="openNutritionModal()">
                <span class="quick-action-icon">📥</span>
                <span class="quick-action-text">Добавить приём пищи</span>
            </button>
            <button class="quick-action-btn workout" onclick="openTrainModal()">
                <span class="quick-action-icon">🏋️</span>
                <span class="quick-action-text">Добавить тренировку</span>
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
}

function openFinanceModalWithType(type) {
    openFinanceModal();
    setTimeout(() => {
        const typeSelect = document.getElementById('f-fin-type');
        if(typeSelect) typeSelect.value = type;
        updateFinanceCategoryOptions();
    }, 100);
}

// === КАРТОЧКА ПИТАНИЯ ===

function renderNutritionCard(todayData, dateStr) {
    const hasData = todayData.mealsCount > 0;
    const calProgress = Math.min(100, (todayData.calories / 1300) * 100);
    const protProgress = Math.min(100, (todayData.protein / 110) * 100);
    
    return `
        <div class="home-card nutrition-card">
            <div class="home-card-header">
                <h2 class="home-card-title">📘 Сегодня</h2>
                <div class="home-card-badge">Питание</div>
            </div>
            <div class="home-card-body">
                ${hasData ? `
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
                                <div class="macro-progress">
                                    <div class="macro-progress-fill prot" style="width: ${protProgress}%"></div>
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
                    </div>
                ` : `
                    <div class="empty-state-mini">
                        <div class="empty-state-mini-icon">📘</div>
                        <div class="empty-state-mini-text">Сегодня ещё нет приёмов пищи</div>
                    </div>
                `}
            </div>
        </div>
    `;
}

function getTodayNutrition(dateStr) {
    let mealsCount = 0;
    let calories = 0;
    let protein = 0;
    let fat = 0;
    let carbs = 0;
    
    if(nutritionData.weeks && nutritionData.weeks.length > 0 && nutritionData.currentWeekId) {
        const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
        if(week && week.menu) {
            week.menu.forEach((day, dayIndex) => {
                if(day.date === dateStr && day.meals) {
                    day.meals.forEach((meal, mealIndex) => {
                        mealsCount++;
                        const calKey = `m-${dayIndex}-${mealIndex}-cal`;
                        const protKey = `m-${dayIndex}-${mealIndex}-prot`;
                        const fatKey = `m-${dayIndex}-${mealIndex}-fat`;
                        const carbKey = `m-${dayIndex}-${mealIndex}-carb`;
                        
                        if(week.data) {
                            calories += parseFloat(week.data[calKey]) || 0;
                            protein += parseFloat(week.data[protKey]) || 0;
                            fat += parseFloat(week.data[fatKey]) || 0;
                            carbs += parseFloat(week.data[carbKey]) || 0;
                        }
                    });
                }
            });
        }
    }
    
    return { mealsCount, calories: Math.round(calories), protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs) };
}

// === КАРТОЧКА ТРЕНИРОВОК ===

function renderWorkoutCard(todayData, dateStr) {
    const hasWorkout = todayData.hasWorkout;
    
    return `
        <div class="home-card workout-card">
            <div class="home-card-header">
                <h2 class="home-card-title">🏋️ Тренировки</h2>
                <div class="home-card-badge">${hasWorkout ? 'Сегодня' : 'Отдых'}</div>
            </div>
            <div class="home-card-body">
                ${hasWorkout ? `
                    <div class="workout-info">
                        <div class="workout-type-badge">${todayData.typeLabel || 'Тренировка'}</div>
                        <div class="workout-details">
                            ${todayData.duration ? `<div class="workout-detail">⏱ ${todayData.duration} мин</div>` : ''}
                            ${todayData.exercisesCount > 0 ? `<div class="workout-detail">🎯 ${todayData.exercisesCount} упражнений</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="empty-state-mini">
                        <div class="empty-state-mini-icon">🏋️</div>
                        <div class="empty-state-mini-text">Сегодня нет тренировок</div>
                    </div>
                `}
                ${todayData.lastWorkout ? `
                    <div class="last-workout">
                        <div class="last-workout-label">Последняя тренировка:</div>
                        <div class="last-workout-date">${formatDateShort(todayData.lastWorkout.date)}</div>
                    </div>
                ` : ''}
                <div class="week-stats">
                    <span class="week-stat">📊 ${todayData.weekCount} тренировок на неделе</span>
                </div>
            </div>
        </div>
    `;
}

function getTodayWorkout(dateStr) {
    const todayWorkouts = workouts.filter(w => w.date === dateStr);
    const hasWorkout = todayWorkouts.length > 0;
    const workout = hasWorkout ? todayWorkouts[0] : null;
    
    const weekStart = new Date(dateStr);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    
    const weekWorkouts = workouts.filter(w => w.date >= weekStartStr && w.date <= weekEndStr);
    
    const lastWorkout = workouts.length > 0 ? [...workouts].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
    
    return {
        hasWorkout,
        typeLabel: workout ? (typeLabels[workout.type] || 'Тренировка') : null,
        duration: workout ? workout.duration : 0,
        exercisesCount: workout && workout.parsedExercises ? workout.parsedExercises.length : 0,
        lastWorkout,
        weekCount: weekWorkouts.length
    };
}

// === КАРТОЧКА ФИНАНСОВ ===

function renderFinanceCard(todayData, dateStr) {
    const hasTransactions = todayData.hasTransactions;
    
    return `
        <div class="home-card finance-card">
            <div class="home-card-header">
                <h2 class="home-card-title">💰 Финансы</h2>
                <div class="home-card-badge">${todayData.monthLabel}</div>
            </div>
            <div class="home-card-body">
                ${hasTransactions ? `
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
                    </div>
                ` : `
                    <div class="empty-state-mini">
                        <div class="empty-state-mini-icon">💰</div>
                        <div class="empty-state-mini-text">Нет операций за этот месяц</div>
                    </div>
                `}
                ${todayData.nextPlanned ? `
                    <div class="finance-month">
                        <div class="month-item">
                            <span class="month-label">📅 Ближайший платёж:</span>
                            <span class="month-value">${todayData.nextPlanned.amount.toLocaleString('ru-RU')} ₽</span>
                            <span class="month-date">${formatDateShort(todayData.nextPlanned.date)}</span>
                        </div>
                    </div>
                ` : ''}
                ${todayData.savingsProgress > 0 ? `
                    <div class="savings-progress">
                        <div class="savings-label">🏦 Накопления: ${todayData.savingsProgress.toLocaleString('ru-RU')} ₽</div>
                        <div class="savings-bar">
                            <div class="savings-bar-fill" style="width: ${Math.min(100, todayData.savingsProgress / 100)}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function getTodayFinance(dateStr) {
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

function renderRecentActivity(activity) {
    let html = `
        <div class="home-card activity-card">
            <div class="home-card-header">
                <h2 class="home-card-title">📋 Последняя активность</h2>
            </div>
            <div class="home-card-body">
    `;
    
    const hasAnyActivity = activity.lastMeal || activity.lastWorkout || activity.lastFinance;
    
    if(!hasAnyActivity) {
        html += `
            <div class="empty-state-mini">
                <div class="empty-state-mini-icon">📋</div>
                <div class="empty-state-mini-text">Пока нет активности</div>
            </div>
        `;
    } else {
        html += `<div class="activity-list">`;
        
        if(activity.lastMeal) {
            html += `
                <div class="activity-item">
                    <div class="activity-icon">📘</div>
                    <div class="activity-content">
                        <div class="activity-title">Последний приём пищи</div>
                        <div class="activity-details">${activity.lastMeal.name} • ${formatDateShort(activity.lastMeal.date)}</div>
                        ${activity.lastMeal.calories > 0 ? `<div class="activity-meta">🔥 ${activity.lastMeal.calories} ккал</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        if(activity.lastWorkout) {
            html += `
                <div class="activity-item">
                    <div class="activity-icon">🏋️</div>
                    <div class="activity-content">
                        <div class="activity-title">Последняя тренировка</div>
                        <div class="activity-details">${typeLabels[activity.lastWorkout.type] || 'Тренировка'} • ${formatDateShort(activity.lastWorkout.date)}</div>
                        ${activity.lastWorkout.duration > 0 ? `<div class="activity-meta">⏱ ${activity.lastWorkout.duration} мин</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        if(activity.lastFinance) {
            const isExpense = activity.lastFinance.type === 'expense';
            html += `
                <div class="activity-item">
                    <div class="activity-icon">${isExpense ? '📉' : '📈'}</div>
                    <div class="activity-content">
                        <div class="activity-title">Последняя операция</div>
                        <div class="activity-details">${isExpense ? 'Расход' : 'Доход'} • ${formatDateShort(activity.lastFinance.date)}</div>
                        <div class="activity-meta">${isExpense ? '−' : '+'}${Math.abs(activity.lastFinance.amount).toLocaleString('ru-RU')} ₽</div>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    html += `</div></div>`;
    return html;
}

function getRecentActivity() {
    let lastMeal = null;
    let lastWorkout = null;
    let lastFinance = null;
    
    // Последний приём пищи
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        const allMeals = [];
        nutritionData.weeks.forEach(week => {
            if(week.menu) {
                week.menu.forEach((day, dayIndex) => {
                    if(day.meals) {
                        day.meals.forEach((meal, mealIndex) => {
                            allMeals.push({
                                name: meal.name,
                                date: day.date,
                                calories: week.data ? parseFloat(week.data[`m-${dayIndex}-${mealIndex}-cal`]) || 0 : 0
                            });
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
    
    // Последняя тренировка
    if(workouts.length > 0) {
        const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
        lastWorkout = sorted[0];
    }
    
    // Последняя финансовая операция
    if(financeData.transactions.length > 0) {
        const sorted = [...financeData.transactions].sort((a, b) => {
            if(a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        lastFinance = sorted[0];
    }
    
    return { lastMeal, lastWorkout, lastFinance };
}

// === ДАШБОРД ПИТАНИЯ ===

function renderDashboard() {
    renderWeightChart();
    renderKbjuChart();
    renderWeeklyAvg();
}

function setKbjuMetric(metric) {
    currentKbjuMetric = metric;
    document.querySelectorAll('#sub-tab-dashboard .metric-btn').forEach(b => { 
        b.classList.toggle('active', b.dataset.metric === metric); 
    });
    renderKbjuChart();
}

function renderWeightChart() {
    const container = document.getElementById('weight-chart-container');
    const statsContainer = document.getElementById('weight-stats-container');
    const period = document.getElementById('weight-period').value;
    
    // Collect weight data from all weeks
    const weightData = [];
    if(nutritionData.weeks && nutritionData.weeks.length > 0) {
        nutritionData.weeks.forEach(week => {
            if(week.menu) {
                week.menu.forEach((day, dayIndex) => {
                    if(day.date && week.data) {
                        const weight = parseFloat(week.data[`weight-${dayIndex}`]);
                        if(weight && weight > 0) {
                            weightData.push({ date: day.date, weight });
                        }
                    }
                });
            }
        });
    }
    
    // Filter by period
    let filteredData = weightData;
    if(period !== 'all') {
        const weeks = parseInt(period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (weeks * 7));
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        filteredData = weightData.filter(d => d.date >= cutoffStr);
    }
    
    // Sort by date
    filteredData.sort((a, b) => a.date.localeCompare(b.date));
    
    if(filteredData.length === 0) {
        container.innerHTML = '<div class="chart-empty">Нет данных о весе</div>';
        statsContainer.innerHTML = '';
        return;
    }
    
    // Render chart
    const data = filteredData.map(d => ({ date: d.date, value: d.weight }));
    container.innerHTML = renderSVGLineChart(data, 'value', 'кг', '#2563eb', 'weightGrad', {
        title: 'Динамика веса',
        textColor: '#065f46',
        titleColor: '#064e3b',
        gridColor: '#a7f3d0'
    });
    
    // Render stats
    const values = filteredData.map(d => d.weight);
    const first = values[0], last = values[values.length - 1];
    const diff = last - first;
    const trendIcon = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➡️');
    const trendColor = diff > 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#6b7280');
    
    statsContainer.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card"><div class="stat-label">Старт</div><div class="stat-value">${first} кг</div><div class="stat-sub">${formatDateShort(filteredData[0].date)}</div></div>
            <div class="stat-card"><div class="stat-label">Сейчас</div><div class="stat-value">${last} кг</div><div class="stat-sub">${formatDateShort(filteredData[filteredData.length - 1].date)}</div></div>
            <div class="stat-card" style="border-left-color:${trendColor};"><div class="stat-label">Изменение ${trendIcon}</div><div class="stat-value" style="color:${trendColor};">${diff > 0 ? '+' : ''}${diff.toFixed(1)} кг</div><div class="stat-sub">${filteredData.length} измерений</div></div>
        </div>
    `;
}

function renderKbjuChart() {
    const container = document.getElementById('kbju-chart-container');
    const statsContainer = document.getElementById('kbju-stats-container');
    const period = document.getElementById('kbju-period').value;
    
    // Collect daily KBJU data
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
                                date: day.date,
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
    
    // Filter by period
    let filteredData = dailyData;
    if(period !== 'all') {
        const weeks = parseInt(period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (weeks * 7));
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        filteredData = dailyData.filter(d => d.date >= cutoffStr);
    }
    
    // Sort by date
    filteredData.sort((a, b) => a.date.localeCompare(b.date));
    
    if(filteredData.length === 0) {
        container.innerHTML = '<div class="chart-empty">Нет данных о КБЖУ</div>';
        statsContainer.innerHTML = '';
        return;
    }
    
    // Get metric to display
    const metric = currentKbjuMetric;
    const metricConfig = {
        cal: { label: 'Калории', unit: 'ккал', color: '#2563eb', field: 'cal' },
        prot: { label: 'Белки', unit: 'г', color: '#16a34a', field: 'prot' },
        fat: { label: 'Жиры', unit: 'г', color: '#ea580c', field: 'fat' },
        carb: { label: 'Углеводы', unit: 'г', color: '#9333ea', field: 'carb' }
    };
    const config = metricConfig[metric];
    
    // Render chart
    const data = filteredData.map(d => ({ date: d.date, value: d[config.field] }));
    container.innerHTML = renderSVGLineChart(data, 'value', config.unit, config.color, 'kbjuGrad', {
        title: config.label + ' по дням',
        textColor: '#065f46',
        titleColor: '#064e3b',
        gridColor: '#a7f3d0'
    });
    
    // Render stats
    const values = filteredData.map(d => d[config.field]);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    statsContainer.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card"><div class="stat-label">Среднее</div><div class="stat-value">${Math.round(avg)} ${config.unit}</div><div class="stat-sub">${config.label}</div></div>
            <div class="stat-card"><div class="stat-label">Макс</div><div class="stat-value">${max} ${config.unit}</div><div class="stat-sub">${config.label}</div></div>
            <div class="stat-card"><div class="stat-label">Мин</div><div class="stat-value">${min} ${config.unit}</div><div class="stat-sub">${config.label}</div></div>
        </div>
    `;
}

function renderWeeklyAvg() {
    const container = document.getElementById('weekly-avg-container');
    
    // Calculate weekly averages
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
        container.innerHTML = '<div class="empty-state-mini"><div class="empty-state-mini-icon">📊</div><div class="empty-state-mini-text">Нет данных для средних значений</div></div>';
        return;
    }
    
    // Render weekly averages
    let html = '<div class="weekly-avg-grid">';
    weeklyData.forEach(week => {
        html += `
            <div class="weekly-avg-card">
                <div class="weekly-avg-title">${week.title}</div>
                <div class="weekly-avg-days">${week.days} дн. с данными</div>
                <div class="weekly-avg-values">
                    <div class="avg-item cal"><span class="avg-value">${week.cal}</span><span class="avg-label">ккал</span></div>
                    <div class="avg-item prot"><span class="avg-value">${week.prot}г</span><span class="avg-label">Б</span></div>
                    <div class="avg-item fat"><span class="avg-value">${week.fat}г</span><span class="avg-label">Ж</span></div>
                    <div class="avg-item carb"><span class="avg-value">${week.carb}г</span><span class="avg-label">У</span></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function formatDateShort(dateStr) {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getPlural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if(mod100 >= 11 && mod100 <= 19) return forms[0];
    if(mod10 === 1) return forms[1];
    if(mod10 >= 2 && mod10 <= 4) return forms[2];
    return forms[0];
}

// Инициализация при загрузке
if(typeof renderHomePage !== 'undefined') {
    // Функция будет вызвана при переключении на вкладку
}