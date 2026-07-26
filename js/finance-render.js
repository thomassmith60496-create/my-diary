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
    else if(tab.includes('Категории')) renderFinanceCategories();
}

window.renderFinanceDashboard = function() {
    const container = document.getElementById('finance-dashboard-content');
    updateFinanceStats();
    
    if(financeData.transactions.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">💰</div>
            <div class="empty-state-title">Дашборд финансов</div>
            <div class="empty-state-text">Добавьте операции чтобы увидеть аналитику</div>
        </div>`;
        return;
    }
    
    const monthSelect = document.getElementById('fin-month-select');
    const allMonthsSet = new Set();
    financeData.transactions.forEach(t => {
        const m = t.date.slice(0, 7);
        allMonthsSet.add(m);
    });
    const sortedMonths = Array.from(allMonthsSet).sort();
    
    // Save currently selected value from the DOM before rebuilding options
    const previouslySelected = monthSelect.value || financeSelectedMonth || '';
    
    monthSelect.innerHTML = '<option value="all">📊 Все месяцы (накопительно)</option>' +
        sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
            const label = `${monthNames[parseInt(mo) - 1]} ${y}`;
            return `<option value="${m}">${label}</option>`;
        }).join('');
    
    // Determine which month to select:
    // 1. "all" — always valid (Все месяцы)
    // 2. If a specific month was previously selected, restore it
    // 3. Otherwise, default to current month if it has data
    // 4. Otherwise, default to most recent month with data
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (previouslySelected === 'all') {
        monthSelect.value = 'all';
    } else if (previouslySelected && previouslySelected !== '' && allMonthsSet.has(previouslySelected)) {
        monthSelect.value = previouslySelected;
    } else if(allMonthsSet.has(currentMonth)) {
        monthSelect.value = currentMonth;
    } else if(sortedMonths.length > 0) {
        monthSelect.value = sortedMonths[sortedMonths.length - 1];
    }
    financeSelectedMonth = monthSelect.value;
    
    let filteredTransactions = [...financeData.transactions];
    if(financeSelectedMonth !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.date.startsWith(financeSelectedMonth));
    }
    if(filteredTransactions.length === 0) {
        container.innerHTML = `<div class="empty-state">
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
        const colors = ['#7e22ce', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff'];
        let cumulativeAngle = 0;
        const sectors = catNames.slice(0, 7).map((name, i) => {
            const value = catTotals[name];
            const angle = (value / totalExpense) * 360;
            const startAngle = cumulativeAngle;
            cumulativeAngle += angle;
            return { name, value, angle, startAngle, color: colors[i % colors.length] };
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
            const barColor = pct >= 100 ? '#b91c1c' : (pct > 80 ? '#dc2626' : (pct > 50 ? '#d97706' : '#16a34a'));
            
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
                    const scPct = sc.limit > 0 ? Math.min(100, (sc.spent / sc.limit) * 100) : 0;
                    const scBarColor = scPct >= 100 ? '#b91c1c' : (scPct > 80 ? '#dc2626' : (scPct > 50 ? '#d97706' : '#16a34a'));
                    const limitDisplay = sc.limit > 0 ? `${Math.round(sc.spent).toLocaleString('ru-RU')} / ${sc.limit.toLocaleString('ru-RU')} ₽` : `${Math.round(sc.spent).toLocaleString('ru-RU')} ₽`;
                    const barHtml = sc.limit > 0 ? `<div class="finance-progress-sub"><div class="finance-progress-sub-fill" style="width:${scPct}%;background:${scBarColor};"></div></div>` : '';
                    return `<div class="finance-subcat-item">
                        <div style="flex:1;min-width:0;">
                            <span class="finance-subcat-name">📂 ${sc.name}</span>
                            <span class="finance-subcat-value">${limitDisplay}</span>
                        </div>
                        ${barHtml}
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
    
    container.innerHTML = html;
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
        </div>
    </div>`;
    
    let filtered = [...financeData.transactions];
    
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
            💵 Баланс: <span class="finance-summary-value" style="color:${totalInc - totalExp >= 0 ? '#16a34a' : '#dc2626'};">${(totalInc - totalExp).toLocaleString('ru-RU')} ₽</span>
        </div>
    </div>`;
    
    html += filtered.map(t => {
        const cat = financeData.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name : '—';
        const catColor = cat ? (cat.color || '#7e22ce') : '#7e22ce';
        const isExpense = t.type === 'expense';
        return `<div class="finance-transaction-item">
            <span class="finance-transaction-date">${formatFinanceDate(t.date)}</span>
            <span class="finance-transaction-amount ${isExpense ? 'expense' : 'income'}">${isExpense ? '−' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₽</span>
            <span class="finance-transaction-category" style="color:${catColor};">${catName}${t.subcategory ? ' › ' + t.subcategory : ''}</span>
            <span class="finance-transaction-comment">${t.comment || ''}</span>
            ${isReadOnlyActive() ? '' : `
            <button class="action-btn edit" onclick="editFinanceTransaction('${t.id}')">✏️</button>
            <button class="action-btn delete" onclick="deleteFinanceItem('transaction','${t.id}')">🗑</button>`}
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
            <span class="finance-transaction-date">${formatFinanceDate(p.date)}</span>
            <span class="finance-transaction-amount expense">${p.amount.toLocaleString('ru-RU')} ₽</span>
            <span class="finance-transaction-category" style="color:#7e22ce;">${catName}${p.subcategory ? ' › ' + p.subcategory : ''}</span>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin-left:auto;">
                <input type="checkbox" ${p.done ? 'checked' : ''} onchange="togglePlannedDone('${p.id}')">
                Выполнено
            </label>
            ${isReadOnlyActive() ? '' : `<button class="action-btn delete" onclick="deleteFinanceItem('planned','${p.id}')">🗑</button>`}
        </div>`;
    }).join('');
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
        const subcatsHtml = c.subcategories.length > 0 
            ? c.subcategories.map(sc => `<span class="subcat-tag" style="margin:2px;">${sc}</span>`).join('')
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
