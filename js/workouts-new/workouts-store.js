// ============================================
// 🏋️ НОВЫЙ СТЕЙТ-МЕНЕДЖМЕНТ ТРЕНИРОВОК
// ============================================
// Централизованное хранилище всех сущностей.
// Заменяет разрозненные глобальные переменные:
//   workouts[], exerciseCategories[], baseExercises[], exerciseVariants[]
//
// Все мутации проходят через store — это даёт:
//   - единый источник правды
//   - возможность подписки на изменения
//   - легкую синхронизацию с Firebase
// ============================================
"use strict";

// ============================================
// ВНУТРЕННЕЕ СОСТОЯНИЕ
// ============================================

const _state = {
  // Категории мышц (встроенные + пользовательские)
  muscleCategories: window._MUSCLE_CATEGORIES 
    ? JSON.parse(JSON.stringify(window._MUSCLE_CATEGORIES)) 
    : [],
  
  // Базовые упражнения
  baseExercises: [],
  
  // Варианты упражнений
  variants: [],
  
  // Тренировки
  workouts: [],
  
  // Выполнения (связка тренировка → вариант + подходы)
  entries: [],
  
  // Несопоставленные названия (требуют проверки)
  unmatchedEntries: [],
  
  // Таблица соответствий: нормализованное_название → variantId
  aliasMap: {},
  
  // Флаг инициализации
  _initialized: false
};

// Подписчики на изменения
const _listeners = {
  muscleCategories: [],
  baseExercises: [],
  variants: [],
  workouts: [],
  entries: [],
  unmatchedEntries: [],
  aliasMap: [],
  any: []
};

// ============================================
// ВНУТРЕННИЕ ФУНКЦИИ
// ============================================

function _notify(entityType, action, payload) {
  const event = { entityType, action, payload };
  
  // Уведомляем подписчиков конкретной сущности
  if (_listeners[entityType]) {
    _listeners[entityType].forEach(fn => {
      try { fn(event); } catch (e) { console.error('[store] listener error:', e); }
    });
  }
  
  // Уведомляем глобальных подписчиков
  _listeners.any.forEach(fn => {
    try { fn(event); } catch (e) { console.error('[store] listener error:', e); }
  });
}

function _set(collection, items) {
  if (!Array.isArray(items)) {
    console.warn('[store] _set: expected array, got', typeof items);
    return;
  }
  _state[collection] = items;
}

// ============================================
// ПУБЛИЧНОЕ API
// ============================================

const WorkoutStore = {
  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================
  
  init(initialData = {}) {
    if (_state._initialized) {
      console.warn('[WorkoutStore] already initialized');
      return;
    }
    
    // Категории мышц — встроенные + пользовательские
    _state.muscleCategories = [
      ...MUSCLE_CATEGORIES,
      ...(initialData.muscleCategories || [])
    ];
    
    // Дедупликация по id
    const seenIds = new Set();
    _state.muscleCategories = _state.muscleCategories.filter(c => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });
    
    // Загружаем данные, если переданы
    if (initialData.baseExercises) _state.baseExercises = initialData.baseExercises;
    if (initialData.variants)      _state.variants = initialData.variants;
    if (initialData.workouts)      _state.workouts = initialData.workouts;
    if (initialData.entries)       _state.entries = initialData.entries;
    if (initialData.unmatchedEntries) _state.unmatchedEntries = initialData.unmatchedEntries;
    if (initialData.aliasMap)      _state.aliasMap = initialData.aliasMap;
    
    _state._initialized = true;
    _notify('any', 'init', {});
    
    console.log('[WorkoutStore] initialized with', {
      muscleCategories: _state.muscleCategories.length,
      baseExercises: _state.baseExercises.length,
      variants: _state.variants.length,
      workouts: _state.workouts.length,
      entries: _state.entries.length,
      unmatchedEntries: _state.unmatchedEntries.length,
      aliases: Object.keys(_state.aliasMap).length
    });
  },
  
  reset() {
    _state.muscleCategories = [];
    _state.baseExercises = [];
    _state.variants = [];
    _state.workouts = [];
    _state.entries = [];
    _state.unmatchedEntries = [];
    _state.aliasMap = {};
    _state._initialized = false;
    _notify('any', 'reset', {});
  },
  
  isInitialized() {
    return _state._initialized;
  },
  
  // ==========================================
  // GETTERS
  // ==========================================
  
  getMuscleCategories() {
    return [..._state.muscleCategories];
  },
  
  getBaseExercises() {
    return [..._state.baseExercises];
  },
  
  getVariants() {
    return [..._state.variants];
  },
  
  getWorkouts() {
    return [..._state.workouts];
  },
  
  getEntries() {
    return [..._state.entries];
  },
  
  getUnmatchedEntries() {
    return [..._state.unmatchedEntries];
  },
  
  getAliasMap() {
    return { ..._state.aliasMap };
  },
  
  getFullState() {
    return {
      muscleCategories: this.getMuscleCategories(),
      baseExercises: this.getBaseExercises(),
      variants: this.getVariants(),
      workouts: this.getWorkouts(),
      entries: this.getEntries(),
      unmatchedEntries: this.getUnmatchedEntries(),
      aliasMap: this.getAliasMap()
    };
  },
  
  // --------------------------------------------------
  // Поиск по ID
  // --------------------------------------------------
  
  findBaseExerciseById(id) {
    return _state.baseExercises.find(b => b.id === id) || null;
  },
  
  findVariantById(id) {
    return _state.variants.find(v => v.id === id) || null;
  },
  
  findWorkoutById(id) {
    return _state.workouts.find(w => w.id === id) || null;
  },
  
  findEntryById(id) {
    return _state.entries.find(e => e.id === id) || null;
  },
  
  findUnmatchedEntryById(id) {
    return _state.unmatchedEntries.find(e => e.id === id) || null;
  },
  
  findMuscleCategoryById(id) {
    return _state.muscleCategories.find(m => m.id === id) || null;
  },
  
  // --------------------------------------------------
  // Поиск по связям
  // --------------------------------------------------
  
  findVariantsByBaseExercise(baseExerciseId) {
    return _state.variants.filter(v => v.baseExerciseId === baseExerciseId);
  },
  
  findEntriesByWorkout(workoutId) {
    return _state.entries.filter(e => e.workoutId === workoutId);
  },
  
  findEntriesByVariant(variantId) {
    return _state.entries.filter(e => e.variantId === variantId);
  },
  
  findWorkoutsByVariant(variantId) {
    const entryWorkoutIds = new Set(
      _state.entries
        .filter(e => e.variantId === variantId)
        .map(e => e.workoutId)
    );
    return _state.workouts.filter(w => entryWorkoutIds.has(w.id));
  },
  
  // --------------------------------------------------
  // Прогресс варианта (вычисляется на лету)
  // --------------------------------------------------
  
  getVariantProgress(variantId) {
    const entries = this.findEntriesByVariant(variantId);
    
    if (entries.length === 0) return null;
    
    const variant = this.findVariantById(variantId);
    if (!variant) return null;
    
    // Собираем все подходы по всем выполнениям
    const allSets = [];
    entries.forEach(entry => {
      const workout = this.findWorkoutById(entry.workoutId);
      if (!workout) return;
      
      entry.sets.forEach(set => {
        allSets.push({
          date: workout.date,
          workoutId: entry.workoutId,
          ...set
        });
      });
    });
    
    // Сортируем по дате
    allSets.sort((a, b) => a.date.localeCompare(b.date));
    
    // Вычисляем метрики в зависимости от типа нагрузки
    const stats = {
      totalWorkouts: entries.length,
      totalSets: allSets.length,
      lastDate: allSets.length > 0 ? allSets[allSets.length - 1].date : null,
      dates: [...new Set(allSets.map(s => s.date))].sort()
    };
    
    if (variant.loadType === LOAD_TYPES.STRENGTH) {
      stats.maxWeight = Math.max(...allSets.map(s => s.weight), 0);
      stats.totalReps = allSets.reduce((sum, s) => sum + (s.reps || 0), 0);
      stats.totalVolume = allSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
      stats.oneRepMax = stats.maxWeight > 0 && stats.totalReps > 0
        ? Math.round(stats.maxWeight * (1 + stats.totalReps / 30))
        : 0;
    } else if (variant.loadType === LOAD_TYPES.CARDIO) {
      stats.maxTime = Math.max(...allSets.map(s => s.time || 0), 0);
      stats.maxDistance = Math.max(...allSets.map(s => s.distance || 0), 0);
      stats.totalTime = allSets.reduce((sum, s) => sum + (s.time || 0), 0);
      stats.totalDistance = allSets.reduce((sum, s) => sum + (s.distance || 0), 0);
    } else if (variant.loadType === LOAD_TYPES.BODYWEIGHT) {
      stats.maxReps = Math.max(...allSets.map(s => s.reps || 0), 0);
      stats.totalReps = allSets.reduce((sum, s) => sum + (s.reps || 0), 0);
    }
    
    return stats;
  },
  
  // --------------------------------------------------
  // Статистика по тренировке
  // --------------------------------------------------
  
  getWorkoutStats(workoutId) {
    const workout = this.findWorkoutById(workoutId);
    if (!workout) return null;
    
    const entries = this.findEntriesByWorkout(workoutId);
    const uniqueVariants = new Set(entries.map(e => e.variantId));
    const totalSets = entries.reduce((sum, e) => sum + e.sets.length, 0);
    
    return {
      exerciseCount: uniqueVariants.size,
      totalSets: totalSets,
      entries: entries.length,
      duration: workout.duration
    };
  },
  
  // ==========================================
  // MUTATIONS (CRUD)
  // ==========================================
  
// --------------------------------------------------
  // Muscle Categories — фиксированный справочник.
  // Пользователь НЕ может добавлять или удалять категории.
  // --------------------------------------------------
  
  // --------------------------------------------------
  // Base Exercises
  // --------------------------------------------------
  
  addBaseExercise(data) {
    const existing = _state.baseExercises.find(
      b => b.normalizedName === normalizeExerciseName(data.name)
    );
    if (existing) return existing;
    
    const base = createBaseExercise(data.name, data.muscleCategoryIds);
    _state.baseExercises.push(base);
    _notify('baseExercises', 'add', base);
    return base;
  },
  
  updateBaseExercise(id, updates) {
    const base = this.findBaseExerciseById(id);
    if (!base) return false;
    
    if (updates.name) {
      base.name = updates.name.trim();
      base.normalizedName = normalizeExerciseName(base.name);
    }
    if (updates.muscleCategoryIds !== undefined) {
      base.muscleCategoryIds = updates.muscleCategoryIds;
    }
    
    _notify('baseExercises', 'update', { id, updates });
    return true;
  },
  
  removeBaseExercise(id) {
    const idx = _state.baseExercises.findIndex(b => b.id === id);
    if (idx === -1) return false;
    
    // Проверяем, есть ли варианты, привязанные к этому базовому
    const variantCount = _state.variants.filter(v => v.baseExerciseId === id).length;
    if (variantCount > 0) {
      console.warn(`[WorkoutStore] cannot remove base exercise with ${variantCount} variants`);
      return false;
    }
    
    const removed = _state.baseExercises.splice(idx, 1)[0];
    _notify('baseExercises', 'remove', removed);
    return true;
  },
  
  // --------------------------------------------------
  // Variants
  // --------------------------------------------------
  
  addVariant(data) {
    const errors = validateVariant(data);
    if (errors.length > 0) {
      console.warn('[WorkoutStore] invalid variant:', errors);
      return null;
    }
    
    const variant = createVariant(data.name, data.baseExerciseId, data.loadType, {
      muscleIds: data.muscleIds,
      equipmentId: data.equipmentId,
      measurementType: data.measurementType,
      needsReview: data.needsReview,
      notes: data.notes
    });
    
    _state.variants.push(variant);
    _notify('variants', 'add', variant);
    return variant;
  },
  
  updateVariant(id, updates) {
    const variant = this.findVariantById(id);
    if (!variant) return false;
    
    if (updates.name) {
      variant.name = updates.name.trim();
      variant.normalizedName = normalizeExerciseName(variant.name);
    }
    if (updates.baseExerciseId !== undefined) variant.baseExerciseId = updates.baseExerciseId;
    if (updates.loadType !== undefined) variant.loadType = updates.loadType;
    if (updates.measurementType !== undefined) variant.measurementType = updates.measurementType;
    if (updates.muscleIds !== undefined) variant.muscleIds = updates.muscleIds;
    if (updates.equipmentId !== undefined) variant.equipmentId = updates.equipmentId;
    if (updates.needsReview !== undefined) variant.needsReview = updates.needsReview;
    if (updates.notes !== undefined) variant.notes = updates.notes;
    
    _notify('variants', 'update', { id, updates });
    return true;
  },
  
  removeVariant(id) {
    const idx = _state.variants.findIndex(v => v.id === id);
    if (idx === -1) return false;
    
    // Проверяем, есть ли выполнения с этим вариантом
    const entryCount = _state.entries.filter(e => e.variantId === id).length;
    if (entryCount > 0) {
      console.warn(`[WorkoutStore] cannot remove variant with ${entryCount} workout entries`);
      return false;
    }
    
    const removed = _state.variants.splice(idx, 1)[0];
    _notify('variants', 'remove', removed);
    return true;
  },
  
  /**
   * Объединить два варианта: перенести все выполнения из sourceId в targetId
   */
  mergeVariants(sourceId, targetId) {
    const source = this.findVariantById(sourceId);
    const target = this.findVariantById(targetId);
    if (!source || !target) return false;
    
    // Перенаправляем все выполнения на целевой вариант
    _state.entries.forEach(e => {
      if (e.variantId === sourceId) {
        e.variantId = targetId;
      }
    });
    
    // Удаляем исходный вариант
    _state.variants = _state.variants.filter(v => v.id !== sourceId);
    
    _notify('variants', 'merge', { sourceId, targetId });
    return true;
  },
  
  // --------------------------------------------------
  // Workouts
  // --------------------------------------------------
  
  addWorkout(data) {
    const workout = createWorkout(data.date, {
      type: data.type,
      duration: data.duration,
      time: data.time,
      rating: data.rating,
      feelBefore: data.feelBefore,
      feelAfter: data.feelAfter,
      note: data.note,
      rawLog: data.rawLog
    });
    
    _state.workouts.push(workout);
    _notify('workouts', 'add', workout);
    return workout;
  },
  
  updateWorkout(id, updates) {
    const workout = this.findWorkoutById(id);
    if (!workout) return false;
    
    const allowedFields = ['date', 'type', 'duration', 'time', 'rating', 
                           'feelBefore', 'feelAfter', 'note', 'rawLog'];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        workout[field] = updates[field];
      }
    });
    
    _notify('workouts', 'update', { id, updates });
    return true;
  },
  
  removeWorkout(id) {
    const idx = _state.workouts.findIndex(w => w.id === id);
    if (idx === -1) return false;
    
    // Удаляем связанные выполнения
    _state.entries = _state.entries.filter(e => e.workoutId !== id);
    
    const removed = _state.workouts.splice(idx, 1)[0];
    _notify('workouts', 'remove', removed);
    return true;
  },
  
  // --------------------------------------------------
  // Workout Entries (выполнения вариантов)
  // --------------------------------------------------
  
  addEntry(workoutId, variantId, sequence) {
    const workout = this.findWorkoutById(workoutId);
    const variant = this.findVariantById(variantId);
    
    if (!workout) throw new Error('Workout not found: ' + workoutId);
    if (!variant) throw new Error('Variant not found: ' + variantId);
    
    // Определяем sequence как следующий по порядку
    const existingEntries = this.findEntriesByWorkout(workoutId);
    const seq = sequence !== undefined ? sequence : existingEntries.length;
    
    const entry = createWorkoutEntry(workoutId, variantId, seq);
    _state.entries.push(entry);
    _notify('entries', 'add', entry);
    return entry;
  },
  
  addSetToEntry(entryId, setData) {
    const entry = this.findEntryById(entryId);
    if (!entry) return false;
    
    const seq = entry.sets.length;
    const set = createSet(seq);
    
    if (setData.weight !== undefined) set.weight = setData.weight;
    if (setData.reps !== undefined)   set.reps = setData.reps;
    if (setData.time !== undefined)   set.time = setData.time;
    if (setData.distance !== undefined) set.distance = setData.distance;
    if (setData.isWarmup !== undefined) set.isWarmup = setData.isWarmup;
    if (setData.notes !== undefined)  set.notes = setData.notes;
    
    entry.sets.push(set);
    _notify('entries', 'update', { id: entryId, action: 'addSet', set });
    return set;
  },
  
  updateSet(entryId, setIndex, updates) {
    const entry = this.findEntryById(entryId);
    if (!entry || setIndex < 0 || setIndex >= entry.sets.length) return false;
    
    const set = entry.sets[setIndex];
    const allowed = ['weight', 'reps', 'time', 'distance', 'isWarmup', 'notes'];
    allowed.forEach(f => {
      if (updates[f] !== undefined) set[f] = updates[f];
    });
    
    _notify('entries', 'update', { id: entryId, action: 'updateSet', setIndex });
    return true;
  },
  
  removeSet(entryId, setIndex) {
    const entry = this.findEntryById(entryId);
    if (!entry || setIndex < 0 || setIndex >= entry.sets.length) return false;
    
    entry.sets.splice(setIndex, 1);
    // Перенумеровываем последовательность
    entry.sets.forEach((s, i) => { s.sequence = i; });
    
    _notify('entries', 'update', { id: entryId, action: 'removeSet', setIndex });
    return true;
  },
  
  removeEntry(id) {
    const idx = _state.entries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    
    const removed = _state.entries.splice(idx, 1)[0];
    _notify('entries', 'remove', removed);
    return true;
  },
  
  // --------------------------------------------------
  // Несопоставленные записи (Unmatched Entries)
  // --------------------------------------------------
  
  addUnmatchedEntry(data) {
    if (!data || !data.name) return null;
    
    const entry = createUnmatchedEntry(
      data.name,
      data.rawText || data.name,
      data.context || {},
      data.source || 'manual'
    );
    
    _state.unmatchedEntries.push(entry);
    _notify('unmatchedEntries', 'add', entry);
    return entry;
  },
  
  updateUnmatchedEntry(id, updates) {
    const entry = this.findUnmatchedEntryById(id);
    if (!entry) return false;
    
    if (updates.name !== undefined) entry.name = updates.name;
    if (updates.resolvedVariantId !== undefined) entry.resolvedVariantId = updates.resolvedVariantId;
    if (updates.resolvedAt !== undefined) entry.resolvedAt = updates.resolvedAt;
    if (updates.status !== undefined) entry.status = updates.status;
    if (updates.notes !== undefined) entry.notes = updates.notes;
    
    _notify('unmatchedEntries', 'update', { id, updates });
    return true;
  },
  
  removeUnmatchedEntry(id) {
    const idx = _state.unmatchedEntries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    
    const removed = _state.unmatchedEntries.splice(idx, 1)[0];
    _notify('unmatchedEntries', 'remove', removed);
    return true;
  },
  
  /**
   * Разрешить несопоставленную запись: привязать к варианту и запомнить alias.
   * @param {string} entryId — ID записи из unmatchedEntries
   * @param {string} variantId — ID варианта, к которому привязываем
   */
  resolveUnmatchedEntry(entryId, variantId) {
    const entry = this.findUnmatchedEntryById(entryId);
    if (!entry) return false;
    const variant = this.findVariantById(variantId);
    if (!variant) return false;
    
    entry.resolvedVariantId = variantId;
    entry.resolvedAt = new Date().toISOString();
    entry.status = 'resolved';
    
    // Запоминаем alias: нормализованное название → variantId
    this.addAlias(entry.name, variantId);
    
    _notify('unmatchedEntries', 'resolve', { entryId, variantId });
    return true;
  },
  
  // --------------------------------------------------
  // Alias Map (соответствия названий)
  // --------------------------------------------------
  
  /**
   * Найти вариант по названию упражнения с учётом aliasMap.
   * Сначала проверяет direct match по normalizedName среди вариантов,
   * затем ищет в aliasMap.
   */
  resolveByName(rawName) {
    const normalized = normalizeExerciseName(rawName);
    
    // 1. Прямое совпадение среди вариантов
    const direct = _state.variants.find(v => v.normalizedName === normalized);
    if (direct) return { variant: direct, source: 'direct' };
    
    // 2. По aliasMap
    const aliasMatch = _state.aliasMap[normalized];
    if (aliasMatch) {
      const variant = this.findVariantById(aliasMatch);
      if (variant) return { variant, source: 'alias' };
    }
    
    return null;
  },
  
  /**
   * Сохранить alias (normalizedName → variantId).
   * Если alias уже существует, обновляет ссылку.
   */
  addAlias(normalizedName, variantId) {
    const key = normalizeExerciseName(normalizedName);
    if (!key) return false;
    
    const prev = _state.aliasMap[key];
    _state.aliasMap[key] = variantId;
    _notify('aliasMap', prev ? 'update' : 'add', { key, variantId, prev });
    return true;
  },
  
  removeAlias(normalizedName) {
    const key = normalizeExerciseName(normalizedName);
    if (!_state.aliasMap[key]) return false;
    
    const prev = _state.aliasMap[key];
    delete _state.aliasMap[key];
    _notify('aliasMap', 'remove', { key, prev });
    return true;
  },
  
  // --------------------------------------------------
  // Импорт старых данных (миграция)
  // --------------------------------------------------
  
  importOldWorkout(oldWorkout) {
    // Создаём тренировку
    const workout = this.addWorkout({
      date: oldWorkout.date,
      type: oldWorkout.type,
      duration: oldWorkout.duration,
      time: oldWorkout.time,
      rating: oldWorkout.rating,
      feelBefore: oldWorkout.feelBefore,
      feelAfter: oldWorkout.feelAfter,
      note: oldWorkout.note,
      rawLog: oldWorkout.log || ''
    });
    
    // Импортируем упражнения, если есть
    if (oldWorkout.parsedExercises && Array.isArray(oldWorkout.parsedExercises)) {
      oldWorkout.parsedExercises.forEach((ex, idx) => {
        // Пытаемся найти вариант по exerciseId, иначе создаём временный
        let variant = this.findVariantById(ex.exerciseId);
        
        if (!variant) {
          // Создаём базовое упражнение, если не существует
          let base = _state.baseExercises.find(b => 
            b.normalizedName === normalizeExerciseName(ex.name)
          );
          if (!base) {
            base = this.addBaseExercise({ name: ex.name });
          }
          
          // Создаём вариант
          variant = this.addVariant({
            name: ex.name,
            baseExerciseId: base.id,
            loadType: ex.type || LOAD_TYPES.STRENGTH,
            muscleIds: [],
            equipmentId: ''
          });
        }
        
        if (!variant) return;
        
        // Создаём выполнение
        const entry = this.addEntry(workout.id, variant.id, idx);
        
        // Добавляем подходы
        if (ex.sets && Array.isArray(ex.sets)) {
          ex.sets.forEach(setData => {
            this.addSetToEntry(entry.id, {
              weight: setData.weight || 0,
              reps: setData.reps || 0,
              time: setData.time || 0,
              distance: setData.distance || 0
            });
          });
        }
      });
    }
    
    return workout;
  },
  
  // ==========================================
  // ПОДПИСКА НА ИЗМЕНЕНИЯ
  // ==========================================
  
  subscribe(entityType, callback) {
    if (!_listeners[entityType]) {
      _listeners[entityType] = [];
    }
    _listeners[entityType].push(callback);
    
    // Возвращаем функцию отписки
    return () => {
      const idx = _listeners[entityType].indexOf(callback);
      if (idx !== -1) _listeners[entityType].splice(idx, 1);
    };
  },
  
  // ==========================================
  // СИНХРОНИЗАЦИЯ С FIREBASE
  // ==========================================
  
  toFirebase() {
    return {
      baseExercises: _state.baseExercises,
      variants: _state.variants,
      workouts: _state.workouts,
      entries: _state.entries,
      unmatchedEntries: _state.unmatchedEntries,
      aliasMap: _state.aliasMap,
      lastUpdated: Date.now()
    };
  },
  
  fromFirebase(data) {
    if (!data) return;
    if (data.baseExercises)     _state.baseExercises = data.baseExercises;
    if (data.variants)          _state.variants = data.variants;
    if (data.workouts)          _state.workouts = data.workouts;
    if (data.entries)           _state.entries = data.entries;
    if (data.unmatchedEntries)  _state.unmatchedEntries = data.unmatchedEntries;
    if (data.aliasMap)          _state.aliasMap = data.aliasMap;
    _notify('any', 'sync', {});
  }
};

// ============================================
// ЭКСПОРТ
// ============================================

window.WorkoutStore = WorkoutStore;

