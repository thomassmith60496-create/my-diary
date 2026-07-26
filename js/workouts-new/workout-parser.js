// ============================================
// 🏋️ НОВЫЙ ПАРСЕР ТРЕНИРОВОК (v2)
// ============================================
// Независимый, stateless парсер текста тренировок.
// Не использует старый gymkeeper-parser.js.
//
// Формат ожидаемого текста:
//   Дата: 26 июля 2026, 60 мин
//   1) Жим лежа · штанга
//   80кг*8
//   80кг*7
//   2) Приседания со штангой
//   100кг*5
//   ...
// ============================================
"use strict";

// ============================================
// СОПОСТАВЛЕНИЕ МЕСЯЦЕВ (русские → число)
// ============================================

const _MONTH_MAP = {
  'янв': '01', 'января': '01', 'январь': '01',
  'фев': '02', 'февраля': '02', 'февраль': '02',
  'мар': '03', 'марта': '03', 'март': '03',
  'апр': '04', 'апреля': '04', 'апрель': '04',
  'мая': '05', 'май': '05',
  'июн': '06', 'июня': '06', 'июнь': '06',
  'июл': '07', 'июля': '07', 'июль': '07',
  'авг': '08', 'августа': '08', 'август': '08',
  'сен': '09', 'сентября': '09', 'сентябрь': '09',
  'окт': '10', 'октября': '10', 'октябрь': '10',
  'ноя': '11', 'ноября': '11', 'ноябрь': '11',
  'дек': '12', 'декабря': '12', 'декабрь': '12'
};

// ============================================
// 1. РАЗБИВКА ТЕКСТА НА СТРОКИ
// ============================================

function _splitLines(text) {
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.match(/^(СУПЕРСЕТ|КРУГОВАЯ|🏋️|GymKeeper)/i));
}

// ============================================
// 2. ПАРСИНГ ДАТЫ
// ============================================
// Распознаёт:
//   26 июля 2026, 60 мин
//   26.07.2026
//   2026-07-26
// ============================================

function _parseDateLine(line) {
  // Формат: "26 июля 2026" или "26 июля 2026, 60 мин"
  const rusMatch = line.match(/^(\d{1,2})\s+([а-яА-ЯёЁ]+)\s+(\d{4})/);
  if (rusMatch) {
    const day = rusMatch[1].padStart(2, '0');
    const monthStr = rusMatch[2].toLowerCase();
    const month = _MONTH_MAP[monthStr] || '01';
    const year = rusMatch[3];
    return { date: `${year}-${month}-${day}`, dateLine: true };
  }

  // Формат: "26.07.2026"
  const dotMatch = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const day = dotMatch[1].padStart(2, '0');
    const month = dotMatch[2].padStart(2, '0');
    const year = dotMatch[3];
    return { date: `${year}-${month}-${day}`, dateLine: true };
  }

  // Формат: "2026-07-26"
  const isoMatch = line.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return { date: `${year}-${month}-${day}`, dateLine: true };
  }

  return null;
}

function _extractDuration(line) {
  const match = line.match(/(\d+)\s*мин/i);
  return match ? parseInt(match[1]) : 0;
}

// ============================================
// 3. ПАРСИНГ НАЗВАНИЯ УПРАЖНЕНИЯ
// ============================================
// Распознаёт:
//   1) Жим лежа · штанга
//   Жим лежа · штанга
//   "Жим лежа"
// ============================================

function _isExerciseLine(line) {
  return !!(
    line.match(/^\d+\)\s/) ||
    (line.includes('·') && !line.match(/\d+(кг|lb|км|м|сек|мин|ч)\*/i))
  );
}

function _extractExerciseName(line) {
  return line
    .replace(/^\d+\)\s*/, '')
    .replace(/^[""]|[""]$/g, '')
    .trim();
}

// ============================================
// 4. ПАРСИНГ ПОДХОДА
// ============================================
// Распознаёт форматы:
//   a) 80кг*8          — weight*reps
//   b) 80kg*10         — lb/kg
//   c) 30сек           — только время
//   d) 1мин*5кг        — время*вес
//   e) 25мин:3.8км     — время:дистанция (кардио)
//   f) 15 раз / 15 повт — только повторения
//   g) 5км / 1000м     — только дистанция
//   h) 40кг            — только вес (1 подход)
// ============================================

function _parseSetLine(line) {
  // Вес + повторения: 80кг*8, 100lb*5, 45kg*12
  let match = line.match(/^(\d+(?:\.\d+)?)\s*(кг|kg|lb)\s*\*\s*(\d+)$/i);
  if (match) {
    let weight = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const reps = parseInt(match[3]);
    if (unit === 'lb') weight = Math.round(weight * 0.4536);
    return { weight, reps, _type: 'strength' };
  }

  // Только вес (без повторений): 40кг
  match = line.match(/^(\d+(?:\.\d+)?)\s*(кг|kg|lb)$/i);
  if (match) {
    let weight = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'lb') weight = Math.round(weight * 0.4536);
    return { weight, reps: 1, _type: 'strength' };
  }

  // Время + вес: 30сек*5кг, 1мин*0кг
  match = line.match(/^(\d+)\s*(сек|с|мин|ч)\s*\*\s*(\d+(?:\.\d+)?)\s*(кг|kg|lb)?$/i);
  if (match) {
    const timeValue = parseInt(match[1]);
    const timeUnit = match[2].toLowerCase();
    const time = _toSeconds(timeValue, timeUnit);
    let weight = match[3] ? parseFloat(match[3]) : 0;
    if (match[4] && match[4].toLowerCase() === 'lb') weight = Math.round(weight * 0.4536);
    return { time, weight, _type: 'timed_weight' };
  }

  // Время + дистанция (кардио): 25мин:3.8км, 30мин:1000м
  match = line.match(/^(\d+)\s*(сек|с|мин|ч)?\s*[:]\s*(\d+(?:\.\d+)?)\s*(км|м|km|m)?$/i);
  if (match) {
    const timeValue = parseInt(match[1]);
    const timeUnit = match[2] ? match[2].toLowerCase() : 'мин';
    const time = _toSeconds(timeValue, timeUnit);
    let distance = parseFloat(match[3]);
    const distUnit = match[4] ? match[4].toLowerCase() : 'км';
    if (distUnit === 'км' || distUnit === 'km') distance = distance * 1000;
    return { time, distance, _type: 'cardio' };
  }

  // Только время: 30сек, 1мин, 2ч
  match = line.match(/^(\d+)\s*(сек|с|мин|ч)$/i);
  if (match) {
    const timeValue = parseInt(match[1]);
    const timeUnit = match[2].toLowerCase();
    const time = _toSeconds(timeValue, timeUnit);
    return { time, _type: 'timed' };
  }

  // Только повторения: 15 раз, 20 повторений, 12 повт
  match = line.match(/^(\d+)\s*(раз|повторений|повт|раза)$/i);
  if (match) {
    return { reps: parseInt(match[1]), _type: 'reps_only' };
  }

  // Только дистанция: 5км, 1000м
  match = line.match(/^(\d+(?:\.\d+)?)\s*(км|м|km|m)$/i);
  if (match) {
    let distance = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'км' || unit === 'km') distance = distance * 1000;
    return { distance, _type: 'distance_only' };
  }

  return null;
}

function _toSeconds(value, unit) {
  if (unit === 'мин') return value * 60;
  if (unit === 'ч') return value * 3600;
  return value; // сек, с
}

// ============================================
// 5. ОПРЕДЕЛЕНИЕ ТИПА НАБОРА ПОДХОДОВ
// ============================================

function _determineExerciseType(sets) {
  if (sets.length === 0) return 'other';
  const types = new Set(sets.map(s => s._type));
  if (types.has('cardio')) return 'cardio';
  if (types.has('timed_weight')) return 'timed_weight';
  if (types.has('timed')) return 'timed';
  if (types.has('reps_only') && !types.has('strength')) return 'reps_only';
  if (types.has('distance_only')) return 'distance_only';
  if (types.has('strength')) return 'strength';
  return 'other';
}

function _cleanSetFields(set) {
  const cleaned = {};
  if (set.weight !== undefined) cleaned.weight = set.weight;
  if (set.reps !== undefined) cleaned.reps = set.reps;
  if (set.time !== undefined) cleaned.time = set.time;
  if (set.distance !== undefined) cleaned.distance = set.distance;
  return cleaned;
}

// ============================================
// 6. ПОИСК ВАРИАНТА В STORE
// ============================================

function _resolveVariant(exerciseName) {
  if (typeof WorkoutStore === 'undefined') return null;
  return WorkoutStore.resolveByName(exerciseName);
}

function _addUnmatchedEntry(exerciseName, rawText, workoutDate) {
  if (typeof WorkoutStore === 'undefined') return null;
  return WorkoutStore.addUnmatchedEntry({
    name: exerciseName,
    rawText: rawText,
    context: { workoutDate },
    source: 'parser'
  });
}

// ============================================
// 7. ГЛАВНАЯ ФУНКЦИЯ ПАРСИНГА
// ============================================
//
// Возвращает массив объектов ParseResult:
// {
//   name: string,          // очищенное название
//   rawName: string,       // как было в тексте
//   sets: array,           // распознанные подходы
//   exerciseType: string,  // strength | cardio | timed | reps_only | distance_only | other
//   resolution: {          // результат поиска варианта
//     status: 'matched' | 'unmatched' | 'alias',
//     variant: Variant | null,
//     unmatchedEntry: UnmatchedEntry | null
//   },
//   loadType: string       // mapped load type
// }
// ============================================

function _mapToLoadType(exerciseType) {
  const map = {
    'strength': LOAD_TYPES.STRENGTH,
    'cardio': LOAD_TYPES.CARDIO,
    'timed': LOAD_TYPES.BODYWEIGHT,
    'timed_weight': LOAD_TYPES.STRENGTH,
    'reps_only': LOAD_TYPES.BODYWEIGHT,
    'distance_only': LOAD_TYPES.CARDIO
  };
  return map[exerciseType] || LOAD_TYPES.OTHER;
}

function parseWorkoutText(text, workoutDate = '') {
  const lines = _splitLines(text);

  if (lines.length === 0) return [];

  const parsedExercises = [];
  let current = null;
  let detectedDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Проверяем, не строка ли это с датой
    const dateResult = _parseDateLine(line);
    if (dateResult) {
      detectedDate = dateResult.date;
      if (!workoutDate) workoutDate = detectedDate;
      continue;
    }

    // Пропускаем строки с длительностью (она уже на строке даты)
    if (line.match(/^\d+\s*мин$/i) && detectedDate) continue;

    // Распознаём упражнение
    if (_isExerciseLine(line)) {
      if (current) parsedExercises.push(current);
      const name = _extractExerciseName(line);
      current = {
        name,
        rawName: line,
        sets: [],
        resolution: null,
        unmatchedEntryId: null
      };

      // Пытаемся найти вариант
      const resolved = _resolveVariant(name);
      if (resolved) {
        current.resolution = {
          status: resolved.source === 'alias' ? 'alias' : 'matched',
          variantId: resolved.variant.id,
          variantName: resolved.variant.name
        };
      }
      continue;
    }

    // Если нет текущего упражнения — пропускаем
    if (!current) continue;

    // Пытаемся распарсить как подход
    const setData = _parseSetLine(line);
    if (setData) {
      current.sets.push(_cleanSetFields(setData));
    }
  }

  // Добавляем последнее упражнение
  if (current) parsedExercises.push(current);

  // Финальная обработка: определяем тип, добавляем unmatched
  const results = [];
  for (const ex of parsedExercises) {
    const exerciseType = _determineExerciseType(ex.sets);
    const loadType = _mapToLoadType(exerciseType);

    // Если вариант не найден — добавляем в unmatchedEntries
    if (!ex.resolution) {
      const entry = _addUnmatchedEntry(ex.name, ex.rawName, workoutDate);
      ex.resolution = {
        status: 'unmatched',
        variantId: null,
        variantName: null,
        unmatchedEntryId: entry ? entry.id : null
      };
      ex.unmatchedEntryId = entry ? entry.id : null;
    }

    results.push({
      name: ex.name,
      rawName: ex.rawName,
      sets: ex.sets,
      exerciseType,
      loadType,
      resolution: ex.resolution,
      unmatchedEntryId: ex.unmatchedEntryId
    });
  }

  return results;
}

// ============================================
// 8. ПОСТРОЕНИЕ ИТОГОВОЙ СТРУКТУРЫ
// ============================================
// Формирует объекты для сохранения в WorkoutStore:
//   { workout: Workout, entries: WorkoutEntry[] }
//
// Вызывается только когда ВСЕ упражнения имеют resolution.variantId
// ============================================

function buildWorkoutFromParsed(parsedExercises, options = {}) {
  if (!Array.isArray(parsedExercises) || parsedExercises.length === 0) return null;

  // Проверяем, что все упражнения привязаны к вариантам
  const unresolved = parsedExercises.filter(ex => !ex.resolution || !ex.resolution.variantId);
  if (unresolved.length > 0) {
    console.warn('[buildWorkout] unresolved exercises:', unresolved.map(e => e.name));
    return null;
  }

  const date = options.date || new Date().toISOString().split('T')[0];
  const duration = options.duration || 0;

  // Создаём тренировку
  const workout = WorkoutStore.addWorkout({
    date,
    type: options.type || 'strength',
    duration,
    time: options.time || '',
    rating: options.rating || 0,
    feelBefore: options.feelBefore || 0,
    feelAfter: options.feelAfter || 0,
    note: options.note || '',
    rawLog: options.rawLog || ''
  });

  if (!workout) return null;

  // Создаём выполнения (entries)
  const entries = [];
  parsedExercises.forEach((ex, idx) => {
    if (!ex.resolution || !ex.resolution.variantId) return;

    const entry = WorkoutStore.addEntry(workout.id, ex.resolution.variantId, idx);
    if (!entry) return;

    // Добавляем подходы
    ex.sets.forEach((setData, setIdx) => {
      WorkoutStore.addSetToEntry(entry.id, {
        weight: setData.weight || 0,
        reps: setData.reps || 0,
        time: setData.time || 0,
        distance: setData.distance || 0
      });
    });

    entries.push(entry);
  });

  return { workout, entries };
}

// ============================================
// ЭКСПОРТ
// ============================================

window.parseWorkoutText = parseWorkoutText;
window.buildWorkoutFromParsed = buildWorkoutFromParsed;
