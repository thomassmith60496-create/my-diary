const ExerciseManager = (() => {
  const DEFAULT_CATEGORIES = [
    { id: 'cat-strength', name: 'Силовые', type: 'strength', icon: '💪' },
    { id: 'cat-cardio', name: 'Кардио', type: 'cardio', icon: '🏃' },
    { id: 'cat-bodyweight', name: 'Повторения без веса', type: 'bodyweight', icon: '🏋️' },
    { id: 'cat-timed', name: 'Упражнения на время', type: 'timed', icon: '⏱' }
  ];

  let categories = [...DEFAULT_CATEGORIES];

  function getCategories() { return categories; }

  function getCategory(id) { return categories.find(c => c.id === id); }

  function getCategoryByType(type) { return categories.find(c => c.type === type); }

  function addCategory(name, type, icon) {
    const id = 'cat-' + Date.now();
    const cat = { id, name, type: type || 'strength', icon: icon || '🏋️' };
    categories.push(cat);
    return cat;
  }

  function getExercises() { return WorkoutStore.getExercises(); }

  function getExercise(id) { return WorkoutStore.getExercise(id); }

  function findByName(name) {
    const norm = WorkoutParser.normalize(name);
    return getExercises().find(e => WorkoutParser.normalize(e.name) === norm);
  }

  function findBySimilar(name) {
    const norm = WorkoutParser.normalize(name);
    return getExercises().filter(e => {
      const en = WorkoutParser.normalize(e.name);
      return norm.includes(en) || en.includes(norm);
    });
  }

  async function create(name, type, metricType, categoryId) {
    const exercise = {
      id: 'ex-' + Date.now(),
      name: name.trim(),
      type: type || 'strength',
      metricType: metricType || 'weight',
      categoryId: categoryId || '',
      createdAt: Date.now()
    };
    await WorkoutStore.saveExercise(exercise);
    return exercise;
  }

  async function update(id, updates) {
    const ex = getExercise(id);
    if (!ex) return;
    Object.assign(ex, updates);
    await WorkoutStore.saveExercise(ex);
    return ex;
  }

  async function remove(id) {
    await WorkoutStore.deleteExercise(id);
  }

  function stats(exerciseId) {
    const trainings = WorkoutStore.getTrainings();
    const entries = [];
    trainings.forEach(t => {
      t.exercises.forEach(ex => {
        if (ex.exerciseId === exerciseId) {
          entries.push({ date: t.date, trainingId: t.id, ...ex });
        }
      });
    });
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  }

  function computeProgress(entries, metric) {
    return entries.map(e => {
      const sets = e.sets || [];
      let value = 0;
      switch (metric) {
        case 'maxWeight':
          value = Math.max(...sets.map(s => s.weight || 0), 0);
          break;
        case 'totalReps':
          value = sets.reduce((s, x) => s + (x.reps || 0), 0);
          break;
        case 'volume':
          value = sets.reduce((s, x) => s + (x.weight || 0) * (x.reps || 0), 0);
          break;
        case 'maxTime':
          value = Math.max(...sets.map(s => s.time || 0), 0);
          break;
        case 'maxDistance':
          value = Math.max(...sets.map(s => s.distance || 0), 0);
          break;
      }
      return { date: e.date, value, sets: sets.length };
    });
  }

  return {
    getCategories, getCategory, getCategoryByType, addCategory,
    getExercises, getExercise, findByName, findBySimilar,
    create, update, remove, stats, computeProgress
  };
})();
