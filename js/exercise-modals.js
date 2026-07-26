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

// === ВСЕ УПРАЖНЕНИЯ (СВОДНЫЙ СПИСОК) ===

window.renderAllExercises = function() {
    const container = document.getElementById('all-exercises-list');
    if (!container) return;
    
    const needsReviewCount = exerciseVariants.filter(v => v.needsReview).length;
    
    let html = `
        <div class="all-exercises-toolbar">
            <div class="all-exercises-stats">
                <span class="stat-badge">📝 Всего: ${exerciseVariants.length}</span>
                <span class="stat-badge review">⚠️ Требуют проверки: ${needsReviewCount}</span>
                <span class="stat-badge base">🏋️ Базовых: ${baseExercises.length}</span>
            </div>
            <div class="all-exercises-actions">
                <button class="action-btn" onclick="suggestAndShowMerges()">🔗 Найти дубли</button>
                <button class="action-btn" onclick="openBulkReassignModal()">📂 Массовое переназначение</button>
            </div>
        </div>
    `;
    
    if (exerciseVariants.length === 0) {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-title">Нет упражнений</div>
                <div class="empty-state-text">Упражнения появятся после импорта тренировок</div>
            </div>
        `;
        container.innerHTML = html;
        return;
    }
    
    // Группируем по базовым упражнениям
    const grouped = {};
    const unassigned = [];
    
    exerciseVariants.forEach(v => {
        if (v.baseExerciseId && findBaseExerciseById(v.baseExerciseId)) {
            if (!grouped[v.baseExerciseId]) grouped[v.baseExerciseId] = [];
            grouped[v.baseExerciseId].push(v);
        } else {
            unassigned.push(v);
        }
    });
    
    // Сортируем группы: сначала с дублями, потом остальные
    const sortedBaseIds = Object.keys(grouped).sort((a, b) => {
        const countA = grouped[a].length;
        const countB = grouped[b].length;
        return countB - countA;
    });
    
    // Рендерим группы
    sortedBaseIds.forEach(baseId => {
        const base = findBaseExerciseById(baseId);
        const variants = grouped[baseId];
        const cat = base ? getCategoryById(base.categoryId) : null;
        const progress = getProgressData();
        
        html += `
            <div class="base-group-card">
                <div class="base-group-header">
                    <div class="base-group-info">
                        <div class="base-group-name">${base ? base.name : 'Без названия'}</div>
                        <div class="base-group-meta">
                            ${cat ? (cat.icon || '') + ' ' + cat.name : 'Без категории'}
                            • ${variants.length} вариантов
                            • ${getBaseExerciseTotalWorkouts(baseId, progress)} тренировок
                        </div>
                    </div>
                    <div class="base-group-actions">
                        <button class="action-btn edit" onclick="openBaseExerciseModal('${baseId}')">✏️</button>
                    </div>
                </div>
                <div class="base-group-variants">
                    ${variants.map(v => {
                        const variantProgress = progress[v.id] || progress[v.name] || [];
                        const lastDate = variantProgress.length > 0 ? variantProgress[variantProgress.length - 1].date : '—';
                        return `
                            <div class="all-variant-row ${v.needsReview ? 'needs-review' : ''}">
                                <div class="variant-main-info">
                                    <div class="variant-name-row">
                                        <span class="variant-name-text">${v.name}</span>
                                        ${v.needsReview ? '<span class="review-badge">⚠️ Требует проверки</span>' : ''}
                                        ${v.name !== v.originalName ? `<span class="original-name-badge">📝 ${v.originalName}</span>` : ''}
                                    </div>
                                    <div class="variant-details-row">
                                        <span class="detail-tag type">${v.type}</span>
                                        <span class="detail-tag metric">${v.metricType}</span>
                                        <span class="detail-tag sets">${variantProgress.length} записей</span>
                                        <span class="detail-tag date">📅 ${lastDate}</span>
                                    </div>
                                </div>
                                <div class="variant-row-actions">
                                    <button class="action-btn edit" onclick="openVariantModal('${v.id}')" title="Редактировать">✏️</button>
                                    <button class="action-btn" onclick="openReassignModal('${v.id}')" title="Переназначить базовое">📂</button>
                                    <button class="action-btn" onclick="openMergeSelectModal('${v.id}')" title="Объединить">🔗</button>
                                    <button class="action-btn delete" onclick="deleteExerciseVariant('${v.id}')" title="Удалить">🗑</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    // Непривязанные варианты
    if (unassigned.length > 0) {
        html += `
            <div class="base-group-card unassigned">
                <div class="base-group-header">
                    <div class="base-group-info">
                        <div class="base-group-name">📂 Без базового упражнения</div>
                        <div class="base-group-meta">${unassigned.length} вариантов</div>
                    </div>
                </div>
                <div class="base-group-variants">
                    ${unassigned.map(v => {
                        const progress = getProgressData();
                        const variantProgress = progress[v.id] || progress[v.name] || [];
                        return `
                            <div class="all-variant-row ${v.needsReview ? 'needs-review' : ''}">
                                <div class="variant-main-info">
                                    <div class="variant-name-row">
                                        <span class="variant-name-text">${v.name}</span>
                                        ${v.needsReview ? '<span class="review-badge">⚠️ Требует проверки</span>' : ''}
                                    </div>
                                    <div class="variant-details-row">
                                        <span class="detail-tag type">${v.type}</span>
                                        <span class="detail-tag metric">${v.metricType}</span>
                                        <span class="detail-tag sets">${variantProgress.length} записей</span>
                                    </div>
                                </div>
                                <div class="variant-row-actions">
                                    <button class="action-btn edit" onclick="openVariantModal('${v.id}')">✏️</button>
                                    <button class="action-btn" onclick="openReassignModal('${v.id}')">📂</button>
                                    <button class="action-btn delete" onclick="deleteExerciseVariant('${v.id}')">🗑</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function getBaseExerciseTotalWorkouts(baseId, progress) {
    const variants = findVariantByBaseExercise(baseId);
    let total = 0;
    variants.forEach(v => {
        const p = progress[v.id] || progress[v.name] || [];
        total += p.length;
    });
    return total;
}

// === РАЗДЕЛ "ТРЕБУЕТ ПРОВЕРКИ" ===

window.renderNeedsReviewSection = function() {
    const container = document.getElementById('needs-review-list');
    if (!container) return;
    
    const needsReview = exerciseVariants.filter(v => v.needsReview);
    
    if (needsReview.length === 0) {
        container.innerHTML = `
            <div class="empty-state-mini">
                <div class="empty-state-mini-icon">✅</div>
                <div class="empty-state-mini-text">Нет упражнений, требующих проверки</div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="needs-review-header">
            <span class="review-count">⚠️ ${needsReview.length} упражнений требуют проверки</span>
            <button class="action-btn" onclick="approveAllReviewed()">✅ Подтвердить все</button>
        </div>
    `;
    
    html += needsReview.map(v => `
        <div class="review-item">
            <div class="review-item-header">
                <div class="review-item-name">${v.name}</div>
                <div class="review-item-original">📝 Оригинал: ${v.originalName || v.name}</div>
            </div>
            <div class="review-item-details">
                <span class="detail-tag type">${v.type}</span>
                <span class="detail-tag metric">${v.metricType}</span>
            </div>
            <div class="review-item-actions">
                <button class="action-btn edit" onclick="approveVariant('${v.id}')">✅ Подтвердить</button>
                <button class="action-btn edit" onclick="openVariantModal('${v.id}')">✏️ Исправить</button>
                <button class="action-btn delete" onclick="deleteExerciseVariant('${v.id}')">🗑 Удалить</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function approveVariant(id) {
    const variant = findVariantById(id);
    if (!variant) return;
    variant.needsReview = false;
    saveExerciseData();
    syncToCloud();
    renderAllExercises();
    renderNeedsReviewSection();
    renderExerciseVariants();
}

function approveAllReviewed() {
    exerciseVariants.forEach(v => { v.needsReview = false; });
    saveExerciseData();
    syncToCloud();
    renderAllExercises();
    renderNeedsReviewSection();
    renderExerciseVariants();
}

// === МОДАЛКА ПЕРЕНАЗНАЧЕНИЯ БАЗОВОГО УПРАЖНЕНИЯ ===

function openReassignModal(variantId) {
    const variant = findVariantById(variantId);
    if (!variant) return;
    
    const modal = document.getElementById('reassign-modal');
    const select = document.getElementById('f-reassign-base');
    const title = document.getElementById('reassign-modal-title');
    
    title.textContent = `📂 Переназначить: ${variant.name}`;
    document.getElementById('f-reassign-variant-id').value = variantId;
    
    select.innerHTML = '<option value="">— выбрать —</option>' +
        baseExercises.map(b => {
            const cat = getCategoryById(b.categoryId);
            return `<option value="${b.id}" ${b.id === variant.baseExerciseId ? 'selected' : ''}>${cat ? (cat.icon || '') + ' ' : ''}${b.name}</option>`;
        }).join('');
    
    modal.classList.add('visible');
}

function saveReassign() {
    const variantId = document.getElementById('f-reassign-variant-id').value;
    const newBaseId = document.getElementById('f-reassign-base').value;
    
    if (!newBaseId) {
        alert('Выберите базовое упражнение');
        return;
    }
    
    reassignVariantToBaseExercise(variantId, newBaseId);
    closeAllModals();
    renderAllExercises();
    renderExerciseVariants();
    alert('✅ Вариант переназначен');
}

// === МОДАЛКА ВЫБОРА ДЛЯ ОБЪЕДИНЕНИЯ ===

function openMergeSelectModal(variantId) {
    const variant = findVariantById(variantId);
    if (!variant) return;
    
    const modal = document.getElementById('merge-modal');
    const title = document.getElementById('merge-modal-title');
    const select = document.getElementById('f-merge-target');
    
    title.textContent = `🔗 Объединить варианты для: ${variant.name}`;
    document.getElementById('f-merge-source-id').value = variantId;
    
    // Показываем похожие варианты + все остальные
    const similar = findSimilarExercises(variant.name, 0.5);
    
    select.innerHTML = '<option value="">— выбрать целевой вариант —</option>' +
        exerciseVariants
            .filter(v => v.id !== variantId)
            .map(v => {
                const isSimilar = similar.some(s => s.variant.id === v.id);
                const base = findBaseExerciseById(v.baseExerciseId);
                const label = isSimilar ? '🔗 ' : '  ';
                return `<option value="${v.id}">${label}${v.name}${base ? ' (' + base.name + ')' : ''}</option>`;
            }).join('');
    
    modal.classList.add('visible');
}

function saveMerge() {
    const sourceId = document.getElementById('f-merge-source-id').value;
    const targetId = document.getElementById('f-merge-target').value;
    
    if (!targetId) {
        alert('Выберите целевой вариант для объединения');
        return;
    }
    
    mergeVariants(sourceId, targetId);
    closeAllModals();
    renderAllExercises();
    renderExerciseVariants();
}

// === АВТОМАТИЧЕСКИЙ ПОИСК ДУБЛЕЙ ===

function suggestAndShowMerges() {
    const suggestions = suggestMerge();
    
    if (suggestions.length === 0) {
        alert('✅ Дубли не найдены! Все упражнения уникальны.');
        return;
    }
    
    const container = document.getElementById('merge-suggestions-container');
    if (!container) return;
    
    let html = `
        <div class="merge-suggestions-header">
            <span class="merge-count">🔗 Найдено ${suggestions.length} групп дублей</span>
            <button class="action-btn" onclick="document.getElementById('merge-suggestions-container').innerHTML = ''">✕ Закрыть</button>
        </div>
    `;
    
    suggestions.forEach((group, idx) => {
        html += `
            <div class="merge-group-card">
                <div class="merge-group-title">Группа ${idx + 1}: ${group.target.name}</div>
                <div class="merge-group-reason">Причина: ${group.reason === 'exact' ? 'Точное совпадение' : group.reason === 'substring' ? 'Одно содержит другое' : 'Похожие названия'}</div>
                <div class="merge-group-variants">
                    <div class="merge-variant-item main">
                        <span>✅ ${group.target.name}</span>
                        <span class="merge-variant-id">(основной)</span>
                    </div>
                    ${group.duplicates.map(d => `
                        <div class="merge-variant-item">
                            <span>📝 ${d.name}</span>
                            <button class="action-btn" onclick="quickMerge('${d.id}', '${group.target.id}')">🔗 Объединить</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function quickMerge(sourceId, targetId) {
    if (!confirm('Объединить варианты?')) return;
    mergeVariants(sourceId, targetId);
    suggestAndShowMerges();
    renderAllExercises();
    renderExerciseVariants();
}

// === МАССОВОЕ ПЕРЕНАЗНАЧЕНИЕ ===

function openBulkReassignModal() {
    const modal = document.getElementById('bulk-reassign-modal');
    const select = document.getElementById('f-bulk-reassign-base');
    const list = document.getElementById('f-bulk-reassign-variants');
    
    select.innerHTML = '<option value="">— выбрать базовое —</option>' +
        baseExercises.map(b => {
            const cat = getCategoryById(b.categoryId);
            return `<option value="${b.id}">${cat ? (cat.icon || '') + ' ' : ''}${b.name}</option>`;
        }).join('');
    
    list.innerHTML = exerciseVariants
        .filter(v => !v.baseExerciseId || !findBaseExerciseById(v.baseExerciseId))
        .map(v => `
            <label class="bulk-variant-item">
                <input type="checkbox" value="${v.id}">
                <span>${v.name}</span>
                <span class="variant-meta">${v.type} • ${v.metricType}</span>
            </label>
        `).join('');
    
    modal.classList.add('visible');
}

function saveBulkReassign() {
    const baseId = document.getElementById('f-bulk-reassign-base').value;
    if (!baseId) { alert('Выберите базовое упражнение'); return; }
    
    const checkboxes = document.querySelectorAll('#f-bulk-reassign-variants input:checked');
    let count = 0;
    
    checkboxes.forEach(cb => {
        if (reassignVariantToBaseExercise(cb.value, baseId)) count++;
    });
    
    closeAllModals();
    renderAllExercises();
    renderExerciseVariants();
    alert(`✅ Переназначено ${count} вариантов`);
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

// === ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ НОВЫХ ВКЛАДОК ===

window.approveNeedsReview = function(variantId) {
    const variant = findVariantById(variantId);
    if (!variant) return;
    variant.needsReview = false;
    saveExerciseData();
    syncToCloud();
    renderNeedsReviewSection();
    renderAllExercises();
    renderExerciseVariants();
    alert('✅ Упражнение подтверждено');
};

window.approveAllReviewed = function() {
    exerciseVariants.forEach(v => { v.needsReview = false; });
    saveExerciseData();
    syncToCloud();
    renderNeedsReviewSection();
    renderAllExercises();
    renderExerciseVariants();
    alert('✅ Все упражнения подтверждены');
};
