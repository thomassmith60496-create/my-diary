// ============================================
// 🏋️ ТРЕНИРОВКИ - UI ОТОБРАЖЕНИЕ
// ============================================
//
// UI слой работает ТОЛЬКО через TrainingExerciseAPI.
// Никаких прямых обращений к localStorage.
// Никаких прямых обращений к ExerciseStorage.
// ============================================
"use strict";

// === СОСТОЯНИЕ UI ===
let trainingUIState = {
    searchQuery: '',
    categoryFilter: 'all',
    expandedExercises: new Set(),
    editingExerciseId: null,
    editingVariantId: null,
    editingVariantParentId: null,
    mergeSourceId: null
};

// === ГЛАВНАЯ ФУНКЦИЯ РЕНДЕРИНГА ===

function renderTrainingExercises() {
    const container = document.getElementById('training-exercises-content');
    if (!container) return;

    let exercises = TrainingExerciseAPI.searchExercises(trainingUIState.searchQuery);
    exercises = TrainingExerciseAPI.filterExercisesByCategory(exercises, trainingUIState.categoryFilter);

    // Сортируем по алфавиту
    exercises.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    let html = '';

    // === ПАНЕЛЬ УПРАВЛЕНИЯ ===
    html += '<div class="train-control-panel">';

    // Поиск
    html += '<div class="train-search-row">';
    html += '<input type="text" class="train-search-input" placeholder="🔍 Поиск упражнений..." value="' + escapeHtml(trainingUIState.searchQuery) + '" oninput="onTrainingSearch(this.value)">';
    html += '</div>';

    // Фильтр категорий
    html += '<div class="train-filter-row">';
    html += '<div class="train-category-filters">';
    html += '<button class="train-cat-btn ' + (trainingUIState.categoryFilter === 'all' ? 'active' : '') + '" onclick="setTrainingCategoryFilter(\'all\')">🏷 Все</button>';
    MUSCLE_CATEGORIES.forEach(cat => {
        html += '<button class="train-cat-btn ' + (trainingUIState.categoryFilter === cat ? 'active' : '') + '" onclick="setTrainingCategoryFilter(\'' + cat + '\')">' + cat + '</button>';
    });
    html += '</div>';
    html += '</div>';

    // Кнопка создания
    html += '<div class="train-actions-row">';
    html += '<button class="btn primary" onclick="openCreateExerciseModal()">➕ Создать упражнение</button>';
    if (trainingUIState.mergeSourceId) {
        html += '<button class="btn danger" onclick="cancelMerge()">✕ Отменить слияние</button>';
        html += '<span class="train-merge-hint">Выберите целевое упражнение для слияния</span>';
    }
    html += '</div>';
    html += '</div>';

    // === СПИСОК УПРАЖНЕНИЙ ===
    if (exercises.length === 0) {
        html += '<div class="empty-state">';
        html += '<div class="empty-state-icon">🏋️</div>';
        html += '<div class="empty-state-title">Нет упражнений</div>';
        html += '<div class="empty-state-text">Создайте первое упражнение, чтобы начать</div>';
        html += '</div>';
    } else {
        html += '<div class="train-exercise-list">';
        exercises.forEach(ex => {
            html += renderExerciseCard(ex);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

// === РЕНДЕРИНГ КАРТОЧКИ УПРАЖНЕНИЯ ===

function renderExerciseCard(exercise) {
    const isExpanded = trainingUIState.expandedExercises.has(exercise.id);
    const isEditing = trainingUIState.editingExerciseId === exercise.id;
    const isMergeTarget = trainingUIState.mergeSourceId && trainingUIState.mergeSourceId !== exercise.id;

    let html = '<div class="train-exercise-card" data-id="' + exercise.id + '">';

    // Заголовок
    html += '<div class="train-exercise-header" onclick="toggleExerciseExpand(\'' + exercise.id + '\')">';

    // Иконка раскрытия
    html += '<span class="train-expand-icon">' + (isExpanded ? '▼' : '▶') + '</span>';

    // Название
    if (isEditing) {
        html += '<input type="text" class="train-inline-edit" value="' + escapeHtml(exercise.name) + '" id="train-rename-input-' + exercise.id + '" onkeydown="if(event.key===\'Enter\')saveRenameExercise(\'' + exercise.id + '\')" onclick="event.stopPropagation()">';
    } else {
        html += '<span class="train-exercise-name">' + escapeHtml(exercise.name) + '</span>';
    }

    // Счётчик вариантов
    html += '<span class="train-variant-count">' + exercise.variants.length + ' вар.</span>';

    // Кнопки действий
    html += '<div class="train-exercise-actions" onclick="event.stopPropagation()">';

    if (isEditing) {
        html += '<button class="train-action-btn" onclick="saveRenameExercise(\'' + exercise.id + '\')" title="Сохранить">💾</button>';
        html += '<button class="train-action-btn" onclick="cancelEditExercise()" title="Отмена">✕</button>';
    } else {
        html += '<button class="train-action-btn" onclick="startRenameExercise(\'' + exercise.id + '\')" title="Переименовать">✏️</button>';

        if (exercise.variants.length === 0) {
            html += '<button class="train-action-btn" onclick="deleteExerciseConfirm(\'' + exercise.id + '\')" title="Удалить">🗑️</button>';
        }

        if (!trainingUIState.mergeSourceId) {
            html += '<button class="train-action-btn" onclick="startMergeExercise(\'' + exercise.id + '\')" title="Объединить">🔀</button>';
        } else if (isMergeTarget) {
            html += '<button class="train-action-btn merge-target" onclick="confirmMerge(\'' + trainingUIState.mergeSourceId + '\', \'' + exercise.id + '\')" title="Слить сюда">⬅️ Слить</button>';
        }

        html += '<button class="train-action-btn" onclick="openCreateVariantModal(\'' + exercise.id + '\')" title="Добавить вариант">➕</button>';
    }

    html += '</div>'; // actions
    html += '</div>'; // header

    // Варианты (раскрывающийся список)
    if (isExpanded) {
        html += '<div class="train-variants-list">';

        if (exercise.variants.length === 0) {
            html += '<div class="train-no-variants">Нет вариантов. Нажмите ➕ чтобы добавить.</div>';
        } else {
            // Сортируем варианты по алфавиту
            const sortedVariants = [...exercise.variants].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

            sortedVariants.forEach(v => {
                html += renderVariantRow(exercise.id, v);
            });
        }

        html += '</div>'; // variants-list
    }

    html += '</div>'; // card
    return html;
}

// === РЕНДЕРИНГ СТРОКИ ВАРИАНТА ===

function renderVariantRow(exerciseId, variant) {
    const isEditing = trainingUIState.editingVariantId === variant.id && trainingUIState.editingVariantParentId === exerciseId;

    let html = '<div class="train-variant-row" data-id="' + variant.id + '">';

    if (isEditing) {
        // Режим редактирования
        html += '<div class="train-variant-edit-form">';
        html += '<div class="train-edit-field">';
        html += '<label>Название</label>';
        html += '<input type="text" id="train-edit-variant-name" value="' + escapeHtml(variant.name) + '">';
        html += '</div>';

        html += '<div class="train-edit-field">';
        html += '<label>Тип нагрузки</label>';
        html += '<select id="train-edit-variant-load">';
        LOAD_TYPES.forEach(lt => {
            html += '<option value="' + lt.id + '" ' + (variant.loadType === lt.id ? 'selected' : '') + '>' + lt.label + '</option>';
        });
        html += '</select>';
        html += '</div>';

        html += '<div class="train-edit-field">';
        html += '<label>Тип измерения</label>';
        html += '<select id="train-edit-variant-measure">';
        MEASUREMENT_TYPES.forEach(mt => {
            html += '<option value="' + mt.id + '" ' + (variant.measurementType === mt.id ? 'selected' : '') + '>' + mt.label + '</option>';
        });
        html += '</select>';
        html += '</div>';

        html += '<div class="train-edit-field">';
        html += '<label>Оборудование</label>';
        html += '<select id="train-edit-variant-equip">';
        html += '<option value="">— не выбрано —</option>';
        EQUIPMENT_TYPES.forEach(eq => {
            html += '<option value="' + eq.id + '" ' + (variant.equipment === eq.id ? 'selected' : '') + '>' + eq.label + '</option>';
        });
        html += '</select>';
        html += '</div>';

        html += '<div class="train-edit-field">';
        html += '<label>Категории мышц</label>';
        html += '<div class="train-cat-checkboxes">';
        MUSCLE_CATEGORIES.forEach(cat => {
            const checked = variant.categories && variant.categories.includes(cat);
            html += '<label class="train-cat-checkbox">';
            html += '<input type="checkbox" value="' + cat + '" ' + (checked ? 'checked' : '') + ' class="train-edit-cat-checkbox">';
            html += ' ' + cat;
            html += '</label>';
        });
        html += '</div>';
        html += '</div>';

        html += '<div class="train-edit-actions">';
        html += '<button class="btn primary" onclick="saveVariantEdit(\'' + exerciseId + '\', \'' + variant.id + '\')">💾 Сохранить</button>';
        html += '<button class="btn" onclick="cancelVariantEdit()">✕ Отмена</button>';
        html += '</div>';
        html += '</div>';
    } else {
        // Режим просмотра
        const loadTypeLabel = LOAD_TYPES.find(lt => lt.id === variant.loadType);
        const measureLabel = MEASUREMENT_TYPES.find(mt => mt.id === variant.measurementType);
        const equipLabel = EQUIPMENT_TYPES.find(eq => eq.id === variant.equipment);

        html += '<div class="train-variant-info">';
        html += '<span class="train-variant-name">' + escapeHtml(variant.name) + '</span>';

        // Теги
        html += '<span class="train-variant-tags">';
        if (loadTypeLabel) html += '<span class="train-tag">' + loadTypeLabel.label + '</span>';
        if (measureLabel) html += '<span class="train-tag">' + measureLabel.label + '</span>';
        if (equipLabel) html += '<span class="train-tag">' + equipLabel.label + '</span>';
        if (variant.categories && variant.categories.length > 0) {
            variant.categories.forEach(cat => {
                html += '<span class="train-tag cat">' + cat + '</span>';
            });
        }
        html += '</span>';

        // Кнопки
        html += '<div class="train-variant-actions">';
        html += '<button class="train-action-btn" onclick="startVariantEdit(\'' + exerciseId + '\', \'' + variant.id + '\')" title="Редактировать">✏️</button>';
        html += '<button class="train-action-btn" onclick="deleteVariantConfirm(\'' + exerciseId + '\', \'' + variant.id + '\')" title="Удалить">🗑️</button>';
        html += '<button class="train-action-btn" onclick="openMoveVariantModal(\'' + exerciseId + '\', \'' + variant.id + '\', \'' + escapeHtml(variant.name) + '\')" title="Перенести">🚚</button>';
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// === ОБРАБОТЧИКИ UI ===

function onTrainingSearch(query) {
    trainingUIState.searchQuery = query;
    renderTrainingExercises();
}

function setTrainingCategoryFilter(category) {
    trainingUIState.categoryFilter = category;
    renderTrainingExercises();
}

function toggleExerciseExpand(id) {
    if (trainingUIState.expandedExercises.has(id)) {
        trainingUIState.expandedExercises.delete(id);
    } else {
        trainingUIState.expandedExercises.add(id);
    }
    renderTrainingExercises();
}

// === СОЗДАНИЕ БАЗОВОГО УПРАЖНЕНИЯ ===

function openCreateExerciseModal() {
    const name = prompt('Введите название упражнения:');
    if (!name || !name.trim()) return;

    const result = TrainingExerciseAPI.createBaseExercise(name);
    if (!result) {
        alert('❌ Упражнение с таким названием уже существует');
        return;
    }

    // API сам сохраняет — не нужно вызывать saveTrainingDataToMemory
    trainingUIState.expandedExercises.add(result.id);
    renderTrainingExercises();
}

// === ПЕРЕИМЕНОВАНИЕ ===

function startRenameExercise(id) {
    trainingUIState.editingExerciseId = id;
    renderTrainingExercises();
    setTimeout(() => {
        const input = document.getElementById('train-rename-input-' + id);
        if (input) {
            input.focus();
            input.select();
        }
    }, 50);
}

function saveRenameExercise(id) {
    const input = document.getElementById('train-rename-input-' + id);
    if (!input) return;

    const newName = input.value;
    const result = TrainingExerciseAPI.renameBaseExercise(id, newName);
    if (!result) {
        alert('❌ Не удалось переименовать. Возможно, такое название уже существует.');
        return;
    }

    trainingUIState.editingExerciseId = null;
    renderTrainingExercises();
}

function cancelEditExercise() {
    trainingUIState.editingExerciseId = null;
    renderTrainingExercises();
}

// === УДАЛЕНИЕ ===

function deleteExerciseConfirm(id) {
    if (!confirm('Вы уверены, что хотите удалить это упражнение?')) return;

    const result = TrainingExerciseAPI.deleteBaseExercise(id);
    if (!result) {
        alert('❌ Не удалось удалить. Возможно, у упражнения есть варианты.');
        return;
    }

    renderTrainingExercises();
}

// === СЛИЯНИЕ ===

function startMergeExercise(id) {
    trainingUIState.mergeSourceId = id;
    renderTrainingExercises();
}

function cancelMerge() {
    trainingUIState.mergeSourceId = null;
    renderTrainingExercises();
}

function confirmMerge(sourceId, targetId) {
    if (!confirm('Переместить все варианты из исходного упражнения в целевое? Исходное упражнение будет удалено.')) return;

    const result = TrainingExerciseAPI.mergeBaseExercises(sourceId, targetId);
    if (!result) {
        alert('❌ Не удалось выполнить слияние');
        return;
    }

    trainingUIState.mergeSourceId = null;
    renderTrainingExercises();
}

// === СОЗДАНИЕ ВАРИАНТА ===

function openCreateVariantModal(exerciseId) {
    const name = prompt('Введите название варианта:');
    if (!name || !name.trim()) return;

    const result = TrainingExerciseAPI.createVariant(exerciseId, { name: name });
    if (!result) {
        alert('❌ Не удалось создать вариант');
        return;
    }

    trainingUIState.expandedExercises.add(exerciseId);
    renderTrainingExercises();
}

// === РЕДАКТИРОВАНИЕ ВАРИАНТА ===

function startVariantEdit(exerciseId, variantId) {
    trainingUIState.editingVariantId = variantId;
    trainingUIState.editingVariantParentId = exerciseId;
    trainingUIState.expandedExercises.add(exerciseId);
    renderTrainingExercises();
}

function saveVariantEdit(exerciseId, variantId) {
    const nameInput = document.getElementById('train-edit-variant-name');
    const loadSelect = document.getElementById('train-edit-variant-load');
    const measureSelect = document.getElementById('train-edit-variant-measure');
    const equipSelect = document.getElementById('train-edit-variant-equip');

    if (!nameInput || !nameInput.value.trim()) {
        alert('❌ Название не может быть пустым');
        return;
    }

    const catCheckboxes = document.querySelectorAll('.train-edit-cat-checkbox:checked');
    const categories = Array.from(catCheckboxes).map(cb => cb.value);

    const data = {
        name: nameInput.value,
        loadType: loadSelect.value,
        measurementType: measureSelect.value,
        equipment: equipSelect.value,
        categories: categories
    };

    const result = TrainingExerciseAPI.updateVariant(exerciseId, variantId, data);
    if (!result) {
        alert('❌ Не удалось сохранить изменения');
        return;
    }

    trainingUIState.editingVariantId = null;
    trainingUIState.editingVariantParentId = null;
    renderTrainingExercises();
}

function cancelVariantEdit() {
    trainingUIState.editingVariantId = null;
    trainingUIState.editingVariantParentId = null;
    renderTrainingExercises();
}

// === УДАЛЕНИЕ ВАРИАНТА ===

function deleteVariantConfirm(exerciseId, variantId) {
    if (!confirm('Вы уверены, что хотите удалить этот вариант?')) return;

    const result = TrainingExerciseAPI.deleteVariant(exerciseId, variantId);
    if (!result) {
        alert('❌ Не удалось удалить вариант');
        return;
    }

    renderTrainingExercises();
}

// === ПЕРЕМЕЩЕНИЕ ВАРИАНТА ===

function openMoveVariantModal(fromExerciseId, variantId, variantName) {
    const allExercises = TrainingExerciseAPI.getExercises();
    const options = allExercises
        .filter(e => e.id !== fromExerciseId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    if (options.length === 0) {
        alert('❌ Нет других упражнений для перемещения');
        return;
    }

    let message = 'Переместить "' + variantName + '" в упражнение:\n';
    options.forEach((o, i) => {
        message += (i + 1) + '. ' + o.name + '\n';
    });
    message += '\nВведите номер:';

    const choice = prompt(message);
    if (!choice) return;

    const idx = parseInt(choice) - 1;
    if (isNaN(idx) || idx < 0 || idx >= options.length) {
        alert('❌ Неверный номер');
        return;
    }

    const result = TrainingExerciseAPI.moveVariant(variantId, fromExerciseId, options[idx].id);
    if (!result) {
        alert('❌ Не удалось переместить вариант');
        return;
    }

    renderTrainingExercises();
}

// === ВСПОМОГАТЕЛЬНЫЕ ===

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}