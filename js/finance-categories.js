// ============================================
// 💰 ФИНАНСЫ: КАТЕГОРИИ
// ============================================
"use strict";

window.updateFinanceCategoryOptions = function() {
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
        cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    
    updateFinanceSubcategoryOptions();
}

window.updateFinanceSubcategoryOptions = function() {
    const catId = document.getElementById('f-fin-category').value;
    const subSelect = document.getElementById('f-fin-subcategory');
    const cat = financeData.categories.find(c => c.id === catId);
    if(cat && cat.subcategories && cat.subcategories.length > 0) {
        subSelect.innerHTML = '<option value="">— выбрать —</option>' +
            cat.subcategories.map(sc => `<option value="${esc(sc)}">${esc(sc)}</option>`).join('');
    } else {
        subSelect.innerHTML = '<option value="">— (нет подкатегорий) —</option>';
    }
}

window.updatePlanCategoryOptions = function() {
    const catSelect = document.getElementById('f-plan-category');
    const expenseCats = financeData.categories.filter(c => c.type === 'expense');
    catSelect.innerHTML = '<option value="">— выбрать —</option>' +
        expenseCats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    updatePlanSubcategoryOptions();
}

window.updateMandatoryCategoryOptions = function() {
    const catSelect = document.getElementById('f-mp-category');
    const expenseCats = financeData.categories.filter(c => c.type === 'expense');
    catSelect.innerHTML = '<option value="">— выбрать —</option>' +
        expenseCats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    updateMandatorySubcategoryOptions();
}

window.updateMandatorySubcategoryOptions = function() {
    const catId = document.getElementById('f-mp-category').value;
    const subSelect = document.getElementById('f-mp-subcategory');
    const cat = financeData.categories.find(c => c.id === catId);
    if(cat && cat.subcategories && cat.subcategories.length > 0) {
        subSelect.innerHTML = '<option value="">— выбрать —</option>' +
            cat.subcategories.map(sc => `<option value="${esc(sc)}">${esc(sc)}</option>`).join('');
    } else {
        subSelect.innerHTML = '<option value="">— (нет подкатегорий) —</option>';
    }
}

window.updatePlanSubcategoryOptions = function() {
    const catId = document.getElementById('f-plan-category').value;
    const subSelect = document.getElementById('f-plan-subcategory');
    const cat = financeData.categories.find(c => c.id === catId);
    if(cat && cat.subcategories && cat.subcategories.length > 0) {
        subSelect.innerHTML = '<option value="">— выбрать —</option>' +
            cat.subcategories.map(sc => `<option value="${esc(sc)}">${esc(sc)}</option>`).join('');
    } else {
        subSelect.innerHTML = '<option value="">— (нет подкатегорий) —</option>';
    }
}

// --- SUBCATEGORY TAG MANAGEMENT ---

window.addSubcategoryTag = function() {
    const input = document.getElementById('f-cat-new-subcat');
    const val = input.value.trim();
    if(!val) return;
    if(!window._editingSubcategories) window._editingSubcategories = [];
    if(window._editingSubcategories.includes(val)) { customAlert('Такая подкатегория уже есть', 'Ошибка'); return; }
    window._editingSubcategories.push(val);
    input.value = '';
    renderSubcategoryTags();
}

window.removeSubcategoryTag = function(el, idx) {
    if(window._editingSubcategories) {
        window._editingSubcategories.splice(idx, 1);
        renderSubcategoryTags();
    }
}

window.renderSubcategoryTags = function() {
    const container = document.getElementById('f-cat-subcats-container');
    if(!window._editingSubcategories) window._editingSubcategories = [];
    if(!window._editingSubcategoryLimits) window._editingSubcategoryLimits = {};
    container.innerHTML = window._editingSubcategories.map((sc, i) => {
        const limitVal = window._editingSubcategoryLimits[sc] || '';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
            <span class="subcat-tag" style="margin:0;">${esc(sc)}</span>
            <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:120px;">
                <label style="font-size:11px;color:#7e22ce;font-weight:600;white-space:nowrap;">Лимит:</label>
                <input type="number" step="0.01" min="0" value="${limitVal}"
                    onchange="updateSubcategoryLimit(this, '${esc(sc)}')"
                    style="width:100%;padding:4px 8px;border:1px solid #d8b4fe;border-radius:4px;font-size:12px;background:white;font-family:inherit;">
            </div>
            <span class="remove-subcat" onclick="removeSubcategoryTag(this, ${i})" style="cursor:pointer;font-weight:700;color:#a855f7;font-size:14px;">✕</span>
        </div>`;
    }).join('');
}

window.updateSubcategoryLimit = function(input, subcatName) {
    if(!window._editingSubcategoryLimits) window._editingSubcategoryLimits = {};
    window._editingSubcategoryLimits[subcatName] = input.value;
}