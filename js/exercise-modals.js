// ============================================
// 🏋️ УПРАЖНЕНИЯ: МОДАЛКИ
// ============================================
"use strict";

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ РЕДАКТИРОВАНИЯ ===

let editingExerciseId = null;
let editingBaseExerciseId = null;
let editingVariantId = null;
window._editingExerciseSubcategories = [];
window._editingExerciseSubcategoryLimits = {};

// === КАТЕГОРИИ УПРАЖНЕНИЙ ===

window.openExerciseCategoryModal = function(id = null) {
    editingExerciseId = id;
    const modal = document.getElementById('exercise-category-modal');
    const title = document.getElementById('exercise-category-modal-title');
    
    if (id) {
        const cat = exerciseCategories.find(c => c.id === id);
        if (!cat) return;
        title.textContent = '✏️ Редактировать категорию';
        document.getElementById('f-ex-cat-name').value = cat.name;
        document.getElementById('f-ex-cat-type').value = cat.type;
        document.getElementById('f-ex-cat-icon').value = cat.icon || '';
    } else {
        title.textContent = '➕ Добавить категорию';
        document.getElementById('f-ex-cat-name').value = '';
        document.getElementById('f-ex-cat-type').value = 'strength';
        document.getElementById('f-ex-cat-icon').value = '💪';
    }
    
    modal.classList.add('visible');
}

function saveExerciseCategory() {
    const name = document.getElementById('f-ex-cat-name').value.trim();
    const type = document.getElementById('f-ex-cat-type').value;
    const icon = document.getElementById('f-ex-cat-icon').value.trim();
    
    if (!name) {
        alert('Укажите название категории');
        return;
    }
    
    if (editingExerciseId) {
        const cat = exerciseCategories.find(c => c.id === editingExerciseId);
        if (cat) {
            cat.name = name;
            cat.type = type;
            cat.icon = icon;
        }
    } else {
        const id = 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        exerciseCategories.push({
            id: id,
            name: name,
            type: type,
            icon: icon
        });
    }
    
    saveExerciseData();
    syncToCloud();
    renderExerciseCategories();
    closeAllModals();
}

function deleteExerciseCategory(id) {
    if (!confirm('Удалить категорию? Упражнения в этой категории останутся, но будут без категории.')) return;
    
    exerciseCategories = exerciseCategories.filter(c => c.id !== id);
    
    // Обновляем базовые упражнения
    baseExercises.forEach(b => {
        if (b.categoryId === id) {
            b.categoryId = null;
        }
    });
    
    saveExerciseData();
    syncToCloud();
    renderExerciseCategories();
}

// === БАЗОВЫЕ УПРАЖНЕНИЯ ===

window.openBaseExerciseModal = function(id = null) {
    editingBaseExerciseId = id;
    const modal = document.getElementById('base-exercise-modal');
    const title = document.getElementById('base-exercise-modal-title');
    
    // Заполняем категории
    const catSelect = document.getElementById('f-base-ex-category');
    catSelect.innerHTML = '<option value="">— выбрать —</option>' +
        exerciseCategories.map(c => `<option value="${c.id}">${c.icon || ''} ${c.name}</option>`).join('');
    
    if (id) {
        const base = baseExercises.find(b => b.id === id);
        if (!base) return;
        title.textContent = '✏️ Редактировать базовое упражнение';
        document.getElementById('f-base-ex-name').value = base.name;
        catSelect.value = base.categoryId || '';
    } else {
        title.textContent = '➕ Добавить базовое упражнение';
        document.getElementById('f-base-ex-name').value = '';
        catSelect.value = '';
    }
    
    modal.classList.add('visible');
}

function saveBaseExercise() {
    const name = document.getElementById('f-base-ex-name').value.trim();
    const categoryId = document.getElementById('f-base-ex-category').value;
    
    if (!name) {
        alert('Укажите название упражнения');
        return;
    }
    
    if (editingBaseExerciseId) {
        const base = baseExercises.find(b => b.id === editingBaseExerciseId);
        if (base) {
            base.name = name;
            base.categoryId = categoryId || null;
            base.normalizedName = normalizeExerciseName(name);
        }
    } else {
        const id = 'base-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        baseExercises.push({
            id: id,
            name: name,
            categoryId: categoryId || null,
            normalizedName: normalizeExerciseName(name)
        });
    }
    
    saveExerciseData();
    syncToCloud();
    renderBaseExercises();
    closeAllModals();
}

function deleteBaseExercise(id) {
    if (!confirm('Удалить базовое упражнение? Варианты упражнений останутся, но будут без связи с базовым.')) return;
    
    baseExercises = baseExercises.filter(b => b.id !== id);
    
    // Обновляем варианты
    exerciseVariants.forEach(v => {
        if (v.baseExerciseId === id) {
            v.baseExerciseId = null;
        }
    });
    
    saveExerciseData();
    syncToCloud();
    renderBaseExercises();
}

// === ВАРИАНТЫ УПРАЖНЕНИЙ ===

window.openVariantModal = function(id = null) {
    editingVariantId = id;
    const modal = document.getElementById('exercise-variant-modal');
    const title = document.getElementById('exercise-variant-modal-title');
    
    // Заполняем базовые упражнения
    const baseSelect = document.getElementById('f-variant-base');
    baseSelect.innerHTML = '<option value="">— выбрать —</option>' +
        baseExercises.map(b => {
            const cat = getCategoryById(b.categoryId);
            return `<option value="${b.id}">${cat ? (cat.icon || '') + ' ' : ''}${b.name}</option>`;
        }).join('');
    
    // Заполняем типы
    const typeSelect = document.getElementById('f-variant-type');
    typeSelect.innerHTML = `
        <option value="strength">💪 Силовые</option>
        <option value="cardio">🏃 Кардио</option>
        <option value="bodyweight">🏋️ Повторения без веса</option>
        <option value="timed">⏱ На время</option>
    `;
    
    // Заполняем метрики
    updateVariantMetricOptions();
    document.getElementById('f-variant-type').onchange = updateVariantMetricOptions;
    
    if (id) {
        const variant = exerciseVariants.find(v => v.id === id);
        if (!variant) return;
        title.textContent = '✏️ Редактировать вариант';
        document.getElementById('f-variant-name').value = variant.name;
        baseSelect.value = variant.baseExerciseId || '';
        typeSelect.value = variant.type;
        document.getElementById('f-variant-metric').value = variant.metricType;
    } else {
        title.textContent = '➕ Добавить вариант';
        document.getElementById('f-variant-name').value = '';
        baseSelect.value = '';
        typeSelect.value = 'strength';
        document.getElementById('f-variant-metric').value = 'weight';
    }
    
    modal.classList.add('visible');
}

function updateVariantMetricOptions() {
    const type = document.getElementById('f-variant-type').value;
    const metricSelect = document.getElementById('f-variant-metric');
    
    let options = '';
    switch(type) {
        case 'strength':
            options = `
                <option value="weight">Вес + повторения</option>
                <option value="time_weight">Время + вес</option>
            `;
            break;
        case 'cardio':
            options = `
                <option value="cardio">Время + дистанция</option>
                <option value="time">Только время</option>
                <option value="distance">Только дистанция</option>
            `;
            break;
        case 'bodyweight':
            options = `
                <option value="reps">Количество повторений</option>
                <option value="time">Время</option>
            `;
            break;
        case 'timed':
            options = `
                <option value="time">Длительность</option>
                <option value="time_weight">Время + вес</option>
            `;
            break;
    }
    
    metricSelect.innerHTML = options;
}

function saveExerciseVariant() {
    const name = document.getElementById('f-variant-name').value.trim();
    const baseExerciseId = document.getElementById('f-variant-base').value;
    const type = document.getElementById('f-variant-type').value;
    const metricType = document.getElementById('f-variant-metric').value;
    
    if (!name) {
        alert('Укажите название варианта');
        return;
    }
    
    if (!baseExerciseId) {
        alert('Выберите базовое упражнение');
        return;
    }
    
    if (editingVariantId) {
        const variant = exerciseVariants.find(v => v.id === editingVariantId);
        if (variant) {
            variant.name = name;
            variant.baseExerciseId = baseExerciseId;
            variant.type = type;
            variant.metricType = metricType;
            variant.normalizedName = normalizeExerciseName(name);
        }
    } else {
        const id = 'var-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        exerciseVariants.push({
            id: id,
            baseExerciseId: baseExerciseId,
            name: name,
            normalizedName: normalizeExerciseName(name),
            originalName: name,
            type: type,
            metricType: metricType,
            needsReview: false
        });
    }
    
    saveExerciseData();
    syncToCloud();
    renderExerciseVariants();
    closeAllModals();
}

function deleteExerciseVariant(id) {
    if (!confirm('Удалить вариант упражнения?')) return;
    
    exerciseVariants = exerciseVariants.filter(v => v.id !== id);
    saveExerciseData();
    syncToCloud();
    renderExerciseVariants();
}

// === ОБЪЕДИНЕНИЕ ВАРИАНТОВ ===

function mergeVariants(sourceId, targetId) {
    if (!confirm('Объединить варианты? Все данные прогресса будут перенесены на целевой вариант.')) return;
    
    const source = exerciseVariants.find(v => v.id === sourceId);
    const target = exerciseVariants.find(v => v.id === targetId);
    
    if (!source || !target) return;
    
    // Переносим прогресс
    const progress = getProgressData();
    const sourceProgress = progress[source.name];
    
    if (sourceProgress && sourceProgress.length > 0) {
        if (!progress[target.name]) {
            progress[target.name] = [];
        }
        progress[target.name].push(...sourceProgress);
        localStorage.setItem('exercise-progress', JSON.stringify(progress));
    }
    
    // Удаляем источник
    exerciseVariants = exerciseVariants.filter(v => v.id !== sourceId);
    
    saveExerciseData();
    syncToCloud();
    renderExerciseVariants();
    
    alert('✅ Варианты объединены');
}

// === РЕНДЕР СПИСКОВ ===

window.renderExerciseCategories = function() {
    const container = document.getElementById('exercise-categories-list');
    if (!container) return;
    
    if (exerciseCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏷</div>
                <div class="empty-state-title">Нет категорий</div>
                <div class="empty-state-text">Создайте категории для группировки упражнений</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = exerciseCategories.map(cat => {
        const count = baseExercises.filter(b => b.categoryId === cat.id).length;
        return `
            <div class="category-card">
                <div class="category-header">
                    <div class="category-info">
                        <div class="category-icon">${cat.icon || '📁'}</div>
                        <div>
                            <div class="category-name">${cat.name}</div>
                            <div class="category-type">${count} упражнений</div>
                        </div>
                    </div>
                    <div class="category-actions">
<button class="action-btn edit" onclick="openExerciseCategoryModal('${cat.id}')">✏️</button>
                        <button class="action-btn delete" onclick="deleteExerciseCategory('${cat.id}')">🗑</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.renderBaseExercises = function() {
    const container = document.getElementById('base-exercises-list');
    if (!container) return;
    
    if (baseExercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <div class="empty-state-title">Нет базовых упражнений</div>
                <div class="empty-state-text">Добавьте базовые упражнения для группировки вариантов</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = baseExercises.map(base => {
        const cat = getCategoryById(base.categoryId);
        const variants = exerciseVariants.filter(v => v.baseExerciseId === base.id);
        return `
            <div class="base-exercise-card">
                <div class="base-exercise-header">
                    <div class="base-exercise-info">
                        <div class="base-exercise-name">${base.name}</div>
                        <div class="base-exercise-meta">
                            ${cat ? (cat.icon || '') + ' ' + cat.name : 'Без категории'}
                            • ${variants.length} вариантов
                        </div>
                    </div>
                    <div class="base-exercise-actions">
                        <button class="action-btn edit" onclick="openBaseExerciseModal('${base.id}')">✏️</button>
                        <button class="action-btn delete" onclick="deleteBaseExercise('${base.id}')">🗑</button>
                    </div>
                </div>
                ${variants.length > 0 ? `
                    <div class="variants-list">
                        ${variants.map(v => `
                            <div class="variant-item">
                                <div class="variant-name">${v.name}</div>
                                <div class="variant-meta">${v.type} • ${v.metricType}</div>
                                <div class="variant-actions">
                                    <button class="action-btn edit" onclick="openVariantModal('${v.id}')">✏️</button>
                                    <button class="action-btn delete" onclick="deleteExerciseVariant('${v.id}')">🗑</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

window.renderExerciseVariants = function() {
    const container = document.getElementById('exercise-variants-list');
    if (!container) return;
    
    if (exerciseVariants.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-title">Нет вариантов</div>
                <div class="empty-state-text">Варианты создаются автоматически при парсинге или добавляются вручную</div>
            </div>
        `;
        return;
    }
    
    // Группируем по базовым упражнениям
    const grouped = {};
    exerciseVariants.forEach(v => {
        if (!grouped[v.baseExerciseId]) {
            grouped[v.baseExerciseId] = [];
        }
        grouped[v.baseExerciseId].push(v);
    });
    
    let html = '';
    Object.keys(grouped).forEach(baseId => {
        const base = findBaseExerciseById(baseId);
        const variants = grouped[baseId];
        
        html += `
            <div class="variant-group">
                <div class="variant-group-header">
                    <div class="variant-group-title">
                        ${base ? base.name : 'Без базового упражнения'}
                    </div>
                </div>
                ${variants.map(v => `
                    <div class="variant-item">
                        <div class="variant-info">
                            <div class="variant-name">${v.name}</div>
                            <div class="variant-meta">
                                ${v.type} • ${v.metricType}
                                ${v.needsReview ? '<span class="review-badge">⚠️ Требует проверки</span>' : ''}
                            </div>
                        </div>
                        <div class="variant-actions">
                            <button class="action-btn edit" onclick="openVariantModal('${v.id}')">✏️</button>
                            <button class="action-btn delete" onclick="deleteExerciseVariant('${v.id}')">🗑</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function updateExerciseSelectOptions() {
    // Обновляет селект упражнений в модалке тренировки
    const select = document.getElementById('f-train-exercise');
    if (!select) return;
    
    select.innerHTML = '<option value="">— выбрать —</option>' +
        exerciseVariants.map(v => {
            const base = findBaseExerciseById(v.baseExerciseId);
            const cat = base ? getCategoryById(base.categoryId) : null;
            return `<option value="${v.id}">${cat ? (cat.icon || '') + ' ' : ''}${v.name}</option>`;
        }).join('');
}