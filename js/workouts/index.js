const WorkoutIndex = (() => {
  let initialized = false;

  async function init() {
    if (initialized) return;
    await WorkoutStore.init();
    injectStyles();
    setupEventListeners();
    initialized = true;
  }

  function injectStyles() {
    if (document.getElementById('workout-v2-styles')) return;
    const link = document.createElement('link');
    link.id = 'workout-v2-styles';
    link.rel = 'stylesheet';
    link.href = 'js/workouts/styles.css';
    document.head.appendChild(link);
  }

  function setupEventListeners() {
    document.addEventListener('click', (e) => {
      const header = e.target.closest('.workout-header');
      if (header) {
        const card = header.closest('.workout-card');
        if (card) card.classList.toggle('collapsed');
      }
    });
  }

  function getContainer() {
    const section = document.getElementById('main-tab-train');
    if (!section) return null;
    let container = section.querySelector('.workout-v2-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'workout-v2-container';
      const existing = section.querySelector('.sub-tab-content, .train-content');
      if (existing) {
        existing.appendChild(container);
      } else {
        section.appendChild(container);
      }
    }
    return container;
  }

  async function render() {
    await init();
    const container = getContainer();
    if (!container) return;
    const trainings = WorkoutStore.getTrainings();
    const sorted = [...trainings].sort((a, b) => b.date.localeCompare(a.date) || ((b.time || '').localeCompare(a.time || '')));

    const readOnly = typeof isReadOnlyActive === 'function' && isReadOnlyActive();
    container.innerHTML = `
      <div class="wf-header-actions">
        ${readOnly ? '' : `<button class="btn orange primary" onclick="WorkoutForm.open()">➕ Добавить тренировку</button>`}
        <button class="btn grey" onclick="ExerciseModal.open()">🏋️ Управление упражнениями</button>
      </div>
      <div class="wf-stats">
        <span class="wf-stat">💪 ${sorted.length} ${sorted.length === 1 ? 'тренировка' : 'тренировок'}</span>
        <span class="wf-stat">🎯 ${new Set(sorted.flatMap(t => (t.exercises || []).map(e => e.name))).size} упражнений</span>
        <span class="wf-stat">⏱ ${sorted.reduce((s, t) => s + (t.duration || 0), 0)} мин</span>
      </div>
      <div id="wf-list" class="wf-list">
        ${sorted.length === 0
          ? `<div class="empty-state"><div class="empty-state-icon">🏋️</div><div class="empty-state-title">Пока нет тренировок</div><div class="empty-state-text">Нажмите «➕ Добавить тренировку»</div>${readOnly ? '' : `<button class="btn orange primary" onclick="WorkoutForm.open()">➕ Добавить первую тренировку</button>`}</div>`
          : sorted.map(t => WorkoutCard.renderOne(t)).join('')
        }
      </div>
    `;
  }

  return { init, render };
})();
