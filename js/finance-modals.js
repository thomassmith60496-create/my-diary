// ============================================
// 💰 FINANCE MODAL FUNCTIONS
// ============================================

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