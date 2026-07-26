"use strict";

// общие утилиты
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function fmtSet(s) {
  const p = [];
  if (s.weight) p.push(s.weight + ' кг');
  if (s.reps) p.push(s.reps + ' повт');
  if (s.time) p.push(s.time >= 60 ? Math.floor(s.time / 60) + ' мин' : s.time + ' сек');
  if (s.distance) p.push(s.distance >= 1000 ? (s.distance / 1000).toFixed(2) + ' км' : s.distance + ' м');
  return p.join(' · ') || '⚪';
}

// ======= ВКЛАДКА УПРАЖНЕНИЯ =======

function renderExList() {
  const q = (document.getElementById('v2-search')?.value || '').toLowerCase().trim();
  const mf = document.getElementById('v2-filter-muscle')?.value || 'all';
  const lf = document.getElementById('v2-filter-load')?.value || 'all';

  const cats = WorkoutStore.getMuscleCategories();
  const bases = WorkoutStore.getBaseExercises();
  const vars = WorkoutStore.getVariants();

  const tree = [];
  cats.forEach(cat => {
    const nodes = [];
    bases.filter(b => b.muscleCategoryIds && b.muscleCategoryIds.includes(cat.id)).forEach(b => {
      let vv = vars.filter(v => v.baseExerciseId === b.id);
      if (lf !== 'all') vv = vv.filter(v => v.loadType === lf);
      if (q) {
        const bm = b.normalizedName.includes(q);
        const vm = vv.some(v => v.normalizedName.includes(q));
        if (!bm && !vm) return;
        if (!bm) vv = vv.filter(v => v.normalizedName.includes(q));
      }
      if (vv.length === 0) return;
      nodes.push({ base: b, variants: vv });
    });
    if (nodes.length === 0) return;
    tree.push({ cat, nodes });
  });

  const c = document.getElementById('v2-exercise-list');
  const s = document.getElementById('v2-stats');
  if (s) s.textContent = '📦 ' + vars.length + ' вариантов';

  if (tree.length === 0) {
    c.innerHTML = '<div class="v2-empty"><div class="v2-empty-icon">🏋️</div><div class="v2-empty-title">' +
      (vars.length ? 'Ничего не найдено' : 'Нет упражнений') + '</div></div>';
    return;
  }

  c.innerHTML = tree.map(g => `
    <div class="v2-muscle-card">
      <div class="v2-muscle-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span>${g.cat.icon || ''} ${g.cat.name}</span>
        <span style="margin-left:auto;font-size:12px">▼</span>
      </div>
      <div class="v2-muscle-body">
        ${g.nodes.map(n => `
          <div class="v2-base-card">
            <div class="v2-base-header" onclick="this.parentElement.classList.toggle('collapsed')">
              <strong>${esc(n.base.name)}</strong>
              <span style="margin-left:auto;font-size:11px;color:#10b981">${n.variants.length} вар.</span>
            </div>
            <div class="v2-base-variants">
              ${n.variants.map(v => `
                <div class="v2-variant">
                  <span class="v2-variant-name">${esc(v.name)}</span>
                  <span class="v2-tag load">${LOAD_TYPE_LABELS[v.loadType] || v.loadType}</span>
                  ${v.equipmentId ? '<span class="v2-tag equipment">' + esc(EQUIPMENT_MAP[v.equipmentId]?.name || '') + '</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function populateFilters() {
  const sel = document.getElementById('v2-filter-muscle');
  if (!sel) return;
  sel.innerHTML = '<option value="all">Все категории</option>' +
    WorkoutStore.getMuscleCategories().map(c => '<option value="' + c.id + '">' + (c.icon || '') + ' ' + c.name + '</option>').join('');
}

// ======= ВКЛАДКА ТРЕБУЕТ ПРОВЕРКИ =======

function renderReview() {
  const c = document.getElementById('v2-unmatched-list');
  if (!c) return;
  const entries = WorkoutStore.getUnmatchedEntries().filter(e => e.status === 'pending');
  const badge = document.getElementById('v2-review-count');
  if (badge) badge.textContent = entries.length;

  if (entries.length === 0) {
    c.innerHTML = '<div class="v2-empty"><div class="v2-empty-icon">✅</div><div class="v2-empty-title">Нет записей</div></div>';
    return;
  }

  c.innerHTML = entries.map(e => `
    <div class="v2-review-card">
      <div class="v2-review-name">⚠️ ${esc(e.name)}</div>
      <div class="v2-review-actions">
        <select class="v2-review-select" id="rv-${e.id}">
          <option value="">— привязать к варианту —</option>
          ${WorkoutStore.getVariants().map(v => '<option value="' + v.id + '">' + esc(v.name) + '</option>').join('')}
        </select>
        <button class="v2-btn v2-btn-sm" onclick="resolveReview('${e.id}')">✅</button>
        <button class="v2-btn v2-btn-sm" onclick="skipReview('${e.id}')">⏭</button>
      </div>
    </div>
  `).join('');
}

window.resolveReview = function(id) {
  const sel = document.getElementById('rv-' + id);
  if (!sel || !sel.value) return;
  WorkoutStore.resolveUnmatchedEntry(id, sel.value);
  renderReview();
};
window.skipReview = function(id) {
  WorkoutStore.updateUnmatchedEntry(id, { status: 'skipped' });
  renderReview();
};

// ======= ВКЛАДКА ИМПОРТ =======

window.runParse = function() {
  const text = document.getElementById('v2-import-text')?.value;
  if (!text) return;

  // детектим дату из текста
  detectDateFromText(text);

  window._parsed = parseWorkoutText(text);
  showPreview();
};

function detectDateFromText(text) {
  const dateInput = document.getElementById('v2-import-date');
  if (!dateInput) return;
  if (dateInput.value) return; // уже установлена

  const line = text.split('\n').map(l => l.trim()).find(l => {
    return l.match(/^(\d{1,2})\s+([а-яА-ЯёЁ]+)\s+(\d{4})/) || l.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/) || l.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  });
  if (!line) return;

  const rus = line.match(/^(\d{1,2})\s+([а-яА-ЯёЁ]+)\s+(\d{4})/);
  if (rus) {
    const mm = { 'янв':'01','января':'01','фев':'02','февраля':'02','мар':'03','марта':'03',
      'апр':'04','апреля':'04','мая':'05','май':'05','июн':'06','июня':'06',
      'июл':'07','июля':'07','авг':'08','августа':'08','сен':'09','сентября':'09',
      'окт':'10','октября':'10','ноя':'11','ноября':'11','дек':'12','декабря':'12' };
    const d = rus[1].padStart(2,'0'), m = mm[rus[2].toLowerCase()] || '01', y = rus[3];
    dateInput.value = y + '-' + m + '-' + d;
    return;
  }
  const dot = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dot) dateInput.value = dot[3] + '-' + dot[2].padStart(2,'0') + '-' + dot[1].padStart(2,'0');
  else {
    const iso = line.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) dateInput.value = iso[1] + '-' + iso[2].padStart(2,'0') + '-' + iso[3].padStart(2,'0');
  }
}

function showPreview() {
  const c = document.getElementById('v2-import-preview');
  if (!c) return;
  const exs = window._parsed || [];
  if (exs.length === 0) { c.innerHTML = '<div class="v2-empty">Нет упражнений</div>'; return; }

  // сопоставляем
  exs.forEach(ex => {
    const r = WorkoutStore.resolveByName(ex.name);
    if (r) {
      ex._match = r.variant;
      ex._status = 'ok';
    } else {
      ex._status = 'new';
      // не создаём дубликат, если уже есть pending запись с таким именем
      const existing = WorkoutStore.getUnmatchedEntries().find(ue => ue.status === 'pending' && ue.normalizedName === normalizeExerciseName(ex.name));
      if (existing) {
        ex._unmatchedId = existing.id;
      } else {
        const ue = WorkoutStore.addUnmatchedEntry({ name: ex.name, source: 'parser', context: {} });
        if (ue) ex._unmatchedId = ue.id;
      }
    }
  });

  const allOk = exs.every(ex => ex._status === 'ok');
  renderReview();

  c.innerHTML = `
    <div class="v2-import-ex-list">
      ${exs.map((ex, i) => `
        <div class="v2-import-ex ${ex._status === 'ok' ? 'ok' : 'new'}">
          <div class="v2-import-ex-h">
            <span class="v2-import-ex-n">${i + 1}</span>
            <span class="v2-import-ex-name">${esc(ex.name)}</span>
            <span class="v2-import-ex-status">${ex._status === 'ok' ? '✅ ' + esc(ex._match.name) : '⚠️ не найдено'}</span>
          </div>
          <div class="v2-import-ex-sets">
            ${ex.sets.map(s => '<span class="v2-set-badge">' + fmtSet(s) + '</span>').join('')}
          </div>
          ${ex._status === 'new' ? `
            <div class="v2-import-ex-resolve">
              <select class="v2-review-select" id="ip-res-${i}">
                <option value="">— выбрать вариант —</option>
                ${WorkoutStore.getVariants().map(v => '<option value="' + v.id + '">' + esc(v.name) + '</option>').join('')}
              </select>
              <button class="v2-btn v2-btn-sm v2-btn-primary" onclick="resolveInline(${i})">✅</button>
            </div>` : ''}
        </div>
      `).join('')}
    </div>
    <div style="text-align:center;margin-top:16px">
      ${allOk
        ? '<button class="v2-btn v2-btn-primary" onclick="saveWorkout()">💾 Сохранить тренировку</button>'
        : '<span style="color:#92400e;font-weight:600">⚠️ Сначала разрешите все нераспознанные упражнения</span>'}
    </div>`;
}

window.resolveInline = function(idx) {
  const ex = window._parsed[idx];
  if (!ex) return;
  const sel = document.getElementById('ip-res-' + idx);
  if (!sel || !sel.value) return;
  const v = WorkoutStore.findVariantById(sel.value);
  if (!v) return;
  if (ex._unmatchedId) WorkoutStore.resolveUnmatchedEntry(ex._unmatchedId, v.id);
  else WorkoutStore.addAlias(ex.name, v.id);
  ex._status = 'ok';
  ex._match = v;
  showPreview();
};

window.saveWorkout = function() {
  const exs = window._parsed || [];
  if (exs.some(e => e._status !== 'ok')) return;

  const dateInput = document.getElementById('v2-import-date');
  const date = dateInput?.value || new Date().toISOString().split('T')[0];
  const dur = parseInt(document.getElementById('v2-import-duration')?.value) || 0;
  const text = document.getElementById('v2-import-text')?.value || '';

  const w = WorkoutStore.addWorkout({ date, duration: dur, rawLog: text });
  if (!w) return;

  exs.forEach((ex, i) => {
    const e = WorkoutStore.addEntry(w.id, ex._match.id, i);
    if (!e) return;
    ex.sets.forEach(s => WorkoutStore.addSetToEntry(e.id, {
      weight: s.weight || 0, reps: s.reps || 0, time: s.time || 0, distance: s.distance || 0
    }));
  });

  document.getElementById('v2-import-preview').innerHTML =
    '<div class="v2-import-done">✅ Тренировка сохранена</div>';
  window._parsed = [];
  renderWorkouts();
  setTimeout(() => switchTab('workouts'), 500);
};

window.clearImport = function() {
  document.getElementById('v2-import-text').value = '';
  document.getElementById('v2-import-preview').innerHTML = '';
  window._parsed = [];
};

// ======= ВКЛАДКА ТРЕНИРОВКИ =======

function renderWorkouts() {
  const c = document.getElementById('v2-workout-list');
  if (!c) return;
  const wws = WorkoutStore.getWorkouts().sort((a, b) => b.date.localeCompare(a.date));
  if (wws.length === 0) {
    c.innerHTML = '<div class="v2-empty"><div class="v2-empty-icon">🏋️</div><div class="v2-empty-title">Нет тренировок</div></div>';
    return;
  }
  c.innerHTML = wws.map(w => {
    const entries = WorkoutStore.findEntriesByWorkout(w.id);
    return `
      <div class="v2-w-card">
        <div class="v2-w-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span><strong>📅 ${w.date}</strong> · ${w.duration || '?'} мин · ${entries.length} упр</span>
          <span style="margin-left:auto;font-size:12px">▼</span>
        </div>
        <div class="v2-w-body">
          ${entries.map((e, i) => {
            const v = WorkoutStore.findVariantById(e.variantId);
            return `<div class="v2-w-entry">
              <span class="v2-w-en">${i + 1}</span>
              <span class="v2-w-en-name">${v ? esc(v.name) : '?'}</span>
              <div class="v2-w-sets">${e.sets.map(s => '<span class="v2-set-badge">' + fmtSet(s) + '</span>').join('')}</div>
            </div>`;
          }).join('')}
          <button class="v2-btn v2-btn-sm v2-btn-ghost" onclick="delW('${w.id}')" style="margin-top:8px">🗑 Удалить</button>
        </div>
      </div>`;
  }).join('');
}

window.delW = function(id) {
  if (!confirm('Удалить тренировку?')) return;
  WorkoutStore.removeWorkout(id);
  renderWorkouts();
};

// ======= ТАБЫ =======

window.switchTab = function(tab) {
  document.querySelectorAll('.v2-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.v2-tab-content').forEach(t => t.classList.remove('active'));
  const tb = document.getElementById('v2-tab-' + tab);
  const tc = document.getElementById('v2-tab-content-' + tab);
  if (tb) tb.classList.add('active');
  if (tc) tc.classList.add('active');
  if (tab === 'workouts') renderWorkouts();
  if (tab === 'review') renderReview();
};

// ======= INIT =======

window.initV2 = function() {
  renderExList();
  populateFilters();
  renderReview();
  renderWorkouts();
};
