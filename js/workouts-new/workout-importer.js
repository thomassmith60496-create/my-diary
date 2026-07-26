// ============================================
// 🏋️ ИМПОРТЁР ТРЕНИРОВОК (v2)
// ============================================
// UI-слой поверх workout-parser.js
// Отвечает за:
//   - отображение формы ввода текста
//   - предпросмотр результата парсинга
//   - инлайн-резолв нераспознанных упражнений
//   - финализация (создание тренировки в Store)
// ============================================
"use strict";

let _parsedResults = [];
let _lastImportDate = '';
let _lastImportDuration = 0;

// ============================================
// 1. ЗАПОЛНЕНИЕ ИНЛАЙН-СЕЛЕКТОВ
// ============================================

function _populateInlineVariantSelect(selectEl, selectedId = '') {
  if (!selectEl) return;
  const variants = WorkoutStore.getVariants();
  selectEl.innerHTML = '<option value="">— выберите вариант —</option>' +
    variants.map(v => {
      const base = WorkoutStore.findBaseExerciseById(v.baseExerciseId);
      const baseName = base ? base.name : '?';
      return `<option value="${v.id}" ${v.id === selectedId ? 'selected' : ''}>${escapeHtml(v.name)} (${escapeHtml(baseName)})</option>`;
    }).join('');
}

// ============================================
// 2. ПАРСИНГ И ПРЕДПРОСМОТР
// ============================================

window.runParsing = function() {
  const textarea = document.getElementById('v2-import-text');
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) { showImportError('Введите текст тренировки'); return; }

  const dateInput = document.getElementById('v2-import-date');
  const durationInput = document.getElementById('v2-import-duration');
  _lastImportDate = dateInput ? dateInput.value : '';
  _lastImportDuration = durationInput ? parseInt(durationInput.value) || 0 : 0;

  _parsedResults = parseWorkoutText(text, _lastImportDate);

  if (_parsedResults.length === 0) {
    showImportError('Не удалось распознать упражнения. Проверьте формат текста.');
    return;
  }

  _renderParsedPreview(_parsedResults);

  // Обновляем бейдж «Требует проверки»
  if (typeof updateUnmatchedBadge === 'function') updateUnmatchedBadge();
};

function showImportError(message) {
  const container = document.getElementById('v2-import-preview');
  if (container) {
    container.innerHTML = `<div class="v2-import-error">❌ ${escapeHtml(message)}</div>`;
  }
}

// ============================================
// 3. РЕНДЕР ПРЕДПРОСМОТРА
// ============================================

function _renderParsedPreview(results) {
  const container = document.getElementById('v2-import-preview');
  if (!container) return;

  const totalSets = results.reduce((sum, ex) => sum + ex.sets.length, 0);
  const matched = results.filter(ex => ex.resolution.status !== 'unmatched').length;
  const unmatched = results.filter(ex => ex.resolution.status === 'unmatched').length;

  // Определяем дату и длительность
  let detectedDate = _lastImportDate || '';
  let detectedDuration = _lastImportDuration || 0;

  // Пытаемся извлечь дату и длительность из текста (ещё раз пробегаем)
  const lines = document.getElementById('v2-import-text')?.value.split('\n').map(l => l.trim()).filter(l => l) || [];
  for (const line of lines) {
    const dateRes = _parseDateLineFromGlobal(line);
    if (dateRes) {
      detectedDate = dateRes.date;
      const durMatch = line.match(/(\d+)\s*мин/i);
      if (durMatch) detectedDuration = parseInt(durMatch[1]);
      break;
    }
  }

  const allResolved = unmatched === 0;

  let html = `
    <div class="v2-import-summary">
      <div class="v2-import-summary-row">
        <span>📅 Дата</span>
        <input type="date" id="v2-import-detected-date" value="${detectedDate}" class="v2-import-date-input">
      </div>
      <div class="v2-import-summary-row">
        <span>⏱ Длительность (мин)</span>
        <input type="number" id="v2-import-detected-duration" value="${detectedDuration}" class="v2-import-duration-input" min="0">
      </div>
      <div class="v2-import-summary-stats">
        <span class="v2-import-stat">📋 Упражнений: <strong>${results.length}</strong></span>
        <span class="v2-import-stat">🏋️ Подходов: <strong>${totalSets}</strong></span>
        <span class="v2-import-stat matched">✅ Найдено: <strong>${matched}</strong></span>
        ${unmatched > 0 ? `<span class="v2-import-stat unmatched">⚠️ Не найдено: <strong>${unmatched}</strong></span>` : ''}
      </div>
    </div>
    <div class="v2-import-exercise-list">
      ${results.map((ex, idx) => _renderExerciseRow(ex, idx)).join('')}
    </div>`;

  if (allResolved) {
    html += `
      <div class="v2-import-finalize">
        <button class="v2-btn v2-btn-primary" onclick="finalizeImport()">💾 Сохранить тренировку</button>
      </div>`;
  } else {
    html += `
      <div class="v2-import-finalize v2-import-finalize-blocked">
        <div class="v2-import-blocked-msg">⚠️ Сначала разрешите все нераспознанные упражнения</div>
      </div>`;
  }

  container.innerHTML = html;
}

function _renderExerciseRow(ex, idx) {
  const isUnmatched = ex.resolution.status === 'unmatched';
  const rowClass = isUnmatched ? 'v2-import-ex-row unmatched' : 'v2-import-ex-row matched';

  const resolutionCell = isUnmatched
    ? `<div class="v2-import-resolution v2-import-resolution-unmatched">
        <span class="v2-import-unmatched-label">⚠️ Требует проверки</span>
        <div class="v2-import-inline-resolve">
          <select class="v2-import-variant-select" id="v2-import-resolve-${idx}" onchange="onInlineResolve(${idx})">
            <option value="">— выберите вариант —</option>
          </select>
          <button class="v2-btn v2-btn-sm v2-btn-primary" onclick="onInlineResolveAndSave(${idx})">✅</button>
        </div>
      </div>`
    : `<div class="v2-import-resolution v2-import-resolution-matched">
        <span class="v2-import-matched-label">✅ ${escapeHtml(ex.resolution.variantName || 'Найден')}</span>
        <button class="v2-btn v2-btn-sm v2-btn-ghost" onclick="onInlineReassign(${idx})" title="Переназначить">✏️</button>
      </div>`;

  return `
    <div class="${rowClass}">
      <div class="v2-import-ex-header">
        <span class="v2-import-ex-number">${idx + 1}</span>
        <span class="v2-import-ex-name">${escapeHtml(ex.name)}</span>
        <span class="v2-import-ex-type">${_loadTypeLabel(ex.loadType)}</span>
      </div>
      <div class="v2-import-ex-body">
        <div class="v2-import-ex-sets">
          ${ex.sets.length > 0
            ? ex.sets.map(s => `<span class="v2-import-set-badge">${_formatSetPreview(s)}</span>`).join('')
            : '<span class="v2-import-no-sets">нет подходов</span>'}
        </div>
        ${resolutionCell}
      </div>
    </div>`;
}

function _loadTypeLabel(loadType) {
  const labels = {
    'strength': '💪',
    'cardio': '🏃',
    'bodyweight': '🤸',
    'timed': '⏱',
    'timed_weight': '💪⏱',
    'reps_only': '🤸',
    'distance_only': '📏'
  };
  return labels[loadType] || '📌';
}

function _formatSetPreview(set) {
  const parts = [];
  if (set.weight) parts.push(set.weight + ' кг');
  if (set.reps) parts.push(set.reps + ' повт');
  if (set.time) {
    if (set.time >= 60) parts.push(Math.floor(set.time / 60) + ' мин');
    else parts.push(set.time + ' сек');
  }
  if (set.distance) {
    if (set.distance >= 1000) parts.push((set.distance / 1000).toFixed(2) + ' км');
    else parts.push(set.distance + ' м');
  }
  return parts.join(' · ') || '⚪';
}

// ============================================
// 4. ИНЛАЙН-РЕЗОЛВ НЕРАСПОЗНАННЫХ
// ============================================

function _ensureSelectPopulated(idx) {
  const select = document.getElementById(`v2-import-resolve-${idx}`);
  if (select && select.options.length <= 1) {
    _populateInlineVariantSelect(select);
  }
  return select;
}

window.onInlineResolve = function(idx) {
  const select = _ensureSelectPopulated(idx);
  if (!select) return;
  const variantId = select.value;
  if (!variantId) return;

  const ex = _parsedResults[idx];
  if (!ex) return;
  const variant = WorkoutStore.findVariantById(variantId);
  if (!variant) return;

  // Если была создана unmatchedEntry — резолвим её
  if (ex.unmatchedEntryId) {
    WorkoutStore.resolveUnmatchedEntry(ex.unmatchedEntryId, variantId);
  } else {
    // Если записи не было — создаём alias
    WorkoutStore.addAlias(ex.name, variantId);
  }

  ex.resolution.status = 'matched';
  ex.resolution.variantId = variantId;
  ex.resolution.variantName = variant.name;
  ex.unmatchedEntryId = null;

  _renderParsedPreview(_parsedResults);
};

window.onInlineResolveAndSave = function(idx) {
  const select = _ensureSelectPopulated(idx);
  if (!select) return;
  const variantId = select.value;
  if (!variantId) { showImportError('Выберите вариант'); return; }
  onInlineResolve(idx);
};

window.onInlineReassign = function(idx) {
  const ex = _parsedResults[idx];
  if (!ex) return;

  // Показываем select для переназначения
  const row = document.querySelector(`#v2-import-preview .v2-import-ex-row:nth-child(${idx + 2})`); // +2 because summary is first
  // Actually, easier: toggle a reassign mode
  const container = document.getElementById('v2-import-preview');
  if (!container) return;

  // Открываем модалку переназначения (используем существующую modal-resolve)
  const entryId = ex.unmatchedEntryId;
  if (entryId) {
    openResolveUnmatchedModal(entryId);
  } else {
    // Если уже был matched — просто показываем тот же select
    ex.resolution.status = 'unmatched';
    ex.resolution.variantId = null;
    ex.resolution.variantName = null;
    _renderParsedPreview(_parsedResults);

    // Фокусируем select для этого idx
    setTimeout(() => {
      const select = document.getElementById(`v2-import-resolve-${idx}`);
      if (select) {
        _populateInlineVariantSelect(select);
        select.focus();
      }
    }, 50);
  }
};

// ============================================
// 5. ФИНАЛИЗАЦИЯ
// ============================================

window.finalizeImport = function() {
  const unresolved = _parsedResults.filter(ex =>
    !ex.resolution || !ex.resolution.variantId
  );
  if (unresolved.length > 0) {
    showImportError('Не все упражнения привязаны к вариантам: ' +
      unresolved.map(e => e.name).join(', '));
    return;
  }

  const dateInput = document.getElementById('v2-import-detected-date');
  const durationInput = document.getElementById('v2-import-detected-duration');
  const rawLog = document.getElementById('v2-import-text')?.value || '';

  const options = {
    date: dateInput ? dateInput.value : (_lastImportDate || new Date().toISOString().split('T')[0]),
    duration: durationInput ? parseInt(durationInput.value) || 0 : _lastImportDuration,
    rawLog
  };

  const result = buildWorkoutFromParsed(_parsedResults, options);

  if (!result) {
    showImportError('Ошибка при сохранении тренировки');
    return;
  }

  // Обновляем UI
  const container = document.getElementById('v2-import-preview');
  if (container) {
    container.innerHTML = `
      <div class="v2-import-success">
        <div class="v2-import-success-icon">✅</div>
        <div class="v2-import-success-title">Тренировка сохранена!</div>
        <div class="v2-import-success-text">
          📅 ${result.workout.date} · ${result.entries.length} упражнений
        </div>
        <button class="v2-btn v2-btn-primary" onclick="clearImportForm()">🔄 Импортировать ещё</button>
      </div>`;
  }

  // Сбрасываем состояние
  _parsedResults = [];

  // Обновляем бейдж проверки
  if (typeof renderUnmatchedList === 'function') renderUnmatchedList();
}

window.clearImportForm = function() {
  const textarea = document.getElementById('v2-import-text');
  if (textarea) textarea.value = '';
  const preview = document.getElementById('v2-import-preview');
  if (preview) preview.innerHTML = '';
  _parsedResults = [];
  _lastImportDate = '';
  _lastImportDuration = 0;
};

// ============================================
// 6. ДОП. ФУНКЦИЯ: ПАРСИНГ ДАТЫ ИЗ ГЛОБАЛЬНОЙ ОБЛАСТИ
// ============================================

function _parseDateLineFromGlobal(line) {
  const monthMap = {
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

  const rusMatch = line.match(/^(\d{1,2})\s+([а-яА-ЯёЁ]+)\s+(\d{4})/);
  if (rusMatch) {
    const day = rusMatch[1].padStart(2, '0');
    const monthStr = rusMatch[2].toLowerCase();
    const month = monthMap[monthStr] || '01';
    const year = rusMatch[3];
    return { date: `${year}-${month}-${day}` };
  }

  const dotMatch = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return { date: `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}` };
  }

  const isoMatch = line.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return { date: `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}` };
  }

  return null;
}

// ============================================
// ЭКСПОРТ
// ============================================

window._parseDateLineFromGlobal = _parseDateLineFromGlobal;
