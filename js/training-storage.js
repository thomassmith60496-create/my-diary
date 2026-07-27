// ============================================
// 🗄️ ТРЕНИРОВКИ - СЛОЙ ХРАНЕНИЯ ДАННЫХ
// ============================================
//
// Абстракция хранения базы упражнений.
// Сейчас реализовано localStorage.
// В будущем можно заменить на Firebase, сохранив тот же интерфейс.
//
// Интерфейс для замены:
//   load() → данные или null
//   save(data) → void
// ============================================
"use strict";

const ExerciseStorage = {
    STORAGE_KEY: 'diary_training_data',

    // === LOCALSTORAGE РЕАЛИЗАЦИЯ ===

    load: function() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Базовая валидация
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.exercises)) {
                    return parsed;
                }
            }
            return null;
        } catch(e) {
            console.warn('ExerciseStorage.load: ошибка чтения из localStorage', e);
            return null;
        }
    },

    save: function(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch(e) {
            console.warn('ExerciseStorage.save: ошибка записи в localStorage', e);
            return false;
        }
    },

    // === ДЛЯ БУДУЩЕЙ FIREBASE РЕАЛИЗАЦИИ ===
    // Пример интерфейса:
    //
    // load: async function() {
    //     const snap = await firebase.database().ref('training_exercises').once('value');
    //     const data = snap.val();
    //     if (data && Array.isArray(data.exercises)) return data;
    //     return null;
    // },
    //
    // save: async function(data) {
    //     await firebase.database().ref('training_exercises').set(data);
    // }
};