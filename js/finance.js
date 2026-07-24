// ============================================
// 💰 FINANCE MODULE FUNCTIONS
// ============================================

// --- MODAL OPENERS ---

function openFinanceModal() {
    document.getElementById('f-fin-date').value = new Date().toISOString().slice(0,10);
    document.getElementById('f-fin-amount').value = '';
    document.getElementById('f-fin-comment').value = '';
    document.getElementById('f-fin-type').value = 'expense';
    document.getElementById('finance-modal-title').textContent = '➕ Добавить операцию';
    updateFinanceCategoryOptions();
    document.getElementById('finance-modal').classList.add('visible');
}

function openSavingsModal() {
    document.getElementById('f-sav-date').value = new Date().toISOString().slice(0,10);
    document.getElementById('f-sav-amount').value = '';
    document.getElementById('f-sav-goal').value = 'Отпуск';
    document.getElementById('f-sav-goal-custom-wrap').style.display = 'none';
    document.getElementById('f-sav-goal-custom').value = '';
    document.getElementById('savings-modal').classList.add('visible');
}

function openPlannedModal() {
    document.getElementById('f-plan-date').value = new Date().toISOString().slice(0,10);
    document.getElementById('f-plan-amount').value = '';
    document.getElementById('f-plan-done').value = 'false';
    updatePlanCategoryOptions();
    document.getElementById('planned-modal').classList.add('visible');
}

function openCategoryModal(catId) {
    if(catId) {
        const cat = financeData.categories.find(c => c.id === catId);
        if(!cat) return;
        document.getElementById('category-modal-title').textContent = '✏️ Редактировать категорию';
        document.getElementById('f-cat-name').value = cat.name;
        document.getElementById('f-cat-type').value = cat.type || 'expense';
        document.getElementById('f-cat-limit').value = cat.limit;
        window._editingCategoryId = catId;
    } else {
        document.getElementById('category-modal-title').textContent = '🏷 Добавить категорию';
        document.getElementById('f-cat-name').value = '';
        document.getElementById('f-cat-limit').value = '';
        window._editingCategoryId = null;
    }
    document.getElementById('f-cat-new-subcat').value = '';
    const container = document.getElementById('f-cat-subcats-container');
    if(catId && financeData.categories.find(c => c.id === catId)) {
        const cat = financeData.categories.find(c => c.id === catId);
        window._editingSubcategories = [...cat.subcategories];
        window._editingSubcategoryLimits = Object.assign({}, cat.subcategoryLimits || {});
    } else {
        window._editingSubcategories = [];
        window._editingSubcategoryLimits = {};
    }
    renderSubcategoryTags();
    document.getElementById('category-modal').classList.add('visible');
}

// Bind the goal select to show/hide custom field
document.addEventListener('change', function(e) {
    if(e.target && e.target.id === 'f-sav-goal') {
        document.getElementById('f-sav-goal-custom-wrap').style.display =
            e.target.value === 'other' ? 'block' : 'none';
    }
});

// --- CATEGORY HELPERS ---

function updateFinanceCategoryOptions() {
    const typeSelect = document.getElementById('f-fin-type');
    const catSelect = document.getElementById('f-fin-category');
    const type = typeSelect.value;
    let cats = financeData.categories.filter(c => c.type === type);
    
    if(cats.length === 0 && type === 'income') {
        const incomeCats = ['Зарплата', 'Фриланс', 'Кэшбэк', 'Прочие доходы'];
        incomeCats.forEach(name => {
            if(!financeData.categories.find(c => c.name === name)) {
                financeData.categories.push({
                    id: 'cat-' + name.toLowerCase().replace(/\s/g, ''),
                    name: name,
                    type: 'income',
                    limit: 0,
                    subcategories: [],
                    subcategoryLimits: {}
                });
            }
        });
        cats = financeData.categories.filter(c => c.type === 'income');
    }
    
    catSelect.innerHTML = '<option value="">— выбрать —</option>' +
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    updateFinanceSubcategoryOptions();
}

function updateFinanceSubcategoryOptions() {
    const catId = document.getElementById('f-fin-category').value;
    const subSelect = document.getElementById('f-fin-subcategory');
    const cat = financeData.categories.find(c => c.id === catId);
    if(cat && cat.subcategories && cat.subcategories.length > 0) {
        subSelect.innerHTML = '<option value="">— выбрать —</option>' +
            cat.subcategories.map(sc => `<option value="${sc}">${sc}</option>`).join('');
    } else {
        subSelect.innerHTML = '<option value="">— (нет подкатегорий) —</option>';
    }
}

function updatePlanCategoryOptions() {
    const catSelect = document.getElementById('f-plan-category');
    const expenseCats = financeData.categories.filter(c => c.type === 'expense');
    catSelect.innerHTML = '<option value="">— выбрать —</option>' +
        expenseCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    updatePlanSubcategoryOptions();
}

function updatePlanSubcategoryOptions() {
    const catId = document.getElementById('f-plan-category').value;
    const subSelect = document.getElementById('f-plan-subcategory');
    const cat = financeData.categories.find(c => c.id === catId);
    if(cat && cat.subcategories && cat.subcategories.length > 0) {
        subSelect.innerHTML = '<option value="">— выбрать —</option>' +
            cat.subcategories.map(sc => `<option value="${sc}">${sc}</option>`).join('');
    } else {
        subSelect.innerHTML = '<option value="">— (нет подкатегорий) —</option>';
    }
}

// --- SUBCATEGORY TAG MANAGEMENT ---

function addSubcategoryTag() {
    const input = document.getElementById('f-cat-new-subcat');
    const val = input.value.trim();
    if(!val) return;
    if(!window._editingSubcategories) window._editingSubcategories = [];
    if(window._editingSubcategories.includes(val)) { alert('Такая подкатегория уже есть'); return; }
    window._editingSubcategories.push(val);
    input.value = '';
    renderSubcategoryTags();
}

function removeSubcategoryTag(el, idx) {
    if(window._editingSubcategories) {
        window._editingSubcategories.splice(idx, 1);
        renderSubcategoryTags();
    }
}

function renderSubcategoryTags() {
    const container = document.getElementById('f-cat-subcats-container');
    if(!window._editingSubcategories) window._editingSubcategories = [];
    if(!window._editingSubcategoryLimits) window._editingSubcategoryLimits = {};
    container.innerHTML = window._editingSubcategories.map((sc, i) => {
        const limitVal = window._editingSubcategoryLimits[sc] || '';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
            <span class="subcat-tag" style="margin:0;">${sc}</span>
            <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:120px;">
                <label style="font-size:11px;color:#7e22ce;font-weight:600;white-space:nowrap;">Лимит:</label>
                <input type="number" step="0.01" min="0" value="${limitVal}"
                    onchange="updateSubcategoryLimit(this, '${sc.replace(/'/g, "\\'")}')"
                    style="width:100%;padding:4px 8px;border:1px solid #d8b4fe;border-radius:4px;font-size:12px;background:white;font-family:inherit;">
            </div>
            <span class="remove-subcat" onclick="removeSubcategoryTag(this, ${i})" style="cursor:pointer;font-weight:700;color:#a855f7;font-size:14px;">✕</span>
        </div>`;
    }).join('');
}

function updateSubcategoryLimit(input, subcatName) {
    if(!window._editingSubcategoryLimits) window._editingSubcategoryLimits = {};
    window._editingSubcategoryLimits[subcatName] = input.value;
}

// --- PARSE FORMULA ---

function parseAmountFormula(val) {
    if(typeof val === 'string' && val.trim().startsWith('=')) {
        try {
            const expr = val.trim().substring(1);
            // Safe math parser — only allows +, -, *, /, parentheses, numbers, and decimals
            const sanitized = expr.replace(/[^0-9+\-*/().,\s]/g, '').replace(',', '.');
            const result = safeEval(sanitized);
            if(typeof result === 'number' && isFinite(result) && result > 0) {
                return Math.round(result * 100) / 100;
            }
        } catch(e) {}
    }
    return parseFloat(val);
}

function safeEval(expr) {
    // Simple recursive descent parser for basic arithmetic
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/().])/g) || [];
    let pos = 0;
    
    function peek() { return tokens[pos] || ''; }
    function consume() { return tokens[pos++]; }
    
    function parseAddSub() {
        let left = parseMulDiv();
        while (peek() === '+' || peek() === '-') {
            const op = consume();
            const right = parseMulDiv();
            if (op === '+') left += right;
            else left -= right;
        }
        return left;
    }
    
    function parseMulDiv() {
        let left = parsePrimary();
        while (peek() === '*' || peek() === '/') {
            const op = consume();
            const right = parsePrimary();
            if (op === '*') left *= right;
            else if (right === 0) throw new Error('Division by zero');
            else left /= right;
        }
        return left;
    }
    
    function parsePrimary() {
        if (peek() === '(') {
            consume(); // '('
            const val = parseAddSub();
            if (peek() === ')') consume(); // ')'
            return val;
        }
        if (peek() === '-') {
            consume();
            return -parsePrimary();
        }
        const num = parseFloat(consume());
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
    }
    
    return parseAddSub();
}

// --- SAVE FUNCTIONS ---

function saveFinanceTransaction() {
    const date = document.getElementById('f-fin-date').value;
    const amountRaw = document.getElementById('f-fin-amount').value;
    const amount = parseAmountFormula(amountRaw);
    const type = document.getElementById('f-fin-type').value;
    const catId = document.getElementById('f-fin-category').value;
    const subcat = document.getElementById('f-fin-subcategory').value;
    const comment = document.getElementById('f-fin-comment').value.trim();
    
    if(!date) { alert('Укажите дату'); return; }
    if(!amount || amount <= 0) { alert('Укажите сумму'); return; }
    
    const txn = {
        id: 'txn-' + Date.now(),
        date,
        type,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category: catId,
        subcategory: subcat,
        comment,
        createdAt: Date.now()
    };
    
    financeData.transactions.push(txn);
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    updateFinanceStats();
    alert('✅ Операция сохранена');
}

function saveSavingsEntry() {
    const date = document.getElementById('f-sav-date').value;
    const amount = parseFloat(document.getElementById('f-sav-amount').value);
    let goal = document.getElementById('f-sav-goal').value;
    
    if(!date) { alert('Укажите дату'); return; }
    if(!amount || amount === 0) { alert('Укажите сумму'); return; }
    if(goal === 'other') {
        goal = document.getElementById('f-sav-goal-custom').value.trim();
        if(!goal) { alert('Введите название цели'); return; }
    }
    
    const entry = {
        id: 'sav-' + Date.now(),
        date,
        amount,
        goal,
        createdAt: Date.now()
    };
    
    financeData.savings.push(entry);
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    updateFinanceStats();
    alert('✅ Накопление сохранено');
}

function savePlannedEntry() {
    const date = document.getElementById('f-plan-date').value;
    const amount = parseFloat(document.getElementById('f-plan-amount').value);
    const catId = document.getElementById('f-plan-category').value;
    const subcat = document.getElementById('f-plan-subcategory').value;
    const done = document.getElementById('f-plan-done').value === 'true';
    
    if(!date) { alert('Укажите дату'); return; }
    if(!amount || amount <= 0) { alert('Укажите сумму'); return; }
    if(!catId) { alert('Укажите категорию'); return; }
    
    const entry = {
        id: 'plan-' + Date.now(),
        date,
        amount,
        category: catId,
        subcategory: subcat,
        done,
        createdAt: Date.now()
    };
    
    financeData.planned.push(entry);
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    alert('✅ Планируемый расход сохранён');
}

function saveCategory() {
    const name = document.getElementById('f-cat-name').value.trim();
    const type = document.getElementById('f-cat-type').value;
    const limit = parseFloat(document.getElementById('f-cat-limit').value) || 0;
    
    if(!name) { alert('Введите название категории'); return; }
    
    const subcategories = window._editingSubcategories || [];
    const subcategoryLimits = window._editingSubcategoryLimits || {};
    
    if(limit > 0) {
        for(const [scName, scLimit] of Object.entries(subcategoryLimits)) {
            if(scLimit && parseFloat(scLimit) > limit) {
                alert(`Лимит подкатегории "${scName}" (${parseFloat(scLimit)} ₽) превышает лимит категории (${limit} ₽)`);
                return;
            }
        }
    }
    
    if(window._editingCategoryId) {
        const cat = financeData.categories.find(c => c.id === window._editingCategoryId);
        if(cat) {
            cat.name = name;
            cat.type = type;
            cat.limit = limit;
            cat.subcategories = subcategories;
            cat.subcategoryLimits = subcategoryLimits;
        }
    } else {
        if(financeData.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert('Такая категория уже существует');
            return;
        }
        financeData.categories.push({
            id: 'cat-' + Date.now(),
            name,
            type,
            limit,
            subcategories,
            subcategoryLimits
        });
    }
    
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    alert('✅ Категория сохранена');
}

function deleteFinanceItem(type, id) {
    if(!confirm('Удалить эту запись?')) return;
    if(type === 'transaction') {
        financeData.transactions = financeData.transactions.filter(t => t.id !== id);
    } else if(type === 'savings') {
        financeData.savings = financeData.savings.filter(s => s.id !== id);
    } else if(type === 'planned') {
        financeData.planned = financeData.planned.filter(p => p.id !== id);
    } else if(type === 'category') {
        financeData.transactions.forEach(t => { if(t.category === id) t.category = ''; });
        financeData.planned.forEach(p => { if(p.category === id) p.category = ''; });
        financeData.categories = financeData.categories.filter(c => c.id !== id);
    }
    saveFinance();
    renderCurrentFinanceTab();
    updateFinanceStats();
}

function editFinanceTransaction(id) {
    const t = financeData.transactions.find(x => x.id === id);
    if(!t) return;
    
    document.getElementById('f-fin-date').value = t.date;
    document.getElementById('f-fin-amount').value = Math.abs(t.amount);
    document.getElementById('f-fin-type').value = t.type;
    document.getElementById('f-fin-comment').value = t.comment || '';
    
    document.getElementById('finance-modal-title').textContent = '✏️ Редактировать операцию';
    window._editingTransactionId = id;
    
    // Set category and subcategory after modal is visible and options are rendered
    updateFinanceCategoryOptions();
    
    // Use a single requestAnimationFrame to wait for DOM update
    requestAnimationFrame(function() {
        document.getElementById('f-fin-category').value = t.category || '';
        updateFinanceSubcategoryOptions();
        requestAnimationFrame(function() {
            document.getElementById('f-fin-subcategory').value = t.subcategory || '';
        });
    });
    
    document.getElementById('finance-modal').classList.add('visible');
}

function deleteAllFinanceTransactions() {
    if(!confirm('Удалить ВСЕ операции? Это нельзя отменить.')) return;
    if(!confirm('Вы уверены? Будет удалено ' + financeData.transactions.length + ' операций.')) return;
    financeData.transactions = [];
    saveFinance();
    renderCurrentFinanceTab();
    updateFinanceStats();
}

function togglePlannedDone(id) {
    const entry = financeData.planned.find(p => p.id === id);
    if(entry) {
        entry.done = !entry.done;
        saveFinance();
        renderCurrentFinanceTab();
    }
}

// --- EXCEL IMPORT ---

function importFinanceExcel(input) {
    const file = input.files[0];
    if(!file) { alert('Файл не выбран'); return; }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            if(jsonData.length < 2) {
                alert('Файл пуст или содержит только заголовки');
                return;
            }
            
            let imported = 0;
            let errors = 0;
            
            for(let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if(!row || row.length < 3) continue;
                
                const dateRaw = row[1];
                const typeRaw = String(row[2] || '').trim().toLowerCase();
                const amountRaw = row[3];
                const categoryName = String(row[4] || '').trim();
                const subcategory = row[5] ? String(row[5]).trim() : '';
                const comment = row[6] ? String(row[6]).trim() : '';
                
                if(!dateRaw || amountRaw === undefined || amountRaw === null || amountRaw === '' || !categoryName) continue;
                
                let date = '';
                
                if(dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
                    date = dateRaw.toISOString().slice(0,10);
                }
                else if(typeof dateRaw === 'number' && dateRaw > 1 && dateRaw < 200000) {
                    const excelEpoch = new Date(1899, 11, 30);
                    const parsed = new Date(excelEpoch.getTime() + dateRaw * 86400000);
                    date = parsed.toISOString().slice(0,10);
                }
                else {
                    const dateStr = String(dateRaw).trim();
                    if(/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(dateStr)) {
                        const parts = dateStr.split('.');
                        const d = parts[0].padStart(2,'0');
                        const m = parts[1].padStart(2,'0');
                        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                        date = `${y}-${m}-${d}`;
                    }
                    else if(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
                        const parts = dateStr.split('/');
                        const d = parts[0].padStart(2,'0');
                        const m = parts[1].padStart(2,'0');
                        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                        date = `${y}-${m}-${d}`;
                    }
                    else if(/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        date = dateStr;
                    }
                    else if(/^\d{1,2}\.\d{1,2}$/.test(dateStr)) {
                        const parts = dateStr.split('.');
                        date = `${new Date().getFullYear()}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                    }
                    else {
                        const d = new Date(dateStr);
                        if(!isNaN(d.getTime())) {
                            date = d.toISOString().slice(0,10);
                        }
                    }
                }
                
                if(!date) { errors++; continue; }
                const dateObj = new Date(date);
                if(isNaN(dateObj.getTime())) { errors++; continue; }
                date = dateObj.toISOString().slice(0,10);
                
                let amount = 0;
                if(typeof amountRaw === 'number') {
                    amount = amountRaw;
                } else {
                    amount = parseFloat(String(amountRaw).replace(/[^\d.,\-]/g, '').replace(',', '.'));
                }
                if(isNaN(amount) || amount === 0) { errors++; continue; }
                
                const isExpense = typeRaw === 'расход' || typeRaw === 'expense' || typeRaw === 'трата' || amount < 0;
                
                let category = financeData.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                if(!category) {
                    category = {
                        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
                        name: categoryName,
                        limit: 0,
                        subcategories: []
                    };
                    financeData.categories.push(category);
                }
                
                if(subcategory && category.subcategories.indexOf(subcategory) === -1) {
                    category.subcategories.push(subcategory);
                }
                
                const txn = {
                    id: 'txn-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
                    date: date,
                    type: isExpense ? 'expense' : 'income',
                    amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
                    category: category.id,
                    subcategory: subcategory || '',
                    comment: comment,
                    createdAt: Date.now()
                };
                
                financeData.transactions.push(txn);
                imported++;
            }
            
            saveFinance();
            renderCurrentFinanceTab();
            updateFinanceStats();
            alert(`✅ Импортировано ${imported} операций${errors ? `, пропущено с ошибками: ${errors}` : ''}`);
        } catch(err) {
            console.error('Excel import error:', err);
            alert('❌ Ошибка при импорте Excel: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}

// --- DATE FORMAT HELPER ---

function formatFinanceDate(dateStr) {
    if(!dateStr) return '';
    if(/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('-');
    if(parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
}

// --- RENDER FUNCTIONS ---

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
            const pct = ((value / totalExpense) * 100).toFixed(1);
            return { name, value, angle, startAngle, pct, color: colors[i % colors.length] };
        });
        
        function polarToCartesian(cx, cy, r, angleDeg) {
            const rad = (angleDeg - 90) * Math.PI / 180;
            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
        }
        
        // Donut chart: outer radius 90, inner radius 50
        const outerR = 90, innerR = 50;
        const donutHtml = sectors.map(s => {
            const cx = 120, cy = 120;
            const startOuter = polarToCartesian(cx, cy, outerR, s.startAngle);
            const endOuter = polarToCartesian(cx, cy, outerR, s.startAngle + s.angle);
            const startInner = polarToCartesian(cx, cy, innerR, s.startAngle + s.angle);
            const endInner = polarToCartesian(cx, cy, innerR, s.startAngle);
            const largeArc = s.angle > 180 ? 1 : 0;
            return `<path d="M ${startOuter.x} ${startOuter.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z" fill="${s.color}" stroke="white" stroke-width="1.5"/>`;
        }).join('');
        
        const legendHtml = sectors.map((s, i) =>
            `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <div style="width:12px;height:12px;border-radius:3px;background:${s.color};flex-shrink:0;"></div>
                <span style="font-size:12px;color:#1e293b;">${s.name}</span>
                <span style="font-size:12px;font-weight:700;color:#1e293b;margin-left:auto;">${Math.round(s.value).toLocaleString('ru-RU')} ₽ (${s.pct}%)</span>
            </div>`
        ).join('');
        
        html += `<h3 style="color:#7e22ce;margin:0 0 12px;font-size:15px;">🥧 Расходы по категориям</h3>
        <div class="dashboard-chart" style="background:#faf5ff;border-color:#e9d5ff;display:flex;flex-wrap:wrap;gap:20px;align-items:center;min-height:260px;">
            <svg width="240" height="240" viewBox="0 0 240 240">
                ${donutHtml}
                <text x="120" y="112" text-anchor="middle" font-size="15" font-weight="800" fill="#1e293b">${totalExpense.toLocaleString('ru-RU')}</text>
                <text x="120" y="132" text-anchor="middle" font-size="11" fill="#1e293b">всего расходов</text>
            </svg>
            <div style="flex:1;min-width:150px;">${legendHtml}</div>
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

function saveFinance() {
    const targetUid = viewingUserId || currentUserId;
    if (targetUid) {
        db.ref(`lera_finance_v1/${targetUid}`).set({
            transactions: financeData.transactions,
            savings: financeData.savings,
            planned: financeData.planned,
            categories: financeData.categories,
            lastUpdated: Date.now()
        }).then(() => {
            console.log('✅ Finance saved for user:', targetUid);
        }).catch((error) => {
            console.error('❌ Finance save error:', error);
        });
    } else {
        // Fallback to root path if no user context
        financeRef.set({
            transactions: financeData.transactions,
            savings: financeData.savings,
            planned: financeData.planned,
            categories: financeData.categories,
            lastUpdated: Date.now()
        }).then(() => {
            console.log('✅ Finance saved (root fallback)');
        }).catch((error) => {
            console.error('❌ Finance save error:', error);
        });
    }
}

