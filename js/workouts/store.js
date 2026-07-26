const WorkoutStore = (() => {
  const DB_PATH = 'lera_diary_v2';

  let cache = {
    trainings: null,
    exercises: null
  };
  let listeners = [];
  let loaded = false;
  let loading = false;

  function getUserId() {
    return typeof viewingUserId !== 'undefined' && viewingUserId || currentUserId;
  }

  function getRef(path) {
    return db.ref(`${DB_PATH}/${getUserId()}/${path}`);
  }

  function notify(event, data) {
    listeners.forEach(fn => fn(event, data));
  }

  async function load() {
    if (loading) return;
    const uid = getUserId();
    if (!uid) return;
    loading = true;
    notify('loading');
    const snap = await db.ref(`${DB_PATH}/${uid}`).once('value');
    const val = snap.val() || {};
    cache.trainings = val.trainings || {};
    cache.exercises = val.exercises || {};
    loaded = true;
    loading = false;
    notify('loaded', { trainings: cache.trainings, exercises: cache.exercises });
  }

  async function save(path, data) {
    await getRef(path).set(data);
    notify('saved', { path, data });
  }

  async function remove(path) {
    await getRef(path).remove();
    notify('deleted', { path });
  }

  return {
    async init() {
      if (!loaded) await load();
    },

    on(fn) {
      listeners.push(fn);
      return () => { listeners = listeners.filter(f => f !== fn); };
    },

    // ---- Trainings ----
    getTrainings() {
      return cache.trainings ? Object.values(cache.trainings) : [];
    },

    getTraining(id) {
      return cache.trainings ? cache.trainings[id] : null;
    },

    async saveTraining(training) {
      const id = training.id || 't-' + Date.now();
      training.id = id;
      if (!cache.trainings) cache.trainings = {};
      cache.trainings[id] = training;
      await save(`trainings/${id}`, training);
      return training;
    },

    async deleteTraining(id) {
      if (cache.trainings) delete cache.trainings[id];
      await remove(`trainings/${id}`);
    },

    // ---- Exercises ----
    getExercises() {
      return cache.exercises ? Object.values(cache.exercises) : [];
    },

    getExercise(id) {
      return cache.exercises ? cache.exercises[id] : null;
    },

    async saveExercise(exercise) {
      const id = exercise.id || 'ex-' + Date.now();
      exercise.id = id;
      if (!cache.exercises) cache.exercises = {};
      cache.exercises[id] = exercise;
      await save(`exercises/${id}`, exercise);
      return exercise;
    },

    async deleteExercise(id) {
      if (cache.exercises) delete cache.exercises[id];
      await remove(`exercises/${id}`);
    },

    // ---- Batch sync (for initial migration) ----
    async saveAll(trainings, exercises) {
      const uid = getUserId();
      if (!uid) return;
      cache.trainings = trainings;
      cache.exercises = exercises;
      await db.ref(`${DB_PATH}/${uid}`).set({ trainings, exercises });
      notify('loaded', { trainings, exercises });
    },

    isLoaded() { return loaded; },
    isLoading() { return loading; }
  };
})();
