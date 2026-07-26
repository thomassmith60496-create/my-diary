const WorkoutForm = (() => {
  let editingId = null;
  let onSaveCallback = null;

  function render() {
    return `
      <div id="workout-form-modal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 id="wf-title">➕ Новая тренировка</h3>
            <button class="modal-close" onclick="WorkoutForm.close()">✕</button>
          </div>
          <div class="modal-body">
            <label>Дата</label>
            <input id="wf-date" type="date" class="input">

            <label>Тип тренировки</label>
            <select id="wf-type" class="input">
              <option value="">— не выбрано —</option>
              <option value="strength">💪 Силовая</option>
              <option value="cardio">🏃 Кардио</option>
              <option value="hiit">🔥 ВИИТ</option>
              <option value="flex">🧘 Растяжка</option>
              <option value="mix">🔄 Микс</option>
            </select>

            <label>Длительность (мин)</label>
            <input id="wf-duration" type="number" class="input" placeholder="60">

            <label>Время</label>
            <input id="wf-time" type="time" class="input">

            <label>Лог тренировки</label>
            <textarea id="wf-log" class="input textarea" rows="6" placeholder="1) Жим штанги&#10;50кг * 10&#10;50кг * 8&#10;2) Тяга гантели&#10;30кг * 12"></textarea>

            <label>Заметки</label>
            <textarea id="wf-note" class="input textarea" rows="3" placeholder="Самочувствие, впечатления..."></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn grey" onclick="WorkoutForm.close()">Отмена</button>
            <button class="btn orange primary" onclick="WorkoutForm.save()">💾 Сохранить</button>
          </div>
        </div>
      </div>`;
  }

  function open(id) {
    editingId = id || null;
    const title = document.getElementById('wf-title');
    if (title) title.textContent = id ? '✏️ Редактировать тренировку' : '➕ Новая тренировка';

    if (id) {
      const t = WorkoutStore.getTraining(id);
      if (t) {
        document.getElementById('wf-date').value = t.date || '';
        document.getElementById('wf-type').value = t.type || '';
        document.getElementById('wf-duration').value = t.duration || '';
        document.getElementById('wf-time').value = t.time || '';
        document.getElementById('wf-log').value = t.rawText || t.exercises.map(e =>
          e.name + '\n' + (e.sets || []).map(s => `${s.weight}кг * ${s.reps}`).join('\n')
        ).join('\n') || '';
        document.getElementById('wf-note').value = t.note || '';
      }
    } else {
      document.getElementById('wf-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('wf-type').value = '';
      document.getElementById('wf-duration').value = '';
      document.getElementById('wf-time').value = '';
      document.getElementById('wf-log').value = '';
      document.getElementById('wf-note').value = '';
    }

    document.getElementById('workout-form-modal').classList.add('visible');
  }

  async function save() {
    const date = document.getElementById('wf-date').value;
    if (!date) { alert('Укажите дату'); return; }
    const type = document.getElementById('wf-type').value;
    const duration = parseInt(document.getElementById('wf-duration').value) || 0;
    const time = document.getElementById('wf-time').value;
    const log = document.getElementById('wf-log').value.trim();
    const note = document.getElementById('wf-note').value.trim();

    if (editingId) {
      const existing = WorkoutStore.getTraining(editingId);
      if (!existing) return;
      const exercises = log ? await WorkoutImporter.linkExercises(log) : [];
      const updated = { ...existing, date, type, duration, time, rawText: log, note, exercises };
      await WorkoutStore.saveTraining(updated);
    } else {
      await WorkoutImporter.importFromText(log, { date, type, duration, time, note });
    }

    close();
    if (onSaveCallback) onSaveCallback();
  }

  function close() {
    document.getElementById('workout-form-modal').classList.remove('visible');
    editingId = null;
  }

  function onSave(fn) { onSaveCallback = fn; }

  return { render, open, save, close, onSave };
})();
