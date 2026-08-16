// ============================================
// 💰 FINANCE RENDER FUNCTIONS
// ============================================

window.updateFinanceStats = function() {
    const totalIncome = financeData.transactions
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalExpense = financeData.transactions
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    const balance = totalIncome - totalExpense;
    
    document.getElementById('fin-stat-balance').textContent =
        `💵 Баланс: ${balance.toLocaleString('ru-RU')} ₽`;
    document.getElementById('fin-stat-income').textContent =
        `📈 Доходы: ${totalIncome.toLocaleString('ru-RU')} ₽`;
    document.getElementById('fin-stat-expense').textContent =
        `📉 Расходы: ${totalExpense.toLocaleString('ru-RU')} ₽`;
}

window.renderCurrentFinanceTab = function() {
    const activeTab = document.querySelector('#main-tab-finance .sub-tab-btn.active');
    if(!activeTab) return;
    const tab = activeTab.textContent.trim();
    if(tab.includes('Дашборд')) renderFinanceDashboard();
    else if(tab.includes('Операции')) renderFinanceTransactions();
    else if(tab.includes('Накопления')) renderFinanceSavings();
    else if(tab.includes('Планируемые')) renderFinancePlanned();
    else if(tab.includes('Обязательные')) renderFinanceMandatory();
    else if(tab.includes('Категории')) renderFinanceCategories();
}

window.renderFinanceDashboard = function() {
    const container = document.getElementById('finance-dashboard-content');
    updateFinanceStats();
    
    // Always set up the month selector first
    const allMonthsSet = new Set();
    financeData.transactions.forEach(t => {
        const m = t.date.slice(0, 7);
        allMonthsSet.add(m);
    });
    const sortedMonths = Array.from(allMonthsSet).sort();

    const staticSelect = document.getElementById('fin-month-select');

    const previouslySelected = staticSelect.value || financeSelectedMonth || '';

    // Обновляем опции статичного селектора месяцев в тулбаре
    let monthOptions = '<option value="all">📊 Все месяцы (накопительно)</option>' +
        sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
            const label = monthNames[parseInt(mo) - 1] + ' ' + y;
            return '<option value="' + m + '">' + label + '</option>';
        }).join('');
    staticSelect.innerHTML = monthOptions;

    // Определяем какой месяц выбрать
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (previouslySelected === 'all') {
        staticSelect.value = 'all';
    } else if (previouslySelected && previouslySelected !== '' && allMonthsSet.has(previouslySelected)) {
        staticSelect.value = previouslySelected;
    } else if(allMonthsSet.has(currentMonth)) {
        staticSelect.value = currentMonth;
    } else if(sortedMonths.length > 0) {
        staticSelect.value = sortedMonths[sortedMonths.length - 1];
    } else {
        staticSelect.value = currentMonth;
    }
    financeSelectedMonth = staticSelect.value;

    if(financeData.transactions.length === 0) {
        // Show mandatory payments even without transactions
        const mandatoryHtml = renderMandatoryDashboardTable(financeSelectedMonth);
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">💰</div>
            <div class="empty-state-title">Дашборд финансов</div>
            <div class="empty-state-text">Добавьте операции чтобы увидеть аналитику</div>
        </div>` + mandatoryHtml;
        return;
    }

    let filteredTransactions = [...financeData.transactions];
    if(financeSelectedMonth !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.date.startsWith(financeSelectedMonth));
    }
    if(filteredTransactions.length === 0) {
        container.innerHTML += `<div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">Нет операций за выбранный период</div>
            <div class="empty-state-text">Попробуйте выбрать другой месяц</div>
        </div>`;
        return;
    }
    
    const monthlyData = {};
    filteredTransactions.forEach(t => {
        const month = t.date.slice(0, 7);
        if(!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0, count: 0 };
        if(t.type === 'income') monthlyData[month].income += Math.abs(t.amount);
        else monthlyData[month].expense += Math.abs(t.amount);
        monthlyData[month].count++;
    });
    
    const months = Object.keys(monthlyData).sort();
    
    const catTotals = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = financeData.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name : 'Без категории';
        if(!catTotals[catName]) catTotals[catName] = 0;
        catTotals[catName] += Math.abs(t.amount);
    });
    
    const catNames = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
    const totalExpense = Object.values(catTotals).reduce((s, v) => s + v, 0);
    
    let html = '';
    
    // Charts container: both charts side by side
    const hasMonths = months.length > 0;
    const hasCats = catNames.length > 0;
    
    if(hasMonths || hasCats) {
        html += `<div class="finance-charts-row">
            <div class="finance-chart-col">`;
    }
    
    if(hasMonths) {
        const maxVal = Math.max(...months.map(m => Math.max(monthlyData[m].income, monthlyData[m].expense)));
        const chartHeight = 200;
        const totalBarsWidth = months.length * 80;
        const svgWidth = Math.max(400, totalBarsWidth);
        const offsetX = months.length === 1 ? (svgWidth - 80) / 2 : 50;
        
        html += `<h3 class="finance-section-title">📊 Доходы / Расходы по месяцам</h3>
        <div class="finance-chart-container">
            <svg viewBox="0 0 ${svgWidth} 260" style="width:100%;height:260px;">
                <line x1="40" y1="230" x2="${svgWidth - 20}" y2="230" stroke="#7e22ce" stroke-width="1.5"/>
                ${[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const y = 230 - (pct * chartHeight);
                    const val = Math.round(maxVal * pct);
                    return `<line x1="35" y1="${y}" x2="${svgWidth - 20}" y2="${y}" stroke="#e9d5ff" stroke-width="1" stroke-dasharray="2,3"/>
                        <text x="35" y="${y + 4}" text-anchor="end" font-size="10" fill="#a855f7" font-weight="600">${val.toLocaleString('ru-RU')}</text>`;
                }).join('')}
                ${months.map((m, i) => {
                    const barWidth = months.length === 1 ? 60 : Math.min(60, (600 / months.length) - 10);
                    const x = offsetX + i * (barWidth + 15);
                    const incomeH = (monthlyData[m].income / maxVal) * chartHeight;
                    const expenseH = (monthlyData[m].expense / maxVal) * chartHeight;
                    const shortLabel = m.slice(5) + '.' + m.slice(2, 4);
                    return `
                        <rect x="${x}" y="${230 - incomeH}" width="${barWidth * 0.4}" height="${incomeH}" fill="#16a34a" rx="3"/>
                        <rect x="${x + barWidth * 0.5}" y="${230 - expenseH}" width="${barWidth * 0.4}" height="${expenseH}" fill="#dc2626" rx="3"/>
                        <text x="${x + barWidth / 2}" y="245" text-anchor="middle" font-size="9" fill="#7e22ce" font-weight="600">${shortLabel}</text>
                    `;
                }).join('')}
                <text x="100" y="12" font-size="11" fill="#16a34a" font-weight="700">📈 Доходы</text>
                <text x="200" y="12" font-size="11" fill="#dc2626" font-weight="700">📉 Расходы</text>
            </svg>
        </div>`;
    }
    
    if(hasMonths && hasCats) {
        html += `</div><div class="finance-chart-col">`;
    }
    
    if(hasCats) {
        const defaultColors = ['#7e22ce', '#a855f7', '#c084fc', '#d8b4fe', '#9333ea', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e'];
        let cumulativeAngle = 0;
        const sectors = catNames.slice(0, 7).map((name, i) => {
            const value = catTotals[name];
            const angle = (value / totalExpense) * 360;
            const startAngle = cumulativeAngle;
            cumulativeAngle += angle;
            const cat = financeData.categories.find(c => c.name === name);
            const color = (cat && cat.color) ? cat.color : defaultColors[i % defaultColors.length];
            return { name, value, angle, startAngle, color };
        });
        
        html += `<h3 class="finance-section-title">🥧 Расходы по категориям</h3>
        <div class="finance-donut-container">
            ${renderDonutChart(sectors, totalExpense, totalExpense.toLocaleString('ru-RU'), 'всего расходов')}
        </div>`;
    }
    
    if(hasMonths || hasCats) {
        html += `</div></div>`;
    }
    
    const limitHtml = financeData.categories
        .filter(c => c.limit > 0)
        .map(c => {
            const spent = filteredTransactions
                .filter(t => t.type === 'expense' && t.category === c.id)
                .reduce((s, t) => s + Math.abs(t.amount), 0);
            const pct = Math.min(100, (spent / c.limit) * 100);
            const catColor = c.color || '#7e22ce';
            const barColor = pct >= 100 ? '#b91c1c' : (pct > 80 ? '#dc2626' : (pct > 50 ? '#d97706' : catColor));
            
            let subcatsHtml = '';
            if(c.subcategories && c.subcategories.length > 0) {
                const subcatsWithSpending = c.subcategories.map(sc => {
                    const scSpent = filteredTransactions
                        .filter(t => t.type === 'expense' && t.category === c.id && t.subcategory === sc)
                        .reduce((s, t) => s + Math.abs(t.amount), 0);
                    const scLimit = c.subcategoryLimits && c.subcategoryLimits[sc] ? parseFloat(c.subcategoryLimits[sc]) : 0;
                    return { name: sc, spent: scSpent, limit: scLimit };
                });
                
                subcatsHtml = subcatsWithSpending.map(sc => {
                    const scPct = sc.limit > 0 ? Math.min(100, (sc.spent / sc.limit) * 100) : Math.min(100, (sc.spent / c.limit) * 100);
                    const scBarColor = scPct >= 100 ? '#b91c1c' : (scPct > 80 ? '#dc2626' : (scPct > 50 ? '#d97706' : catColor));
                    const limitDisplay = sc.limit > 0 ? `${Math.round(sc.spent).toLocaleString('ru-RU')} / ${sc.limit.toLocaleString('ru-RU')} ₽` : `${Math.round(sc.spent).toLocaleString('ru-RU')} ₽`;
                    return `<div class="finance-subcat-item">
                        <div class="finance-subcat-header">
                            <span class="finance-subcat-name">📂 ${sc.name}</span>
                            <span class="finance-subcat-value">${limitDisplay}</span>
                        </div>
                        <div class="finance-progress-sub"><div class="finance-progress-sub-fill" style="width:${scPct}%;background:${scBarColor};"></div></div>
                    </div>`;
                }).join('');
            }
            
            return `<div class="finance-limit-item">
                <div class="finance-limit-header">
                    <span class="finance-limit-name">${c.name}</span>
                    <span class="finance-limit-value">${Math.round(spent).toLocaleString('ru-RU')} / ${c.limit.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div class="finance-limit-bar">
                    <div class="finance-limit-fill" style="width:${pct}%;background:${barColor};"></div>
                </div>
                ${subcatsHtml}
            </div>`;
        }).join('');
    
    if(limitHtml) {
        html += `<h3 class="finance-section-title">🏷 Лимиты категорий</h3>
        <div class="finance-limits-container">${limitHtml}</div>`;
    }
    
    const savingsByGoal = {};
    financeData.savings.forEach(s => {
        if(!savingsByGoal[s.goal]) savingsByGoal[s.goal] = 0;
        savingsByGoal[s.goal] += s.amount;
    });
    
    const goalNames = Object.keys(savingsByGoal);
    if(goalNames.length > 0) {
        const goalHtml = goalNames.map(goal => {
            const total = savingsByGoal[goal];
            const signClass = total >= 0 ? 'positive' : 'negative';
            return `<div class="finance-goal-item">
                <span class="finance-goal-name">🎯 ${goal}</span>
                <span class="finance-goal-value ${signClass}">${total.toLocaleString('ru-RU')} ₽</span>
            </div>`;
        }).join('');
        
        html += `<h3 class="finance-section-title">🏦 Накопления по целям</h3>
        <div class="finance-savings-container">${goalHtml}</div>`;
    }
    
    // Add mandatory payments table for the selected month
    html += renderMandatoryDashboardTable(financeSelectedMonth);
    
    container.innerHTML = html;
    
    window.renderFinanceActivity();
}

window.renderFinanceActivity = function() {
    const streaks = document.getElementById('finance-streaks');
    if(streaks && typeof renderActivityStreaks === 'function') renderActivityStreaks(streaks, { only: ['finance'] });
    
    const heatmap = document.getElementById('finance-heatmap');
    if(heatmap && typeof renderActivityHeatmap === 'function') {
        renderActivityHeatmap(heatmap, 'finance', {
            onDayClick: date => window.activityNavigate('finance', date)
        });
    }
}

window.clearFinanceDateFilter = function() {
    window.financeSelectedDate = null;
    renderFinanceTransactions();
}

window.renderFinanceTransactions = function() {
    const container = document.getElementById('finance-transactions-list');
    updateFinanceStats();
    
    if(financeData.transactions.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">💸</div>
            <div class="empty-state-title">Нет операций</div>
            <div class="empty-state-text">Нажмите «➕ Добавить операцию» чтобы начать</div>
        </div>`;
        return;
    }
    
    let html = `<div class="finance-filter-row">
        <div class="finance-filter-group">
            <label class="finance-filter-label">Период</label>
            <select id="fin-filter-period" onchange="renderFinanceTransactions()" class="finance-filter-select">
                <option value="all">Все время</option>
                <option value="month">Этот месяц</option>
                <option value="3months">Последние 3 месяца</option>
            </select>
        </div>
        <div class="finance-filter-group">
            <label class="finance-filter-label">Тип</label>
            <select id="fin-filter-type" onchange="renderFinanceTransactions()" class="finance-filter-select">
                <option value="all">Все</option>
                <option value="income">📈 Доходы</option>
                <option value="expense">📉 Расходы</option>
            </select>
        </div>`;
    
    if(window.financeSelectedDate) {
        html += `<div class="finance-filter-group">
            <label class="finance-filter-label">Дата</label>
            <span class="finance-filter-chip">📅 ${window.financeSelectedDate} <button onclick="clearFinanceDateFilter()">✕</button></span>
        </div>`;
    }
    html += `</div>`;
    
    let filtered = [...financeData.transactions];
    
    if(window.financeSelectedDate) {
        filtered = filtered.filter(t => t.date === window.financeSelectedDate);
    }
    
    const period = document.getElementById('fin-filter-period')?.value || 'all';
    if(period === 'month') {
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        filtered = filtered.filter(t => t.date.startsWith(monthStart));
    } else if(period === '3months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const cutoff = threeMonthsAgo.toISOString().slice(0, 10);
        filtered = filtered.filter(t => t.date >= cutoff);
    }
    
    const typeFilter = document.getElementById('fin-filter-type')?.value || 'all';
    if(typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    
    if(filtered.length === 0) {
        container.innerHTML = html + `<div class="finance-no-data">Нет операций по выбранным фильтрам</div>`;
        return;
    }
    
    const totalInc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalExp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    
    html += `<div class="finance-summary-row">
        <div class="finance-summary-box finance-summary-income">
            📈 Доходы: <span class="finance-summary-value">${totalInc.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div class="finance-summary-box finance-summary-expense">
            📉 Расходы: <span class="finance-summary-value">${totalExp.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div class="finance-summary-box finance-summary-income">
            💵 Баланс: <span class="finance-summary-value ${totalInc - totalExp >= 0 ? 'positive' : 'negative'}">${(totalInc - totalExp).toLocaleString('ru-RU')} ₽</span>
        </div>
    </div>`;
    
    html += filtered.map(t => {
        const cat = financeData.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name : '—';
        const catColor = cat ? (cat.color || '#7e22ce') : '#7e22ce';
        const isExpense = t.type === 'expense';
        const typeIcon = isExpense ? '📉' : '📈';
        return `<div class="finance-transaction-item">
            <div class="finance-transaction-type ${isExpense ? 'expense' : 'income'}">${typeIcon}</div>
            <div class="finance-transaction-info">
                <div class="finance-transaction-amount ${isExpense ? 'expense' : 'income'}">${isExpense ? '−' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₽</div>
                <div class="finance-transaction-category" style="color:${catColor};">${catName}${t.subcategory ? ' › ' + t.subcategory : ''}</div>
                <div class="finance-transaction-date">${formatFinanceDate(t.date)}</div>
                ${t.comment ? `<div class="finance-transaction-comment">${t.comment}</div>` : ''}
            </div>
            ${isReadOnlyActive() ? '' : `
            <div class="finance-transaction-actions">
                <button class="action-btn edit" onclick="editFinanceTransaction('${t.id}')">✏️</button>
                <button class="action-btn delete" onclick="deleteFinanceItem('transaction','${t.id}')">🗑</button>
            </div>`}
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

window.renderFinanceSavings = function() {
    const container = document.getElementById('finance-savings-list');
    updateFinanceStats();
    
    if(financeData.savings.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🏦</div>
            <div class="empty-state-title">Нет накоплений</div>
            <div class="empty-state-text">Нажмите «➕ Добавить накопление»</div>
        </div>`;
        return;
    }
    
    const byGoal = {};
    financeData.savings.forEach(s => {
        if(!byGoal[s.goal]) byGoal[s.goal] = { entries: [], total: 0 };
        byGoal[s.goal].entries.push(s);
        byGoal[s.goal].total += s.amount;
    });
    
    let html = Object.keys(byGoal).map(goal => {
        const g = byGoal[goal];
        return `<div class="finance-savings-card">
            <div class="finance-savings-header">
                <span class="finance-savings-title">🎯 ${goal}</span>
                <span class="finance-savings-total">${g.total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div class="finance-savings-entries">
                ${g.entries.slice().reverse().map(e => `
                    <div class="finance-savings-entry">
                        <span style="color:#64748b;">${formatFinanceDate(e.date)}</span>
                        <span style="font-weight:600;color:${e.amount >= 0 ? '#16a34a' : '#dc2626'};">${e.amount >= 0 ? '+' : ''}${e.amount.toLocaleString('ru-RU')} ₽</span>
                        ${isReadOnlyActive() ? '' : `<button class="action-btn delete" onclick="deleteFinanceItem('savings','${e.id}')">🗑</button>`}
                    </div>
                `).join('')}
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

window.renderFinancePlanned = function() {
    const container = document.getElementById('finance-planned-list');
    
    if(financeData.planned.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <div class="empty-state-title">Нет планируемых расходов</div>
            <div class="empty-state-text">Нажмите «➕ Добавить планируемый расход»</div>
        </div>`;
        return;
    }
    
    const sorted = [...financeData.planned].sort((a, b) => a.date.localeCompare(b.date));
    
    container.innerHTML = sorted.map(p => {
        const cat = financeData.categories.find(c => c.id === p.category);
        const catName = cat ? cat.name : '—';
        return `<div class="finance-planned-item${p.done ? ' done' : ''}">
            <span class="finance-planned-date">${formatFinanceDate(p.date)}</span>
            <span class="finance-planned-amount">${p.amount.toLocaleString('ru-RU')} ₽</span>
            <div class="finance-planned-info">
                <span class="finance-planned-category" style="color:#7e22ce;">${catName}${p.subcategory ? ' › ' + p.subcategory : ''}</span>
            </div>
            <label class="finance-planned-done">
                <input type="checkbox" ${p.done ? 'checked' : ''} onchange="togglePlannedDone('${p.id}')">
                Выполнено
            </label>
            ${isReadOnlyActive() ? '' : `<button class="action-btn delete" onclick="deleteFinanceItem('planned','${p.id}')">🗑</button>`}
        </div>`;
    }).join('');
}

// ============================================
// 🔄 ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ
// ============================================

/**
 * Вычисляет дату платежа для обязательного платежа в заданном месяце
 * @param {Object} mp - mandatory payment object
 * @param {string} month - месяц в формате "YYYY-MM"
 * @returns {string|null} - дата в формате "YYYY-MM-DD" или null, если платежа нет в этом месяце
 */
window.calculateMandatoryDateInMonth = function(mp, month) {
    const [year, mon] = month.split('-').map(Number);
    
    if (mp.scheduleType === 'monthly') {
        // Ежемесячный платёж — просто день месяца
        const maxDay = new Date(year, mon, 0).getDate();
        const day = Math.min(mp.dayOfMonth || 1, maxDay);
        return `${month}-${String(day).padStart(2, '0')}`;
    } else if (mp.scheduleType === 'interval') {
        // Интервальный платёж — идём от startDate, прибавляя intervalDays
        const interval = mp.intervalDays || 30;
        const start = new Date(mp.startDate + 'T00:00:00');
        const monthStart = new Date(year, mon - 1, 1);
        const monthEnd = new Date(year, mon, 0, 23, 59, 59);
        
        let current = new Date(start);
        // Если startDate уже после месяца, идём назад
        if (current > monthEnd) {
            while (current > monthEnd) {
                current.setDate(current.getDate() - interval);
            }
            // Проверяем, попали ли в нужный месяц
            if (current >= monthStart && current <= monthEnd) {
                return current.toISOString().slice(0, 10);
            }
            return null;
        }
        
        // Идём вперёд от startDate
        while (current < monthStart) {
            current.setDate(current.getDate() + interval);
        }
        
        if (current >= monthStart && current <= monthEnd) {
            return current.toISOString().slice(0, 10);
        }
        return null;
    }
    return null;
}

/**
 * Проверяет, оплачен ли обязательный платёж в заданную дату
 * @param {Object} mp - mandatory payment object
 * @param {string} dateStr - дата в формате "YYYY-MM-DD"
 * @returns {boolean}
 */
window.isMandatoryPaymentPaid = function(mp, dateStr) {
    if (!dateStr) return false;
    
    const paymentDate = new Date(dateStr + 'T00:00:00');
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const dateFrom = new Date(paymentDate.getTime() - threeDaysMs);
    const dateTo = new Date(paymentDate.getTime() + threeDaysMs);
    
    // Ищем транзакцию с совпадающей категорией и суммой (с погрешностью ±10%)
    return financeData.transactions.some(t => {
        if (t.type !== 'expense') return false;
        if (t.category !== mp.category) return false;
        
        // Проверяем сумму с погрешностью ±10%
        const txnAmount = Math.abs(t.amount);
        const lowerBound = mp.amount * 0.9;
        const upperBound = mp.amount * 1.1;
        if (txnAmount < lowerBound || txnAmount > upperBound) return false;
        
        // Проверяем дату ±3 дня
        const txnDate = new Date(t.date + 'T00:00:00');
        return txnDate >= dateFrom && txnDate <= dateTo;
    });
}

/**
 * Рендерит таблицу обязательных платежей для дашборда
 * @param {string} month - месяц в формате "YYYY-MM" или "all"
 * @returns {string} HTML таблицы
 */
window.renderMandatoryDashboardTable = function(month) {
    const activePayments = financeData.mandatoryPayments.filter(mp => mp.active !== false);
    if (activePayments.length === 0) return '';
    
    // Определяем какой месяц показывать
    let targetMonth = month;
    if (!targetMonth || targetMonth === 'all') {
        const today = new Date();
        targetMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    
    const [year, mon] = targetMonth.split('-').map(Number);
    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const monthLabel = monthNames[mon - 1] + ' ' + year;
    
    // Собираем данные по каждому платежу
    const rows = [];
    activePayments.forEach(mp => {
        const dateStr = calculateMandatoryDateInMonth(mp, targetMonth);
        if (!dateStr) return; // Платежа нет в этом месяце
        
        const isPaid = isMandatoryPaymentPaid(mp, dateStr);
        const today = new Date();
        const paymentDate = new Date(dateStr + 'T00:00:00');
        const isOverdue = !isPaid && paymentDate < today;
        
        const cat = financeData.categories.find(c => c.id === mp.category);
        const catName = cat ? cat.name : '—';
        
        let statusIcon, statusText, statusClass;
        if (isPaid) {
            statusIcon = '✅';
            statusText = 'Оплачено';
            statusClass = 'mp-status-paid';
        } else if (isOverdue) {
            statusIcon = '🔴';
            statusText = 'Просрочено';
            statusClass = 'mp-status-overdue';
        } else {
            statusIcon = '⏳';
            statusText = 'Ожидается';
            statusClass = 'mp-status-pending';
        }
        
        rows.push({
            name: mp.name,
            amount: mp.amount,
            dateStr: dateStr,
            formattedDate: formatFinanceDate(dateStr),
            catName: catName,
            statusIcon,
            statusText,
            statusClass,
            isPaid
        });
    });
    
    if (rows.length === 0) return '';
    
    // Сортируем по дате
    rows.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    const paidAmount = rows.filter(r => r.isPaid).reduce((s, r) => s + r.amount, 0);
    
    let tableHtml = `
    <h3 class="finance-section-title">🔄 Обязательные платежи на ${monthLabel}</h3>
    <div class="finance-mandatory-summary">
        <span>💳 Всего: <strong>${totalAmount.toLocaleString('ru-RU')} ₽</strong></span>
        <span>✅ Оплачено: <strong>${paidAmount.toLocaleString('ru-RU')} ₽</strong></span>
        <span>⏳ Осталось: <strong>${(totalAmount - paidAmount).toLocaleString('ru-RU')} ₽</strong></span>
    </div>
    <div class="finance-mandatory-table">
        <div class="finance-mandatory-header">
            <span class="fm-col-name">Название</span>
            <span class="fm-col-amount">Сумма</span>
            <span class="fm-col-date">Дата</span>
            <span class="fm-col-cat">Категория</span>
            <span class="fm-col-status">Статус</span>
        </div>`;
    
    tableHtml += rows.map(r => `
        <div class="finance-mandatory-row">
            <span class="fm-col-name">${r.name}</span>
            <span class="fm-col-amount">${r.amount.toLocaleString('ru-RU')} ₽</span>
            <span class="fm-col-date">${r.formattedDate}</span>
            <span class="fm-col-cat">${r.catName}</span>
            <span class="fm-col-status ${r.statusClass}">${r.statusIcon} ${r.statusText}</span>
        </div>
    `).join('');
    
    tableHtml += `</div>`;
    
    return tableHtml;
}

window.renderFinanceMandatory = function() {
    const container = document.getElementById('finance-mandatory-list');
    
    if (financeData.mandatoryPayments.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🔄</div>
            <div class="empty-state-title">Нет обязательных платежей</div>
            <div class="empty-state-text">Нажмите «➕ Добавить обязательный платёж» чтобы настроить регулярные платежи</div>
        </div>`;
        return;
    }
    
    let html = `<div class="finance-mandatory-settings">`;
    
    financeData.mandatoryPayments.forEach(mp => {
        const cat = financeData.categories.find(c => c.id === mp.category);
        const catName = cat ? cat.name : '—';
        const scheduleText = mp.scheduleType === 'monthly'
            ? `📅 Ежемесячно, ${mp.dayOfMonth}-го числа`
            : `🔄 Каждые ${mp.intervalDays} дней (с ${formatFinanceDate(mp.startDate)})`;
        const activeClass = mp.active !== false ? '' : ' inactive';
        
        html += `<div class="finance-mandatory-card${activeClass}">
            <div class="finance-mandatory-card-header">
                <span class="finance-mandatory-card-name">${mp.name}</span>
                <span class="finance-mandatory-card-amount">${mp.amount.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div class="finance-mandatory-card-info">
                <span style="color:#7e22ce;">${catName}${mp.subcategory ? ' › ' + mp.subcategory : ''}</span>
                <span style="color:#64748b;font-size:12px;">${scheduleText}</span>
            </div>
            ${isReadOnlyActive() ? '' : `
            <div class="finance-mandatory-card-actions">
                <button class="action-btn edit" onclick="editMandatoryPayment('${mp.id}')">✏️</button>
                <button class="action-btn delete" onclick="deleteFinanceItem('mandatory','${mp.id}')">🗑</button>
            </div>`}
        </div>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

window.renderFinanceCategories = function() {
    const container = document.getElementById('finance-categories-list');
    
    if(financeData.categories.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🏷</div>
            <div class="empty-state-title">Нет категорий</div>
            <div class="empty-state-text">Создайте категории расходов и установите лимиты</div>
        </div>`;
        return;
    }
    
    container.innerHTML = financeData.categories.map(c => {
        const typeLabel = c.type === 'expense' ? '📉 Расход' : '📈 Доход';
        const limitDisplay = c.limit > 0 ? `${c.limit.toLocaleString('ru-RU')} ₽` : 'Без лимита';
        const catColor = c.color || '#7e22ce';
        const subcats = c.subcategories || [];
        const subcatsHtml = subcats.length > 0 
            ? subcats.map(sc => `<span class="subcat-tag" style="margin:2px;">${sc}</span>`).join('')
            : '<span style="color:#94a3b8;font-size:11px;">Нет подкатегорий</span>';
        return `<div class="finance-category-card" style="border-left:4px solid ${catColor};">
            <div class="finance-category-header">
                <div>
                    <span class="finance-category-name" style="color:${catColor};">${c.name}</span>
                    <span class="finance-category-type">${typeLabel}</span>
                </div>
                <div class="finance-category-actions">
                    <span class="finance-category-limit">💰 ${limitDisplay}</span>
                    ${isReadOnlyActive() ? '' : `
                    <button class="action-btn edit" onclick="openCategoryModal('${c.id}')">✏️</button>
                    <button class="action-btn delete" onclick="deleteFinanceItem('category','${c.id}')">🗑</button>`}
                </div>
            </div>
            <div class="finance-subcategory-list">${subcatsHtml}</div>
        </div>`;
    }).join('');
}