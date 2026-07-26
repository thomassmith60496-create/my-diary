"use strict";

function parseWorkoutText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const exercises = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // пропускаем заглушки
    if (line.match(/^(СУПЕРСЕТ|КРУГОВАЯ|🏋️|GymKeeper)/i)) continue;

    // строка упражнения: "1) Название" или "Название · оборудование"
    const isEx = line.match(/^\d+\)\s/) || (line.includes('·') && !line.match(/\d+(кг|lb|км|м|сек|с|мин|ч)\*/i));

    if (isEx) {
      if (current) exercises.push(current);
      const name = line.replace(/^\d+\)\s*/, '').trim();
      current = { name, sets: [] };
      continue;
    }

    if (!current) continue;

    // парсим подход
    const set = parseSetLine(line);
    if (set) current.sets.push(set);
  }
  if (current) exercises.push(current);

  return exercises;
}

function parseSetLine(line) {
  let m;

  // 80кг*8 / 100lb*5
  m = line.match(/^(\d+(?:\.\d+)?)\s*(кг|kg|lb)\s*\*\s*(\d+)$/i);
  if (m) {
    let w = parseFloat(m[1]);
    if (m[2].toLowerCase() === 'lb') w = Math.round(w * 0.4536);
    return { weight: w, reps: parseInt(m[3]) };
  }

  // 40кг (только вес)
  m = line.match(/^(\d+(?:\.\d+)?)\s*(кг|kg|lb)$/i);
  if (m) {
    let w = parseFloat(m[1]);
    if (m[2].toLowerCase() === 'lb') w = Math.round(w * 0.4536);
    return { weight: w, reps: 1 };
  }

  // 30сек*5кг
  m = line.match(/^(\d+)\s*(сек|с|мин|ч)\s*\*\s*(\d+(?:\.\d+)?)\s*(кг|kg|lb)?$/i);
  if (m) {
    return { time: toSec(parseInt(m[1]), m[2]), weight: m[3] ? parseFloat(m[3]) : 0 };
  }

  // 25мин:3.8км
  m = line.match(/^(\d+)\s*(сек|с|мин|ч)?\s*:\s*(\d+(?:\.\d+)?)\s*(км|м|km|m)?$/i);
  if (m) {
    const t = toSec(parseInt(m[1]), m[2] || 'мин');
    let d = parseFloat(m[3]);
    if (m[4] && (m[4].toLowerCase() === 'км' || m[4].toLowerCase() === 'km')) d *= 1000;
    return { time: t, distance: d };
  }

  // 30сек
  m = line.match(/^(\d+)\s*(сек|с|мин|ч)$/i);
  if (m) return { time: toSec(parseInt(m[1]), m[2]) };

  // 15 раз
  m = line.match(/^(\d+)\s*(раз|повторений|повт|раза)$/i);
  if (m) return { reps: parseInt(m[1]) };

  // 5км
  m = line.match(/^(\d+(?:\.\d+)?)\s*(км|м|km|m)$/i);
  if (m) {
    let d = parseFloat(m[1]);
    if (m[2].toLowerCase() === 'км' || m[2].toLowerCase() === 'km') d *= 1000;
    return { distance: d };
  }

  return null;
}

function toSec(val, unit) {
  if (unit === 'мин' || unit === 'min') return val * 60;
  if (unit === 'ч' || unit === 'h') return val * 3600;
  return val;
}

function detectLoadType(sets) {
  const types = new Set(sets.map(s => {
    if (s.weight && s.reps) return 'strength';
    if (s.weight && s.time) return 'timed_weight';
    if (s.time && s.distance) return 'cardio';
    if (s.time) return 'timed';
    if (s.reps) return 'reps_only';
    if (s.distance) return 'distance_only';
    return 'other';
  }));
  if (types.has('cardio')) return 'cardio';
  if (types.has('timed_weight')) return 'strength';
  if (types.has('strength')) return 'strength';
  if (types.has('timed')) return 'bodyweight';
  if (types.has('reps_only')) return 'bodyweight';
  if (types.has('distance_only')) return 'cardio';
  return 'other';
}
