const WorkoutParser = (() => {
  function normalize(s) {
    return s.toLowerCase().replace(/ё/g, 'е').replace(/[ьъ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function detectType(name) {
    const n = normalize(name);
    if (n.match(/беговая дорожка|велотренажёр|эллипс|степпер|велосипед|бег|ходьба/i)) return { type: 'cardio', metricType: 'cardio' };
    if (n.match(/планка|канат|статич|удержание/i)) return { type: 'timed', metricType: 'time' };
    if (n.match(/жим|присед|тяга|подъем|подъём|становая|штанга|гантел|гантель|сгибание|разгибание|махи/i)) return { type: 'strength', metricType: 'weight' };
    if (n.match(/отжимани|подтягиван|пресс|брусья|выпады|приседания|скручиван/i)) return { type: 'bodyweight', metricType: 'reps' };
    return { type: 'strength', metricType: 'weight' };
  }

  function parseWeightReps(line) {
    const m = line.match(/(\d+(?:\.\d+)?)(кг|lb|kg)\s*\*+\s*(\d+)/i);
    if (m) {
      const w = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      return { weight: unit === 'lb' ? Math.round(w * 0.4536) : w, reps: parseInt(m[3]) };
    }
    const m2 = line.match(/(\d+)\s*х\s*(\d+)/i);
    if (m2) return { weight: parseInt(m2[1]), reps: parseInt(m2[2]) };
    const m3 = line.match(/(\d+(?:\.\d+)?)(кг|lb|kg)\s+(\d+)/i);
    if (m3) {
      const w = parseFloat(m3[1]);
      const unit = m3[2].toLowerCase();
      return { weight: unit === 'lb' ? Math.round(w * 0.4536) : w, reps: parseInt(m3[3]) };
    }
    return null;
  }

  function parseTimed(line) {
    const m = line.match(/(\d+)(сек|мин|ч|s|m)\s*\*+\s*(\d+(?:\.\d+)?)(кг|lb)?/i);
    if (m) {
      const tv = parseInt(m[1]);
      const tu = m[2].toLowerCase();
      const w = m[4] ? parseFloat(m[3]) : 0;
      const unit = m[4] ? m[4].toLowerCase() : 'кг';
      let sec = tv; if (tu === 'мин' || tu === 'm') sec = tv * 60; if (tu === 'ч') sec = tv * 3600;
      return { time: sec, weight: unit === 'lb' ? Math.round(w * 0.4536) : w, reps: 0 };
    }
    return null;
  }

  function parseCardio(line) {
    const m = line.match(/(\d+)(сек|мин|ч|s|m)?\s*:\s*(\d+(?:\.\d+)?)(км|м|km|m)/i);
    if (m) {
      const tv = parseInt(m[1]);
      const tu = (m[2] || 'мин').toLowerCase();
      const d = parseFloat(m[3]);
      const du = (m[4] || 'км').toLowerCase();
      let sec = tv; if (tu === 'мин' || tu === 'm') sec = tv * 60; if (tu === 'ч') sec = tv * 3600;
      let meters = d; if (du === 'км' || du === 'km') meters = d * 1000;
      return { time: sec, distance: meters, reps: 0 };
    }
    const m2 = line.match(/^(\d+(?:\.\d+)?)(км|м|km|m)$/i);
    if (m2) {
      const d = parseFloat(m2[1]);
      return { distance: m2[2].toLowerCase() === 'км' || m2[2].toLowerCase() === 'km' ? d * 1000 : d, reps: 0 };
    }
    return null;
  }

  function parseTimeOnly(line) {
    const m = line.match(/^(\d+)(сек|мин|ч|s|m)$/i);
    if (m) {
      const tv = parseInt(m[1]);
      const tu = m[2].toLowerCase();
      let sec = tv; if (tu === 'мин' || tu === 'm') sec = tv * 60; if (tu === 'ч') sec = tv * 3600;
      return { time: sec, weight: 0, reps: 0 };
    }
    return null;
  }

  function parseRepsOnly(line) {
    const m = line.match(/^(\d+)\s*(раз|повторений|повт|раза)$/i);
    if (m) return { weight: 0, reps: parseInt(m[1]) };
    const m2 = line.match(/^x\s*(\d+)/i);
    if (m2) return { weight: 0, reps: parseInt(m2[1]) };
    return null;
  }

  function parseSet(line) {
    line = line.trim();
    if (!line) return null;

    let result = parseWeightReps(line);
    if (result) return { ...result, unrecognized: false };
    result = parseTimed(line);
    if (result) return { ...result, unrecognized: false };
    result = parseCardio(line);
    if (result) return { ...result, unrecognized: false };
    result = parseTimeOnly(line);
    if (result) return { ...result, unrecognized: false };
    result = parseRepsOnly(line);
    if (result) return { ...result, unrecognized: false };

    return { weight: 0, reps: 0, originalText: line, unrecognized: true };
  }

  function isExerciseHeader(line) {
    return !!(line.match(/^\d+\)\s+.+/) || (line.includes('·') && !line.match(/\d+(кг|lb)\*/i)));
  }

  function parse(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const exercises = [];
    let current = null;

    for (const line of lines) {
      if (line.match(/^(СУПЕРСЕТ|КРУГОВАЯ|🏋️|GymKeeper)/i)) continue;

      if (isExerciseHeader(line)) {
        if (current) exercises.push(current);
        const exerciseName = line.replace(/^\d+\)\s*/, '').trim();
        const typeInfo = detectType(exerciseName);
        current = {
          name: exerciseName,
          type: typeInfo.type,
          metricType: typeInfo.metricType,
          sets: []
        };
      } else if (current) {
        const set = parseSet(line);
        if (set) {
          set.originalText = line;
          current.sets.push(set);
          if (set.unrecognized) current.hasUnrecognized = true;
        }
      }
    }

    if (current) exercises.push(current);
    return exercises;
  }

  return { parse, detectType, parseSet, normalize };
})();
