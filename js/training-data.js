// ============================================
// 🏋️ ТРЕНИРОВКИ - УПРАВЛЕНИЕ БАЗОЙ УПРАЖНЕНИЙ
// ============================================
"use strict";

// === КАТЕГОРИИ МЫШЦ (фиксированный справочник) ===
const MUSCLE_CATEGORIES = [
    'Грудь',
    'Спина',
    'Ноги',
    'Плечи',
    'Руки',
    'Корпус',
    'Фулбоди',
    'Кардио',
    'Другое'
];

// === ТИПЫ НАГРУЗКИ ===
const LOAD_TYPES = [
    { id: 'weight', label: 'С весом' },
    { id: 'bodyweight', label: 'С весом тела' },
    { id: 'cardio', label: 'Кардио' },
    { id: 'static', label: 'Статика' },
    { id: 'none', label: 'Без нагрузки' }
];

// === ТИПЫ ИЗМЕРЕНИЯ ===
const MEASUREMENT_TYPES = [
    { id: 'reps_weight', label: 'Повторения × Вес' },
    { id: 'reps', label: 'Только повторения' },
    { id: 'time', label: 'Время' },
    { id: 'distance', label: 'Дистанция' },
    { id: 'weight_only', label: 'Только вес' }
];

// === ОБОРУДОВАНИЕ ===
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

// === ДАННЫЕ ===
let trainingData = {
    exercises: [] // Базовые упражнения
};

// ID генератор
function generateTrainingId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// === ОПЕРАЦИИ С БАЗОВЫМИ УПРАЖНЕНИЯМИ ===

function createBaseExercise(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;

    if (trainingData.exercises.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
        return null;
    }

    const exercise = {
        id: generateTrainingId(),
        name: trimmed,
        variants: []
    };
    trainingData.exercises.push(exercise);
    return exercise;
}

function renameBaseExercise(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const exercise = trainingData.exercises.find(e => e.id === id);
    if (!exercise) return false;

    if (trainingData.exercises.some(e => e.id !== id && e.name.toLowerCase() === trimmed.toLowerCase())) {
        return false;
    }

    exercise.name = trimmed;
    return true;
}

function deleteBaseExercise(id) {
    const idx = trainingData.exercises.findIndex(e => e.id === id);
    if (idx === -1) return false;

    if (trainingData.exercises[idx].variants.length > 0) return false;

    trainingData.exercises.splice(idx, 1);
    return true;
}

function mergeBaseExercise(sourceId, targetId) {
    const source = trainingData.exercises.find(e => e.id === sourceId);
    const target = trainingData.exercises.find(e => e.id === targetId);

    if (!source || !target) return false;
    if (source.id === target.id) return false;

    target.variants = target.variants.concat(source.variants);

    const idx = trainingData.exercises.findIndex(e => e.id === sourceId);
    trainingData.exercises.splice(idx, 1);

    return true;
}

// === ОПЕРАЦИИ С ВАРИАНТАМИ УПРАЖНЕНИЙ ===

function createVariant(exerciseId, data) {
    const exercise = trainingData.exercises.find(e => e.id === exerciseId);
    if (!exercise) return null;

    const variant = {
        id: generateTrainingId(),
        name: (data.name || '').trim(),
        loadType: data.loadType || 'weight',
        measurementType: data.measurementType || 'reps_weight',
        equipment: data.equipment || '',
        categories: data.categories || []
    };

    if (!variant.name) return null;

    exercise.variants.push(variant);
    return variant;
}

function updateVariant(exerciseId, variantId, data) {
    const exercise = trainingData.exercises.find(e => e.id === exerciseId);
    if (!exercise) return false;

    const variant = exercise.variants.find(v => v.id === variantId);
    if (!variant) return false;

    if (data.name !== undefined) variant.name = data.name.trim();
    if (data.loadType !== undefined) variant.loadType = data.loadType;
    if (data.measurementType !== undefined) variant.measurementType = data.measurementType;
    if (data.equipment !== undefined) variant.equipment = data.equipment;
    if (data.categories !== undefined) variant.categories = data.categories;

    return true;
}

function deleteVariant(exerciseId, variantId) {
    const exercise = trainingData.exercises.find(e => e.id === exerciseId);
    if (!exercise) return false;

    const idx = exercise.variants.findIndex(v => v.id === variantId);
    if (idx === -1) return false;

    exercise.variants.splice(idx, 1);
    return true;
}

function moveVariant(variantId, fromExerciseId, toExerciseId) {
    const from = trainingData.exercises.find(e => e.id === fromExerciseId);
    const to = trainingData.exercises.find(e => e.id === toExerciseId);

    if (!from || !to) return false;

    const idx = from.variants.findIndex(v => v.id === variantId);
    if (idx === -1) return false;

    const variant = from.variants.splice(idx, 1)[0];
    to.variants.push(variant);
    return true;
}

// === ЗАГРУЗКА/СОХРАНЕНИЕ (локальное) ===

function saveTrainingDataToMemory() {
    try {
        localStorage.setItem('diary_training_data', JSON.stringify(trainingData));
    } catch(e) {
        // игнорируем ошибки localStorage
    }
}

function loadTrainingDataFromMemory() {
    try {
        const saved = localStorage.getItem('diary_training_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.exercises && Array.isArray(parsed.exercises)) {
                trainingData = parsed;
            }
        }
    } catch(e) {
        // игнорируем
    }
}

loadTrainingDataFromMemory();

// === ПОИСК ===

function searchExercises(query) {
    if (!query || !query.trim()) return trainingData.exercises;

    const q = query.toLowerCase().trim();

    return trainingData.exercises.filter(ex => {
        if (ex.name.toLowerCase().includes(q)) return true;
        return ex.variants.some(v => v.name.toLowerCase().includes(q));
    });
}

function filterExercisesByCategory(exercises, category) {
    if (!category || category === 'all') return exercises;

    return exercises.filter(ex => {
        return ex.variants.some(v => v.categories && v.categories.includes(category));
    });
}