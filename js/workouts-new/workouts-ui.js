// ============================================
// 🏋️ НОВАЯ СИСТЕМА — UI: РЕДАКТОР БАЗЫ УПРАЖНЕНИЙ
// ============================================
"use strict";

// ============================================
// СОСТОЯНИЕ РЕДАКТИРОВАНИЯ
// ============================================

let _editingBaseId = null;
let _editingVariantId = null;
let _contextBaseId = null;
let _moveVariantId = null;

// ============================================
// УТИЛИТЫ
// ============================================

function getWorkoutCountForVariant(variantId) {
  // Пока история не подключена — всегда 0
  return 0;
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ============================================
// УПРАВЛЕНИЕ МОДАЛКАМИ
// ============================================

function openModal(id) {
  document.getElementById(id).classList.add('visible');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('visible');
  // Сбрасываем ошибки
  document.querySelectorAll(`#${id} .v2-form-error`).forEach(el => el.remove());
}

function showFormError(modalId, message) {
  const modal = document.getElementById(modalId);
  const existing = modal.querySelector('.v2-form-error');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'v2-form-error';
  el.textContent = '❌ ' + message;
  el.style.cssText = 'color:#dc2626;font-size:12px;font-weight:600;margin-top:8px;grid-column:1/-1;';
  modal.querySelector('.v2-form-grid')?.appendChild(el);
}

// ============================================
// ЗАПОЛНЕНИЕ ОПЦИЙ ФИЛЬТРОВ
// ============================================

function populateFilterOptions() {
  const select = document.getElementById('v2-filter-muscle');
  if (!select) return;
  const categories = WorkoutStore.getMuscleCategories();
  select.innerHTML = '<option value="all">Все категории мышц</option>' +
    categories.map(c => `<option value="${c.id}">${c.icon || ''} ${c.name}</option>`).join('');
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ДЛЯ ФОРМ
// ============================================

function populateMuscleCheckboxes(containerId, selectedIds = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const categories = WorkoutStore.getMuscleCategories();
  container.innerHTML = categories.map(c => {
    const checked = selectedIds.includes(c.id);
    return `<label class="${checked ? 'checked' : ''}">
      <input type="checkbox" value="${c.id}" ${checked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('checked')">
      ${c.icon || ''} ${c.name}
    </label>`;
  }).join('');
}

function getSelectedMuscleIds(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

function populateEquipmentSelect(selectId, selectedId = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">— не выбрано —</option>' +
    EQUIPMENT_LIST.map(e =>
      `<option value="${e.id}" ${e.id === selectedId ? 'selected' : ''}>${e.name}</option>`
    ).join('');
}

function populateBaseSelect(selectId, excludeId = null, selectedId = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const bases = WorkoutStore.getBaseExercises().filter(b => b.id !== excludeId);
  select.innerHTML = '<option value="">— выберите —</option>' +
    bases.map(b => `<option value="${b.id}" ${b.id === selectedId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('');
}

function onVariantLoadChange() {
  const loadType = document.getElementById('v2-f-var-load').value;
  const measSelect = document.getElementById('v2-f-var-measurement');
  // Авто-подбор measurementType по умолчанию
  const defaults = {
    strength: 'weight_reps',
    cardio: 'distance_time',
    bodyweight: 'reps_only',
    other: 'none'
  };
  const suggested = defaults[loadType];
  if (suggested && !measSelect.dataset.userChanged) {
    measSelect.value = suggested;
  }
}

// ============================================
// МОДАЛКА: БАЗОВОЕ УПРАЖНЕНИЕ (создание/редактирование)
// ============================================

window.openCreateBaseModal = function() {
  _editingBaseId = null;
  document.getElementById('v2-modal-base-title').textContent = '➕ Создать базовое упражнение';
  document.getElementById('v2-f-base-name').value = '';
  populateMuscleCheckboxes('v2-f-base-muscles', []);
  openModal('v2-modal-base');
};

window.openEditBaseModal = function(id) {
  const base = WorkoutStore.findBaseExerciseById(id);
  if (!base) return;
  _editingBaseId = id;
  document.getElementById('v2-modal-base-title').textContent = '✏️ Редактировать: ' + base.name;
  document.getElementById('v2-f-base-name').value = base.name;
  populateMuscleCheckboxes('v2-f-base-muscles', base.muscleCategoryIds || []);
  openModal('v2-modal-base');
};

window.saveBaseExercise = function() {
  const name = document.getElementById('v2-f-base-name').value.trim();
  const muscleIds = getSelectedMuscleIds('v2-f-base-muscles');

  if (!name) {
    showFormError('v2-modal-base', 'Укажите название');
    return;
  }

  if (_editingBaseId) {
    WorkoutStore.updateBaseExercise(_editingBaseId, { name, muscleCategoryIds: muscleIds });
  } else {
    WorkoutStore.addBaseExercise({ name, muscleCategoryIds: muscleIds });
  }

  closeModal('v2-modal-base');
  renderExerciseList();
};

window.deleteBaseExercise = function(id) {
  const variants = WorkoutStore.findVariantsByBaseExercise(id);
  if (variants.length > 0) {
    alert('Нельзя удалить базовое упражнение, у которого есть варианты. Сначала удалите все варианты (' + variants.length + ' шт.)');
    return;
  }
  const base = WorkoutStore.findBaseExerciseById(id);
  if (!confirm('Удалить базовое упражнение «' + base.name + '»?')) return;
  WorkoutStore.removeBaseExercise(id);
  renderExerciseList();
};

// ============================================
// МОДАЛКА: ВАРИАНТ (создание/редактирование)
// ============================================

window.openCreateVariantModal = function(baseId) {
  _editingVariantId = null;
  _contextBaseId = baseId;
  document.getElementById('v2-modal-variant-title').textContent = '➕ Создать вариант';
  document.getElementById('v2-f-var-name').value = '';
  document.getElementById('v2-f-var-load').value = 'strength';
  populateEquipmentSelect('v2-f-var-equipment', '');
  populateMuscleCheckboxes('v2-f-var-muscles', []);
  // Авто-подбор измерения
  document.getElementById('v2-f-var-measurement').value = 'weight_reps';
  document.getElementById('v2-f-var-measurement').dataset.userChanged = '';
  openModal('v2-modal-variant');
};

window.openEditVariantModal = function(id) {
  const variant = WorkoutStore.findVariantById(id);
  if (!variant) return;
  _editingVariantId = id;
  _contextBaseId = variant.baseExerciseId;
  document.getElementById('v2-modal-variant-title').textContent = '✏️ Редактировать: ' + variant.name;
  document.getElementById('v2-f-var-name').value = variant.name;
  document.getElementById('v2-f-var-load').value = variant.loadType;
  document.getElementById('v2-f-var-measurement').value = variant.measurementType;
  document.getElementById('v2-f-var-measurement').dataset.userChanged = '1';
  populateEquipmentSelect('v2-f-var-equipment', variant.equipmentId);
  populateMuscleCheckboxes('v2-f-var-muscles', variant.muscleIds || []);
  openModal('v2-modal-variant');
};

window.saveVariant = function() {
  const name = document.getElementById('v2-f-var-name').value.trim();
  const loadType = document.getElementById('v2-f-var-load').value;
  const measurementType = document.getElementById('v2-f-var-measurement').value;
  const equipmentId = document.getElementById('v2-f-var-equipment').value;
  const muscleIds = getSelectedMuscleIds('v2-f-var-muscles');

  if (!name) {
    showFormError('v2-modal-variant', 'Укажите название варианта');
    return;
  }

  if (_editingVariantId) {
    WorkoutStore.updateVariant(_editingVariantId, {
      name,
      loadType,
      measurementType,
      equipmentId,
      muscleIds
    });
  } else {
    if (!_contextBaseId) {
      showFormError('v2-modal-variant', 'Не указано базовое упражнение');
      return;
    }
    WorkoutStore.addVariant({
      name,
      baseExerciseId: _contextBaseId,
      loadType,
      measurementType,
      equipmentId,
      muscleIds
    });
  }

  closeModal('v2-modal-variant');
  renderExerciseList();
};

window.deleteVariant = function(id) {
  const variant = WorkoutStore.findVariantById(id);
  if (!variant) return;
  if (!confirm('Удалить вариант «' + variant.name + '»?')) return;
  WorkoutStore.removeVariant(id);
  renderExerciseList();
};

// ============================================
// МОДАЛКА: ПЕРЕНОС ВАРИАНТА
// ============================================

window.openMoveVariantModal = function(variantId) {
  const variant = WorkoutStore.findVariantById(variantId);
  if (!variant) return;
  _moveVariantId = variantId;

  document.getElementById('v2-move-variant-name').textContent = '📝 ' + variant.name;
  populateBaseSelect('v2-f-move-base', variant.baseExerciseId, '');
  openModal('v2-modal-move');
};

window.saveMoveVariant = function() {
  const targetBaseId = document.getElementById('v2-f-move-base').value;
  if (!targetBaseId) {
    showFormError('v2-modal-move', 'Выберите базовое упражнение');
    return;
  }
  WorkoutStore.updateVariant(_moveVariantId, { baseExerciseId: targetBaseId });
  closeModal('v2-modal-move');
  renderExerciseList();
};

// ============================================
// МОДАЛКА: ОБЪЕДИНЕНИЕ БАЗОВЫХ УПРАЖНЕНИЙ
// ============================================

window.openMergeBasesModal = function() {
  const bases = WorkoutStore.getBaseExercises();
  if (bases.length < 2) {
    alert('Нужно минимум 2 базовых упражнения для объединения');
    return;
  }
  populateBaseSelect('v2-f-merge-source', null, '');
  populateBaseSelect('v2-f-merge-target', null, '');
  openModal('v2-modal-merge');
};

window.saveMergeBases = function() {
  const sourceId = document.getElementById('v2-f-merge-source').value;
  const targetId = document.getElementById('v2-f-merge-target').value;

  if (!sourceId || !targetId) {
    showFormError('v2-modal-merge', 'Выберите источник и цель');
    return;
  }
  if (sourceId === targetId) {
    showFormError('v2-modal-merge', 'Источник и цель должны быть разными');
    return;
  }

  const source = WorkoutStore.findBaseExerciseById(sourceId);
  const target = WorkoutStore.findBaseExerciseById(targetId);
  const variants = WorkoutStore.findVariantsByBaseExercise(sourceId);

  if (variants.length === 0) {
    if (!confirm('У «' + source.name + '» нет вариантов. Просто удалить его?')) return;
    WorkoutStore.removeBaseExercise(sourceId);
    closeModal('v2-modal-merge');
    renderExerciseList();
    return;
  }

  if (!confirm('Перенести ' + variants.length + ' вариантов из «' + source.name + '» в «' + target.name + '» и удалить источник?')) return;

  variants.forEach(v => {
    WorkoutStore.updateVariant(v.id, { baseExerciseId: targetId });
  });

  WorkoutStore.removeBaseExercise(sourceId);
  closeModal('v2-modal-merge');
  renderExerciseList();
};

// ============================================
// ФИЛЬТРАЦИЯ ПОСТРОЕНИЕ ДЕРЕВА
// ============================================

function getFilteredExerciseTree() {
  const searchQuery = (document.getElementById('v2-search')?.value || '').toLowerCase().trim();
  const muscleFilter = document.getElementById('v2-filter-muscle')?.value || 'all';
  const loadFilter = document.getElementById('v2-filter-load')?.value || 'all';

  const allCategories = WorkoutStore.getMuscleCategories();
  const allBases = WorkoutStore.getBaseExercises();
  const allVariants = WorkoutStore.getVariants();

  const tree = [];

  allCategories.forEach(cat => {
    const basesForCat = allBases.filter(base =>
      base.muscleCategoryIds && base.muscleCategoryIds.includes(cat.id)
    );
    if (basesForCat.length === 0) return;

    const baseNodes = [];
    basesForCat.forEach(base => {
      let variants = allVariants.filter(v => v.baseExerciseId === base.id);
      if (loadFilter !== 'all') {
        variants = variants.filter(v => v.loadType === loadFilter);
      }
      if (searchQuery) {
        const baseMatch = base.normalizedName.includes(searchQuery);
        const variantMatch = variants.some(v => v.normalizedName.includes(searchQuery));
        if (!baseMatch && !variantMatch) return;
        if (!baseMatch) {
          variants = variants.filter(v => v.normalizedName.includes(searchQuery));
        }
      }
      if (variants.length === 0) return;
      baseNodes.push({ base, variants });
    });
    if (baseNodes.length === 0) return;
    tree.push({ category: cat, baseNodes });
  });

  // Показываем беcкатегорные при поиске
  if (searchQuery) {
    const uncategorizedBases = allBases.filter(base =>
      !base.muscleCategoryIds || base.muscleCategoryIds.length === 0
    );
    const uncategorizedNodes = [];
    uncategorizedBases.forEach(base => {
      let variants = allVariants.filter(v => v.baseExerciseId === base.id);
      if (loadFilter !== 'all') {
        variants = variants.filter(v => v.loadType === loadFilter);
      }
      if (searchQuery) {
        const baseMatch = base.normalizedName.includes(searchQuery);
        if (!baseMatch) {
          variants = variants.filter(v => v.normalizedName.includes(searchQuery));
        }
        if (!baseMatch && variants.length === 0) return;
      }
      if (variants.length === 0 && !base.normalizedName.includes(searchQuery)) return;
      uncategorizedNodes.push({ base, variants });
    });
    if (uncategorizedNodes.length > 0) {
      tree.push({
        category: { id: 'uncategorized', name: 'Без категории', icon: '📂' },
        baseNodes: uncategorizedNodes
      });
    }
  }

  return tree;
}

function getFilterStats(tree) {
  let totalBases = 0, totalVariants = 0;
  tree.forEach(catNode => {
    catNode.baseNodes.forEach(bn => {
      totalBases++;
      totalVariants += bn.variants.length;
    });
  });
  return { bases: totalBases, variants: totalVariants };
}

// ============================================
// РЕНДЕР: ПОЛНЫЙ СПИСОК
// ============================================

function renderExerciseList() {
  const container = document.getElementById('v2-exercise-list');
  if (!container) return;

  const tree = getFilteredExerciseTree();
  const stats = getFilterStats(tree);

  const statsEl = document.getElementById('v2-stats');
  if (statsEl) {
    const all = WorkoutStore.getVariants().length;
    statsEl.textContent = stats.variants > 0
      ? `🔍 ${stats.variants} из ${all}`
      : `📦 ${all} вариантов`;
  }

  if (tree.length === 0) {
    const all = WorkoutStore.getVariants().length;
    if (all === 0) {
      container.innerHTML = `
        <div class="v2-empty">
          <div class="v2-empty-icon">🏋️</div>
          <div class="v2-empty-title">Нет упражнений</div>
          <div class="v2-empty-text">
            База упражнений пуста.
            <button class="v2-btn v2-btn-primary v2-btn-sm" style="margin-top:12px;" onclick="openCreateBaseModal()">➕ Создать базовое упражнение</button>
          </div>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="v2-empty">
          <div class="v2-empty-icon">🔍</div>
          <div class="v2-empty-title">Ничего не найдено</div>
          <div class="v2-empty-text">Попробуйте изменить поиск или фильтры</div>
        </div>`;
    }
    return;
  }

  container.innerHTML = tree.map(catNode => renderMuscleCategory(catNode)).join('');
}

// ============================================
// РЕНДЕР: КАТЕГОРИЯ МЫШЦ
// ============================================

function renderMuscleCategory(catNode) {
  const cat = catNode.category;
  const baseNodes = catNode.baseNodes;

  return `
    <div class="v2-muscle-card" data-muscle-id="${cat.id}">
      <div class="v2-muscle-header" onclick="toggleMuscleCategory('${cat.id}')">
        <div class="v2-muscle-header-left">
          <span>${cat.icon || ''} ${cat.name}</span>
        </div>
        <div class="v2-muscle-header-actions" onclick="event.stopPropagation()">
          <button class="v2-action-btn add" onclick="openCreateBaseModal()" title="Создать базовое упражнение">➕</button>
          <span class="v2-toggle-icon">▼</span>
        </div>
      </div>
      <div class="v2-muscle-body">
        ${baseNodes.map(bn => renderBaseExercise(bn)).join('')}
      </div>
    </div>`;
}

// ============================================
// РЕНДЕР: БАЗОВОЕ УПРАЖНЕНИЕ
// ============================================

function renderBaseExercise(bn) {
  const base = bn.base;
  const variants = bn.variants;

  return `
    <div class="v2-base-card" data-base-id="${base.id}">
      <div class="v2-base-header" onclick="toggleBaseExercise('${base.id}')">
        <div class="v2-base-header-left">
          <span class="v2-base-name">${escapeHtml(base.name)}</span>
          <span class="v2-base-count">${variants.length} вар.</span>
        </div>
        <div class="v2-base-actions" onclick="event.stopPropagation()">
          <button class="v2-action-btn" onclick="openCreateVariantModal('${base.id}')" title="Добавить вариант">➕</button>
          <button class="v2-action-btn edit" onclick="openEditBaseModal('${base.id}')" title="Редактировать">✏️</button>
          <button class="v2-action-btn delete" onclick="deleteBaseExercise('${base.id}')" title="Удалить">🗑</button>
          <span class="v2-base-toggle">▼</span>
        </div>
      </div>
      <div class="v2-base-variants">
        ${variants.map(v => renderVariant(v)).join('')}
      </div>
    </div>`;
}

// ============================================
// РЕНДЕР: ВАРИАНТ
// ============================================

function renderVariant(variant) {
  const loadLabel = LOAD_TYPE_LABELS[variant.loadType] || variant.loadType;
  const measLabel = MEASUREMENT_TYPE_LABELS[variant.measurementType] || variant.measurementType;
  const equipName = variant.equipmentId ? getEquipmentName(variant.equipmentId) : '';
  const muscleNames = variant.muscleIds
    .map(id => getMuscleCategoryName(id))
    .filter(n => n !== 'Неизвестно')
    .join(', ');
  const workoutCount = getWorkoutCountForVariant(variant.id);

  return `
    <div class="v2-variant" data-variant-id="${variant.id}">
      <div class="v2-variant-info">
        <span class="v2-variant-name">${escapeHtml(variant.name)}</span>
        <div class="v2-variant-tags">
          <span class="v2-tag load">${loadLabel}</span>
          <span class="v2-tag measurement">${measLabel}</span>
          ${equipName ? `<span class="v2-tag equipment">${equipName}</span>` : ''}
          ${muscleNames ? `<span class="v2-tag muscle">${muscleNames}</span>` : ''}
          ${variant.needsReview ? `<span class="v2-tag" style="background:#fef2f2;color:#dc2626;">⚠️</span>` : ''}
        </div>
        <span class="v2-workout-count">🏋️ ${workoutCount}</span>
      </div>
      <div class="v2-variant-actions">
        <button class="v2-action-btn edit" onclick="openEditVariantModal('${variant.id}')" title="Редактировать">✏️</button>
        <button class="v2-action-btn move" onclick="openMoveVariantModal('${variant.id}')" title="Перенести в другое базовое">📂</button>
        <button class="v2-action-btn delete" onclick="deleteVariant('${variant.id}')" title="Удалить">🗑</button>
      </div>
    </div>`;
}

// ============================================
// TOGGLE
// ============================================

function toggleMuscleCategory(id) {
  const card = document.querySelector(`.v2-muscle-card[data-muscle-id="${id}"]`);
  if (card) card.classList.toggle('collapsed');
}

function toggleBaseExercise(id) {
  const card = document.querySelector(`.v2-base-card[data-base-id="${id}"]`);
  if (card) card.classList.toggle('collapsed');
}

// ============================================
// TAB: ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ============================================

window.switchTab = function(tab) {
  document.querySelectorAll('.v2-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.v2-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('v2-tab-' + tab)?.classList.add('active');
  document.getElementById('v2-tab-content-' + tab)?.classList.add('active');
};

// ============================================
// TAB: ТРЕБУЕТ ПРОВЕРКИ
// ============================================

function getUnmatchedSearchQuery() {
  return (document.getElementById('v2-review-search')?.value || '').toLowerCase().trim();
}

function updateUnmatchedBadge() {
  const entries = WorkoutStore.getUnmatchedEntries();
  const pending = entries.filter(e => e.status === 'pending').length;
  const badge = document.getElementById('v2-review-count');
  if (badge) badge.textContent = pending;
}

window.renderUnmatchedList = function() {
  const container = document.getElementById('v2-unmatched-list');
  if (!container) return;

  const search = getUnmatchedSearchQuery();
  let entries = WorkoutStore.getUnmatchedEntries();

  if (search) {
    entries = entries.filter(e =>
      e.name.toLowerCase().includes(search) ||
      e.rawText.toLowerCase().includes(search)
    );
  }

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const totalCount = entries.length;

  const statsEl = document.getElementById('v2-review-stats');
  if (statsEl) {
    statsEl.textContent = pendingCount > 0
      ? `⚠️ ${pendingCount} требуют проверки`
      : `✅ Все проверены (${totalCount})`;
  }

  updateUnmatchedBadge();

  if (entries.length === 0) {
    container.innerHTML = search
      ? `<div class="v2-empty">
          <div class="v2-empty-icon">🔍</div>
          <div class="v2-empty-title">Ничего не найдено</div>
        </div>`
      : `<div class="v2-empty">
          <div class="v2-empty-icon">✅</div>
          <div class="v2-empty-title">Нет записей</div>
          <div class="v2-empty-text">Сюда попадают названия упражнений, которые не удалось распознать.</div>
        </div>`;
    return;
  }

  container.innerHTML = entries.map(entry => renderUnmatchedEntry(entry)).join('');
};

function renderUnmatchedEntry(entry) {
  const statusLabel = entry.status === 'resolved' ? '✅ Разрешено' :
                       entry.status === 'skipped' ? '⏭ Пропущено' :
                       '⚠️ Требует проверки';
  const statusClass = entry.status === 'resolved' ? 'resolved' :
                       entry.status === 'skipped' ? 'skipped' : 'pending';
  const variantName = entry.resolvedVariantId
    ? (WorkoutStore.findVariantById(entry.resolvedVariantId)?.name || 'неизвестный вариант')
    : null;

  return `
    <div class="v2-unmatched-card ${statusClass}" data-entry-id="${entry.id}">
      <div class="v2-unmatched-header">
        <div class="v2-unmatched-name">${escapeHtml(entry.name)}</div>
        <span class="v2-unmatched-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="v2-unmatched-meta">
        <span class="v2-unmatched-source">📥 ${entry.source === 'parser' ? 'парсер' : 'вручную'}</span>
        <span class="v2-unmatched-date">🕐 ${new Date(entry.createdAt).toLocaleDateString()}</span>
        ${entry.context.workoutDate ? `<span class="v2-unmatched-workout-date">📅 ${entry.context.workoutDate}</span>` : ''}
      </div>
      ${entry.rawText !== entry.name ? `<div class="v2-unmatched-raw">Исходный текст: «${escapeHtml(entry.rawText)}»</div>` : ''}
      ${variantName ? `<div class="v2-unmatched-variant">Привязано к: <strong>${escapeHtml(variantName)}</strong></div>` : ''}
      ${entry.notes ? `<div class="v2-unmatched-notes">📝 ${escapeHtml(entry.notes)}</div>` : ''}
      <div class="v2-unmatched-actions">
        ${entry.status === 'pending' ? `
          <button class="v2-btn v2-btn-primary v2-btn-sm" onclick="openResolveUnmatchedModal('${entry.id}')">🔗 Привязать к варианту</button>
          <button class="v2-btn v2-btn-sm" onclick="openCreateVariantFromUnmatched('${entry.id}')">➕ Создать вариант</button>
          <button class="v2-btn v2-btn-ghost v2-btn-sm" onclick="skipUnmatchedEntry('${entry.id}')">⏭ Пропустить</button>
        ` : ''}
        <button class="v2-btn v2-btn-ghost v2-btn-sm" onclick="deleteUnmatchedEntry('${entry.id}')" title="Удалить запись">🗑</button>
      </div>
    </div>`;
}

// ============================================
// ДЕЙСТВИЯ С ЗАПИСЯМИ
// ============================================

let _resolveEntryId = null;
let _createFromEntryId = null;

window.openResolveUnmatchedModal = function(entryId) {
  const entry = WorkoutStore.findUnmatchedEntryById(entryId);
  if (!entry) return;
  _resolveEntryId = entryId;

  document.getElementById('v2-resolve-entry-name').textContent = '📝 ' + entry.name;

  const select = document.getElementById('v2-f-resolve-variant');
  if (select) {
    const variants = WorkoutStore.getVariants();
    select.innerHTML = '<option value="">— выберите вариант —</option>' +
      variants.map(v => {
        const base = WorkoutStore.findBaseExerciseById(v.baseExerciseId);
        const baseName = base ? base.name : 'без базового';
        return `<option value="${v.id}">${escapeHtml(v.name)} (${escapeHtml(baseName)})</option>`;
      }).join('');
  }

  openModal('v2-modal-resolve');
};

window.saveResolveUnmatched = function() {
  const variantId = document.getElementById('v2-f-resolve-variant')?.value;
  if (!variantId) {
    showFormError('v2-modal-resolve', 'Выберите вариант');
    return;
  }

  WorkoutStore.resolveUnmatchedEntry(_resolveEntryId, variantId);
  closeModal('v2-modal-resolve');
  renderUnmatchedList();
};

window.openCreateVariantFromUnmatched = function(entryId) {
  const entry = WorkoutStore.findUnmatchedEntryById(entryId);
  if (!entry) return;
  _createFromEntryId = entryId;

  document.getElementById('v2-create-from-entry-name').textContent = '📝 ' + entry.name;
  document.getElementById('v2-f-create-var-name').value = entry.name;
  document.getElementById('v2-f-create-var-load').value = 'strength';
  document.getElementById('v2-f-create-var-measurement').value = 'weight_reps';
  populateEquipmentSelect('v2-f-create-var-equipment', '');
  populateMuscleCheckboxes('v2-f-create-var-muscles', []);
  populateBaseSelect('v2-f-create-var-base', null, '');

  openModal('v2-modal-create-from-unmatched');
};

window.saveCreateVariantFromUnmatched = function() {
  const name = document.getElementById('v2-f-create-var-name')?.value.trim();
  const baseExerciseId = document.getElementById('v2-f-create-var-base')?.value;
  const loadType = document.getElementById('v2-f-create-var-load')?.value;
  const measurementType = document.getElementById('v2-f-create-var-measurement')?.value;
  const equipmentId = document.getElementById('v2-f-create-var-equipment')?.value;
  const muscleIds = getSelectedMuscleIds('v2-f-create-var-muscles');

  if (!name) {
    showFormError('v2-modal-create-from-unmatched', 'Укажите название варианта');
    return;
  }
  if (!baseExerciseId) {
    showFormError('v2-modal-create-from-unmatched', 'Выберите базовое упражнение');
    return;
  }

  const variant = WorkoutStore.addVariant({
    name,
    baseExerciseId,
    loadType,
    measurementType,
    equipmentId,
    muscleIds
  });

  if (variant && _createFromEntryId) {
    WorkoutStore.resolveUnmatchedEntry(_createFromEntryId, variant.id);
  }

  closeModal('v2-modal-create-from-unmatched');
  renderUnmatchedList();
  renderExerciseList();
};

window.skipUnmatchedEntry = function(entryId) {
  WorkoutStore.updateUnmatchedEntry(entryId, { status: 'skipped' });
  renderUnmatchedList();
};

window.deleteUnmatchedEntry = function(entryId) {
  const entry = WorkoutStore.findUnmatchedEntryById(entryId);
  if (!entry) return;
  if (!confirm('Удалить запись «' + entry.name + '»?')) return;
  WorkoutStore.removeUnmatchedEntry(entryId);
  renderUnmatchedList();
};

// ============================================
// ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ============================================

window.renderExerciseList = renderExerciseList;
window.populateFilterOptions = populateFilterOptions;
window.toggleMuscleCategory = toggleMuscleCategory;
window.toggleBaseExercise = toggleBaseExercise;
window.closeModal = closeModal;
window.onVariantLoadChange = onVariantLoadChange;