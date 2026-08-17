// ============================================
// 💰 ФИНАНСЫ: МОДАЛКИ
// ============================================
"use strict";

window.openFinanceModal = function() {
    document.getElementById('f-fin-date').value = getLocalDateStr();
    document.getElementById('f-fin-amount').value = '';
    document.getElementById('f-fin-comment').value = '';
    document.getElementById('f-fin-type').value = 'expense';
    document.getElementById('finance-modal-title').textContent = '➕ Добавить операцию';
    updateFinanceCategoryOptions();
    document.getElementById('finance-modal').classList.add('visible');
}

window.openSavingsModal = function() {
    document.getElementById('f-sav-date').value = getLocalDateStr();
    document.getElementById('f-sav-amount').value = '';
    document.getElementById('f-sav-goal').value = 'Отпуск';
    document.getElementById('f-sav-goal-custom-wrap').style.display = 'none';
    document.getElementById('f-sav-goal-custom').value = '';
    document.getElementById('savings-modal').classList.add('visible');
}

window.openMandatoryModal = function() {
    document.getElementById('f-mp-name').value = '';
    document.getElementById('f-mp-amount').value = '';
    document.getElementById('f-mp-schedule-type').value = 'monthly';
    document.getElementById('f-mp-day').value = '1';
    document.getElementById('f-mp-interval').value = '30';
    document.getElementById('f-mp-start-date').value = getLocalDateStr();
    document.getElementById('mandatory-modal-title').textContent = '🔄 Добавить обязательный платёж';
    window._editingMandatoryId = null;
    updateMandatoryCategoryOptions();
    document.getElementById('mandatory-modal').classList.add('visible');
}

window.openPlannedModal = function() {
    document.getElementById('f-plan-date').value = getLocalDateStr();
    document.getElementById('f-plan-amount').value = '';
    document.getElementById('f-plan-done').value = 'false';
    updatePlanCategoryOptions();
    document.getElementById('planned-modal').classList.add('visible');
}

window.openCategoryModal = function(catId) {
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

window.toggleMandatoryScheduleFields = function() {
    const type = document.getElementById('f-mp-schedule-type').value;
    document.getElementById('f-mp-day-wrap').style.display = type === 'monthly' ? 'block' : 'none';
    document.getElementById('f-mp-interval-wrap').style.display = type === 'interval' ? 'block' : 'none';
}

// Bind the goal select to show/hide custom field
document.addEventListener('change', function(e) {
    if(e.target && e.target.id === 'f-sav-goal') {
        document.getElementById('f-sav-goal-custom-wrap').style.display =
            e.target.value === 'other' ? 'block' : 'none';
    }
});