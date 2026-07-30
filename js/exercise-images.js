// ============================================
// 🎬 ИЗОБРАЖЕНИЯ УПРАЖНЕНИЙ
// ============================================
// Маппинг упражнений → GIF файлов из exercises-dataset
// ============================================
"use strict";

const EXERCISE_IMAGE_MAP = {
    // ===== ГРУДЬ =====
    'Жим лежа': '0025-EIeI8Vf.gif',
    'Жим лежа · штанга': '0025-EIeI8Vf.gif',
    'Жим лежа · гантели': '0025-EIeI8Vf.gif',
    'Жим лежа (наклон) · гантели': '0025-EIeI8Vf.gif',
    'Сведение рук': '0026-W9pFVv1.gif',
    'Сведение рук лежа · гантели': '0026-W9pFVv1.gif',
    'Сведение рук лежа (наклон) · гантели': '0026-W9pFVv1.gif',
    'Жим от груди': '0027-eZyBC3j.gif',
    'Жим от груди сидя · тренажер': '0027-eZyBC3j.gif',
    'Отжимания': '0032-ila4NZS.gif',
    'Отжимания с колен': '0032-ila4NZS.gif',

    // ===== РУКИ =====
    'Сгибание рук': '0033-GrO65fd.gif',
    'Сгибание рук · гантели': '0033-GrO65fd.gif',
    'Сгибание рук · нижний блок': '0033-GrO65fd.gif',
    'Сгибание рук молотковым хватом · гантели': '0033-GrO65fd.gif',
    'Сгибание рук молотковым хватом · нижний блок': '0033-GrO65fd.gif',
    'Разгибание рук': '0034-hMEptv0.gif',
    'Разгибание рук · верхний блок': '0034-hMEptv0.gif',
    'Разгибание рук сидя · гантель': '0034-hMEptv0.gif',
    'Обратные отжимания': '0035-LMGXZn8.gif',

    // ===== СПИНА =====
    'Тяга в наклоне': '0064-Jsgsc27.gif',
    'Тяга в наклоне · штанга': '0064-Jsgsc27.gif',
    'Тяга в наклоне · гантели': '0064-Jsgsc27.gif',
    'Тяга в наклоне одной рукой · гантель': '0064-Jsgsc27.gif',
    'Вертикальная тяга': '0065-vtusOWT.gif',
    'Вертикальная тяга · верхний блок': '0065-vtusOWT.gif',
    'Горизонтальная тяга': '0066-2DxtqHL.gif',
    'Горизонтальная тяга сидя · блок': '0066-2DxtqHL.gif',
    'Горизонтальная рычажная тяга': '0066-2DxtqHL.gif',
    'Подтягивания': '0065-vtusOWT.gif',
    'Подтягивания широким хватом': '0065-vtusOWT.gif',
    'Гиперэкстензия': '0067-xHKN2s8.gif',

    // ===== НОГИ =====
    'Приседания': '0043-qXTaZnJ.gif',
    'Приседания · гантели': '0043-qXTaZnJ.gif',
    'Приседания · тренажер Смита': '0043-qXTaZnJ.gif',
    'Приседания сумо · гантель': '0043-qXTaZnJ.gif',
    'Сплит-приседания': '0044-XlZ4lAC.gif',
    'Сплит-приседания · гантели': '0044-XlZ4lAC.gif',
    'Болгарские приседания': '0045-GXoaSgn.gif',
    'Выпады': '0046-5VCj6iH.gif',
    'Выпады · гантели': '0046-5VCj6iH.gif',
    'Вышагивания на платформу': '0047-3TZduzM.gif',
    'Вышагивания на платформу · гантели': '0047-3TZduzM.gif',
    'Жим ногами': '0048-641mIfk.gif',
    'Жим ногами · тренажер': '0048-641mIfk.gif',
    'Разгибание ног': '0049-dmgMp3n.gif',
    'Разгибание ног · тренажер': '0049-dmgMp3n.gif',
    'Сгибание ног': '0050-xi0yckC.gif',
    'Сгибание ног лежа · тренажер': '0050-xi0yckC.gif',
    'Сгибание ног · тренажер': '0050-xi0yckC.gif',
    'Разведение ног': '0051-pkSoCW9.gif',
    'Разведение ног сидя · тренажер': '0051-pkSoCW9.gif',
    'Сведение ног': '0052-ZsiqXYa.gif',
    'Сведение ног сидя · тренажер': '0052-ZsiqXYa.gif',
    'Румынская тяга': '0053-1gFNTZV.gif',
    'Румынская тяга · штанга': '0053-1gFNTZV.gif',
    'Румынская тяга · гантели': '0053-1gFNTZV.gif',
    'Ягодичный мостик': '0054-t8iSghb.gif',
    'Ягодичный мостик · гантель': '0054-t8iSghb.gif',

    // ===== ПЛЕЧИ =====
    'Жим над головой': '0055-EcaV7aL.gif',
    'Жим над головой · гантели': '0055-EcaV7aL.gif',
    'Жим над головой сидя · гантели': '0055-EcaV7aL.gif',
    'Жим над головой · тренажер': '0055-EcaV7aL.gif',
    'Подъём рук в стороны': '0056-HJ63mSO.gif',
    'Подъём рук в стороны · гантели': '0056-HJ63mSO.gif',
    'Подъем перед собой': '0057-EMpUwRI.gif',
    'Подъем перед собой · гантели': '0057-EMpUwRI.gif',
    'Подъем перед собой · нижний блок': '0057-EMpUwRI.gif',
    'Тяга к подбородку': '0058-SNFfUff.gif',
    'Тяга к подбородку · гантели': '0058-SNFfUff.gif',
    'Тяга к подбородку · штанга': '0058-SNFfUff.gif',
    'Гало': '0059-SYJ4Bkt.gif',

    // ===== КОР =====
    'Планка': '0060-h8LFzo9.gif',
    'Динамическая планка': '0060-h8LFzo9.gif',
    'Подъем колен лежа': '0061-iZop9xO.gif',
    'Птица-собака': '0063-elhhVgj.gif',

    // ===== ФУЛБОДИ =====
    'Махи': '0064-Jsgsc27.gif',
    'Махи · гиря': '0064-Jsgsc27.gif',
    'Трастеры': '0065-vtusOWT.gif',
    'Трастеры · гиря': '0065-vtusOWT.gif',
    'Волны с канатами': '0066-2DxtqHL.gif',

    // ===== КАРДИО =====
    'Беговая дорожка': '0067-xHKN2s8.gif',
    'Велосипед': '0068-uKyN64F.gif',
    'Эллипсоид': '0069-gfk9kD4.gif'
};

function getExerciseGif(variantName) {
    if (!variantName) return null;
    
    // Exact match
    if (EXERCISE_IMAGE_MAP[variantName]) {
        return EXERCISE_IMAGE_MAP[variantName];
    }
    
    // Try base name match (before · separator)
    const baseName = variantName.split('·')[0].trim();
    for (const [key, value] of Object.entries(EXERCISE_IMAGE_MAP)) {
        if (key.includes(baseName) || baseName.includes(key)) {
            return value;
        }
    }
    
    // Try partial match
    for (const [key, value] of Object.entries(EXERCISE_IMAGE_MAP)) {
        const keyBase = key.split('·')[0].trim();
        if (variantName.includes(keyBase) || keyBase.includes(baseName)) {
            return value;
        }
    }
    
    return null;
}

function getExerciseGifUrl(variantName) {
    const gifFile = getExerciseGif(variantName);
    if (gifFile) {
        return 'exercise-gifs/' + gifFile;
    }
    return '';
}

window.ExerciseImageAPI = {
    getGif: getExerciseGif,
    getGifUrl: getExerciseGifUrl
};