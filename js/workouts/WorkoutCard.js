const WorkoutCard = (() => {
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const weekday = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()];
    return `${day}.${month}.${year} (${weekday})`;
  }

  function typeLabel(type) {
    const map = { strength: '💪 Силовая', cardio: '🏃 Кардио', hiit: '🔥 ВИИТ', flex: '🧘 Растяжка', mix: '🔄 Микс' };
    return map[type] || type;
  }

  function renderStars(val) {
    if (!val) return '';
    return '<div class="stars">' + [1,2,3,4,5].map(n =>
      `<span class="star ${n <= val ? 'active' : ''}">★</span>`
    ).join('') + '</div>';
  }

  function renderOne(training) {
    const t = training;
    const exList = (t.exercises || []).map(ex => {
      const totalWeight = ex.sets.reduce((s, x) => s + (x.weight || 0), 0);
      const totalReps = ex.sets.reduce((s, x) => s + (x.reps || 0), 0);
      const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0), 0);
      return `
        <div class="wf-parsed-item">
          <div class="wf-parsed-name">${ex.name}</div>
          <div class="wf-parsed-stats">${ex.sets.length} подходов • макс. ${maxWeight} кг • ${totalReps} повт.</div>
        </div>`;
    }).join('');

    const hasUnrecognized = (t.exercises || []).some(e => (e.sets || []).some(s => s.unrecognized));
    const readOnly = typeof isReadOnlyActive === 'function' && isReadOnlyActive();

    return `
      <div class="workout-card" data-id="${t.id}">
        <div class="workout-header" onclick="WorkoutCard.toggle('${t.id}')">
          <div class="workout-header-left">
            <div class="workout-date">${formatDate(t.date)}</div>
            ${t.type ? `<div class="workout-type-badge">${typeLabel(t.type)}</div>` : ''}
            ${renderStars(t.rating)}
          </div>
          <div class="workout-toggle-icon">▼</div>
        </div>
        <div class="workout-body">
          <div class="workout-info-grid">
            ${t.duration ? `<div class="info-item"><div class="info-label">⏱ Длительность</div><div class="info-value">${t.duration} мин</div></div>` : ''}
            ${t.time ? `<div class="info-item"><div class="info-label">🕐 Время</div><div class="info-value">${t.time}</div></div>` : ''}
            ${t.feelBefore ? `<div class="info-item"><div class="info-label">😊 До</div><div class="info-value">${renderStars(t.feelBefore)}</div></div>` : ''}
            ${t.feelAfter ? `<div class="info-item"><div class="info-label">🔥 После</div><div class="info-value">${renderStars(t.feelAfter)}</div></div>` : ''}
          </div>
          ${t.rawText ? `<div class="section-title">📋 Лог тренировки</div><div class="log-box">${escapeHtml(t.rawText)}</div>` : ''}
          ${exList ? `<div class="section-title">🎯 Упражнения (${t.exercises.length})</div><div class="wf-parsed-list">${exList}</div>` : ''}
          ${hasUnrecognized ? `<div class="wf-unrecognized-warn">⚠️ Некоторые подходы не распознаны</div>` : ''}
          ${t.note ? `<div class="section-title">💬 Заметки</div><div class="note-box">${escapeHtml(t.note)}</div>` : ''}
          ${readOnly ? '' : `
          <div class="workout-actions">
            <button class="action-btn edit" onclick="event.stopPropagation();WorkoutForm.open('${t.id}')">✏️ Редактировать</button>
            <button class="action-btn delete" onclick="event.stopPropagation();WorkoutCard.remove('${t.id}')">🗑 Удалить</button>
          </div>`}
        </div>
      </div>`;
  }

  async function deleteWorkout(id) {
    if (!confirm('Удалить эту тренировку?')) return;
    await WorkoutStore.deleteTraining(id);
    WorkoutIndex.render();
  }

  function toggle(id) {
    const card = document.querySelector(`.workout-card[data-id="${id}"]`);
    if (card) card.classList.toggle('collapsed');
  }

  function escapeHtml(text) {
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
  }

  return { renderOne, remove: deleteWorkout, toggle };
})();
