const ExerciseModal = (() => {
  let currentId = null;
  let onSaveCallback = null;

  function render() {
    const cats = ExerciseManager.getCategories();
    return `
      <div id="workout-ex-modal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 id="ex-modal-title">➕ Новое упражнение</h3>
            <button class="modal-close" onclick="ExerciseModal.close()">✕</button>
          </div>
          <div class="modal-body">
            <label>Название</label>
            <input id="ex-f-name" type="text" class="input" placeholder="Жим штанги">

            <label>Тип</label>
            <select id="ex-f-type" class="input">
              <option value="strength">💪 Силовое</option>
              <option value="cardio">🏃 Кардио</option>
              <option value="bodyweight">🏋️ Повторения без веса</option>
              <option value="timed">⏱ На время</option>
            </select>

            <label>Категория</label>
            <select id="ex-f-category" class="input">
              ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="modal-footer">
            <button class="btn grey" onclick="ExerciseModal.close()">Отмена</button>
            <button class="btn orange primary" onclick="ExerciseModal.save()">💾 Сохранить</button>
          </div>
        </div>
      </div>`;
  }

  function open(id) {
    currentId = id || null;
    const title = document.getElementById('ex-modal-title');
    if (title) title.textContent = id ? '✏️ Редактировать упражнение' : '➕ Новое упражнение';

    if (id) {
      const ex = ExerciseManager.getExercise(id);
      if (ex) {
        document.getElementById('ex-f-name').value = ex.name;
        document.getElementById('ex-f-type').value = ex.type || 'strength';
        document.getElementById('ex-f-category').value = ex.categoryId || 'cat-strength';
      }
    } else {
      document.getElementById('ex-f-name').value = '';
      document.getElementById('ex-f-type').value = 'strength';
      document.getElementById('ex-f-category').value = 'cat-strength';
    }

    document.getElementById('workout-ex-modal').classList.add('visible');
  }

  async function save() {
    const name = document.getElementById('ex-f-name').value.trim();
    if (!name) { alert('Введите название упражнения'); return; }
    const type = document.getElementById('ex-f-type').value;
    const categoryId = document.getElementById('ex-f-category').value;

    if (currentId) {
      await ExerciseManager.update(currentId, { name, type, categoryId });
    } else {
      await ExerciseManager.create(name, type, null, categoryId);
    }

    close();
    if (onSaveCallback) onSaveCallback();
  }

  function close() {
    document.getElementById('workout-ex-modal').classList.remove('visible');
    currentId = null;
  }

  function onSave(fn) { onSaveCallback = fn; }

  return { render, open, save, close, onSave };
})();
