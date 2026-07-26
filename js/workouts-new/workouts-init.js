// ============================================
// 🏋️ ИНИЦИАЛИЗАЦИЯ НОВОЙ СИСТЕМЫ ТРЕНИРОВОК
// ============================================
// Точка входа для новой архитектуры.
// Подключается после workouts-schema.js и workouts-store.js
// ============================================
"use strict";

(function initNewWorkoutSystem() {
  console.log('[WorkoutSystem] Initializing new workout system...');
  
  // 1. Инициализируем Store
  WorkoutStore.init({
    // При необходимости можно передать сохранённые категории
    muscleCategories: []
  });
  
  // 2. Проверяем, есть ли уже данные (например, после синхронизации)
  if (WorkoutStore.getBaseExercises().length === 0) {
    // Если данных нет — запускаем seed
    console.log('[WorkoutSystem] No existing exercises found, running seed...');
    if (typeof seedWorkoutData === 'function') {
      seedWorkoutData();
    }
  } else {
    console.log('[WorkoutSystem] Existing exercises found:', 
      WorkoutStore.getBaseExercises().length, 'base,',
      WorkoutStore.getVariants().length, 'variants');
  }
  
  // 3. Миграция старых данных (если есть)
  migrateOldWorkoutData();
  
  console.log('[WorkoutSystem] New workout system ready!');
  console.log('[WorkoutSystem] Stats:', {
    muscleCategories: WorkoutStore.getMuscleCategories().length,
    baseExercises: WorkoutStore.getBaseExercises().length,
    variants: WorkoutStore.getVariants().length,
    workouts: WorkoutStore.getWorkouts().length,
    entries: WorkoutStore.getEntries().length
  });
})();

/**
 * Миграция старых данных из глобальных переменных
 * в новую структуру WorkoutStore
 */
function migrateOldWorkoutData() {
  // Проверяем, есть ли старые данные
  if (typeof workouts === 'undefined' || workouts.length === 0) {
    console.log('[migrate] No old workout data to migrate');
    return;
  }
  
  if (WorkoutStore.getWorkouts().length > 0) {
    console.log('[migrate] Workouts already migrated');
    return;
  }
  
  console.log('[migrate] Starting migration of', workouts.length, 'old workouts...');
  
  let migrated = 0;
  let errors = 0;
  
  workouts.forEach(oldWorkout => {
    try {
      WorkoutStore.importOldWorkout(oldWorkout);
      migrated++;
    } catch (e) {
      console.error('[migrate] Failed to migrate workout:', oldWorkout.id, e);
      errors++;
    }
  });
  
  console.log('[migrate] Done:', migrated, 'migrated,', errors, 'errors');
}

