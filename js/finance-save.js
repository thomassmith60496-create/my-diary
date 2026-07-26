// ============================================
// 💰 ФИНАНСЫ: СОХРАНЕНИЕ
// ============================================
"use strict";

function migrateCategoryColors() {
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

function saveFinance() {
    // Guard: block writes in read-only mode
    const isReadOnly = currentUserRole === 'reader' || window.isReadOnlyMode;
    if (isReadOnly) {
        return;
    }
    
    const targetUid = getTargetUid();
    const authUid = currentUser ? (currentUser.uid || currentUser.user_id) : null;
    
    // If no targetUid, we can't write to a user-specific path - rules require $uid
    if (!targetUid) {
        showSyncStatus('❌ Ошибка: пользователь не определён', 'error');
        return;
    }
    
    // UID mismatch check: rules require auth.uid === $uid
    if (targetUid !== authUid) {
        showSyncStatus('❌ UID mismatch: целевой пользователь не совпадает с текущим', 'error');
        return;
    }
    
    const data = {
        transactions: financeData.transactions,
        savings: financeData.savings,
        planned: financeData.planned,
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
            alert('✅ Операция обновлена');
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
            // When editing, check for duplicate name excluding current category
            const duplicate = financeData.categories.find(c => c.id !== window._editingCategoryId && c.name.toLowerCase() === name.toLowerCase());
            if(duplicate) {
                alert('Такая категория уже существует');
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
            alert('Такая категория уже существует');
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