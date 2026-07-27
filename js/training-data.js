// ============================================
// 🏋️ ТРЕНИРОВКИ - API СЛОЙ БАЗЫ УПРАЖНЕНИЙ
// ============================================
//
// Архитектура:
//   UI (training-ui.js)
//       ↓
//   TrainingExerciseAPI (единый API)
//       ↓
//   ExerciseStorage (абстракция хранения)
//       ↓
//   localStorage (сейчас) / Firebase (в будущем)
//
// UI НЕ имеет прямого доступа к:
//   - localStorage
//   - ExerciseStorage
//   - внутреннему состоянию (trainingData)
// ============================================
"use strict";

// === ФИКСИРОВАННЫЕ СПРАВОЧНИКИ ===

const MUSCLE_CATEGORIES = [
    'Грудь', 'Спина', 'Ноги', 'Плечи',
    'Руки', 'Корпус', 'Фулбоди', 'Кардио', 'Другое'
];

const LOAD_TYPES = [
    { id: 'weight', label: 'С весом' },
    { id: 'bodyweight', label: 'С весом тела' },
    { id: 'cardio', label: 'Кардио' },
    { id: 'static', label: 'Статика' },
    { id: 'none', label: 'Без нагрузки' }
];

const MEASUREMENT_TYPES = [
    { id: 'reps_weight', label: 'Повторения × Вес' },
    { id: 'reps', label: 'Только повторения' },
    { id: 'time', label: 'Время' },
    { id: 'distance', label: 'Дистанция' },
    { id: 'weight_only', label: 'Только вес' }
];

const EQUIPMENT_TYPES = [
    { id: 'barbell', label: 'Штанга' },
    { id: 'dumbbell', label: 'Гантели' },
    { id: 'kettlebell', label: 'Гиря' },
    { id: 'machine', label: 'Тренажёр' },
    { id: 'cable', label: 'Блоки' },
    { id: 'bands', label: 'Резинки' },
    { id: 'bodyweight', label: 'Вес тела' },
    { id: 'other', label: 'Другое' }
];

// === ВНУТРЕННЕЕ СОСТОЯНИЕ ===
// Доступно только через TrainingExerciseAPI

let _data = {
    version: 1,             // версия структуры данных
    exercises: []           // базовые упражнения
};

// === ВСПОМОГАТЕЛЬНЫЕ ===

function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function _normalizeName(name) {
    return name.trim().toLowerCase();
}

// === ЕДИНЫЙ API ===

const TrainingExerciseAPI = {

    // -------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ
    // -------------------------------------------------------

    /** Загрузить данные из хранилища */
    load: function() {
        const stored = ExerciseStorage.load();
        if (stored) {
            // Версионирование — применяем миграции если нужно
            stored.version = stored.version || 1;
            // В будущем: if (stored.version < 2) { applyMigrationV2(stored); }
            _data = stored;
        } else {
            // Данные по умолчанию
            _data = { version: 1, exercises: [] };
        }
        return this;
    },

    /** Сохранить данные в хранилище */
    save: function() {
        ExerciseStorage.save(_data);
        return this;
    },

    /** Перезагрузить из хранилища (сбросить несохранённые изменения) */
    reload: function() {
        this.load();
        return this;
    },

    // -------------------------------------------------------
    // ЧТЕНИЕ
    // -------------------------------------------------------

    /** Получить копию всех базовых упражнений */
    getExercises: function() {
        return _data.exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            variants: ex.variants.map(v => ({ ...v }))
        }));
    },

    /** Получить базовое упражнение по ID (копия) */
    getExerciseById: function(id) {
        const ex = _data.exercises.find(e => e.id === id);
        return ex ? { ...ex, variants: ex.variants.map(v => ({ ...v })) } : null;
    },

    /** Получить версию данных */
    getVersion: function() {
        return _data.version || 1;
    },

    // -------------------------------------------------------
    // ПОИСК И ФИЛЬТРАЦИЯ
    // -------------------------------------------------------

    /** Поиск по названию (базовые + варианты) */
    searchExercises: function(query) {
        if (!query || !query.trim()) return this.getExercises();
        const q = query.toLowerCase().trim();
        return _data.exercises
            .filter(ex => {
                if (ex.name.toLowerCase().includes(q)) return true;
                return ex.variants.some(v => v.name.toLowerCase().includes(q));
            })
            .map(ex => ({
                id: ex.id,
                name: ex.name,
                variants: ex.variants.map(v => ({ ...v }))
            }));
    },

    /** Фильтр по категории мышц */
    filterExercisesByCategory: function(exercises, category) {
        if (!category || category === 'all') return exercises;
        return exercises.filter(ex => {
            return ex.variants.some(v => v.categories && v.categories.includes(category));
        });
    },

    // -------------------------------------------------------
    // МУТАЦИИ: БАЗОВЫЕ УПРАЖНЕНИЯ
    // -------------------------------------------------------

    /** Создать базовое упражнение. Возвращает созданный объект или null. */
    createBaseExercise: function(name) {
        const trimmed = name.trim();
        if (!trimmed) return null;
        if (_data.exercises.some(e => _normalizeName(e.name) === _normalizeName(trimmed))) {
            return null;
        }
        const exercise = { id: _generateId(), name: trimmed, variants: [] };
        _data.exercises.push(exercise);
        this.save();
        return { ...exercise, variants: [] };
    },

    /** Переименовать базовое упражнение. Возвращает boolean. */
    renameBaseExercise: function(id, newName) {
        const trimmed = newName.trim();
        if (!trimmed) return false;
        const exercise = _data.exercises.find(e => e.id === id);
        if (!exercise) return false;
        if (_data.exercises.some(e => e.id !== id && _normalizeName(e.name) === _normalizeName(trimmed))) {
            return false;
        }
        exercise.name = trimmed;
        this.save();
        return true;
    },

    /** Удалить базовое упражнение (только если нет вариантов). Возвращает boolean. */
    deleteBaseExercise: function(id) {
        const idx = _data.exercises.findIndex(e => e.id === id);
        if (idx === -1) return false;
        if (_data.exercises[idx].variants.length > 0) return false;
        _data.exercises.splice(idx, 1);
        this.save();
        return true;
    },

    /** Объединить два базовых упражнения (source → target). source удаляется. */
    mergeBaseExercises: function(sourceId, targetId) {
        const source = _data.exercises.find(e => e.id === sourceId);
        const target = _data.exercises.find(e => e.id === targetId);
        if (!source || !target) return false;
        if (source.id === target.id) return false;
        target.variants = target.variants.concat(source.variants);
        const idx = _data.exercises.findIndex(e => e.id === sourceId);
        _data.exercises.splice(idx, 1);
        this.save();
        return true;
    },

    // -------------------------------------------------------
    // МУТАЦИИ: ВАРИАНТЫ
    // -------------------------------------------------------

    /** Создать вариант. Возвращает созданный объект или null. */
    createVariant: function(exerciseId, data) {
        const exercise = _data.exercises.find(e => e.id === exerciseId);
        if (!exercise) return null;
        const name = (data.name || '').trim();
        if (!name) return null;
        const variant = {
            id: _generateId(),
            name: name,
            loadType: data.loadType || 'weight',
            measurementType: data.measurementType || 'reps_weight',
            equipment: data.equipment || '',
            categories: data.categories || []
        };
        exercise.variants.push(variant);
        this.save();
        return { ...variant };
    },

    /** Обновить вариант. Возвращает boolean. */
    updateVariant: function(exerciseId, variantId, data) {
        const exercise = _data.exercises.find(e => e.id === exerciseId);
        if (!exercise) return false;
        const variant = exercise.variants.find(v => v.id === variantId);
        if (!variant) return false;
        if (data.name !== undefined) {
            const trimmed = data.name.trim();
            if (!trimmed) return false;
            variant.name = trimmed;
        }
        if (data.loadType !== undefined) variant.loadType = data.loadType;
        if (data.measurementType !== undefined) variant.measurementType = data.measurementType;
        if (data.equipment !== undefined) variant.equipment = data.equipment;
        if (data.categories !== undefined) variant.categories = data.categories;
        this.save();
        return true;
    },

    /** Удалить вариант. Возвращает boolean. */
    deleteVariant: function(exerciseId, variantId) {
        const exercise = _data.exercises.find(e => e.id === exerciseId);
        if (!exercise) return false;
        const idx = exercise.variants.findIndex(v => v.id === variantId);
        if (idx === -1) return false;
        exercise.variants.splice(idx, 1);
        this.save();
        return true;
    },

    /** Переместить вариант в другое базовое упражнение. Возвращает boolean. */
    moveVariant: function(variantId, fromExerciseId, toExerciseId) {
        const from = _data.exercises.find(e => e.id === fromExerciseId);
        const to = _data.exercises.find(e => e.id === toExerciseId);
        if (!from || !to) return false;
        const idx = from.variants.findIndex(v => v.id === variantId);
        if (idx === -1) return false;
        const variant = from.variants.splice(idx, 1)[0];
        to.variants.push(variant);
        this.save();
        return true;
    }
};

// === АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ПРИ СТАРТЕ ===
TrainingExerciseAPI.load();