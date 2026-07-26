const WorkoutImporter = (() => {
  function findOrCreateExercise(exerciseName, type, metricType) {
    const exercises = WorkoutStore.getExercises();
    const norm = WorkoutParser.normalize(exerciseName);

    let match = exercises.find(e => WorkoutParser.normalize(e.name) === norm);
    if (match) return match;

    match = exercises.find(e => {
      const en = WorkoutParser.normalize(e.name);
      return norm.includes(en) || en.includes(norm);
    });
    if (match) return match;

    const exercise = {
      id: 'ex-' + Date.now(),
      name: exerciseName.trim(),
      type: type || 'strength',
      metricType: metricType || 'weight',
      createdAt: Date.now()
    };
    WorkoutStore.saveExercise(exercise);
    return exercise;
  }

  function buildSets(sets) {
    return sets.map(s => ({
      weight: s.weight || 0,
      reps: s.reps || 0,
      time: s.time || 0,
      distance: s.distance || 0,
      unrecognized: s.unrecognized || false,
      originalText: s.originalText || ''
    }));
  }

  async function linkExercises(text) {
    const parsed = WorkoutParser.parse(text);
    const exercises = [];
    for (const ex of parsed) {
      const ref = findOrCreateExercise(ex.name, ex.type, ex.metricType);
      exercises.push({
        exerciseId: ref.id,
        name: ex.name,
        type: ex.type,
        metricType: ex.metricType,
        sets: buildSets(ex.sets)
      });
    }
    return exercises;
  }

  async function importFromText(text, meta = {}) {
    const exercises = await linkExercises(text);
    const training = {
      id: 't-' + Date.now(),
      date: meta.date || new Date().toISOString().slice(0, 10),
      type: meta.type || '',
      duration: meta.duration || 0,
      time: meta.time || '',
      rawText: text,
      exercises: exercises,
      note: meta.note || '',
      rating: meta.rating || 0,
      feelBefore: meta.feelBefore || 0,
      feelAfter: meta.feelAfter || 0,
      createdAt: Date.now()
    };
    await WorkoutStore.saveTraining(training);
    return training;
  }

  async function importGymKeeper(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const parsedTrainings = [];
    let current = null;

    for (const line of lines) {
      const dateMatch = line.match(/^📅\s*(\d{2})[\/.](\d{2})[\/.](\d{4})/);
      if (dateMatch) {
        if (current && current.exercises.length > 0) parsedTrainings.push(current);
        current = {
          date: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,
          exercises: [],
          createdAt: Date.now()
        };
        continue;
      }
      if (!current) continue;

      if (line.match(/^🏋️/)) {
        const name = line.replace(/^🏋️\s*/, '').trim();
        const typeInfo = WorkoutParser.detectType(name);
        current.exercises.push({ name, type: typeInfo.type, metricType: typeInfo.metricType, sets: [] });
        continue;
      }

      if (current.exercises.length > 0) {
        const last = current.exercises[current.exercises.length - 1];
        const m = line.match(/^(\d+)[×xх](\d+)/);
        if (m) last.sets.push({ weight: parseInt(m[1]) || 0, reps: parseInt(m[2]) || 0 });
      }
    }
    if (current && current.exercises.length > 0) parsedTrainings.push(current);

    const saved = [];
    for (const pt of parsedTrainings) {
      const exercises = [];
      for (const ex of pt.exercises) {
        const ref = findOrCreateExercise(ex.name, ex.type, ex.metricType);
        exercises.push({
          exerciseId: ref.id,
          name: ex.name,
          type: ex.type,
          metricType: ex.metricType,
          sets: buildSets(ex.sets)
        });
      }
      const training = {
        id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        date: pt.date,
        rawText: text,
        exercises,
        createdAt: Date.now()
      };
      await WorkoutStore.saveTraining(training);
      saved.push(training);
    }
    return saved;
  }

  return { linkExercises, importFromText, importGymKeeper };
})();
