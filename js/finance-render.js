// ============================================
// 💰 FINANCE RENDER FUNCTIONS
// ============================================

function updateFinanceStats() {
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

function renderCurrentFinanceTab() {
    const activeTab = document.querySelector('#main-tab-finance .sub-tab-btn.active');
    if(!activeTab) return;
    const tab = activeTab.textContent.trim();
    if(tab.includes('Дашборд')) renderFinanceDashboard();
    else if(tab.includes('Операции')) renderFinanceTransactions();
    else if(tab.includes('Накопления')) renderFinanceSavings();
    else if(tab.includes('Планируемые')) renderFinancePlanned();
    else if(tab.includes('Категории')) renderFinanceCategories();
}

function renderFinanceDashboard() {
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
    const currentMonthValue = monthSelect.value;
    monthSelect.innerHTML = '<option value="all">📊 Все месяцы (накопительно)</option>' +
        sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
            const label = `${monthNames[parseInt(mo) - 1]} ${y}`;
            return `<option value="${m}">${label}</option>`;
        }).join('');
    if(currentMonthValue && (currentMonthValue === 'all' || allMonthsSet.has(currentMonthValue))) {
        monthSelect.value = currentMonthValue;
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
        html += `<div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:300px;">`;
    }
    
    if(hasMonths) {
        const maxVal = Math.max(...months.map(m => Math.max(monthlyData[m].income, monthlyData[m].expense)));
        const chartHeight = 200;
        const totalBarsWidth = months.length * 80;
        const svgWidth = Math.max(400, totalBarsWidth);
        const offsetX = months.length === 1 ? (svgWidth - 80) / 2 : 50;
        
        html += `<h3 style="color:#7e22ce;margin:0 0 12px;font-size:15px;">📊 Доходы / Расходы по месяцам</h3>
        <div class="dashboard-chart" style="background:#faf5ff;border-color:#e9d5ff;">
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
        html += `</div><div style="flex:1;min-width:300px;">`;
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
        
        html += `<h3 style="color:#7e22ce;margin:0 0 12px;font-size:15px;">🥧 Расходы по категориям</h3>
        <div class="dashboard-chart" style="background:#faf5ff;border-color:#e9d5ff;display:flex;flex-wrap:wrap;gap:20px;align-items:center;min-height:260px;">
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
            const barColor = pct > 90 ? '#dc2626' : (pct > 70 ? '#d97706' : '#16a34a');
            
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
                    const scBarColor = scPct > 90 ? '#dc2626' : (scPct > 70 ? '#d97706' : '#a855f7');
                    const limitDisplay = sc.limit > 0 ? `${Math.round(sc.spent).toLocaleString('ru-RU')} / ${sc.limit.toLocaleString('ru-RU')} ₽` : `${Math.round(sc.spent).toLocaleString('ru-RU')} ₽`;
                    const barHtml = sc.limit > 0 ? `<div style="height:6px;background:#f3e8ff;border-radius:3px;overflow:hidden;margin-top:2px;">
                        <div style="height:100%;width:${scPct}%;background:${scBarColor};border-radius:3px;transition:width 0.3s;"></div>
                    </div>` : '';
                    return `<div style="padding:4px 0 2px 12px;font-size:11px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:#a855f7;">📂 ${sc.name}</span>
                            <span style="color:#64748b;font-weight:600;">${limitDisplay}</span>
                        </div>
                        ${barHtml}
                    </div>`;
                }).join('');
            }
            
            return `<div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                    <span style="font-weight:600;color:#7e22ce;">${c.name}</span>
                    <span style="color:#334155;">${Math.round(spent).toLocaleString('ru-RU')} / ${c.limit.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div style="height:8px;background:#e9d5ff;border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.3s;"></div>
                </div>
                ${subcatsHtml}
            </div>`;
        }).join('');
    
    if(limitHtml) {
        html += `<h3 style="color:#7e22ce;margin:16px 0 12px;font-size:15px;">🏷 Лимиты категорий</h3>
        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;">${limitHtml}</div>`;
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
            const sign = total >= 0 ? 'green' : 'red';
            return `<div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:8px;border:1px solid #e9d5ff;">
                <span style="font-weight:600;color:#7e22ce;">🎯 ${goal}</span>
                <span style="font-weight:700;color:${sign === 'green' ? '#16a34a' : '#dc2626'};">${total.toLocaleString('ru-RU')} ₽</span>
            </div>`;
        }).join('');
        
        html += `<h3 style="color:#7e22ce;margin:16px 0 12px;font-size:15px;">🏦 Накопления по целям</h3>
        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;">${goalHtml}</div>`;
    }
    
    container.innerHTML = html;
}

function renderFinanceTransactions() {
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
    
    let html = `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:150px;">
            <label style="font-size:11px;font-weight:700;color:#7e22ce;display:block;margin-bottom:2px;">Период</label>
            <select id="fin-filter-period" onchange="renderFinanceTransactions()" style="width:100%;padding:6px 8px;border:1px solid #d8b4fe;border-radius:6px;font-size:12px;font-family:inherit;background:#faf5ff;">
                <option value="all">Все время</option>
                <option value="month">Этот месяц</option>
                <option value="3months">Последние 3 месяца</option>
            </select>
        </div>
        <div style="flex:1;min-width:150px;">
            <label style="font-size:11px;font-weight:700;color:#7e22ce;display:block;margin-bottom:2px;">Тип</label>
            <select id="fin-filter-type" onchange="renderFinanceTransactions()" style="width:100%;padding:6px 8px;border:1px solid #d8b4fe;border-radius:6px;font-size:12px;font-family:inherit;background:#faf5ff;">
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
        container.innerHTML = html + `<div style="text-align:center;padding:30px;color:#7e22ce;">Нет операций по выбранным фильтрам</div>`;
        return;
    }
    
    const totalInc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalExp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    
    html += `<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="background:#f0fdf4;padding:8px 14px;border-radius:8px;border:1px solid #bbf7d0;font-size:13px;font-weight:600;">
            📈 Доходы: <span style="color:#16a34a;">${totalInc.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div style="background:#fef2f2;padding:8px 14px;border-radius:8px;border:1px solid #fecaca;font-size:13px;font-weight:600;">
            📉 Расходы: <span style="color:#dc2626;">${totalExp.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div style="background:#f0fdf4;padding:8px 14px;border-radius:8px;border:1px solid #bbf7d0;font-size:13px;font-weight:600;">
            💵 Баланс: <span style="color:${totalInc - totalExp >= 0 ? '#16a34a' : '#dc2626'};">${(totalInc - totalExp).toLocaleString('ru-RU')} ₽</span>
        </div>
    </div>`;
    
    html += filtered.map(t => {
        const cat = financeData.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name : '—';
        const isExpense = t.type === 'expense';
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:white;border-radius:8px;border:1px solid #e9d5ff;margin-bottom:6px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:600;color:#64748b;min-width:70px;">${formatFinanceDate(t.date)}</span>
            <span style="font-size:13px;font-weight:700;color:${isExpense ? '#dc2626' : '#16a34a'};min-width:80px;">${isExpense ? '−' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₽</span>
            <span style="font-size:12px;color:#7e22ce;font-weight:600;min-width:100px;">${catName}${t.subcategory ? ' › ' + t.subcategory : ''}</span>
            <span style="font-size:11px;color:#94a3b8;flex:1;">${t.comment || ''}</span>
            <button class="action-btn edit" onclick="editFinanceTransaction('${t.id}')" style="padding:3px 8px;font-size:11px;">✏️</button>
            <button class="action-btn delete" onclick="deleteFinanceItem('transaction','${t.id}')" style="padding:3px 8px;font-size:11px;">🗑</button>
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

function renderFinanceSavings() {
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
        return `<div style="background:white;border-radius:10px;border:1px solid #e9d5ff;margin-bottom:12px;overflow:hidden;">
            <div style="padding:10px 14px;background:#faf5ff;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9d5ff;">
                <span style="font-weight:700;color:#7e22ce;">🎯 ${goal}</span>
                <span style="font-weight:700;color:#16a34a;">${g.total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div style="padding:8px 14px;">
                ${g.entries.slice().reverse().map(e => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px dashed #f3e8ff;font-size:13px;">
                        <span style="color:#64748b;">${formatFinanceDate(e.date)}</span>
                        <span style="font-weight:600;color:${e.amount >= 0 ? '#16a34a' : '#dc2626'};">${e.amount >= 0 ? '+' : ''}${e.amount.toLocaleString('ru-RU')} ₽</span>
                        <button class="action-btn delete" onclick="deleteFinanceItem('savings','${e.id}')" style="padding:2px 6px;font-size:10px;">🗑</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

function renderFinancePlanned() {
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
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:white;border-radius:8px;border:1px solid #e9d5ff;margin-bottom:6px;flex-wrap:wrap;${p.done ? 'opacity:0.6;' : ''}">
            <span style="font-size:12px;font-weight:600;color:#64748b;min-width:70px;">${formatFinanceDate(p.date)}</span>
            <span style="font-size:13px;font-weight:700;color:#dc2626;min-width:80px;">${p.amount.toLocaleString('ru-RU')} ₽</span>
            <span style="font-size:12px;color:#7e22ce;font-weight:600;min-width:100px;">${catName}${p.subcategory ? ' › ' + p.subcategory : ''}</span>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin-left:auto;">
                <input type="checkbox" ${p.done ? 'checked' : ''} onchange="togglePlannedDone('${p.id}')" style="width:16px;height:16px;cursor:pointer;">
                Выполнено
            </label>
            <button class="action-btn delete" onclick="deleteFinanceItem('planned','${p.id}')" style="padding:3px 8px;font-size:11px;">🗑</button>
        </div>`;
    }).join('');
}

function renderFinanceCategories() {
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
        const subcatsHtml = c.subcategories.length > 0 
            ? c.subcategories.map(sc => `<span class="subcat-tag" style="margin:2px;">${sc}</span>`).join('')
            : '<span style="color:#94a3b8;font-size:11px;">Нет подкатегорий</span>';
        return `<div style="background:white;border-radius:10px;border:1px solid #e9d5ff;padding:12px 14px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
                <div>
                    <span style="font-weight:700;color:#7e22ce;">${c.name}</span>
                    <span style="font-size:11px;color:#94a3b8;margin-left:6px;">${typeLabel}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:12px;font-weight:600;color:#065f46;">💰 ${limitDisplay}</span>
                    <button class="action-btn edit" onclick="openCategoryModal('${c.id}')" style="padding:2px 8px;font-size:11px;">✏️</button>
                    <button class="action-btn delete" onclick="deleteFinanceItem('category','${c.id}')" style="padding:2px 8px;font-size:11px;">🗑</button>
                </div>
            </div>
            <div>${subcatsHtml}</div>
        </div>`;
    }).join('');
}