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
        customAlert('❌ Не удалось переименовать. Возможно, такое название уже существует.', 'Ошибка');
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

function startMergeExercise(id) {
    trainingUIState.mergeSourceId = id;
    renderTrainingExercises();
}

function cancelMerge() {
    trainingUIState.mergeSourceId = null;
    renderTrainingExercises();
}

function confirmMerge(sourceId, targetId) {
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

function openCreateVariantModal(exerciseId) {
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

function cancelVariantEdit() {
    trainingUIState.editingVariantId = null;
    trainingUIState.editingVariantParentId = null;
    renderTrainingExercises();
}

// === УДАЛЕНИЕ ВАРИАНТА ===

function deleteVariantConfirm(exerciseId, variantId) {
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

function openMoveVariantModal(fromExerciseId, variantId, variantName) {
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

function renderTrainingWorkouts() {
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

function renderWorkoutCard(workout) {
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

function renderSetSummary(sets, variant) {
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

function viewWorkoutDetail(workoutId) {
    workoutsUIState.viewingWorkoutId = workoutId;
    renderTrainingWorkouts();
}

function closeWorkoutDetail() {
    workoutsUIState.viewingWorkoutId = null;
    renderTrainingWorkouts();
}

function renderWorkoutDetail(workoutId) {
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

function renderWorkoutExerciseBlock(workoutId, exercise, idx, total) {
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

function renderSetHeaderRow(mt) {
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

function renderSetRow(workoutId, variantId, set, num, mt, totalSets) {
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

function renderSetEditFields(set, mt) {
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

function renderAddSetForm(workoutId, variantId, mt) {
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

function renderAddExerciseForm(workoutId) {
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

function openCreateWorkoutModal() {
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

function startEditWorkout(id) {
    workoutsUIState.editingWorkoutId = id;
    renderTrainingWorkouts();
}

function startEditWorkoutDetail(id) {
    workoutsUIState.editingWorkoutId = id;
    renderTrainingWorkouts();
}

function saveWorkoutEdit(id) {
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

function saveWorkoutDetailEdit(id) {
    saveWorkoutEdit(id);
}

function cancelWorkoutEdit() {
    workoutsUIState.editingWorkoutId = null;
    renderTrainingWorkouts();
}

// --- Удаление тренировки ---

function deleteWorkoutConfirm(id) {
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

function openAddExerciseToWorkout(workoutId) {
    workoutsUIState.addExerciseWorkoutId = workoutId;
    renderTrainingWorkouts();
}

function cancelAddExerciseToWorkout() {
    workoutsUIState.addExerciseWorkoutId = null;
    renderTrainingWorkouts();
}

function addExerciseToWorkout(workoutId, variantId) {
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

function removeExerciseFromWorkout(workoutId, variantId) {
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

function addSetToExercise(workoutId, variantId) {
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

function startEditSet(workoutId, variantId, setId) {
    workoutsUIState.editSetWorkoutId = workoutId;
    workoutsUIState.editSetVariantId = variantId;
    workoutsUIState.editSetId = setId;
    renderTrainingWorkouts();
}

function saveSetEdit(workoutId, variantId, setId) {
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

function cancelSetEdit() {
    workoutsUIState.editSetId = null;
    workoutsUIState.editSetWorkoutId = null;
    workoutsUIState.editSetVariantId = null;
    renderTrainingWorkouts();
}

// --- Удаление / разминка подхода ---

function deleteSetConfirm(workoutId, variantId, setId) {
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

function toggleSetWarmup(workoutId, variantId, setId) {
    TrainingWorkoutAPI.toggleSetWarmup(workoutId, variantId, setId);
    renderTrainingWorkouts();
}

// --- Перемещение упражнения ---

function moveExercise(workoutId, fromIndex, toIndex) {
    if (toIndex < 0) return;
    const result = TrainingWorkoutAPI.moveExercise(workoutId, fromIndex, toIndex);
    if (!result) {
        customAlert('❌ Не удалось переместить упражнение', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// --- Перемещение подхода ---

function moveSet(workoutId, variantId, fromIndex, toIndex) {
    if (toIndex < 0) return;
    const result = TrainingWorkoutAPI.moveSet(workoutId, variantId, fromIndex, toIndex);
    if (!result) {
        customAlert('❌ Не удалось переместить подход', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// --- Копирование упражнения ---

function copyExercise(workoutId, variantId) {
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

function toggleExerciseCollapse(variantId) {
    if (workoutsUIState.collapsedExercises.has(variantId)) {
        workoutsUIState.collapsedExercises.delete(variantId);
    } else {
        workoutsUIState.collapsedExercises.add(variantId);
    }
    renderTrainingWorkouts();
}

// --- Копирование подхода ---

function copySet(workoutId, variantId, setId) {
    const result = TrainingWorkoutAPI.copySet(workoutId, variantId, setId);
    if (!result) {
        customAlert('❌ Не удалось скопировать подход', 'Ошибка');
        return;
    }
    renderTrainingWorkouts();
}

// --- Быстрое добавление подхода по предыдущему (автозаполнение) ---

function addSetFromPrevious(workoutId, variantId) {
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

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    // ГГГГ-ММ-ДД → ДД.ММ.ГГГГ
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return parts[2] + '.' + parts[1] + '.' + parts[0];
    }
    return dateStr;
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
