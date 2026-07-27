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
    version: 2,             // версия структуры данных
    exercises: [],           // базовые упражнения
    workouts: []             // тренировки
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
            // Миграция v1 → v2: добавляем workouts
            if (stored.version < 2) {
                stored.workouts = stored.workouts || [];
                stored.version = 2;
            }
            if (!Array.isArray(stored.workouts)) stored.workouts = [];
            if (!Array.isArray(stored.exercises)) stored.exercises = [];
            _data = stored;
        } else {
            // Данные по умолчанию
            _data = { version: 2, exercises: [], workouts: [] };
        }
        // Seed: если база пуста — заполняем из training-seed.js
        if (typeof SEED_EXERCISES !== 'undefined' && _data.exercises.length === 0) {
            for (var si = 0; si < SEED_EXERCISES.length; si++) {
                var sg = SEED_EXERCISES[si];
                if (_data.exercises.some(function(e) { return _normalizeName(e.name) === _normalizeName(sg.name); })) continue;
                var ex = { id: _generateId(), name: sg.name.trim(), variants: [] };
                for (var sj = 0; sj < sg.variants.length; sj++) {
                    var sv = sg.variants[sj];
                    ex.variants.push({
                        id: _generateId(),
                        name: sv.name.trim(),
                        loadType: sv.loadType || 'weight',
                        measurementType: sv.measurementType || 'reps_weight',
                        equipment: sv.equipment || '',
                        categories: sv.categories || [],
                        aliases: sv.aliases || []
                    });
                }
                _data.exercises.push(ex);
            }
            ExerciseStorage.save(_data);
        }
        return this;
    },

    /** Сохранить данные в хранилище */
    save: function() {
        ExerciseStorage.save(_data);
        // Firebase sync (ленивая проверка — db/uid доступны позже)
        try {
            if (typeof db !== 'undefined' && typeof getTargetUid === 'function') {
                var uid = getTargetUid();
                if (uid) {
                    db.ref('lera_training_v1/' + uid).set({
                        version: _data.version,
                        exercises: _data.exercises,
                        workouts: _data.workouts,
                        lastUpdated: Date.now()
                    }).catch(function() {});
                }
            }
        } catch(e) {}
        return this;
    },

    /** Перезагрузить из хранилища (сбросить несохранённые изменения) */
    reload: function() {
        this.load();
        return this;
    },

    /** Вернуть сырые данные для Firebase-синка */
    getRawData: function() {
        return _data;
    },

    /** Загрузить данные из Firebase (вызывается из auth.js) */
    loadFromFirebase: function(data) {
        if (!data) return;
        data.version = data.version || 1;
        if (data.version < 2) {
            data.workouts = data.workouts || [];
            data.version = 2;
        }
        if (!Array.isArray(data.workouts)) data.workouts = [];
        if (!Array.isArray(data.exercises)) data.exercises = [];
        _data = data;
        // Если из Firebase пришли пустые упражнения — сидируем
        if (_data.exercises.length === 0 && typeof SEED_EXERCISES !== 'undefined') {
            for (var fi = 0; fi < SEED_EXERCISES.length; fi++) {
                var fg = SEED_EXERCISES[fi];
                var fe = { id: _generateId(), name: fg.name.trim(), variants: [] };
                for (var fj = 0; fj < fg.variants.length; fj++) {
                    var fv = fg.variants[fj];
                    fe.variants.push({
                        id: _generateId(),
                        name: fv.name.trim(),
                        loadType: fv.loadType || 'weight',
                        measurementType: fv.measurementType || 'reps_weight',
                        equipment: fv.equipment || '',
                        categories: fv.categories || [],
                        aliases: fv.aliases || []
                    });
                }
                _data.exercises.push(fe);
            }
        }
        ExerciseStorage.save(_data);
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
            categories: data.categories || [],
            aliases: data.aliases || []
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
        if (data.aliases !== undefined) variant.aliases = data.aliases;
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

// ============================================
// 🏋️ ТРЕНИРОВКИ - API СЛОЙ ТРЕНИРОВОК
// ============================================
//
// Работает через то же _data, что и TrainingExerciseAPI.
// Сохраняет тренировки в _data.workouts.
// ============================================

const TrainingWorkoutAPI = {

    // -------------------------------------------------------
    // ЧТЕНИЕ
    // -------------------------------------------------------

    /** Получить копию всех тренировок (сортировка по дате DESC) */
    getWorkouts: function() {
        return _data.workouts
            .map(w => ({
                id: w.id,
                date: w.date,
                comment: w.comment || '',
                exercises: w.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) }))
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
    },

    /** Получить тренировку по ID (копия) */
    getWorkoutById: function(id) {
        const w = _data.workouts.find(w => w.id === id);
        if (!w) return null;
        return {
            id: w.id,
            date: w.date,
            comment: w.comment || '',
            exercises: w.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) }))
        };
    },

    /** Найти вариант упражнения по variantId во всех базовых упражнениях */
    getVariantById: function(variantId) {
        for (const ex of _data.exercises) {
            const v = ex.variants.find(v => v.id === variantId);
            if (v) return { ...v, baseExerciseId: ex.id, baseExerciseName: ex.name };
        }
        return null;
    },

    /** Получить все тренировки за указанную дату */
    getWorkoutsByDate: function(dateStr) {
        return _data.workouts
            .filter(w => w.date === dateStr)
            .map(w => ({
                id: w.id,
                date: w.date,
                comment: w.comment || '',
                exercises: w.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) }))
            }));
    },

    // -------------------------------------------------------
    // МУТАЦИИ
    // -------------------------------------------------------

    /** Создать тренировку. Возвращает созданный объект или null. */
    createWorkout: function(data) {
        if (!data.date) return null;
        const workout = {
            id: _generateId(),
            date: data.date,
            comment: data.comment || '',
            exercises: []    // [{ variantId, sets: [{ weight, reps, time, distance, warmup, comment }] }]
        };
        _data.workouts.push(workout);
        TrainingExerciseAPI.save();
        return { ...workout, exercises: [] };
    },

    /** Обновить поля тренировки (дата, комментарий). Возвращает boolean. */
    updateWorkout: function(id, data) {
        const workout = _data.workouts.find(w => w.id === id);
        if (!workout) return false;
        if (data.date !== undefined) workout.date = data.date;
        if (data.comment !== undefined) workout.comment = data.comment;
        TrainingExerciseAPI.save();
        return true;
    },

    /** Удалить тренировку. Возвращает boolean. */
    deleteWorkout: function(id) {
        const idx = _data.workouts.findIndex(w => w.id === id);
        if (idx === -1) return false;
        _data.workouts.splice(idx, 1);
        TrainingExerciseAPI.save();
        return true;
    },

    // -------------------------------------------------------
    // УПРАЖНЕНИЯ В ТРЕНИРОВКЕ
    // -------------------------------------------------------

    /** Добавить выполненное упражнение в тренировку. Возвращает boolean. */
    addExerciseToWorkout: function(workoutId, variantId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        // Проверяем, что такой variantId существует в базе
        const variant = this.getVariantById(variantId);
        if (!variant) return false;
        // Проверяем, не добавлен ли уже
        if (workout.exercises.some(e => e.variantId === variantId)) return false;
        workout.exercises.push({
            variantId: variantId,
            sets: []
        });
        TrainingExerciseAPI.save();
        return true;
    },

    /** Удалить выполненное упражнение из тренировки. Возвращает boolean. */
    removeExerciseFromWorkout: function(workoutId, variantId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        const idx = workout.exercises.findIndex(e => e.variantId === variantId);
        if (idx === -1) return false;
        workout.exercises.splice(idx, 1);
        TrainingExerciseAPI.save();
        return true;
    },

    // -------------------------------------------------------
    // ПОДХОДЫ
    // -------------------------------------------------------

    /** Добавить подход к упражнению в тренировке. Возвращает созданный подход или null. */
    addSet: function(workoutId, variantId, setData) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return null;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return null;
        const set = {
            id: _generateId(),
            weight: setData.weight || 0,
            reps: setData.reps || 0,
            time: setData.time || 0,
            distance: setData.distance || 0,
            warmup: !!setData.warmup,
            comment: setData.comment || ''
        };
        exercise.sets.push(set);
        TrainingExerciseAPI.save();
        return { ...set };
    },

    /** Обновить подход. Возвращает boolean. */
    updateSet: function(workoutId, variantId, setId, setData) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return false;
        const set = exercise.sets.find(s => s.id === setId);
        if (!set) return false;
        if (setData.weight !== undefined) set.weight = setData.weight;
        if (setData.reps !== undefined) set.reps = setData.reps;
        if (setData.time !== undefined) set.time = setData.time;
        if (setData.distance !== undefined) set.distance = setData.distance;
        if (setData.warmup !== undefined) set.warmup = !!setData.warmup;
        if (setData.comment !== undefined) set.comment = setData.comment;
        TrainingExerciseAPI.save();
        return true;
    },

    /** Удалить подход. Возвращает boolean. */
    deleteSet: function(workoutId, variantId, setId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return false;
        const idx = exercise.sets.findIndex(s => s.id === setId);
        if (idx === -1) return false;
        exercise.sets.splice(idx, 1);
        TrainingExerciseAPI.save();
        return true;
    },

    /** Пометить подход как разминочный */
    toggleSetWarmup: function(workoutId, variantId, setId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return false;
        const set = exercise.sets.find(s => s.id === setId);
        if (!set) return false;
        set.warmup = !set.warmup;
        TrainingExerciseAPI.save();
        return true;
    },

    /** Получить все variantId, которые уже добавлены в тренировку */
    getUsedVariantIds: function(workoutId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return [];
        return workout.exercises.map(e => e.variantId);
    },

    // -------------------------------------------------------
    // ПОРЯДОК УПРАЖНЕНИЙ
    // -------------------------------------------------------

    /** Переместить упражнение в тренировке. Возвращает boolean. */
    moveExercise: function(workoutId, fromIndex, toIndex) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        if (fromIndex < 0 || fromIndex >= workout.exercises.length) return false;
        if (toIndex < 0 || toIndex >= workout.exercises.length) return false;
        if (fromIndex === toIndex) return true;
        const [exercise] = workout.exercises.splice(fromIndex, 1);
        workout.exercises.splice(toIndex, 0, exercise);
        TrainingExerciseAPI.save();
        return true;
    },

    // -------------------------------------------------------
    // ПОРЯДОК ПОДХОДОВ
    // -------------------------------------------------------

    /** Переместить подход. Возвращает boolean. */
    moveSet: function(workoutId, variantId, fromIndex, toIndex) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return false;
        if (fromIndex < 0 || fromIndex >= exercise.sets.length) return false;
        if (toIndex < 0 || toIndex >= exercise.sets.length) return false;
        if (fromIndex === toIndex) return true;
        const [set] = exercise.sets.splice(fromIndex, 1);
        exercise.sets.splice(toIndex, 0, set);
        TrainingExerciseAPI.save();
        return true;
    },

    // -------------------------------------------------------
    // КОПИРОВАНИЕ
    // -------------------------------------------------------

    /** Копировать подход. Возвращает созданный подход или null. */
    copySet: function(workoutId, variantId, setId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return null;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return null;
        const set = exercise.sets.find(s => s.id === setId);
        if (!set) return null;
        const newSet = {
            id: _generateId(),
            weight: set.weight,
            reps: set.reps,
            time: set.time,
            distance: set.distance,
            warmup: false,
            comment: set.comment
        };
        // Вставляем после текущего
        const idx = exercise.sets.findIndex(s => s.id === setId);
        exercise.sets.splice(idx + 1, 0, newSet);
        TrainingExerciseAPI.save();
        return { ...newSet };
    },

    /** Копировать упражнение со всеми подходами. Возвращает boolean. */
    copyExercise: function(workoutId, variantId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return false;
        const exercise = workout.exercises.find(e => e.variantId === variantId);
        if (!exercise) return false;
        const newExercise = {
            variantId: variantId,
            sets: exercise.sets.map(s => ({ ...s, id: _generateId() }))
        };
        // Вставляем после текущего
        const idx = workout.exercises.findIndex(e => e.variantId === variantId);
        workout.exercises.splice(idx + 1, 0, newExercise);
        TrainingExerciseAPI.save();
        return true;
    },

    // -------------------------------------------------------
    // СТАТИСТИКА
    // -------------------------------------------------------

    /** Получить историю выполнения варианта упражнения */
    getVariantHistory: function(variantId) {
        const variant = this.getVariantById(variantId);
        if (!variant) return { variant: null, entries: [] };

        const mt = variant.measurementType || 'reps_weight';
        const workouts = this.getWorkouts();
        const entries = [];

        for (const w of workouts) {
            const we = w.exercises.find(e => e.variantId === variantId);
            if (!we || we.sets.length === 0) continue;

            const entry = {
                workoutId: w.id,
                date: w.date,
                comment: w.comment || '',
                sets: we.sets.map(s => ({ ...s }))
            };

            const working = entry.sets.filter(s => !s.warmup);
            switch (mt) {
                case 'reps_weight':
                    entry.bestWeight = working.length ? Math.max(...working.map(s => s.weight || 0)) : 0;
                    entry.totalVolume = working.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
                    entry.est1RM = working.length ? Math.max(...working.map(s => {
                        const w = s.weight || 0;
                        return (s.reps || 0) > 0 ? w * (1 + (s.reps || 0) / 30) : w;
                    })) : 0;
                    entry.bestSet = working.reduce((best, s) => {
                        const bw = best.weight || 0, sw = s.weight || 0;
                        if (sw > bw) return s;
                        if (sw === bw && (s.reps || 0) > (best.reps || 0)) return s;
                        return best;
                    }, { weight: 0, reps: 0 });
                    break;
                case 'reps':
                    entry.totalReps = working.reduce((sum, s) => sum + (s.reps || 0), 0);
                    entry.maxReps = working.length ? Math.max(...working.map(s => s.reps || 0)) : 0;
                    break;
                case 'time':
                    entry.totalTime = working.reduce((sum, s) => sum + (s.time || 0), 0);
                    entry.bestTime = working.length ? Math.max(...working.map(s => s.time || 0)) : 0;
                    break;
                case 'distance':
                    entry.totalDistance = working.reduce((sum, s) => sum + (s.distance || 0), 0);
                    entry.bestDistance = working.length ? Math.max(...working.map(s => s.distance || 0)) : 0;
                    break;
                case 'weight_only':
                    entry.bestWeight = working.length ? Math.max(...working.map(s => s.weight || 0)) : 0;
                    break;
            }
            entries.push(entry);
        }

        entries.sort((a, b) => a.date.localeCompare(b.date));

        const allWorking = entries.flatMap(e => e.sets.filter(s => !s.warmup));
        const overall = { executionCount: entries.length, totalSets: allWorking.length };

        switch (mt) {
            case 'reps_weight':
                overall.bestWeight = allWorking.length ? Math.max(...allWorking.map(s => s.weight || 0)) : 0;
                overall.totalVolume = allWorking.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
                overall.avgVolume = entries.length ? Math.round(overall.totalVolume / entries.length) : 0;
                break;
            case 'reps':
                overall.maxReps = allWorking.length ? Math.max(...allWorking.map(s => s.reps || 0)) : 0;
                overall.totalReps = allWorking.reduce((sum, s) => sum + (s.reps || 0), 0);
                break;
            case 'time':
                overall.bestTime = allWorking.length ? Math.max(...allWorking.map(s => s.time || 0)) : 0;
                overall.totalTime = allWorking.reduce((sum, s) => sum + (s.time || 0), 0);
                break;
            case 'distance':
                overall.bestDistance = allWorking.length ? Math.max(...allWorking.map(s => s.distance || 0)) : 0;
                overall.totalDistance = allWorking.reduce((sum, s) => sum + (s.distance || 0), 0);
                break;
            case 'weight_only':
                overall.bestWeight = allWorking.length ? Math.max(...allWorking.map(s => s.weight || 0)) : 0;
                break;
        }

        const last = entries.length ? entries[entries.length - 1] : null;
        overall.lastDate = last ? last.date : null;
        switch (mt) {
            case 'reps_weight':
                overall.lastResult = last ? last.bestWeight + ' кг \u00d7 ' + last.bestSet.reps : '\u2014';
                overall.lastVolume = last ? last.totalVolume : 0;
                break;
            case 'reps':
                overall.lastResult = last ? last.maxReps + ' повт.' : '\u2014';
                break;
            case 'time':
                overall.lastResult = last ? last.bestTime + ' с' : '\u2014';
                break;
            case 'distance':
                overall.lastResult = last ? last.bestDistance + ' м' : '\u2014';
                break;
            case 'weight_only':
                overall.lastResult = last ? last.bestWeight + ' кг' : '\u2014';
                break;
        }

        return { variant, entries, executionCount: entries.length, overall, measurementType: mt };
    },

    /** Получить статистику тренировки: { exerciseCount, setCount, totalVolume } */
    getWorkoutStats: function(workoutId) {
        const workout = _data.workouts.find(w => w.id === workoutId);
        if (!workout) return null;
        let exerciseCount = workout.exercises.length;
        let setCount = 0;
        let totalVolume = 0;
        workout.exercises.forEach(e => {
            setCount += e.sets.length;
            e.sets.forEach(s => {
                if (s.weight && s.reps) {
                    totalVolume += s.weight * s.reps;
                }
            });
        });
        return {
            exerciseCount: exerciseCount,
            setCount: setCount,
            totalVolume: totalVolume
        };
    }
};

// === АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ПРИ СТАРТЕ ===
TrainingExerciseAPI.load();

// Ручной вызов seed (если нужно пересоздать)
window.seedExercisesNow = function() {
    var exs = TrainingExerciseAPI.getExercises();
    if (exs.length > 0 && !confirm('База не пуста (' + exs.length + ' упр.). Пересоздать?')) return;
    _data = { version: 2, exercises: [], workouts: [] };
    if (typeof SEED_EXERCISES !== 'undefined') {
        for (var wi = 0; wi < SEED_EXERCISES.length; wi++) {
            var wg = SEED_EXERCISES[wi];
            var we = { id: _generateId(), name: wg.name.trim(), variants: [] };
            for (var wj = 0; wj < wg.variants.length; wj++) {
                var wv = wg.variants[wj];
                we.variants.push({
                    id: _generateId(),
                    name: wv.name.trim(),
                    loadType: wv.loadType || 'weight',
                    measurementType: wv.measurementType || 'reps_weight',
                    equipment: wv.equipment || '',
                    categories: wv.categories || [],
                    aliases: wv.aliases || []
                });
            }
            _data.exercises.push(we);
        }
    }
    ExerciseStorage.save(_data);
    renderTrainingExercises();
};
