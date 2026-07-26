// ============================================
// 🏋️ УПРАЖНЕНИЯ: КАТЕГОРИИ, БАЗОВЫЕ, ВАРИАНТЫ
// ============================================
"use strict";

// === НОРМАЛИЗАЦИЯ НАЗВАНИЙ ===

function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[ьъ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeExerciseName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[ьъ]/g, '')
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

// === РАССТОЯНИЕ ЛЕВЕНШТЕЙНА ДЛЯ ПОИСКА ПОХОЖИХ НАЗВАНИЙ ===

function levenshteinDistance(a, b) {
    const matrix = [];
    for(let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for(let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for(let i = 1; i <= b.length; i++) {
        for(let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
}

function findSimilarExercises(name, threshold = 0.4) {
    const normalized = normalizeExerciseName(name);
    const results = [];
    
    exerciseVariants.forEach(variant => {
        const variantNorm = normalizeExerciseName(variant.name);
        if (variantNorm === normalized) {
            results.push({ variant, distance: 0, matchType: 'exact' });
            return;
        }
        
        // Проверяем вхождение одного названия в другое
        if (normalized.includes(variantNorm) || variantNorm.includes(normalized)) {
            results.push({ variant, distance: 0.1, matchType: 'substring' });
            return;
        }
        
        // Проверяем расстояние Левенштейна
        const maxLen = Math.max(normalized.length, variantNorm.length);
        if (maxLen === 0) return;
        const distance = levenshteinDistance(normalized, variantNorm);
        const ratio = distance / maxLen;
        
        if (ratio <= threshold) {
            results.push({ variant, distance: ratio, matchType: 'fuzzy' });
        }
    });
    
    // Сортируем по близости совпадения
    results.sort((a, b) => a.distance - b.distance);
    return results;
}

function suggestMerge() {
    const suggestions = [];
    const checked = new Set();
    
    exerciseVariants.forEach((v1, i) => {
        if (checked.has(v1.id)) return;
        
        const similar = findSimilarExercises(v1.name, 0.3);
        const duplicates = similar.filter(s => {
            if (s.variant.id === v1.id) return false;
            if (checked.has(s.variant.id)) return false;
            // Не предлагаем объединять если названия отличаются ключевыми словами
            const words1 = new Set(normalizeExerciseName(v1.name).split(' '));
            const words2 = new Set(normalizeExerciseName(s.variant.name).split(' '));
            // Проверяем, что разница только в регистре/ё/опечатках
            return s.distance < 0.2 || s.matchType === 'substring';
        });
        
        if (duplicates.length > 0) {
            suggestions.push({
                target: v1,
                duplicates: duplicates.map(d => d.variant),
                reason: duplicates[0].matchType
            });
            checked.add(v1.id);
            duplicates.forEach(d => checked.add(d.variant.id));
        }
    });
    
    return suggestions;
}

function reassignVariantToBaseExercise(variantId, newBaseExerciseId) {
    const variant = findVariantById(variantId);
    if (!variant) return false;
    
    variant.baseExerciseId = newBaseExerciseId;
    saveExerciseData();
    syncToCloud();
    return true;
}

function splitVariant(name1, name2) {
    // Разделить ошибочно объединённый вариант на два
    const sourceVariant = findVariantByName(name1);
    if (!sourceVariant) return null;
    
    // Создаём новый вариант для name2
    const newVariant = createVariant(
        name2,
        sourceVariant.baseExerciseId,
        sourceVariant.type,
        sourceVariant.metricType
    );
    
    // Переносим прогресс (половину записей) в новый вариант
    const progress = getProgressData();
    const sourceKey = sourceVariant.id || sourceVariant.name;
    const sourceProgress = progress[sourceKey];
    
    if (sourceProgress && sourceProgress.length > 1) {
        const mid = Math.floor(sourceProgress.length / 2);
        const movedEntries = sourceProgress.splice(mid);
        
        movedEntries.forEach(entry => {
            entry.exerciseId = newVariant.id;
            entry.baseExerciseId = newVariant.baseExerciseId;
            entry.type = newVariant.type;
            entry.metricType = newVariant.metricType;
        });
        
        progress[newVariant.id] = movedEntries;
        
        if (sourceProgress.length === 0) {
            delete progress[sourceKey];
        } else {
            progress[sourceKey] = sourceProgress;
        }
        
        localStorage.setItem('exercise-progress', JSON.stringify(progress));
    }
    
    saveExerciseData();
    syncToCloud();
    return newVariant;
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