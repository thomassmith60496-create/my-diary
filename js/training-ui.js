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

let progressUIState = {
    period: 'all',
    muscleGroup: 'all',
    selectedVariantId: null,
    exercises: [],
    startDate: '',
    endDate: '',
    chartType: 'line',
    chartData: null,
    historyEntries: []
};

// === ГЛАВНАЯ ФУНКЦИЯ РЕНДЕРИНГА ===

window.renderTrainingExercises = function() {
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
    html += '<button class="btn" onclick="openImportTraining()">📥 Импорт тренировок</button>';
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

window.renderExerciseCard = function(exercise) {
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

window.renderVariantRow = function(exerciseId, variant) {
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
        html += '<button class="train-action-btn" onclick="showVariantProgress(\'' + variant.id + '\')" title="Прогресс">📊</button>';
        html += '<button class="train-action-btn" onclick="deleteVariantConfirm(\'' + exerciseId + '\', \'' + variant.id + '\')" title="Удалить">🗑️</button>';
        html += '<button class="train-action-btn" onclick="openMoveVariantModal(\'' + exerciseId + '\', \'' + variant.id + '\', \'' + escapeHtml(variant.name) + '\')" title="Перенести">🚚</button>';
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// === ОБРАБОТЧИКИ UI ===

window.onTrainingSearch = function(query) {
    trainingUIState.searchQuery = query;
    renderTrainingExercises();
}

window.setTrainingCategoryFilter = function(category) {
    trainingUIState.categoryFilter = category;
    renderTrainingExercises();
}

window.toggleExerciseExpand = function(id) {
    if (trainingUIState.expandedExercises.has(id)) {
        trainingUIState.expandedExercises.delete(id);
    } else {
        trainingUIState.expandedExercises.add(id);
    }
    renderTrainingExercises();
}

// === СОЗДАНИЕ БАЗОВОГО УПРАЖНЕНИЯ ===

window.openCreateExerciseModal = function() {
    customPrompt('Введите название упражнения:', '', '', 'Создание упражнения')
        .then(name => {
            if (!name || !name.trim()) return;

            const result = TrainingExerciseAPI.createBaseExercise(name);
            if (!result) {
                customAlert('❌ Упражнение с таким названием уже существует', 'Ошибка');
                return;
            }

            // API сам сохраняет — не нужно вызывать saveTrainingDataToMemory
            trainingUIState.expandedExercises.add(result.id);
            renderTrainingExercises();
        });
}

// === ПЕРЕИМЕНОВАНИЕ ===

window.startRenameExercise = function(id) {
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

window.saveRenameExercise = function(id) {
    const input = document.getElementById('train-rename-input-' + id);
    if (!input) return;

    const newName = input.value;
    const result = TrainingExerciseAPI.renameBaseExercise(id, newName);
    if (!result) {
        customAlert('❌ Не удалось переименовать. Возможно, такое название уже существует.', 'Ошибка');
        return;
    }

    trainingUIState.editingExerciseId = null;
    renderTrainingExercises();
}

window.cancelEditExercise = function() {
    trainingUIState.editingExerciseId = null;
    renderTrainingExercises();
}

// === УДАЛЕНИЕ ===

window.deleteExerciseConfirm = function(id) {
    customConfirm('Вы уверены, что хотите удалить это упражнение?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;

            const result = TrainingExerciseAPI.deleteBaseExercise(id);
            if (!result) {
                customAlert('❌ Не удалось удалить. Возможно, у упражнения есть варианты.', 'Ошибка');
                return;
            }

            renderTrainingExercises();
        });
}

// === СЛИЯНИЕ ===

window.startMergeExercise = function(id) {
    trainingUIState.mergeSourceId = id;
    renderTrainingExercises();
}

window.cancelMerge = function() {
    trainingUIState.mergeSourceId = null;
    renderTrainingExercises();
}

window.confirmMerge = function(sourceId, targetId) {
    customConfirm('Переместить все варианты из исходного упражнения в целевое? Исходное упражнение будет удалено.', 'Подтверждение слияния')
        .then(confirmed => {
            if (!confirmed) return;

            const result = TrainingExerciseAPI.mergeBaseExercises(sourceId, targetId);
            if (!result) {
                customAlert('❌ Не удалось выполнить слияние', 'Ошибка');
                return;
            }

            trainingUIState.mergeSourceId = null;
            renderTrainingExercises();
        });
}

// === СОЗДАНИЕ ВАРИАНТА ===

window.openCreateVariantModal = function(exerciseId) {
    customPrompt('Введите название варианта:', '', '', 'Создание варианта')
        .then(name => {
            if (!name || !name.trim()) return;

            const result = TrainingExerciseAPI.createVariant(exerciseId, { name: name });
            if (!result) {
                customAlert('❌ Не удалось создать вариант', 'Ошибка');
                return;
            }

            trainingUIState.expandedExercises.add(exerciseId);
            renderTrainingExercises();
        });
}

// === РЕДАКТИРОВАНИЕ ВАРИАНТА ===

window.startVariantEdit = function(exerciseId, variantId) {
    trainingUIState.editingVariantId = variantId;
    trainingUIState.editingVariantParentId = exerciseId;
    trainingUIState.expandedExercises.add(exerciseId);
    renderTrainingExercises();
}

window.saveVariantEdit = function(exerciseId, variantId) {
    const nameInput = document.getElementById('train-edit-variant-name');
    const loadSelect = document.getElementById('train-edit-variant-load');
    const measureSelect = document.getElementById('train-edit-variant-measure');
    const equipSelect = document.getElementById('train-edit-variant-equip');

    if (!nameInput || !nameInput.value.trim()) {
        customAlert('❌ Название не может быть пустым', 'Ошибка');
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
        customAlert('❌ Не удалось сохранить изменения', 'Ошибка');
        return;
    }

    trainingUIState.editingVariantId = null;
    trainingUIState.editingVariantParentId = null;
    renderTrainingExercises();
}

window.cancelVariantEdit = function() {
    trainingUIState.editingVariantId = null;
    trainingUIState.editingVariantParentId = null;
    renderTrainingExercises();
}

// === УДАЛЕНИЕ ВАРИАНТА ===

window.deleteVariantConfirm = function(exerciseId, variantId) {
    customConfirm('Вы уверены, что хотите удалить этот вариант?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;

            const result = TrainingExerciseAPI.deleteVariant(exerciseId, variantId);
            if (!result) {
                customAlert('❌ Не удалось удалить вариант', 'Ошибка');
                return;
            }

            renderTrainingExercises();
        });
}

// === ПЕРЕМЕЩЕНИЕ ВАРИАНТА ===

window.openMoveVariantModal = function(fromExerciseId, variantId, variantName) {
    const allExercises = TrainingExerciseAPI.getExercises();
    const options = allExercises
        .filter(e => e.id !== fromExerciseId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    if (options.length === 0) {
        customAlert('❌ Нет других упражнений для перемещения', 'Ошибка');
        return;
    }

    let message = 'Переместить "' + variantName + '" в упражнение:\n';
    options.forEach((o, i) => {
        message += (i + 1) + '. ' + o.name + '\n';
    });
    message += '\nВведите номер:';

    customPrompt(message, '', '', 'Перемещение варианта')
        .then(choice => {
            if (!choice) return;

            const idx = parseInt(choice) - 1;
            if (isNaN(idx) || idx < 0 || idx >= options.length) {
                customAlert('❌ Неверный номер', 'Ошибка');
                return;
            }

            const result = TrainingExerciseAPI.moveVariant(variantId, fromExerciseId, options[idx].id);
            if (!result) {
                customAlert('❌ Не удалось переместить вариант', 'Ошибка');
                return;
            }

            renderTrainingExercises();
        });
}

// ============================================
// 📋 ТРЕНИРОВКИ - UI ТРЕНИРОВОК
// ============================================

// === СОСТОЯНИЕ UI ТРЕНИРОВОК ===
let workoutsUIState = {
    viewingWorkoutId: null,      // ID тренировки для просмотра/редактирования
    editingWorkoutId: null,      // ID тренировки в режиме редактирования
    editingWorkoutDate: '',      // дата при редактировании
    editingWorkoutComment: '',   // комментарий при редактировании
    addExerciseWorkoutId: null,  // ID тренировки, куда добавляем упражнение
    editSetWorkoutId: null,      // ID тренировки, где редактируем подход
    editSetVariantId: null,      // variantId упражнения, где редактируем подход
    editSetId: null,             // ID редактируемого подхода
    collapsedExercises: new Set() // свёрнутые упражнения в детальном просмотре
};

// === ГЛАВНАЯ ФУНКЦИЯ ===

window.renderTrainingWorkouts = function() {
    const container = document.getElementById('training-workouts-content');
    if (!container) return;

    // Если просматриваем конкретную тренировку
    if (workoutsUIState.viewingWorkoutId) {
        container.innerHTML = renderWorkoutDetail(workoutsUIState.viewingWorkoutId);
        return;
    }

    const workouts = TrainingWorkoutAPI.getWorkouts();

    let html = '';

    // === ПАНЕЛЬ УПРАВЛЕНИЯ ===
    html += '<div class="train-control-panel">';
    html += '<div class="train-actions-row">';
    html += '<button class="btn primary" onclick="openCreateWorkoutModal()">➕ Новая тренировка</button>';
    html += '<button class="btn" onclick="openImportTraining()" style="margin-left:8px;">📥 Импорт из GymKeeper</button>';
    html += '</div>';
    html += '</div>';

    // === СПИСОК ТРЕНИРОВОК ===
    if (workouts.length === 0) {
        html += '<div class="empty-state">';
        html += '<div class="empty-state-icon">📋</div>';
        html += '<div class="empty-state-title">Нет тренировок</div>';
        html += '<div class="empty-state-text">Создайте первую тренировку, чтобы начать</div>';
        html += '</div>';
    } else {
        html += '<div class="train-workout-list">';
        workouts.forEach(w => {
            html += renderWorkoutCard(w);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

// === РЕНДЕРИНГ КАРТОЧКИ ТРЕНИРОВКИ В СПИСКЕ ===

window.renderWorkoutCard = function(workout) {
    const isEditing = workoutsUIState.editingWorkoutId === workout.id;
    const dateStr = formatDateForDisplay(workout.date);
    const exerciseCount = workout.exercises.length;
    const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);

    let html = '<div class="train-workout-card" data-id="' + workout.id + '">';

    if (isEditing) {
        // === РЕЖИМ РЕДАКТИРОВАНИЯ ===
        html += '<div class="train-workout-edit-form">';
        html += '<div class="train-edit-field">';
        html += '<label>Дата</label>';
        html += '<input type="date" id="train-edit-w-date" value="' + workout.date + '">';
        html += '</div>';
        html += '<div class="train-edit-field">';
        html += '<label>Комментарий</label>';
        html += '<textarea id="train-edit-w-comment" rows="2">' + escapeHtml(workout.comment) + '</textarea>';
        html += '</div>';
        html += '<div class="train-edit-actions">';
        html += '<button class="btn primary" onclick="saveWorkoutEdit(\'' + workout.id + '\')">💾 Сохранить</button>';
        html += '<button class="btn" onclick="cancelWorkoutEdit()">✕ Отмена</button>';
        html += '</div>';
        html += '</div>';
    } else {
        // === РЕЖИМ ПРОСМОТРА В СПИСКЕ ===
        html += '<div class="train-workout-header" onclick="viewWorkoutDetail(\'' + workout.id + '\')">';
        html += '<div class="train-workout-date">' + dateStr + '</div>';
        html += '<div class="train-workout-meta">';
        html += '<span>' + exerciseCount + ' упр.</span>';
        html += '<span>' + totalSets + ' подходов</span>';
        html += '</div>';
        if (workout.comment) {
            html += '<div class="train-workout-comment">' + escapeHtml(workout.comment) + '</div>';
        }
        html += '</div>'; // header

        // Кнопки действий
        html += '<div class="train-workout-actions">';
        html += '<button class="train-action-btn" onclick="event.stopPropagation(); startEditWorkout(\'' + workout.id + '\')" title="Редактировать">✏️</button>';
        html += '<button class="train-action-btn" onclick="event.stopPropagation(); deleteWorkoutConfirm(\'' + workout.id + '\')" title="Удалить">🗑️</button>';
        html += '</div>';
    }

    // Список упражнений (свёрнутый превью)
    if (!isEditing && workout.exercises.length > 0) {
        html += '<div class="train-workout-preview">';
        workout.exercises.forEach(e => {
            const variant = TrainingWorkoutAPI.getVariantById(e.variantId);
            const name = variant ? variant.baseExerciseName + ' — ' + variant.name : '❓ Неизвестное (' + e.variantId + ')';
            const setsSummary = e.sets.length > 0
                ? e.sets.length + ' п. | ' + renderSetSummary(e.sets, variant)
                : 'нет подходов';
            html += '<div class="train-workout-preview-item">';
            html += '<span class="train-workout-preview-name">' + escapeHtml(name) + '</span>';
            html += '<span class="train-workout-preview-sets">' + setsSummary + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    html += '</div>'; // card
    return html;
}

window.renderSetSummary = function(sets, variant) {
    if (!variant || !sets.length) return '';
    const mt = variant.measurementType || 'reps_weight';
    switch (mt) {
        case 'reps_weight':
            return sets.map(s => s.warmup
                ? (s.weight ? s.weight + 'кг' : '') + '×' + (s.reps || '—') + ' (разм)'
                : (s.weight ? s.weight + 'кг' : '') + '×' + (s.reps || '—')).join(', ');
        case 'reps':
            return sets.map(s => (s.reps || '—') + ' повт').join(', ');
        case 'time':
            return sets.map(s => (s.time || '—') + ' с').join(', ');
        case 'distance':
            return sets.map(s => (s.distance || '—') + ' м').join(', ');
        case 'weight_only':
            return sets.map(s => (s.weight ? s.weight + 'кг' : '—')).join(', ');
        default:
            return sets.length + ' подходов';
    }
}

// === ПРОСМОТР ТРЕНИРОВКИ (ДЕТАЛЬНО) ===

window.viewWorkoutDetail = function(workoutId) {
    workoutsUIState.viewingWorkoutId = workoutId;
    renderTrainingWorkouts();
}

window.closeWorkoutDetail = function() {
    workoutsUIState.viewingWorkoutId = null;
    renderTrainingWorkouts();
}

window.renderWorkoutDetail = function(workoutId) {
    const workout = TrainingWorkoutAPI.getWorkoutById(workoutId);
    if (!workout) {
        return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Тренировка не найдена</div></div>';
    }

    const dateStr = formatDateForDisplay(workout.date);
    const isEditing = workoutsUIState.editingWorkoutId === workoutId;
    const addExerciseActive = workoutsUIState.addExerciseWorkoutId === workoutId;
    const stats = TrainingWorkoutAPI.getWorkoutStats(workoutId);

    let html = '';

    // === ШАПКА ===
    html += '<div class="train-detail-header">';
    html += '<button class="train-back-btn" onclick="closeWorkoutDetail()">← Назад к списку</button>';
    html += '</div>';

    html += '<div class="train-detail-card">';

    // Дата и комментарий
    if (isEditing) {
        html += '<div class="train-edit-field">';
        html += '<label>Дата</label>';
        html += '<input type="date" id="train-edit-w-date" value="' + workout.date + '">';
        html += '</div>';
        html += '<div class="train-edit-field">';
        html += '<label>Комментарий</label>';
        html += '<textarea id="train-edit-w-comment" rows="2">' + escapeHtml(workout.comment) + '</textarea>';
        html += '</div>';
        html += '<div class="train-edit-actions">';
        html += '<button class="btn primary" onclick="saveWorkoutDetailEdit(\'' + workout.id + '\')">💾 Сохранить</button>';
        html += '<button class="btn" onclick="cancelWorkoutEdit()">✕ Отмена</button>';
        html += '</div>';
    } else {
        html += '<div class="train-detail-date">' + dateStr + '</div>';
        if (workout.comment) {
            html += '<div class="train-detail-comment">' + escapeHtml(workout.comment) + '</div>';
        }
        html += '<div class="train-detail-actions">';
        html += '<button class="btn" onclick="startEditWorkoutDetail(\'' + workout.id + '\')">✏️ Редактировать</button>';
        html += '<button class="btn danger" onclick="deleteWorkoutConfirm(\'' + workout.id + '\')">🗑️ Удалить</button>';
        html += '</div>';
    }

    // === СТАТИСТИКА ===
    if (stats && !isEditing) {
        html += '<div class="train-stats-bar">';
        html += '<div class="train-stat-item">';
        html += '<span class="train-stat-value">' + stats.exerciseCount + '</span>';
        html += '<span class="train-stat-label">упражнений</span>';
        html += '</div>';
        html += '<div class="train-stat-item">';
        html += '<span class="train-stat-value">' + stats.setCount + '</span>';
        html += '<span class="train-stat-label">подходов</span>';
        html += '</div>';
        if (stats.totalVolume > 0) {
            html += '<div class="train-stat-item">';
            html += '<span class="train-stat-value">' + Math.round(stats.totalVolume).toLocaleString() + '</span>';
            html += '<span class="train-stat-label">кг (объём)</span>';
            html += '</div>';
        }
        html += '</div>';
    }

    // === СПИСОК УПРАЖНЕНИЙ ===
    html += '<div class="train-detail-exercises">';
    html += '<h3 class="train-detail-section-title">Упражнения</h3>';

    if (workout.exercises.length === 0) {
        html += '<div class="empty-state" style="padding:16px;">';
        html += '<div class="empty-state-text">Нет упражнений. Добавьте первое.</div>';
        html += '</div>';
    } else {
        workout.exercises.forEach((e, idx) => {
            html += renderWorkoutExerciseBlock(workout.id, e, idx, workout.exercises.length);
        });
    }

    // Кнопка добавления упражнения
    html += '<div style="margin-top:12px;">';
    if (addExerciseActive) {
        html += renderAddExerciseForm(workout.id);
    } else {
        html += '<button class="btn primary" onclick="openAddExerciseToWorkout(\'' + workout.id + '\')">➕ Добавить упражнение</button>';
    }
    html += '</div>';

    html += '</div>'; // detail-exercises
    html += '</div>'; // detail-card

    return html;
}

// === БЛОК УПРАЖНЕНИЯ В ДЕТАЛЬНОМ ПРОСМОТРЕ ===

window.renderWorkoutExerciseBlock = function(workoutId, exercise, idx, total) {
    const variant = TrainingWorkoutAPI.getVariantById(exercise.variantId);
    const name = variant
        ? escapeHtml(variant.baseExerciseName) + ' — ' + escapeHtml(variant.name)
        : '❓ Неизвестное (' + exercise.variantId + ')';
    const mt = variant ? (variant.measurementType || 'reps_weight') : 'reps_weight';
    const isCollapsed = workoutsUIState.collapsedExercises.has(exercise.variantId);

    let html = '<div class="train-detail-exercise-block" data-variant="' + exercise.variantId + '">';

    // Заголовок упражнения
    html += '<div class="train-detail-exercise-header">';
    html += '<button class="train-action-btn" onclick="toggleExerciseCollapse(\'' + exercise.variantId + '\')" title="' + (isCollapsed ? 'Развернуть' : 'Свернуть') + '">' + (isCollapsed ? '▶' : '▼') + '</button>';
    html += '<span class="train-detail-exercise-name">' + name + '</span>';
    if (variant) {
        html += '<span class="train-variant-tags" style="margin-left:8px;">';
        const measureLabel = MEASUREMENT_TYPES.find(mt2 => mt2.id === variant.measurementType);
        if (measureLabel) html += '<span class="train-tag">' + measureLabel.label + '</span>';
        html += '</span>';
    }
    
    // Кнопки порядка
    html += '<span class="train-exercise-order-btns">';
    html += '<button class="train-action-btn" onclick="moveExercise(\'' + workoutId + '\', ' + idx + ', ' + (idx - 1) + ')" title="Вверх" ' + (idx === 0 ? 'disabled' : '') + '>⬆️</button>';
    html += '<button class="train-action-btn" onclick="moveExercise(\'' + workoutId + '\', ' + idx + ', ' + (idx + 1) + ')" title="Вниз" ' + (idx === total - 1 ? 'disabled' : '') + '>⬇️</button>';
    html += '</span>';
    
    html += '<button class="train-action-btn" onclick="copyExercise(\'' + workoutId + '\', \'' + exercise.variantId + '\')" title="Копировать упражнение">📋</button>';
    html += '<button class="train-action-btn" onclick="removeExerciseFromWorkout(\'' + workoutId + '\', \'' + exercise.variantId + '\')" title="Удалить упражнение">🗑️</button>';
    html += '</div>';

    // Сворачиваемое содержимое
    html += '<div class="train-exercise-collapsible" style="display:' + (isCollapsed ? 'none' : 'block') + ';">';
    
    // Таблица подходов
    if (exercise.sets.length === 0) {
        html += '<div class="train-detail-no-sets">Нет подходов. Добавьте первый.</div>';
    } else {
        html += '<div class="train-sets-table">';
        html += '<div class="train-sets-table-header">';
        html += renderSetHeaderRow(mt);
        html += '</div>';
        exercise.sets.forEach((set, idx) => {
            html += renderSetRow(workoutId, exercise.variantId, set, idx + 1, mt, exercise.sets.length);
        });
        html += '</div>';
    }

    // Форма добавления подхода
    html += '<div class="train-add-set-form" data-variant="' + exercise.variantId + '">';
    html += renderAddSetForm(workoutId, exercise.variantId, mt);
    html += '</div>';

    html += '</div>'; // collapsible

    html += '</div>'; // exercise-block
    return html;
}

window.renderSetHeaderRow = function(mt) {
    let html = '<span class="train-set-col num">#</span>';
    html += '<span class="train-set-col warmup">Разм</span>';
    switch (mt) {
        case 'reps_weight':
            html += '<span class="train-set-col weight">Вес, кг</span>';
            html += '<span class="train-set-col reps">Повт.</span>';
            break;
        case 'reps':
            html += '<span class="train-set-col reps">Повторения</span>';
            break;
        case 'time':
            html += '<span class="train-set-col time">Время, с</span>';
            break;
        case 'distance':
            html += '<span class="train-set-col dist">Дист., м</span>';
            break;
        case 'weight_only':
            html += '<span class="train-set-col weight">Вес, кг</span>';
            break;
    }
    html += '<span class="train-set-col comment">Комментарий</span>';
    html += '<span class="train-set-col actions"></span>';
    return html;
}

window.renderSetRow = function(workoutId, variantId, set, num, mt, totalSets) {
    const setIndex = num - 1; // 0-based index
    const isEditing = workoutsUIState.editSetId === set.id
        && workoutsUIState.editSetWorkoutId === workoutId
        && workoutsUIState.editSetVariantId === variantId;

    let html = '<div class="train-set-row' + (set.warmup ? ' warmup' : '') + '" data-id="' + set.id + '">';

    if (isEditing) {
        // Режим редактирования подхода
        html += '<div class="train-set-edit-form">';
        html += renderSetEditFields(set, mt);
        html += '<div class="train-set-edit-actions">';
        html += '<button class="train-action-btn" onclick="saveSetEdit(\'' + workoutId + '\', \'' + variantId + '\', \'' + set.id + '\')" title="Сохранить">💾</button>';
        html += '<button class="train-action-btn" onclick="cancelSetEdit()" title="Отмена">✕</button>';
        html += '</div>';
        html += '</div>';
    } else {
        // Режим просмотра
        html += '<span class="train-set-col num">' + num + '</span>';
        html += '<span class="train-set-col warmup">' + (set.warmup ? '🔥' : '') + '</span>';
        switch (mt) {
            case 'reps_weight':
                html += '<span class="train-set-col weight">' + (set.weight || '—') + '</span>';
                html += '<span class="train-set-col reps">' + (set.reps || '—') + '</span>';
                break;
            case 'reps':
                html += '<span class="train-set-col reps">' + (set.reps || '—') + '</span>';
                break;
            case 'time':
                html += '<span class="train-set-col time">' + (set.time || '—') + '</span>';
                break;
            case 'distance':
                html += '<span class="train-set-col dist">' + (set.distance || '—') + '</span>';
                break;
            case 'weight_only':
                html += '<span class="train-set-col weight">' + (set.weight || '—') + '</span>';
                break;
        }
        html += '<span class="train-set-col comment">' + escapeHtml(set.comment || '') + '</span>';
        html += '<span class="train-set-col actions">';
        // Кнопки порядка
        html += '<button class="train-action-btn" onclick="moveSet(\'' + workoutId + '\', \'' + variantId + '\', ' + setIndex + ', ' + (setIndex - 1) + ')" title="Вверх" ' + (setIndex === 0 ? 'disabled' : '') + '>⬆️</button>';
        html += '<button class="train-action-btn" onclick="moveSet(\'' + workoutId + '\', \'' + variantId + '\', ' + setIndex + ', ' + (setIndex + 1) + ')" title="Вниз" ' + (setIndex === totalSets - 1 ? 'disabled' : '') + '>⬇️</button>';
        html += '<button class="train-action-btn" onclick="startEditSet(\'' + workoutId + '\', \'' + variantId + '\', \'' + set.id + '\')" title="Редактировать">✏️</button>';
        html += '<button class="train-action-btn" onclick="copySet(\'' + workoutId + '\', \'' + variantId + '\', \'' + set.id + '\')" title="Копировать подход">📋</button>';
        html += '<button class="train-action-btn" onclick="addSetFromPrevious(\'' + workoutId + '\', \'' + variantId + '\')" title="Добавить по предыдущему">➕</button>';
        html += '<button class="train-action-btn" onclick="toggleSetWarmup(\'' + workoutId + '\', \'' + variantId + '\', \'' + set.id + '\')" title="Разминка">' + (set.warmup ? '➖' : '🔥') + '</button>';
        html += '<button class="train-action-btn" onclick="deleteSetConfirm(\'' + workoutId + '\', \'' + variantId + '\', \'' + set.id + '\')" title="Удалить">🗑️</button>';
        html += '</span>';
    }

    html += '</div>'; // set-row
    return html;
}

window.renderSetEditFields = function(set, mt) {
    let html = '';
    html += '<div class="train-edit-field">';
    html += '<label><input type="checkbox" ' + (set.warmup ? 'checked' : '') + ' id="train-edit-set-warmup"> Разминка</label>';
    html += '</div>';
    
    function _val(v) { return (v !== undefined && v !== null) ? v : ''; }
    
    switch (mt) {
        case 'reps_weight':
            html += '<div class="train-edit-field">';
            html += '<label>Вес, кг</label>';
            html += '<input type="number" step="0.5" id="train-edit-set-weight" value="' + _val(set.weight) + '">';
            html += '</div>';
            html += '<div class="train-edit-field">';
            html += '<label>Повторения</label>';
            html += '<input type="number" id="train-edit-set-reps" value="' + _val(set.reps) + '">';
            html += '</div>';
            break;
        case 'reps':
            html += '<div class="train-edit-field">';
            html += '<label>Повторения</label>';
            html += '<input type="number" id="train-edit-set-reps" value="' + _val(set.reps) + '">';
            html += '</div>';
            break;
        case 'time':
            html += '<div class="train-edit-field">';
            html += '<label>Время, с</label>';
            html += '<input type="number" step="0.1" id="train-edit-set-time" value="' + _val(set.time) + '">';
            html += '</div>';
            break;
        case 'distance':
            html += '<div class="train-edit-field">';
            html += '<label>Дистанция, м</label>';
            html += '<input type="number" step="1" id="train-edit-set-dist" value="' + _val(set.distance) + '">';
            html += '</div>';
            break;
        case 'weight_only':
            html += '<div class="train-edit-field">';
            html += '<label>Вес, кг</label>';
            html += '<input type="number" step="0.5" id="train-edit-set-weight" value="' + _val(set.weight) + '">';
            html += '</div>';
            break;
    }
    html += '<div class="train-edit-field">';
    html += '<label>Комментарий</label>';
    html += '<input type="text" id="train-edit-set-comment" value="' + escapeHtml(set.comment || '') + '">';
    html += '</div>';
    return html;
}

window.renderAddSetForm = function(workoutId, variantId, mt) {
    let html = '<div class="train-add-set-inline">';
    html += '<div class="train-add-set-fields">';
    html += '<label class="train-add-set-warmup"><input type="checkbox" id="train-new-set-warmup-' + variantId + '"> Разм.</label>';
    switch (mt) {
        case 'reps_weight':
            html += '<input type="number" step="0.5" class="train-set-input" id="train-new-set-weight-' + variantId + '" placeholder="Вес, кг">';
            html += '<input type="number" class="train-set-input" id="train-new-set-reps-' + variantId + '" placeholder="Повт.">';
            break;
        case 'reps':
            html += '<input type="number" class="train-set-input" id="train-new-set-reps-' + variantId + '" placeholder="Повторения">';
            break;
        case 'time':
            html += '<input type="number" step="0.1" class="train-set-input" id="train-new-set-time-' + variantId + '" placeholder="Время, с">';
            break;
        case 'distance':
            html += '<input type="number" step="1" class="train-set-input" id="train-new-set-dist-' + variantId + '" placeholder="Дист., м">';
            break;
        case 'weight_only':
            html += '<input type="number" step="0.5" class="train-set-input" id="train-new-set-weight-' + variantId + '" placeholder="Вес, кг">';
            break;
    }
    html += '<input type="text" class="train-set-input" id="train-new-set-comment-' + variantId + '" placeholder="Коммент.">';
    html += '<button class="btn primary small" onclick="addSetToExercise(\'' + workoutId + '\', \'' + variantId + '\')">➕</button>';
    html += '</div>';
    html += '</div>';
    return html;
}

// === ФОРМА ДОБАВЛЕНИЯ УПРАЖНЕНИЯ ===

window.renderAddExerciseForm = function(workoutId) {
    const allExercises = TrainingExerciseAPI.getExercises();
    const usedVariantIds = TrainingWorkoutAPI.getUsedVariantIds(workoutId);

    let html = '<div class="train-add-exercise-form">';
    html += '<h4>Выберите упражнение для добавления:</h4>';

    // Группируем по базовым упражнениям
    let hasAvailable = false;
    allExercises.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    allExercises.forEach(ex => {
        const availableVariants = ex.variants.filter(v => !usedVariantIds.includes(v.id));
        if (availableVariants.length === 0) return;
        hasAvailable = true;

        html += '<div class="train-add-exercise-group">';
        html += '<div class="train-add-exercise-group-name">' + escapeHtml(ex.name) + '</div>';
        availableVariants.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        availableVariants.forEach(v => {
            html += '<div class="train-add-exercise-item" onclick="addExerciseToWorkout(\'' + workoutId + '\', \'' + v.id + '\')">';
            html += '<span class="train-add-exercise-item-name">' + escapeHtml(v.name) + '</span>';
            const measureLabel = MEASUREMENT_TYPES.find(mt => mt.id === v.measurementType);
            if (measureLabel) html += '<span class="train-tag">' + measureLabel.label + '</span>';
            html += '</div>';
        });
        html += '</div>';
    });

    if (!hasAvailable) {
        html += '<div class="empty-state" style="padding:12px;">';
        html += '<div class="empty-state-text">Нет доступных вариантов. Все уже добавлены или база упражнений пуста.</div>';
        html += '</div>';
    }

    html += '<button class="btn" onclick="cancelAddExerciseToWorkout()" style="margin-top:8px;">✕ Отмена</button>';
    html += '</div>';
    return html;
}

// === ОБРАБОТЧИКИ ===

// --- Создание тренировки ---

window.openCreateWorkoutModal = function() {
    const today = new Date().toISOString().slice(0, 10);
    customPrompt('Введите дату тренировки (ГГГГ-ММ-ДД):', '', today, 'Новая тренировка')
        .then(date => {
            if (!date || !date.trim()) return;

            // Проверка формата даты
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
                customAlert('❌ Неверный формат даты. Используйте ГГГГ-ММ-ДД.', 'Ошибка');
                return;
            }

            const result = TrainingWorkoutAPI.createWorkout({
                date: date.trim(),
                comment: ''
            });
            if (!result) {
                customAlert('❌ Не удалось создать тренировку', 'Ошибка');
                return;
            }

            // Открываем детальный просмотр новой тренировки
            workoutsUIState.viewingWorkoutId = result.id;
            renderTrainingWorkouts();
        });
}

// --- Редактирование тренировки (в списке) ---

window.startEditWorkout = function(id) {
    workoutsUIState.editingWorkoutId = id;
    renderTrainingWorkouts();
}

window.startEditWorkoutDetail = function(id) {
    workoutsUIState.editingWorkoutId = id;
    renderTrainingWorkouts();
}

window.saveWorkoutEdit = function(id) {
    const dateInput = document.getElementById('train-edit-w-date');
    const commentInput = document.getElementById('train-edit-w-comment');
    if (!dateInput || !dateInput.value) {
        customAlert('❌ Дата обязательна', 'Ошибка');
        return;
    }
    const result = TrainingWorkoutAPI.updateWorkout(id, {
        date: dateInput.value,
        comment: commentInput ? commentInput.value : ''
    });
    if (!result) {
        customAlert('❌ Не удалось сохранить', 'Ошибка');
        return;
    }
    workoutsUIState.editingWorkoutId = null;
    renderTrainingWorkouts();
}

window.saveWorkoutDetailEdit = function(id) {
    saveWorkoutEdit(id);
}

window.cancelWorkoutEdit = function() {
    workoutsUIState.editingWorkoutId = null;
    renderTrainingWorkouts();
}

// --- Удаление тренировки ---

window.deleteWorkoutConfirm = function(id) {
    customConfirm('Вы уверены, что хотите удалить эту тренировку?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            const result = TrainingWorkoutAPI.deleteWorkout(id);
            if (!result) {
                customAlert('❌ Не удалось удалить тренировку', 'Ошибка');
                return;
            }
            // Если мы были в детальном просмотре удалённой тренировки, выходим
            if (workoutsUIState.viewingWorkoutId === id) {
                workoutsUIState.viewingWorkoutId = null;
            }
            renderTrainingWorkouts();
        });
}

// --- Добавление упражнения ---

window.openAddExerciseToWorkout = function(workoutId) {
    workoutsUIState.addExerciseWorkoutId = workoutId;
    renderTrainingWorkouts();
}

window.cancelAddExerciseToWorkout = function() {
    workoutsUIState.addExerciseWorkoutId = null;
    renderTrainingWorkouts();
}

window.addExerciseToWorkout = function(workoutId, variantId) {
    const result = TrainingWorkoutAPI.addExerciseToWorkout(workoutId, variantId);
    if (!result) {
        customAlert('❌ Не удалось добавить упражнение. Возможно, оно уже добавлено.', 'Ошибка');
        return;
    }
    workoutsUIState.addExerciseWorkoutId = null;
    // После добавления показываем детальный просмотр
    workoutsUIState.viewingWorkoutId = workoutId;
    renderTrainingWorkouts();
}

// --- Удаление упражнения ---

window.removeExerciseFromWorkout = function(workoutId, variantId) {
    customConfirm('Удалить это упражнение из тренировки?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            const result = TrainingWorkoutAPI.removeExerciseFromWorkout(workoutId, variantId);
            if (!result) {
                customAlert('❌ Не удалось удалить упражнение', 'Ошибка');
                return;
            }
            renderTrainingWorkouts();
        });
}

// --- Добавление подхода ---

window.addSetToExercise = function(workoutId, variantId) {
    const variant = TrainingWorkoutAPI.getVariantById(variantId);
    const mt = variant ? (variant.measurementType || 'reps_weight') : 'reps_weight';

    const warmupCheckbox = document.getElementById('train-new-set-warmup-' + variantId);
    const weightInput = document.getElementById('train-new-set-weight-' + variantId);
    const repsInput = document.getElementById('train-new-set-reps-' + variantId);
    const timeInput = document.getElementById('train-new-set-time-' + variantId);
    const distInput = document.getElementById('train-new-set-dist-' + variantId);
    const commentInput = document.getElementById('train-new-set-comment-' + variantId);

    const setData = {
        warmup: warmupCheckbox ? warmupCheckbox.checked : false,
        weight: weightInput ? parseFloat(weightInput.value) || 0 : 0,
        reps: repsInput ? parseInt(repsInput.value) || 0 : 0,
        time: timeInput ? parseFloat(timeInput.value) || 0 : 0,
        distance: distInput ? parseFloat(distInput.value) || 0 : 0,
        comment: commentInput ? commentInput.value : ''
    };

    const result = TrainingWorkoutAPI.addSet(workoutId, variantId, setData);
    if (!result) {
        customAlert('❌ Не удалось добавить подход', 'Ошибка');
        return;
    }

    // Очищаем поля
    if (weightInput) weightInput.value = '';
    if (repsInput) repsInput.value = '';
    if (timeInput) timeInput.value = '';
    if (distInput) distInput.value = '';
    if (commentInput) commentInput.value = '';
    if (warmupCheckbox) warmupCheckbox.checked = false;

    renderTrainingWorkouts();
}

// --- Редактирование подхода ---

window.startEditSet = function(workoutId, variantId, setId) {
    workoutsUIState.editSetWorkoutId = workoutId;
    workoutsUIState.editSetVariantId = variantId;
    workoutsUIState.editSetId = setId;
    renderTrainingWorkouts();
}

window.saveSetEdit = function(workoutId, variantId, setId) {
    const warmupCheckbox = document.getElementById('train-edit-set-warmup');
    const weightInput = document.getElementById('train-edit-set-weight');
    const repsInput = document.getElementById('train-edit-set-reps');
    const timeInput = document.getElementById('train-edit-set-time');
    const distInput = document.getElementById('train-edit-set-dist');
    const commentInput = document.getElementById('train-edit-set-comment');

    const setData = {
        warmup: warmupCheckbox ? warmupCheckbox.checked : false,
        weight: weightInput ? parseFloat(weightInput.value) || 0 : 0,
        reps: repsInput ? parseInt(repsInput.value) || 0 : 0,
        time: timeInput ? parseFloat(timeInput.value) || 0 : 0,
        distance: distInput ? parseFloat(distInput.value) || 0 : 0,
        comment: commentInput ? commentInput.value : ''
    };

    const result = TrainingWorkoutAPI.updateSet(workoutId, variantId, setId, setData);
    if (!result) {
        customAlert('❌ Не удалось сохранить подход', 'Ошибка');
        return;
    }

    cancelSetEdit();
}

window.cancelSetEdit = function() {
    workoutsUIState.editSetId = null;
    workoutsUIState.editSetWorkoutId = null;
    workoutsUIState.editSetVariantId = null;
    renderTrainingWorkouts();
}

// --- Удаление / разминка подхода ---

window.deleteSetConfirm = function(workoutId, variantId, setId) {
    customConfirm('Удалить этот подход?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            const result = TrainingWorkoutAPI.deleteSet(workoutId, variantId, setId);
            if (!result) {
                customAlert('❌ Не удалось удалить подход', 'Ошибка');
                return;
            }
            renderTrainingWorkouts();
        });
}

window.toggleSetWarmup = function(workoutId, variantId, setId) {
    TrainingWorkoutAPI.toggleSetWarmup(workoutId, variantId, setId);
    renderTrainingWorkouts();
}

// --- Перемещение упражнения ---

window.moveExercise = function(workoutId, fromIndex, toIndex) {
    if (toIndex < 0) return;
    const result = TrainingWorkoutAPI.moveExercise(workoutId, fromIndex, toIndex);
    if (!result) {
        customAlert('❌ Не удалось переместить упражнение', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// --- Перемещение подхода ---

window.moveSet = function(workoutId, variantId, fromIndex, toIndex) {
    if (toIndex < 0) return;
    const result = TrainingWorkoutAPI.moveSet(workoutId, variantId, fromIndex, toIndex);
    if (!result) {
        customAlert('❌ Не удалось переместить подход', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// --- Копирование упражнения ---

window.copyExercise = function(workoutId, variantId) {
    customConfirm('Копировать это упражнение со всеми подходами?', 'Подтверждение копирования')
        .then(confirmed => {
            if (!confirmed) return;
            const result = TrainingWorkoutAPI.copyExercise(workoutId, variantId);
            if (!result) {
                customAlert('❌ Не удалось скопировать упражнение', 'Ошибка');
                return;
            }
            renderTrainingWorkouts();
        });
}

// --- Сворачивание / разворачивание упражнения ---

window.toggleExerciseCollapse = function(variantId) {
    if (workoutsUIState.collapsedExercises.has(variantId)) {
        workoutsUIState.collapsedExercises.delete(variantId);
    } else {
        workoutsUIState.collapsedExercises.add(variantId);
    }
    renderTrainingWorkouts();
}

// --- Копирование подхода ---

window.copySet = function(workoutId, variantId, setId) {
    const result = TrainingWorkoutAPI.copySet(workoutId, variantId, setId);
    if (!result) {
        customAlert('❌ Не удалось скопировать подход', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// --- Быстрое добавление подхода по предыдущему (автозаполнение) ---

window.addSetFromPrevious = function(workoutId, variantId) {
    const workout = TrainingWorkoutAPI.getWorkoutById(workoutId);
    if (!workout) return;
    const exercise = workout.exercises.find(e => e.variantId === variantId);
    if (!exercise || exercise.sets.length === 0) {
        customAlert('Нет предыдущих подходов для копирования', 'Информация');
        return;
    }
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const setData = {
        weight: lastSet.weight || 0,
        reps: lastSet.reps || 0,
        time: lastSet.time || 0,
        distance: lastSet.distance || 0,
        warmup: false,
        comment: lastSet.comment || ''
    };
    const result = TrainingWorkoutAPI.addSet(workoutId, variantId, setData);
    if (!result) {
        customAlert('❌ Не удалось добавить подход', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// === ВСПОМОГАТЕЛЬНЫЕ ===

window.formatDateForDisplay = function(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return parts[2] + '.' + parts[1] + '.' + parts[0].slice(2);
    }
    return dateStr;
}

// ============================================
// 📊 ТРЕНИРОВКИ — АНАЛИТИКА ПРОГРЕССА
// ============================================

window.renderTrainingProgress = function() {
    const container = document.getElementById('training-progress-content');
    if (!container) return;

    const exercises = TrainingExerciseAPI.getExercises();
    const workouts = TrainingWorkoutAPI.getWorkouts();

    var variantMap = {};
    exercises.forEach(function(ex) {
        ex.variants.forEach(function(v) {
            variantMap[v.id] = { name: v.name, baseExerciseName: ex.name, categories: v.categories }; 
        });
    });

    var period = progressUIState.period || 'all';
    const now = new Date();
    let cutoffDate = null;
    if (period === 'week') {
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (period === 'month') {
        cutoffDate = new Date(now);
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (period === '3months') {
        cutoffDate = new Date(now);
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    }

    let filteredWorkouts = workouts;
    if (cutoffDate) {
        const cutoffStr = cutoffDate.toISOString().slice(0, 10);
        filteredWorkouts = workouts.filter(w => w.date >= cutoffStr);
    }

    let html = '';

    html += '<div class="train-period-selector">';
    html += '<span class="train-period-label">📅 Период:</span>';
    html += '<button class="train-period-btn' + (period === 'all' ? ' active' : '') + '" onclick="setProgressPeriod(\'all\')">Все время</button>';
    html += '<button class="train-period-btn' + (period === 'week' ? ' active' : '') + '" onclick="setProgressPeriod(\'week\')">Последняя неделя</button>';
    html += '<button class="train-period-btn' + (period === 'month' ? ' active' : '') + '" onclick="setProgressPeriod(\'month\')">Последний месяц</button>';
    html += '<button class="train-period-btn' + (period === '3months' ? ' active' : '') + '" onclick="setProgressPeriod(\'3months\')">Последние 3 месяца</button>';
    html += '</div>';

    const totalWorkouts = filteredWorkouts.length;
    const uniqueVariants = new Set(filteredWorkouts.flatMap(function(w) { return (w.exercises || []).map(function(e) { return e.variantId; }); }));
    const uniqueExercises = new Set();
    filteredWorkouts.forEach(function(w) {
        (w.exercises || []).forEach(function(e) {
            const v = variantMap[e.variantId];
            if (v && v.baseExerciseName) uniqueExercises.add(v.baseExerciseName);
        });
    });
    const dateRange = totalWorkouts > 0
        ? filteredWorkouts[0].date + ' — ' + filteredWorkouts[filteredWorkouts.length - 1].date
        : '';

    html += '<div class="train-period-label" style="margin-bottom:12px; font-size:13px; color:#64748b;">' + (dateRange || '') + '</div>';

    if (uniqueVariants.size > 0) {
        var muscleStats = {};
        MUSCLE_CATEGORIES.forEach(function(cat) { muscleStats[cat] = 0; });
        var totalSets = 0;

            filteredWorkouts.forEach(function(w) {
                (w.exercises || []).forEach(function(ex) {
                    var v = variantMap[ex.variantId] || null;
                    if (!v) return;
                    var cat = null;
                    if (v.categories) {
                        cat = MUSCLE_CATEGORIES.find(function(c) { return v.categories.indexOf(c) >= 0; });
                    }
                    var group = cat || 'Другое';
                    muscleStats[group] = (muscleStats[group] || 0) + ((ex.sets || []).length);
                    totalSets += (ex.sets || []).length;
                });
            });

            var colorPalette = ['#7e22ce', '#2563eb', '#16a34a', '#ea580c', '#dc2626', '#0891b2', '#7c3aed', '#d97706', '#059669', '#4f46e5'];
            var activeGroups = MUSCLE_CATEGORIES.filter(function(c) { return muscleStats[c] > 0; });
            var otherMuscle = muscleStats['Другое'] || 0;
    }

    html += '<div class="train-progress-summary">';
    html += '<div class="train-progress-card">';
    html += '<div class="train-progress-card-icon">🏋️</div>';
    html += '<div class="train-progress-card-value">' + totalWorkouts + '</div>';
    html += '<div class="train-progress-card-label">Тренировок</div>';
    html += '</div>';
    html += '<div class="train-progress-card">';
    html += '<div class="train-progress-card-icon">💪</div>';
    html += '<div class="train-progress-card-value">' + uniqueVariants.size + '</div>';
    html += '<div class="train-progress-card-label">Упражнений</div>';
    html += '</div>';

    if (uniqueVariants.size > 0 && totalSets > 0) {
        var svgSize = 200, cx = svgSize / 2, cy = svgSize / 2, r = 75, innerR = 44;
        var segments = [];
        var cumulativeAngle = -Math.PI / 2;

        activeGroups.forEach(function(cat, i) {
            var value = muscleStats[cat];
            var angle = (value / totalSets) * Math.PI * 2;
            segments.push({ name: cat, value: value, angle: angle, startAngle: cumulativeAngle, color: colorPalette[i % colorPalette.length] });
            cumulativeAngle += angle;
        });
        if (otherMuscle > 0) {
            segments.push({ name: 'Другое', value: otherMuscle, angle: (otherMuscle / totalSets) * Math.PI * 2, startAngle: cumulativeAngle, color: '#94a3b8' });
        }

        var donutSvg = '<svg width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '" class="train-donut-chart">';
        segments.forEach(function(seg) {
            var x1 = cx + r * Math.cos(seg.startAngle);
            var y1 = cy + r * Math.sin(seg.startAngle);
            var x2 = cx + r * Math.cos(seg.startAngle + seg.angle);
            var y2 = cy + r * Math.sin(seg.startAngle + seg.angle);
            var largeArc = seg.angle > Math.PI ? 1 : 0;
            donutSvg += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + seg.color + '" style="cursor:pointer;" title="' + seg.name + ': ' + seg.value + '"/>';
        });
        donutSvg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + innerR + '" fill="white"/>';
        donutSvg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="26" font-weight="700" fill="#1e293b">' + totalSets + '</text>';
        donutSvg += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="12" fill="#64748b">подходов</text>';
        donutSvg += '</svg>';

        html += '<div class="train-progress-card" style="display:flex;align-items:center;gap:16px;text-align:left;padding:14px;">';
        html += donutSvg;
        html += '<div style="font-size:14px;line-height:1.6;">';
        var halfLen = Math.ceil(segments.length / 2);
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">';
        segments.forEach(function(seg, si) {
            var pct = totalSets > 0 ? ((seg.value / totalSets) * 100).toFixed(1) : 0;
            html += '<div style="display:flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;background:' + seg.color + ';border-radius:50%;display:inline-block;flex-shrink:0;"></span><span style="font-size:14px;font-weight:600;color:#1e293b;">' + seg.name + '</span></div>';
            html += '<div style="font-size:14px;color:#1e293b;text-align:right;">' + seg.value + ' (' + pct + '%)</div>';
        });
        html += '</div>';
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';

    // Селектор мышечной группы
    var selectedMuscle = progressUIState.muscleGroup || 'all';
    html += '<div class="train-muscle-filter">';
    html += '<span class="train-period-label">Группа мышц:</span>';
    html += '<select class="finance-filter-select" onchange="progressUIState.muscleGroup=this.value; renderTrainingProgress();" style="min-width:200px;">';
    html += '<option value="all"' + (selectedMuscle === 'all' ? ' selected' : '') + '>Все группы</option>';
    MUSCLE_CATEGORIES.forEach(function(cat) {
        html += '<option value="' + cat + '"' + (selectedMuscle === cat ? ' selected' : '') + '>' + cat + '</option>';
    });
    html += '</select>';
    html += '</div>';

    // Список упражнений (все данные, без фильтра по периоду)
    var filteredExercises = selectedMuscle === 'all'
        ? exercises
        : exercises.filter(function(ex) {
            return ex.variants && ex.variants.some(function(v) {
                return v.categories && v.categories.indexOf(selectedMuscle) >= 0;
            });
        });

    if (filteredExercises.length === 0) {
        html += '<div class="empty-state" style="margin-top:24px;">';
        html += '<div class="empty-state-icon">🏋️</div>';
        html += '<div class="empty-state-title">Нет упражнений</div>';
        html += '<div class="empty-state-text">Нет упражнений в этой группе</div>';
        html += '</div>';
    } else {
        html += '<div class="train-progress-list">';
        filteredExercises.forEach(function(ex) {
            var hasData = false;
            ex.variants.forEach(function(v) {
                var h = TrainingWorkoutAPI.getVariantHistory(v.id);
                if (h && h.entries && h.entries.length > 0) hasData = true;
            });
            if (!hasData) return;

            var safeName = ex.name.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_');
            html += '<div class="train-exercise-block">';
            html += '<div class="train-exercise-block-header" onclick="toggleExerciseBlock(\'' + safeName + '\')">';
            html += '<span class="train-exercise-block-name">' + escapeHtml(ex.name) + '</span>';
            html += '<span class="train-exercise-block-toggle" id="tog-' + safeName + '">▶</span>';
            html += '</div>';
            html += '<div class="train-exercise-block-body" id="blk-' + safeName + '" style="display:none;">';

            ex.variants.forEach(function(v) {
                var hist = TrainingWorkoutAPI.getVariantHistory(v.id);
                var entries = hist ? hist.entries : [];
                if (!entries || entries.length === 0) return;

                var mt = hist.measurementType;
                var mtLabel = getMeasurementTypeLabel(mt);
                var overall = hist.overall || {};

                var first = entries[0];
                var last = entries[entries.length - 1];
                var startVal = getVariantSetValue(first, mt);
                var currentVal = getVariantSetValue(last, mt);
                var bestOverall = getVariantBestValue(overall, mt);

                var progressText = '';
                var progressColor = '#64748b';
                if (mt === 'reps_weight' || mt === 'weight_only') {
                    if (first.bestWeight && first.bestWeight > 0) {
                        var pct = ((last.bestWeight || 0) / first.bestWeight - 1) * 100;
                        progressText = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
                        progressColor = pct >= 0 ? '#16a34a' : '#dc2626';
                    }
                } else if (mt === 'reps') {
                    if (first.maxReps && first.maxReps > 0) {
                        var pct2 = ((last.maxReps || 0) / first.maxReps - 1) * 100;
                        progressText = (pct2 >= 0 ? '+' : '') + pct2.toFixed(1) + '%';
                        progressColor = pct2 >= 0 ? '#16a34a' : '#dc2626';
                    }
                } else if (mt === 'time') {
                    if (first.bestTime && first.bestTime > 0) {
                        var pct3 = ((last.bestTime || 0) / first.bestTime - 1) * 100;
                        progressText = (pct3 <= 0 ? '+' : '') + pct3.toFixed(1) + '%';
                        progressColor = pct3 <= 0 ? '#16a34a' : '#dc2626';
                    }
                } else if (mt === 'distance') {
                    if (first.bestDistance && first.bestDistance > 0) {
                        var pct4 = ((last.bestDistance || 0) / first.bestDistance - 1) * 100;
                        progressText = (pct4 >= 0 ? '+' : '') + pct4.toFixed(1) + '%';
                        progressColor = pct4 >= 0 ? '#16a34a' : '#dc2626';
                    }
                }

                var chartWidth = 420, chartHeight = 150;
                var padLeft = 50, padRight = 10, padTop = 10, padBottom = 30;
                var plotW = chartWidth - padLeft - padRight;
                var plotH = chartHeight - padTop - padBottom;

                var allValues = entries.map(function(e) {
                    if (mt === 'reps_weight') return e.bestWeight || 0;
                    if (mt === 'reps') return e.maxReps || 0;
                    if (mt === 'time') return e.bestTime || 0;
                    if (mt === 'distance') return e.bestDistance || 0;
                    if (mt === 'weight_only') return e.bestWeight || 0;
                    return 0;
                }).filter(function(v) { return v > 0; });

                var maxVal = allValues.length > 0 ? Math.max.apply(null, allValues) : 1;
                var minVal = allValues.length > 0 ? Math.min.apply(null, allValues) : 0;
                var yRange = maxVal - minVal || 1;

                var xStep = plotW / Math.max(entries.length - 1, 1);
                var chartPoints = entries.map(function(e, i) {
                    var val = 0;
                    if (mt === 'reps_weight') val = e.bestWeight || 0;
                    else if (mt === 'reps') val = e.maxReps || 0;
                    else if (mt === 'time') val = e.bestTime || 0;
                    else if (mt === 'distance') val = e.bestDistance || 0;
                    else if (mt === 'weight_only') val = e.bestWeight || 0;
                    var x = padLeft + i * xStep;
                    var y = padTop + plotH - ((val - minVal) / yRange) * plotH;
                    return { x: x, y: y, val: val, date: e.date };
                });

                if (entries.length < 2) {
                    html += '<div class="train-variant-card">';
                    html += '<div class="train-variant-card-header">';
                    html += '<div class="train-variant-card-title">';
                    html += '<span class="train-variant-name">' + escapeHtml(v.name) + '</span>';
                    html += '<span class="train-variant-mt-badge">' + mtLabel + '</span>';
                    html += '</div>';
                    html += '<div class="train-variant-card-stats">';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Старт</span><span class="train-variant-stat-value">' + startVal + '</span></div>';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Текущий</span><span class="train-variant-stat-value" style="font-weight:700;color:#1e293b;">' + currentVal + '</span></div>';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Прогресс</span><span class="train-variant-stat-value" style="color:' + progressColor + ';">' + (progressText || '—') + '</span></div>';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Рекорд</span><span class="train-variant-stat-value" style="color:#7e22ce;">' + bestOverall + '</span></div>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div class="train-variant-card-chart" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Для построения графика необходимо минимум 2 выполнения упражнения (сейчас: ' + entries.length + ')</div>';
                    html += '</div>';
                } else {
                    var linePath = chartPoints.map(function(p) { return p.x + ',' + p.y; }).join(' L');
                    var areaPath = 'M ' + padLeft + ',' + (padTop + plotH) + ' L ' + chartPoints.map(function(p) { return p.x + ',' + p.y; }).join(' L') + ' L ' + (padLeft + (chartPoints.length - 1) * xStep) + ',' + (padTop + plotH) + ' Z';

                    var yTicks = 4;
                    var yAxisLabels = '';
                    for (var t = 0; t <= yTicks; t++) {
                        var yVal = minVal + (yRange * t / yTicks);
                        var yPos = padTop + plotH - (yRange * t / yTicks) * plotH;
                        var yLabel = mt === 'time' ? Math.round(yVal) + 'с' : mt === 'distance' ? Math.round(yVal) + 'м' : Math.round(yVal) + '';
                        yAxisLabels += '<text x="' + (padLeft - 4) + '" y="' + (yPos + 3) + '" text-anchor="end" font-size="11" fill="#94a3b8">' + yLabel + '</text>';
                    }
                    yAxisLabels += '<text x="' + (padLeft - 4) + '" y="' + (padTop + plotH + 16) + '" text-anchor="end" font-size="10" fill="#64748b" font-weight="700">мин</text>';
                    yAxisLabels += '<text x="' + (padLeft - 4) + '" y="' + (padTop - 6) + '" text-anchor="end" font-size="10" fill="#64748b" font-weight="700">макс</text>';

                    var dateStep = Math.max(1, Math.floor(entries.length / 5));
                    var xAxisLabels = '';
                    chartPoints.forEach(function(p, i) {
                        if (i % dateStep === 0 || i === entries.length - 1) {
                            var dateParts = p.date.split('-');
                            var dateLabel = dateParts.length === 3 ? dateParts[2] + '.' + dateParts[1] : p.date.slice(5);
                            xAxisLabels += '<text x="' + p.x + '" y="' + (chartHeight - 4) + '" text-anchor="middle" font-size="11" fill="#94a3b8">' + dateLabel + '</text>';
                        }
                    });

                    var chartSvg = '<svg width="100%" height="' + chartHeight + '" viewBox="0 0 ' + chartWidth + ' ' + chartHeight + '" style="overflow:visible;">';
                    chartSvg += '<defs><linearGradient id="grad-' + safeName + '-' + v.id + '" x1="0" y1="0" x2="0" y2="1">';
                    chartSvg += '<stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>';
                    chartSvg += '<stop offset="100%" stop-color="#6366f1" stop-opacity="0.02"/>';
                    chartSvg += '</linearGradient></defs>';
                    chartSvg += '<line x1="' + padLeft + '" y1="' + (padTop + plotH) + '" x2="' + (padLeft + plotW) + '" y2="' + (padTop + plotH) + '" stroke="#e2e8f0" stroke-width="1"/>';
                    chartSvg += '<line x1="' + padLeft + '" y1="' + padTop + '" x2="' + padLeft + '" y2="' + (padTop + plotH) + '" stroke="#e2e8f0" stroke-width="1"/>';
                    chartSvg += yAxisLabels;
                    chartSvg += xAxisLabels;
                    chartSvg += '<path d="' + areaPath + '" fill="url(#grad-' + safeName + '-' + v.id + ')"/>';
                    chartSvg += '<path d="M ' + linePath + '" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
                    chartPoints.forEach(function(p) {
                        chartSvg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="white" stroke="#6366f1" stroke-width="2"/>';
                    });
                    chartPoints.forEach(function(p) {
                        chartSvg += '<text x="' + p.x + '" y="' + (p.y - 8) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#1e293b">' + p.val + '</text>';
                    });
                    chartSvg += '</svg>';

                    html += '<div class="train-variant-card">';
                    html += '<div class="train-variant-card-header">';
                    html += '<div class="train-variant-card-title">';
                    html += '<span class="train-variant-name">' + escapeHtml(v.name) + '</span>';
                    html += '<span class="train-variant-mt-badge">' + mtLabel + '</span>';
                    html += '</div>';
                    html += '<div class="train-variant-card-stats">';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Старт</span><span class="train-variant-stat-value">' + startVal + '</span></div>';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Текущий</span><span class="train-variant-stat-value" style="font-weight:700;color:#1e293b;">' + currentVal + '</span></div>';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Прогресс</span><span class="train-variant-stat-value" style="color:' + progressColor + ';">' + (progressText || '—') + '</span></div>';
                    html += '<div class="train-variant-stat"><span class="train-variant-stat-label">Рекорд</span><span class="train-variant-stat-value" style="color:#7e22ce;">' + bestOverall + '</span></div>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div class="train-variant-card-chart">' + chartSvg + '</div>';
                    html += '</div>';
                }
            });

            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function getVariantBestValue(overall, mt) {
    if (!overall) return '-';
    switch (mt) {
        case 'reps_weight': return (overall.bestWeight || 0) + ' кг';
        case 'reps': return (overall.maxReps || 0) + ' повт';
        case 'time': return (overall.bestTime || 0) + ' с';
        case 'distance': return (overall.bestDistance || 0) + ' м';
        case 'weight_only': return (overall.bestWeight || 0) + ' кг';
        default: return '-';
    }
}

function renderVariantSparklineCustom(entries, mt, width, height) {
    if (!entries || entries.length === 0) return '';

    const dataEntries = entries.filter(function(_, i) { return i % 2 === 0; }).slice(-8);
    if (dataEntries.length === 0) return '';

    var max = 1;
    dataEntries.forEach(function(entry) {
        var val = 0;
        if (mt === 'reps_weight') val = entry.bestWeight || 0;
        else if (mt === 'reps') val = entry.maxReps || 0;
        else if (mt === 'time') val = entry.bestTime || 0;
        else if (mt === 'distance') val = entry.bestDistance || 0;
        else if (mt === 'weight_only') val = entry.bestWeight || 0;
        if (val > max) max = val;
    });

    const points = dataEntries.map(function(entry, i) {
        let value = 0;
        if (mt === 'reps_weight') value = entry.bestWeight || 0;
        else if (mt === 'reps') value = entry.maxReps || 0;
        else if (mt === 'time') value = entry.bestTime || 0;
        else if (mt === 'distance') value = entry.bestDistance || 0;
        else if (mt === 'weight_only') value = entry.bestWeight || 0;
        
        const x = (i / (dataEntries.length - 1)) * width;
        const y = height - 5 - (value / max) * (height - 10);
        return x + ',' + y;
    });

const linePath = points.join(' L');
    const d = 'M ' + linePath;

    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><path d="' + d + '" fill="none" stroke="#6366f1" stroke-width="1.5"/></svg>';
}

window.showVariantProgress = function(variantId) {
    const variant = TrainingWorkoutAPI.getVariantById(variantId);
    if (!variant) return;

    const hist = TrainingWorkoutAPI.getVariantHistory(variantId);
    const name = variant.baseExerciseName + ' — ' + variant.name;
    const mt = variant.measurementType || 'reps_weight';
    const mtLabel = getMeasurementTypeLabel(mt);
    const entries = hist.entries || [];
    const overall = hist.overall || {};

    let html = '';
    html += '<div style="margin-bottom:16px;">';
    html += '<h3 style="margin:0 0 8px;font-size:16px;color:#1e293b;">' + escapeHtml(name) + '</h3>';
    html += '<span style="font-size:13px;color:#64748b;">Тип: ' + mtLabel + '</span>';
    html += '</div>';

    html += '<div class="train-progress-summary" style="margin-bottom:16px;">';
    html += '<div class="train-progress-card">';
    html += '<div class="train-progress-card-value">' + (overall.executionCount || 0) + '</div>';
    html += '<div class="train-progress-card-label">Тренировок</div>';
    html += '</div>';
    html += '<div class="train-progress-card">';
    html += '<div class="train-progress-card-value">' + (overall.totalSets || 0) + '</div>';
    html += '<div class="train-progress-card-label">Подходов</div>';
    html += '</div>';
    html += '</div>';

    const lastDateStr = overall.lastDate ? formatDateForDisplay(overall.lastDate) : '—';
    html += '<div style="font-size:13px;color:#64748b;margin-bottom:12px;">';
    html += 'Последняя запись: ' + lastDateStr + ' • ' + (overall.lastResult || '—');
    html += '</div>';

    html += '<div style="margin-bottom:12px;">';
    html += '<button class="btn" onclick="toggleHistoryTable()" style="font-size:13px;">📋 История записей</button>';
    html += '</div>';

    html += '<div id="variant-history-table" style="display:none;overflow-x:auto;">';
    html += '<table class="train-history-table">';
    html += '<thead><tr><th>Дата</th><th>Тренировка</th><th>Подходов</th><th>Комментарий</th><th>Подробнее</th></tr></thead>';
    html += '<tbody>';

    if (entries.length === 0) {
        html += '<tr><td colspan="5" style="text-align:center;padding:16px;color:#94a3b8;">Нет записей</td></tr>';
    } else {
        entries.forEach(function(entry) {
            const dateStr = formatDateForDisplay(entry.date);
            const workoutComment = entry.comment || '';
            const setCount = (entry.sets || []).length;
            const workingSets = (entry.sets || []).filter(function(s) { return !s.warmup; });

            let detailText = '';
            switch (mt) {
                case 'reps_weight':
                    detailText = 'Вес: ' + (entry.bestWeight || 0) + ' кг, Объём: ' + (entry.totalVolume || 0).toLocaleString('ru-RU') + ' кг';
                    break;
                case 'reps':
                    detailText = 'Макс: ' + (entry.maxReps || 0) + ' повт, Всего: ' + (entry.totalReps || 0) + ' повт';
                    break;
                case 'time':
                    detailText = 'Лучшее: ' + (entry.bestTime || 0) + ' с, Общее: ' + (entry.totalTime || 0) + ' с';
                    break;
                case 'distance':
                    detailText = 'Лучшее: ' + (entry.bestDistance || 0) + ' м, Общее: ' + (entry.totalDistance || 0) + ' м';
                    break;
                case 'weight_only':
                    detailText = 'Лучший вес: ' + (entry.bestWeight || 0) + ' кг';
                    break;
            }

            html += '<tr>';
            html += '<td>' + dateStr + '</td>';
            html += '<td>' + escapeHtml(workoutComment || 'Тренировка') + '</td>';
            html += '<td>' + setCount + '</td>';
            html += '<td>' + escapeHtml(workoutComment) + '</td>';
            html += '<td style="font-size:12px;color:#64748b;">' + detailText + '</td>';
            html += '</tr>';

            entry.sets.forEach(function(s, si) {
                const warmupLabel = s.warmup ? ' (разм)' : '';
                let setDetail = '';
                switch (mt) {
                    case 'reps_weight':
                        setDetail = (s.weight || 0) + ' кг × ' + (s.reps || 0) + warmupLabel;
                        break;
                    case 'reps':
                        setDetail = (s.reps || 0) + ' повт' + warmupLabel;
                        break;
                    case 'time':
                        setDetail = (s.time || 0) + ' с' + warmupLabel;
                        break;
                    case 'distance':
                        setDetail = (s.distance || 0) + ' м' + warmupLabel;
                        break;
                    case 'weight_only':
                        setDetail = (s.weight || 0) + ' кг' + warmupLabel;
                        break;
                }
                if (s.comment) setDetail += ' — ' + escapeHtml(s.comment);
                html += '<tr style="background:#f8fafc;">';
                html += '<td></td><td></td><td></td>';
                html += '<td colspan="2" style="font-size:12px;color:#64748b;">Подход #' + (si + 1) + ': ' + setDetail + '</td>';
                html += '</tr>';
            });
        });
    }

    html += '</tbody></table></div>';

    showCustomModal({
        title: '📊 Прогресс: ' + variant.name,
        message: html,
        type: 'info',
        confirmText: 'Закрыть',
        cancelText: ''
    });
}

window.toggleHistoryTable = function() {
    const el = document.getElementById('variant-history-table');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function toggleExerciseBlock(safeName) {
    var body = document.getElementById('blk-' + safeName);
    var toggle = document.getElementById('tog-' + safeName);
    if (!body) return;
    var isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (toggle) toggle.textContent = isHidden ? '▼' : '▶';
}

window.setProgressPeriod = function(period) {
    progressUIState.period = period;
    renderTrainingProgress();
}

function getMeasurementTypeLabel(mt) {
    var map = { reps_weight: 'Повт.хВес', reps: 'Повторения', time: 'Время', distance: 'Дистанция', weight_only: 'Вес' };
    return map[mt] || mt;
}

function getVariantSetValue(entry, mt) {
    if (!entry) return '-';
    switch (mt) {
        case 'reps_weight': return (entry.bestWeight || 0) + ' кг';
        case 'reps': return (entry.maxReps || 0) + ' повт';
        case 'time': return (entry.bestTime || 0) + ' с';
        case 'distance': return (entry.bestDistance || 0) + ' м';
        case 'weight_only': return (entry.bestWeight || 0) + ' кг';
        default: return '-';
    }
}

function renderVariantSparkline(hist, mt, width, height) {
    if (!hist || hist.entries.length === 0) return '';

    const entries = hist.entries.filter((_, i) => i % 2 === 0).slice(-8);
    if (entries.length === 0) return '';

    const maxValues = {
        'reps_weight': hist.overall.bestWeight || 0,
        'reps': hist.overall.maxReps || 0,
        'time': hist.overall.bestTime || 0,
        'distance': hist.overall.bestDistance || 0,
        'weight_only': hist.overall.bestWeight || 0
    };
    const max = maxValues[mt] || 1;
    const points = entries.map((entry, i) => {
        let value = 0;
        if (mt === 'reps_weight') value = entry.bestWeight || 0;
        else if (mt === 'reps') value = entry.maxReps || 0;
        else if (mt === 'time') value = entry.bestTime || 0;
        else if (mt === 'distance') value = entry.bestDistance || 0;
        else if (mt === 'weight_only') value = entry.bestWeight || 0;
        
        const x = (i / (entries.length - 1)) * width;
        const y = height - 5 - (value / max) * (height - 10);
        return `${x},${y}`;
    });

    const linePath = points.join(' L');
    const d = 'M ' + linePath;

    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><path d="' + d + '" fill="none" stroke="#6366f1" stroke-width="1.5"/></svg>';
}