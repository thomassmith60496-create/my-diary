// ============================================
// 🌱 SEED-БАЗА УПРАЖНЕНИЙ
// ============================================
// Запускается однократно при пустой базе.
// Создаёт упражнения из дневника пользователя.
// ============================================
"use strict";

var SEED_EXERCISES = [
        // ===== ГРУДЬ =====
        {
            name: 'Жим лежа',
            variants: [
                { name: 'Жим лежа · штанга', loadType: 'weight', measurementType: 'reps_weight', equipment: 'barbell', categories: ['Грудь'] },
                { name: 'Жим лежа · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Грудь'] },
                { name: 'Жим лежа (наклон) · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Грудь'] }
            ]
        },
        {
            name: 'Сведение рук',
            variants: [
                { name: 'Сведение рук лежа · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Грудь'] },
                { name: 'Сведение рук лежа (наклон) · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Грудь'] }
            ]
        },
        {
            name: 'Жим от груди',
            variants: [
                { name: 'Жим от груди сидя · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Грудь'] }
            ]
        },
        {
            name: 'Отжимания',
            variants: [
                { name: 'Отжимания', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Грудь', 'Руки'] },
                { name: 'Отжимания с колен', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Грудь', 'Руки'] }
            ]
        },

        // ===== РУКИ (бицепс, трицепс) =====
        {
            name: 'Сгибание рук',
            variants: [
                { name: 'Сгибание рук · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Руки'] },
                { name: 'Сгибание рук · нижний блок', loadType: 'weight', measurementType: 'reps_weight', equipment: 'cable', categories: ['Руки'] },
                { name: 'Сгибание рук молотковым хватом · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Руки'] },
                { name: 'Сгибание рук молотковым хватом · нижний блок', loadType: 'weight', measurementType: 'reps_weight', equipment: 'cable', categories: ['Руки'] }
            ]
        },
        {
            name: 'Разгибание рук',
            variants: [
                { name: 'Разгибание рук · верхний блок', loadType: 'weight', measurementType: 'reps_weight', equipment: 'cable', categories: ['Руки'] },
                { name: 'Разгибание рук сидя · гантель', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Руки'] }
            ]
        },
        {
            name: 'Обратные отжимания',
            variants: [
                { name: 'Обратные отжимания', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Руки'] }
            ]
        },

        // ===== СПИНА =====
        {
            name: 'Тяга в наклоне',
            variants: [
                { name: 'Тяга в наклоне · штанга', loadType: 'weight', measurementType: 'reps_weight', equipment: 'barbell', categories: ['Спина'], aliases: ['Тяга штанги в наклоне'] },
                { name: 'Тяга в наклоне · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Спина'], aliases: ['Тяга гантели в наклоне'] },
                { name: 'Тяга в наклоне одной рукой · гантель', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Спина'] }
            ]
        },
        {
            name: 'Вертикальная тяга',
            variants: [
                { name: 'Вертикальная тяга · верхний блок', loadType: 'weight', measurementType: 'reps_weight', equipment: 'cable', categories: ['Спина'] }
            ]
        },
        {
            name: 'Горизонтальная тяга',
            variants: [
                { name: 'Горизонтальная тяга сидя · блок', loadType: 'weight', measurementType: 'reps_weight', equipment: 'cable', categories: ['Спина'] },
                { name: 'Горизонтальная рычажная тяга', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Спина'] }
            ]
        },
        {
            name: 'Подтягивания',
            variants: [
                { name: 'Подтягивания', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Спина', 'Руки'] },
                { name: 'Подтягивания широким хватом', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Спина', 'Руки'] }
            ]
        },
        {
            name: 'Гиперэкстензия',
            variants: [
                { name: 'Гиперэкстензия', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Спина', 'Ноги'] }
            ]
        },

        // ===== НОГИ =====
        {
            name: 'Приседания',
            variants: [
                { name: 'Приседания', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Ноги'] },
                { name: 'Приседания · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] },
                { name: 'Приседания · тренажер Смита', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] },
                { name: 'Приседания сумо · гантель', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Сплит-приседания',
            variants: [
                { name: 'Сплит-приседания', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Ноги'] },
                { name: 'Сплит-приседания · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Болгарские приседания',
            variants: [
                { name: 'Болгарские приседания', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Выпады',
            variants: [
                { name: 'Выпады', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Ноги'] },
                { name: 'Выпады · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Вышагивания на платформу',
            variants: [
                { name: 'Вышагивания на платформу', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Ноги'] },
                { name: 'Вышагивания на платформу · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Жим ногами',
            variants: [
                { name: 'Жим ногами · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Разгибание ног',
            variants: [
                { name: 'Разгибание ног · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Сгибание ног',
            variants: [
                { name: 'Сгибание ног лежа · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] },
                { name: 'Сгибание ног · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Разведение ног',
            variants: [
                { name: 'Разведение ног сидя · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Сведение ног',
            variants: [
                { name: 'Сведение ног сидя · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Румынская тяга',
            variants: [
                { name: 'Румынская тяга · штанга', loadType: 'weight', measurementType: 'reps_weight', equipment: 'barbell', categories: ['Ноги'] },
                { name: 'Румынская тяга · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] }
            ]
        },
        {
            name: 'Ягодичный мостик',
            variants: [
                { name: 'Ягодичный мостик · гантель', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Ноги'] }
            ]
        },

        // ===== ПЛЕЧИ =====
        {
            name: 'Жим над головой',
            variants: [
                { name: 'Жим над головой · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Плечи'] },
                { name: 'Жим над головой сидя · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Плечи'] },
                { name: 'Жим над головой · тренажер', loadType: 'weight', measurementType: 'reps_weight', equipment: 'machine', categories: ['Плечи'] }
            ]
        },
        {
            name: 'Подъём рук в стороны',
            variants: [
                { name: 'Подъём рук в стороны · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Плечи'] }
            ]
        },
        {
            name: 'Подъем перед собой',
            variants: [
                { name: 'Подъем перед собой · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Плечи'], aliases: ['Подъём перед собой · гантели', 'Подъем перед собой гантели'] },
                { name: 'Подъем перед собой · нижний блок', loadType: 'weight', measurementType: 'reps_weight', equipment: 'cable', categories: ['Плечи'], aliases: ['Подъём перед собой · нижний блок'] }
            ]
        },
        {
            name: 'Тяга к подбородку',
            variants: [
                { name: 'Тяга к подбородку · гантели', loadType: 'weight', measurementType: 'reps_weight', equipment: 'dumbbell', categories: ['Плечи'] },
                { name: 'Тяга к подбородку · штанга', loadType: 'weight', measurementType: 'reps_weight', equipment: 'barbell', categories: ['Плечи'] }
            ]
        },
        {
            name: 'Гало',
            variants: [
                { name: 'Гало', loadType: 'weight', measurementType: 'reps_weight', equipment: 'other', categories: ['Плечи'] }
            ]
        },

        // ===== КОР =====
        {
            name: 'Планка',
            variants: [
                { name: 'Планка', loadType: 'static', measurementType: 'time', equipment: 'bodyweight', categories: ['Корпус'] },
                { name: 'Динамическая планка', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Корпус'] }
            ]
        },
        {
            name: 'Подъем колен лежа',
            variants: [
                { name: 'Подъем колен лежа', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Корпус'] }
            ]
        },
        {
            name: 'Птица-собака',
            variants: [
                { name: 'Птица-собака', loadType: 'bodyweight', measurementType: 'reps', equipment: 'bodyweight', categories: ['Корпус'] }
            ]
        },

        // ===== ФУЛБОДИ =====
        {
            name: 'Махи',
            variants: [
                { name: 'Махи · гиря', loadType: 'weight', measurementType: 'reps_weight', equipment: 'kettlebell', categories: ['Фулбоди'] }
            ]
        },
        {
            name: 'Трастеры',
            variants: [
                { name: 'Трастеры · гиря', loadType: 'weight', measurementType: 'reps_weight', equipment: 'kettlebell', categories: ['Фулбоди'] }
            ]
        },
        {
            name: 'Волны с канатами',
            variants: [
                { name: 'Волны с канатами', loadType: 'none', measurementType: 'time', equipment: 'other', categories: ['Фулбоди', 'Кардио'] }
            ]
        },

        // ===== КАРДИО =====
        {
            name: 'Беговая дорожка',
            variants: [
                { name: 'Беговая дорожка', loadType: 'cardio', measurementType: 'distance', equipment: 'other', categories: ['Кардио'] }
            ]
        },
        {
            name: 'Велосипед',
            variants: [
                { name: 'Велосипед', loadType: 'cardio', measurementType: 'distance', equipment: 'other', categories: ['Кардио'] }
            ]
        },
        {
            name: 'Эллипсоид',
            variants: [
                { name: 'Эллипсоид', loadType: 'cardio', measurementType: 'distance', equipment: 'other', categories: ['Кардио'] }
            ]
        }
    ];
