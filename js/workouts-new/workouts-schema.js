// ============================================
// 🏋️ НОВАЯ СХЕМА ДАННЫХ ТРЕНИРОВОК (v2)
// ============================================
// Сущности:
//   1. MuscleCategory  — фиксированные категории мышц (9 шт.)
//   2. BaseExercise    — контейнер для вариантов (НЕ имеет прогресса)
//   3. Variant         — единица аналитики (настоящее упражнение)
//   4. Workout         — тренировка (дата, длительность...)
//   5. WorkoutEntry    — выполнение варианта в тренировке
//   6. Set             — подход (вес, повторы, время, дистанция)
//   7. UnmatchedEntry   — несопоставленное название (требует проверки)
// ============================================
"use strict";

// ============================================
// 1. КАТЕГОРИИ МЫШЦ (ФИКСИРОВАННЫЕ)
// ============================================
// Пользователь НЕ может создавать/удалять/редактировать категории.
// Это жёстко заданный справочник.

const MUSCLE_CATEGORIES = Object.freeze([
  { id: 'muscle-chest',      name: 'Грудь',   icon: '🏋️' },
  { id: 'muscle-back',       name: 'Спина',   icon: '🏋️' },
  { id: 'muscle-legs',       name: 'Ноги',    icon: '🦵' },
  { id: 'muscle-shoulders',  name: 'Плечи',   icon: '🏋️' },
  { id: 'muscle-arms',       name: 'Руки',    icon: '💪' },
  { id: 'muscle-core',       name: 'Корпус',  icon: '🧘' },
  { id: 'muscle-fullbody',   name: 'Фулбоди', icon: '🔥' },
  { id: 'muscle-cardio',     name: 'Кардио',  icon: '🏃' },
  { id: 'muscle-other',      name: 'Другое',  icon: '📌' }
]);

const MUSCLE_CATEGORY_MAP = Object.freeze(
  Object.fromEntries(MUSCLE_CATEGORIES.map(c => [c.id, c]))
);

const VALID_MUSCLE_CATEGORY_IDS = Object.freeze(
  MUSCLE_CATEGORIES.map(c => c.id)
);

// ============================================
// 2. ТИПЫ НАГРУЗКИ
// ============================================

const LOAD_TYPES = Object.freeze({
  STRENGTH:   'strength',
  CARDIO:     'cardio',
  BODYWEIGHT: 'bodyweight',
  OTHER:      'other'
});

const LOAD_TYPE_LABELS = Object.freeze({
  [LOAD_TYPES.STRENGTH]:   '💪 Силовое',
  [LOAD_TYPES.CARDIO]:     '🏃 Кардио',
  [LOAD_TYPES.BODYWEIGHT]: '🤸 Повторения без веса',
  [LOAD_TYPES.OTHER]:      '📌 Другое'
});

const VALID_LOAD_TYPES = Object.freeze(Object.values(LOAD_TYPES));

// ============================================
// 3. ОБОРУДОВАНИЕ (справочник с id)
// ============================================
// Храним как объекты с id, чтобы можно было переименовывать
// без изменения всех упражнений, ссылающихся на оборудование.

const EQUIPMENT_LIST = Object.freeze([
  { id: 'eq-barbell',       name: 'штанга' },
  { id: 'eq-dumbbell',      name: 'гантели' },
  { id: 'eq-kettlebell',    name: 'гиря' },
  { id: 'eq-machine',       name: 'тренажёр' },
  { id: 'eq-crossover',     name: 'кроссовер' },
  { id: 'eq-band',          name: 'резинка' },
  { id: 'eq-rope',          name: 'канат' },
  { id: 'eq-bar',           name: 'турник' },
  { id: 'eq-parallel-bars', name: 'брусья' },
  { id: 'eq-mat',           name: 'коврик' },
  { id: 'eq-fitball',       name: 'фитбол' },
  { id: 'eq-bench',         name: 'скамья' },
  { id: 'eq-step',          name: 'степ-платформа' },
  { id: 'eq-expander',      name: 'эспандер' },
  { id: 'eq-foam-roller',   name: 'ролл' },
  { id: 'eq-bodyweight',    name: 'без оборудования' }
]);

const EQUIPMENT_MAP = Object.freeze(
  Object.fromEntries(EQUIPMENT_LIST.map(e => [e.id, e]))
);

const EQUIPMENT_IDS = Object.freeze(EQUIPMENT_LIST.map(e => e.id));

function getEquipmentName(id) {
  const e = EQUIPMENT_MAP[id];
  return e ? e.name : id;
}

// ============================================
// 4. ТИПЫ ИЗМЕРЕНИЙ (measurementType)
// ============================================
// Определяет, какие метрики используются для варианта упражнения.
// Не привязан жёстко к loadType — даёт гибкость.

const MEASUREMENT_TYPES = Object.freeze({
  WEIGHT_REPS:  'weight_reps',    // вес + повторения (силовые)
  TIME:         'time',           // только время (планка)
  DISTANCE_TIME: 'distance_time', // дистанция + время (кардио)
  REPS_ONLY:    'reps_only',      // только повторения (отжимания)
  WEIGHT_TIME:  'weight_time',    // вес + время (канат)
  DISTANCE_ONLY: 'distance_only', // только дистанция
  TIME_REPS:    'time_reps',      // время + повторения
  NONE:         'none'            // без метрик (растяжка)
});

const MEASUREMENT_TYPE_LABELS = Object.freeze({
  [MEASUREMENT_TYPES.WEIGHT_REPS]:   'Вес + повторения',
  [MEASUREMENT_TYPES.TIME]:          'Время',
  [MEASUREMENT_TYPES.DISTANCE_TIME]: 'Дистанция + время',
  [MEASUREMENT_TYPES.REPS_ONLY]:     'Только повторения',
  [MEASUREMENT_TYPES.WEIGHT_TIME]:   'Вес + время',
  [MEASUREMENT_TYPES.DISTANCE_ONLY]: 'Только дистанция',
  [MEASUREMENT_TYPES.TIME_REPS]:     'Время + повторения',
  [MEASUREMENT_TYPES.NONE]:          'Без метрик'
});

const VALID_MEASUREMENT_TYPES = Object.freeze(Object.values(MEASUREMENT_TYPES));

// ============================================
// 5A. СТАТУСЫ НЕСОПОСТАВЛЕННЫХ ЗАПИСЕЙ
// ============================================

const UNMATCHED_STATUS = Object.freeze({
  PENDING:  'pending',
  RESOLVED: 'resolved',
  SKIPPED:  'skipped'
});

// ============================================
// 6. ФАБРИКИ СОЗДАНИЯ СУЩНОСТЕЙ
// ============================================

let _idCounter = Date.now();

function generateId(prefix = '') {
  return prefix + (++_idCounter) + '-' + Math.random().toString(36).substr(2, 6);
}

// Примечание: MuscleCategory — фиксированный справочник (9 шт. выше).
// Пользователь НЕ может создавать новые категории мышц.
// Функция createMuscleCategory не предоставляется.

// --- BaseExercise ---

function createBaseExercise(name, muscleCategoryIds = []) {
  if (!name || !name.trim()) {
    throw new Error('BaseExercise: name is required');
  }
  return {
    id: generateId('base-'),
    name: name.trim(),
    normalizedName: normalizeExerciseName(name),
    muscleCategoryIds: Array.isArray(muscleCategoryIds) ? muscleCategoryIds : [],
    createdAt: Date.now()
  };
}

// --- Variant ---

function createVariant(name, baseExerciseId, loadType, options = {}) {
  if (!name || !name.trim()) {
    throw new Error('Variant: name is required');
  }
  if (!baseExerciseId) {
    throw new Error('Variant: baseExerciseId is required');
  }
  if (!VALID_LOAD_TYPES.includes(loadType)) {
    throw new Error('Variant: invalid loadType "' + loadType + '"');
  }

  // measurementType: если не указан, выводим из loadType
  let measurementType = options.measurementType;
  if (!measurementType || !VALID_MEASUREMENT_TYPES.includes(measurementType)) {
    switch (loadType) {
      case LOAD_TYPES.STRENGTH:   measurementType = MEASUREMENT_TYPES.WEIGHT_REPS; break;
      case LOAD_TYPES.CARDIO:     measurementType = MEASUREMENT_TYPES.DISTANCE_TIME; break;
      case LOAD_TYPES.BODYWEIGHT: measurementType = MEASUREMENT_TYPES.REPS_ONLY; break;
      default:                    measurementType = MEASUREMENT_TYPES.NONE;
    }
  }

  // equipment: сохраняем id из справочника
  const equipmentId = options.equipmentId || '';
  if (equipmentId && !EQUIPMENT_IDS.includes(equipmentId)) {
    console.warn('Variant: unknown equipmentId "' + equipmentId + '"');
  }

  return {
    id: generateId('var-'),
    name: name.trim(),
    normalizedName: normalizeExerciseName(name),
    baseExerciseId: baseExerciseId,
    loadType: loadType,
    measurementType: measurementType,
    muscleIds: options.muscleIds || [],
    equipmentId: equipmentId,
    needsReview: options.needsReview === true,
    notes: options.notes || '',
    createdAt: Date.now()
  };
}

// --- Workout ---

function createWorkout(date, options = {}) {
  if (!date) {
    throw new Error('Workout: date is required');
  }
  return {
    id: generateId('w-'),
    date: date,
    type: options.type || '',
    duration: options.duration || 0,
    time: options.time || '',
    rating: options.rating || 0,
    feelBefore: options.feelBefore || 0,
    feelAfter: options.feelAfter || 0,
    note: options.note || '',
    rawLog: options.rawLog || '',
    createdAt: Date.now()
  };
}

// --- WorkoutEntry (выполнение варианта в тренировке) ---

function createWorkoutEntry(workoutId, variantId, sequence = 0, notes = '') {
  if (!workoutId || !variantId) {
    throw new Error('WorkoutEntry: workoutId and variantId are required');
  }
  return {
    id: generateId('we-'),
    workoutId: workoutId,
    variantId: variantId,
    sequence: sequence,
    sets: [],
    notes: notes || '',  // заметки к выполнению упражнения в конкретной тренировке
    createdAt: Date.now()
  };
}

// --- Set (подход) ---

function createSet(sequence = 0) {
  return {
    weight: 0,
    reps: 0,
    time: 0,       // секунды
    distance: 0,   // метры
    isWarmup: false,
    sequence: sequence,
    notes: ''
  };
}

// --- UnmatchedEntry (несопоставленное название) ---

function createUnmatchedEntry(name, rawText = '', context = {}, source = 'manual') {
  if (!name || !name.trim()) {
    throw new Error('UnmatchedEntry: name is required');
  }
  return {
    id: generateId('un-'),
    name: name.trim(),
    normalizedName: normalizeExerciseName(name),
    rawText: rawText || name.trim(),
    context: {
      workoutDate: context.workoutDate || '',
      workoutId: context.workoutId || '',
      lineNumber: context.lineNumber || 0,
      surroundingText: context.surroundingText || ''
    },
    source: source,          // 'manual' | 'parser' | 'import'
    status: UNMATCHED_STATUS.PENDING,
    resolvedVariantId: null,
    resolvedAt: null,
    notes: '',
    createdAt: Date.now()
  };
}

// ============================================
// 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function normalizeExerciseName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[ьъ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s·-]/g, '')
    .trim();
}

function formatSetDisplay(set) {
  const parts = [];
  if (set.weight > 0) parts.push(set.weight + ' кг');
  if (set.reps > 0)   parts.push(set.reps + ' повт');
  if (set.time > 0)   parts.push(formatTime(set.time));
  if (set.distance > 0) parts.push(formatDistance(set.distance));
  if (set.isWarmup)   parts.unshift('🏋️ Разминка');
  return parts.join(' · ') || '—';
}

function formatTime(seconds) {
  if (seconds >= 3600) return (seconds / 3600).toFixed(1) + ' ч';
  if (seconds >= 60)   return (seconds / 60).toFixed(0) + ' мин';
  return seconds + ' сек';
}

function formatDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' км';
  return meters + ' м';
}

function findMuscleCategoryById(id) {
  return MUSCLE_CATEGORY_MAP[id] || null;
}

function getMuscleCategoryName(id) {
  const cat = findMuscleCategoryById(id);
  return cat ? cat.name : 'Неизвестно';
}

// ============================================
// 8. ВАЛИДАЦИЯ
// ============================================

function validateVariant(variant) {
  const errors = [];
  if (!variant.name || !variant.name.trim()) {
    errors.push('Название варианта обязательно');
  }
  if (!variant.baseExerciseId) {
    errors.push('Базовое упражнение обязательно');
  }
  if (!Object.values(LOAD_TYPES).includes(variant.loadType)) {
    errors.push('Некорректный тип нагрузки: ' + variant.loadType);
  }
  return errors;
}

function validateWorkoutEntry(entry) {
  const errors = [];
  if (!entry.workoutId) errors.push('WorkoutEntry: workoutId required');
  if (!entry.variantId) errors.push('WorkoutEntry: variantId required');
  if (!Array.isArray(entry.sets)) errors.push('WorkoutEntry: sets must be array');
  return errors;
}

