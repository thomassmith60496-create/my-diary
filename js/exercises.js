// ============================================
// 🏋️ УПРАЖНЕНИЯ: КАТЕГОРИИ, БАЗОВЫЕ, ВАРИАНТЫ
// ============================================
"use strict";

// === НОРМАЛИЗАЦИЯ НАЗВАНИЙ ===

function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeExerciseName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
}

// === РАБОТА С КАТЕГОРИЯМИ ===

function getCategoryById(id) {
    return exerciseCategories.find(c => c.id === id);
}

function getCategoryByType(type) {
    return exerciseCategories.find(c => c.type === type);
}

// === РАБОТА С БАЗОВЫМИ УПРАЖНЕНИЯМИ ===

function findBaseExerciseByName(name) {
    const normalized = normalizeExerciseName(name);
    return baseExercises.find(b => normalizeExerciseName(b.name) === normalized);
}

function findBaseExerciseById(id) {
    return baseExercises.find(b => b.id === id);
}

function createBaseExercise(name, categoryId) {
    const id = 'base-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const baseExercise = {
        id: id,
        name: name.trim(),
        categoryId: categoryId,
        normalizedName: normalizeExerciseName(name)
    };
    baseExercises.push(baseExercise);
    return baseExercise;
}

function getOrCreateBaseExercise(name, categoryId) {
    let base = findBaseExerciseByName(name);
    if (!base) {
        base = createBaseExercise(name, categoryId);
    }
    return base;
}

// === РАБОТА С ВАРИАНТАМИ УПРАЖНЕНИЙ ===

function findVariantByName(name) {
    const normalized = normalizeExerciseName(name);
    return exerciseVariants.find(v => normalizeExerciseName(v.name) === normalized);
}

function findVariantById(id) {
    return exerciseVariants.find(v => v.id === id);
}

function findVariantByBaseExercise(baseExerciseId) {
    return exerciseVariants.filter(v => v.baseExerciseId === baseExerciseId);
}

function createVariant(name, baseExerciseId, type, metricType) {
    const id = 'var-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const variant = {
        id: id,
        baseExerciseId: baseExerciseId,
        name: name.trim(),
        normalizedName: normalizeExerciseName(name),
        originalName: name.trim(),
        type: type,
        metricType: metricType,
        needsReview: false
    };
    exerciseVariants.push(variant);
    return variant;
}

function getOrCreateVariant(name, baseExerciseId, type, metricType) {
    let variant = findVariantByName(name);
    if (!variant) {
        variant = createVariant(name, baseExerciseId, type, metricType);
    }
    return variant;
}

// === ПАРСИНГ УПРАЖНЕНИЙ ИЗ ТЕКСТА ===

function detectExerciseType(line) {
    // Кардио
    if (line.match(/беговая дорожка|велотренажёр|эллипс|степпер|велосипед/i)) {
        return { type: 'cardio', metricType: 'cardio' };
    }
    
    // Время + вес (планка, канат и т.д.)
    if (line.match(/планка|канат|статич/i)) {
        return { type: 'timed', metricType: 'time' };
    }
    
    // Упражнения с весом (силовые)
    if (line.match(/жим|присед|тяга|подъем|подъём|становая|штанга|гантели|гантель/i)) {
        return { type: 'strength', metricType: 'weight' };
    }
    
    // Отжимания, подтягивания
    if (line.match(/отжимани|подтягиван|пресс|брусья/i)) {
        return { type: 'bodyweight', metricType: 'reps' };
    }
    
    // По умолчанию
    return { type: 'strength', metricType: 'weight' };
}

function parseExerciseLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    
    // Убираем нумерацию "1) "
    const name = trimmed.replace(/^\d+\)\s*/, '').trim();
    if (!name) return null;
    
    const { type, metricType } = detectExerciseType(name);
    
    return {
        name: name,
        type: type,
        metricType: metricType
    };
}

// === НОРМАЛИЗАЦИЯ ПРИ ИМПОРТЕ ===

function findOrCreateExerciseForImport(name) {
    const parsed = parseExerciseLine(name);
    if (!parsed) return null;
    
    // Ищем базовое упражнение
    let base = findBaseExerciseByName(parsed.name);
    if (!base) {
        // Пытаемся найти похожее базовое упражнение
        const normalized = normalizeExerciseName(parsed.name);
        base = baseExercises.find(b => {
            const baseNorm = normalizeExerciseName(b.name);
            return normalized.includes(baseNorm) || baseNorm.includes(normalized);
        });
    }
    
    // Если не нашли базовое, создаем новое
    if (!base) {
        const category = getCategoryByType(parsed.type);
        base = createBaseExercise(parsed.name, category ? category.id : 'cat-strength');
    }
    
    // Ищем или создаем вариант
    let variant = findVariantByName(parsed.name);
    if (!variant) {
        variant = createVariant(parsed.name, base.id, parsed.type, parsed.metricType);
    }
    
    return {
        baseExercise: base,
        variant: variant
    };
}

// === МИГРАЦИЯ СТАРЫХ ДАННЫХ ===

function migrateOldExercises() {
    let migrated = 0;
    const progress = getProgressData();
    const oldProgressKeys = Object.keys(progress);
    
    // Мигрируем прогресс под старые ключи (имена упражнений)
    oldProgressKeys.forEach(oldName => {
        const exerciseData = findOrCreateExerciseForImport(oldName);
        if (exerciseData) {
            const newKey = exerciseData.variant.id;
            if (newKey !== oldName) {
                // Переносим прогресс на новый ключ
                const oldEntries = progress[oldName];
                if (oldEntries && oldEntries.length > 0) {
                    // Обновляем старые записи с новыми ID
                    oldEntries.forEach(entry => {
                        entry.exerciseId = exerciseData.variant.id;
                        entry.baseExerciseId = exerciseData.baseExercise.id;
                        entry.type = exerciseData.variant.type;
                        entry.metricType = exerciseData.variant.metricType;
                    });
                    
                    // Объединяем с новым ключом
                    if (!progress[newKey]) {
                        progress[newKey] = [];
                    }
                    progress[newKey].push(...oldEntries);
                    
                    // Удаляем старый ключ
                    delete progress[oldName];
                    
                    migrated++;
                }
            }
        }
    });
    
    if (migrated > 0) {
        localStorage.setItem('exercise-progress', JSON.stringify(progress));
        console.log(`Мигрировано ${migrated} упражнений в новую структуру`);
    }
    
    return migrated;
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function getBaseExerciseStats(baseExerciseId) {
    const variants = findVariantByBaseExercise(baseExerciseId);
    const stats = {
        totalWorkouts: 0,
        totalSets: 0,
        bestResult: null,
        variants: variants.length
    };
    
    variants.forEach(variant => {
        const progress = getProgressData();
        const variantProgress = progress[variant.name];
        if (variantProgress && variantProgress.length > 0) {
            stats.totalWorkouts += variantProgress.length;
            variantProgress.forEach(entry => {
                stats.totalSets += entry.sets || 0;
                if (stats.bestResult === null || entry.maxWeight > stats.bestResult) {
                    stats.bestResult = entry.maxWeight;
                }
            });
        }
    });
    
    return stats;
}

function getVariantProgress(variantName) {
    const progress = getProgressData();
    return progress[variantName] || [];
}

// === ЗАГРУЗКА/СОХРАНЕНИЕ ===

function loadExerciseData() {
    try {
        const saved = localStorage.getItem('exercise-data');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.categories) exerciseCategories = data.categories;
            if (data.baseExercises) baseExercises = data.baseExercises;
            if (data.variants) exerciseVariants = data.variants;
        }
    } catch (e) {
        console.error('Ошибка загрузки данных упражнений:', e);
    }
}

function saveExerciseData() {
    try {
        const data = {
            categories: exerciseCategories,
            baseExercises: baseExercises,
            variants: exerciseVariants
        };
        localStorage.setItem('exercise-data', JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения данных упражнений:', e);
    }
}

// === ИНИЦИАЛИЗАЦИЯ ===

function initExerciseData() {
    loadExerciseData();
    
    // Если нет категорий, создаем стандартные
    if (exerciseCategories.length === 0) {
        exerciseCategories = [
            { id: 'cat-strength', name: 'Силовые', type: 'strength', icon: '💪' },
            { id: 'cat-cardio', name: 'Кардио', type: 'cardio', icon: '🏃' },
            { id: 'cat-bodyweight', name: 'Повторения без веса', type: 'bodyweight', icon: '🏋️' },
            { id: 'cat-timed', name: 'Упражнения на время', type: 'timed', icon: '⏱' }
        ];
    }
    
    saveExerciseData();
}