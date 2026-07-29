// ============================================
// 💰 ФИНАНСЫ: СОХРАНЕНИЕ
// ============================================
"use strict";

window.migrateCategoryColors = function() {
    if (!financeData || !financeData.categories) return;
    // Don't save if Firebase Auth isn't ready yet
    if (!currentUser || !currentUserId) {
        return;
    }
    
    const colors = ['#7e22ce', '#a855f7', '#c084fc', '#d8b4fe', '#9333ea', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e'];
    let needsUpdate = false;
    
    financeData.categories.forEach((cat, index) => {
        if (!cat.color) {
            cat.color = colors[index % colors.length];
            needsUpdate = true;
        }
    });
    
    if (needsUpdate) {
        // Delay save so auth has time to settle
        setTimeout(() => saveFinance(), 100);
    }
}

window.saveFinance = function() {
    const isReadOnly = currentUserRole === 'reader' || window.isReadOnlyMode;
    if (isReadOnly) {
        return;
    }
    
    const targetUid = getTargetUid();
    
    if (!targetUid) {
        showSyncStatus('❌ Ошибка: пользователь не определён', 'error');
        return;
    }
    
    const data = {
        transactions: financeData.transactions,
        savings: financeData.savings,
        planned: financeData.planned,
        mandatoryPayments: financeData.mandatoryPayments,
        categories: financeData.categories,
        lastUpdated: Date.now()
    };
    
    db.ref(`lera_finance_v1/${targetUid}`).set(data)
    .then(() => {
        showSyncStatus('✅ Финансы сохранены!', 'success');
    }).catch((error) => {
        if (error.code === 'PERMISSION_DENIED') {
            showSyncStatus('❌ Нет прав на запись. Опубликуйте правила БД в Firebase Console → Realtime Database → Rules → Publish', 'error');
        } else {
            showSyncStatus('❌ Ошибка сохранения финансов', 'error');
        }
    });
}

window.saveFinanceTransaction = function() {
    const date = document.getElementById('f-fin-date').value;
    const amountRaw = document.getElementById('f-fin-amount').value;
    const amount = parseAmountFormula(amountRaw);
    const type = document.getElementById('f-fin-type').value;
    const catId = document.getElementById('f-fin-category').value;
    const subcat = document.getElementById('f-fin-subcategory').value;
    const comment = document.getElementById('f-fin-comment').value.trim();
    
    if(!date) { customAlert('Укажите дату', 'Ошибка'); return; }
    if(!amount || amount <= 0) { customAlert('Укажите сумму', 'Ошибка'); return; }
    
    // Check if we're editing an existing transaction
    if(window._editingTransactionId) {
        const txn = financeData.transactions.find(t => t.id === window._editingTransactionId);
        if(txn) {
            txn.date = date;
            txn.amount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
            txn.type = type;
            txn.category = catId;
            txn.subcategory = subcat;
            txn.comment = comment;
            window._editingTransactionId = null;
            saveFinance();
            closeAllModals();
            renderCurrentFinanceTab();
            updateFinanceStats();
            customAlert('✅ Операция обновлена', 'Успех');
            return;
        }
    }
    
    // Create new transaction
    const newTxn = {
        id: 'txn-' + Date.now(),
        date,
        type,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category: catId,
        subcategory: subcat,
        comment,
        createdAt: Date.now()
    };
    
    financeData.transactions.push(newTxn);
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    updateFinanceStats();
    customAlert('✅ Операция сохранена', 'Успех');
}

window.saveSavingsEntry = function() {
    const date = document.getElementById('f-sav-date').value;
    const amount = parseFloat(document.getElementById('f-sav-amount').value);
    let goal = document.getElementById('f-sav-goal').value;
    
    if(!date) { customAlert('Укажите дату', 'Ошибка'); return; }
    if(!amount || amount === 0) { customAlert('Укажите сумму', 'Ошибка'); return; }
    if(goal === 'other') {
        goal = document.getElementById('f-sav-goal-custom').value.trim();
        if(!goal) { customAlert('Введите название цели', 'Ошибка'); return; }
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
    customAlert('✅ Накопление сохранено', 'Успех');
}

window.savePlannedEntry = function() {
    const date = document.getElementById('f-plan-date').value;
    const amount = parseFloat(document.getElementById('f-plan-amount').value);
    const catId = document.getElementById('f-plan-category').value;
    const subcat = document.getElementById('f-plan-subcategory').value;
    const done = document.getElementById('f-plan-done').value === 'true';
    
    if(!date) { customAlert('Укажите дату', 'Ошибка'); return; }
    if(!amount || amount <= 0) { customAlert('Укажите сумму', 'Ошибка'); return; }
    if(!catId) { customAlert('Укажите категорию', 'Ошибка'); return; }
    
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
    customAlert('✅ Планируемый расход сохранён', 'Успех');
}

window.saveCategory = function() {
    const name = document.getElementById('f-cat-name').value.trim();
    const type = document.getElementById('f-cat-type').value;
    const limit = parseFloat(document.getElementById('f-cat-limit').value) || 0;
    
    if(!name) { customAlert('Введите название категории', 'Ошибка'); return; }
    
    const subcategories = window._editingSubcategories || [];
    const subcategoryLimits = window._editingSubcategoryLimits || {};
    
    if(limit > 0) {
        for(const [scName, scLimit] of Object.entries(subcategoryLimits)) {
            if(scLimit && parseFloat(scLimit) > limit) {
                customAlert(`Лимит подкатегории "${scName}" (${parseFloat(scLimit)} ₽) превышает лимит категории (${limit} ₽)`, 'Ошибка');
                return;
            }
        }
    }
    
    if(window._editingCategoryId) {
        const cat = financeData.categories.find(c => c.id === window._editingCategoryId);
        if(cat) {
            // When editing, check for duplicate name excluding current category
            const duplicate = financeData.categories.find(c => c.id !== window._editingCategoryId && c.name.toLowerCase() === name.toLowerCase());
            if(duplicate) {
                customAlert('Такая категория уже существует', 'Ошибка');
                return;
            }
            cat.name = name;
            cat.type = type;
            cat.limit = limit;
            cat.subcategories = subcategories;
            cat.subcategoryLimits = subcategoryLimits;
        }
    } else {
        if(financeData.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            customAlert('Такая категория уже существует', 'Ошибка');
            return;
        }
        // Assign a color based on category index
        const colors = ['#7e22ce', '#a855f7', '#c084fc', '#d8b4fe', '#9333ea', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e'];
        const colorIndex = financeData.categories.length % colors.length;
        
        financeData.categories.push({
            id: 'cat-' + Date.now(),
            name,
            type,
            limit,
            subcategories,
            subcategoryLimits,
            color: colors[colorIndex]
        });
    }
    
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    customAlert('✅ Категория сохранена', 'Успех');
}

window.saveMandatoryPayment = function() {
    const name = document.getElementById('f-mp-name').value.trim();
    const amount = parseFloat(document.getElementById('f-mp-amount').value);
    const catId = document.getElementById('f-mp-category').value;
    const subcat = document.getElementById('f-mp-subcategory').value;
    const scheduleType = document.getElementById('f-mp-schedule-type').value;
    const dayOfMonth = parseInt(document.getElementById('f-mp-day').value) || 1;
    const intervalDays = parseInt(document.getElementById('f-mp-interval').value) || 30;
    const startDate = document.getElementById('f-mp-start-date').value;

    if(!name) { customAlert('Введите название платежа', 'Ошибка'); return; }
    if(!amount || amount <= 0) { customAlert('Укажите сумму', 'Ошибка'); return; }
    if(!catId) { customAlert('Укажите категорию', 'Ошибка'); return; }
    if(!startDate) { customAlert('Укажите дату начала', 'Ошибка'); return; }

    if(window._editingMandatoryId) {
        const mp = financeData.mandatoryPayments.find(p => p.id === window._editingMandatoryId);
        if(mp) {
            mp.name = name;
            mp.amount = amount;
            mp.category = catId;
            mp.subcategory = subcat;
            mp.scheduleType = scheduleType;
            mp.dayOfMonth = dayOfMonth;
            mp.intervalDays = intervalDays;
            mp.startDate = startDate;
            window._editingMandatoryId = null;
            saveFinance();
            closeAllModals();
            renderCurrentFinanceTab();
            customAlert('✅ Обязательный платёж обновлён', 'Успех');
            return;
        }
    }

    const newMp = {
        id: 'mp-' + Date.now(),
        name,
        amount,
        category: catId,
        subcategory: subcat,
        scheduleType,
        dayOfMonth,
        intervalDays,
        startDate,
        active: true,
        createdAt: Date.now()
    };

    financeData.mandatoryPayments.push(newMp);
    saveFinance();
    closeAllModals();
    renderCurrentFinanceTab();
    customAlert('✅ Обязательный платёж сохранён', 'Успех');
}

window.editMandatoryPayment = function(id) {
    const mp = financeData.mandatoryPayments.find(p => p.id === id);
    if(!mp) return;

    document.getElementById('f-mp-name').value = mp.name;
    document.getElementById('f-mp-amount').value = mp.amount;
    document.getElementById('f-mp-schedule-type').value = mp.scheduleType || 'monthly';
    document.getElementById('f-mp-day').value = mp.dayOfMonth || 1;
    document.getElementById('f-mp-interval').value = mp.intervalDays || 30;
    document.getElementById('f-mp-start-date').value = mp.startDate;

    document.getElementById('mandatory-modal-title').textContent = '✏️ Редактировать обязательный платёж';
    window._editingMandatoryId = id;

    updateMandatoryCategoryOptions();
    requestAnimationFrame(function() {
        document.getElementById('f-mp-category').value = mp.category || '';
        updateMandatorySubcategoryOptions();
        requestAnimationFrame(function() {
            document.getElementById('f-mp-subcategory').value = mp.subcategory || '';
        });
    });

    document.getElementById('mandatory-modal').classList.add('visible');
}

window.deleteFinanceItem = function(type, id) {
    if (isReadOnlyActive()) { customAlert('❌ Удаление недоступно в режиме просмотра', 'Ошибка'); return; }
    customConfirm('Удалить эту запись?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            if(type === 'transaction') {
                financeData.transactions = financeData.transactions.filter(t => t.id !== id);
            } else if(type === 'savings') {
                financeData.savings = financeData.savings.filter(s => s.id !== id);
            } else if(type === 'planned') {
                financeData.planned = financeData.planned.filter(p => p.id !== id);
            } else if(type === 'mandatory') {
                financeData.mandatoryPayments = financeData.mandatoryPayments.filter(p => p.id !== id);
            } else if(type === 'category') {
                financeData.transactions.forEach(t => { if(t.category === id) t.category = ''; });
                financeData.planned.forEach(p => { if(p.category === id) p.category = ''; });
                financeData.mandatoryPayments.forEach(p => { if(p.category === id) p.category = ''; });
                financeData.categories = financeData.categories.filter(c => c.id !== id);
            }
            saveFinance();
            renderCurrentFinanceTab();
            updateFinanceStats();
        });
}

window.editFinanceTransaction = function(id) {
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

window.deleteAllFinanceTransactions = function() {
    if (isReadOnlyActive()) { customAlert('❌ Удаление недоступно в режиме просмотра', 'Ошибка'); return; }
    customConfirm('Удалить ВСЕ операции? Это нельзя отменить.', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            customConfirm('Вы уверены? Будет удалено ' + financeData.transactions.length + ' операций.', 'Последнее подтверждение')
                .then(confirmed2 => {
                    if (!confirmed2) return;
                    financeData.transactions = [];
                    saveFinance();
                    renderCurrentFinanceTab();
                    updateFinanceStats();
                });
        });
}

window.togglePlannedDone = function(id) {
    if (isReadOnlyActive()) return;
    const entry = financeData.planned.find(p => p.id === id);
    if(entry) {
        entry.done = !entry.done;
        saveFinance();
        renderCurrentFinanceTab();
    }
}