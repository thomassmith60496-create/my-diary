// ============================================
// ✅ TO-DO (Календарь задач)
// ============================================
(function() {
'use strict';

/* ================= утилиты ================= */
const $ = s => document.querySelector(s);

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WEEKDAYS_FULL = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const WEEKDAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const pad = n => String(n).padStart(2,'0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
const parseKey = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };

function plural(n, one, few, many){
  const n10 = n % 10, n100 = n % 100;
  if(n10 === 1 && n100 !== 11) return one;
  if(n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

let seq = 0;
function uid(){ return 'id-' + Date.now().toString(36) + '-' + (seq++).toString(36) + '-' + Math.random().toString(36).slice(2,7); }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'\u0026amp;','<':'\u0026lt;','>':'\u0026gt;','"':'\u0026quot;',"'":'&#39;'}[c]));

function fmtDeadline(dl){
  if(!dl) return '';
  const [dp, tp] = String(dl).split('T');
  const [y,m,d] = dp.split('-');
  return `${d}.${m}.${y}` + (tp ? ' ' + tp.slice(0,5) : '');
}
const isOverdue = t => !!t.deadline && !t.completed && new Date(t.deadline) < new Date();
const normalizeTag = name => String(name || '').trim().replace(/^#+/,'').trim();

/* ================= состояние ================= */
const LS_KEY = 'local-calendar-v1';

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return {tasks:[], tags:[]};
    const data = JSON.parse(raw);
    const tasks = Array.isArray(data.tasks) ? data.tasks.map(t => ({
      id: t.id || uid(),
      date: t.date || todayKey(),
      title: String(t.title || ''),
      description: String(t.description || ''),
      completed: !!t.completed,
      deadline: t.deadline || null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      createdAt: t.createdAt || Date.now(),
      subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
        id: s.id || uid(), title: String(s.title || ''), completed: !!s.completed
      })) : []
    })) : [];
    return { tasks, tags: Array.isArray(data.tags) ? data.tags : [] };
  }catch(e){ return {tasks:[], tags:[]}; }
}

let state = loadState();

function save(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){ console.warn('Не удалось сохранить данные', e); }
}

/* ================= синхронизация с Firebase ================= */
function syncToFirebase(){
  if (typeof firebase === 'undefined') { console.warn('Firebase not initialized'); return; }
  const targetUid = getTargetUid();
  if (!targetUid) return;
  
  const tasksData = state.tasks.map(t => ({
    id: t.id,
    date: t.date,
    title: t.title,
    description: t.description,
    completed: t.completed,
    deadline: t.deadline,
    tags: t.tags,
    createdAt: t.createdAt,
    subtasks: t.subtasks
  }));
  
  const tagsData = state.tags;
  
  firebase.database().ref(`lera_todo_v1/${targetUid}`).set({
    tasks: tasksData,
    tags: tagsData,
    lastUpdated: Date.now()
  }).catch(err => console.warn('Ошибка синхронизации todo с Firebase:', err));
  
  showSyncStatus('✅ Todo сохранено в Firebase!', 'success');
}

/* ================= получение todo из Firebase ================= */
function loadFromFirebase(){
  if (typeof firebase === 'undefined') { console.warn('Firebase not initialized'); return; }
  const targetUid = getTargetUid();
  if (!targetUid) return;
  
  firebase.database().ref(`lera_todo_v1/${targetUid}`).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) return;
      
      // Merge with local data - Firebase takes precedence for existing tasks
      if (data.tasks && Array.isArray(data.tasks)) {
        // Get existing local task IDs
        const localIds = new Set(state.tasks.map(t => t.id));
        
        // Add tasks from Firebase that don't exist locally
        data.tasks.forEach(fbTask => {
          if (!localIds.has(fbTask.id)) {
            state.tasks.push({
              id: fbTask.id,
              date: fbTask.date || todayKey(),
              title: fbTask.title || '',
              description: fbTask.description || '',
              completed: fbTask.completed || false,
              deadline: fbTask.deadline || null,
              tags: fbTask.tags || [],
              createdAt: fbTask.createdAt || Date.now(),
              subtasks: fbTask.subtasks || []
            });
          }
        });
      }
      
      // Update tags from Firebase
      if (data.tags && Array.isArray(data.tags)) {
        state.tags = data.tags;
      }
      
      save();
      renderAll();
      showSyncStatus('✅ Todo загружено из Firebase!', 'success');
    })
    .catch(err => console.warn('Ошибка загрузки todo из Firebase:', err));
}

const now0 = new Date();
let viewY = now0.getFullYear();
let viewM = now0.getMonth();
let selectedDate = todayKey();   // при запуске всегда сегодня
let activeFilter = null;         // тег-фильтр или null = «Все»

const ui = {
  editingTask: null,
  editTags: new Set(),
  editingSub: null,      // {taskId, subId}
  addingSubFor: null,
  newFormOpen: false,
  newFormTags: new Set(),
  tagPanelOpen: false,
  renamingTag: null,
  prevPct: null,         // чтобы анимация «100%» проигрывалась только в момент достижения
};

/* ================= доступ к данным ================= */
const tasksOf = k => state.tasks.filter(t => t.date === k);
const findTask = id => state.tasks.find(t => t.id === id);

function dayStats(k){
  const list = tasksOf(k);
  const total = list.length;
  const done = list.filter(t => t.completed).length;
  let subTotal = 0, subDone = 0;
  for(const t of list){
    subTotal += t.subtasks.length;
    subDone += t.subtasks.filter(s => s.completed).length;
  }
  const pct = total ? Math.round(done / total * 100) : 0;
  return {total, done, subTotal, subDone, pct};
}

/* ================= иконки ================= */
const ICON = {
  check:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.6 5.4 11 12 3.6"/></svg>',
  plus:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9"/></svg>',
  pencil:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m11.4 2.4 2.2 2.2-7.8 7.8-2.9.7.7-2.9 7.8-7.8z"/></svg>',
  trash:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 4.3h10.6M6.4 2.3h3.2M4.1 4.3l.7 8.5c0 .5.5.9 1 .9h4.4c.5 0 1-.4 1-.9l.7-8.5M6.6 6.9v3.8M9.4 6.9v3.8"/></svg>',
  x:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m3.2 3.2 7.6 7.6M10.8 3.2l-7.6 7.6"/></svg>',
  clock:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="5.3"/><path d="M7 4.3V7l1.9 1.4"/></svg>',
  move:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8h9M8.5 4.5 12 8l-3.5 3.5M13.5 3v10"/></svg>',
};

/* ================= изменения данных ================= */
function commit(){ save(); renderAll(); }

function addTask(title, opts = {}){
  title = String(title || '').trim();
  if(!title) return;
  state.tasks.push({
    id: uid(),
    date: opts.date || selectedDate,
    title,
    description: String(opts.description || '').trim(),
    completed: false,
    deadline: opts.deadline || null,
    tags: [...new Set(opts.tags || [])],
    createdAt: Date.now(),
    subtasks: [],
  });
  commit();
}

function syncParent(t){
  if(t.subtasks.length) t.completed = t.subtasks.every(s => s.completed);
}

function toggleTask(id){
  const t = findTask(id); if(!t) return;
  const target = !t.completed;
  t.completed = target;
  if(t.subtasks.length) t.subtasks.forEach(s => s.completed = target);
  commit();
}

function toggleSub(taskId, subId){
  const t = findTask(taskId); if(!t) return;
  const s = t.subtasks.find(x => x.id === subId); if(!s) return;
  s.completed = !s.completed;
  syncParent(t);
  commit();
}

function deleteTask(id){
  if(!confirm('Удалить задачу?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  if(ui.editingTask === id) ui.editingTask = null;
  commit();
}

function startEditTask(id){
  const t = findTask(id); if(!t) return;
  ui.editingTask = id;
  ui.editTags = new Set(t.tags);
  ui.editingSub = null;
  ui.addingSubFor = null;
  renderAll();
}

function saveTaskEdit(id){
  const t = findTask(id);
  if(!t){ ui.editingTask = null; renderAll(); return; }
  const root = document.querySelector(`.task[data-id="${id}"]`);
  if(!root) return;
  const title = root.querySelector('.edit-title').value.trim();
  if(!title){ toast('Название не может быть пустым'); root.querySelector('.edit-title').focus(); return; }
  t.title = title;
  const dl = root.querySelector('.edit-deadline').value;
  t.deadline = dl ? dl.slice(0,16) : null;
  const descEl = root.querySelector('.edit-desc');
  t.description = descEl ? descEl.value.trim() : '';
  t.tags = [...ui.editTags].filter(tag => state.tags.includes(tag));
  ui.editingTask = null;
  commit();
}

function addSub(taskId, title){
  const t = findTask(taskId); if(!t) return;
  title = String(title || '').trim();
  if(!title) return;
  t.subtasks.push({id: uid(), title, completed: false});
  syncParent(t);
  commit();
}

function saveSubEdit(taskId, subId){
  const t = findTask(taskId);
  const s = t && t.subtasks.find(x => x.id === subId);
  ui.editingSub = null;
  if(s){
    const inp = document.querySelector(`.task[data-id="${taskId}"] .sub[data-subid="${subId}"] .sub-edit-input`);
    const v = inp ? inp.value.trim() : '';
    if(v) s.title = v;
  }
  commit();
}

function deleteSub(taskId, subId){
  if(!confirm('Удалить подзадачу?')) return;
  const t = findTask(taskId); if(!t) return;
  t.subtasks = t.subtasks.filter(s => s.id !== subId);
  syncParent(t);
  commit();
}

function moveToday(id){
  const t = findTask(id); if(!t) return;
  state.tasks.push({
    id: uid(),
    date: todayKey(),
    title: t.title,
    description: t.description || '',
    completed: false,
    deadline: null,
    tags: [...t.tags],
    createdAt: Date.now(),
    subtasks: t.subtasks.map(s => ({id: uid(), title: s.title, completed: false})),
  });
  commit();
  toast('Задача скопирована на сегодня');
}

/* ================= теги ================= */
function createTag(name){
  const n = normalizeTag(name);
  if(!n) return null;
  if(!state.tags.includes(n)) state.tags.push(n);
  return n;
}

function deleteTag(tag){
  if(!confirm(`Удалить тег #${tag}? Задачи останутся на месте.`)) return;
  state.tags = state.tags.filter(t => t !== tag);
  state.tasks.forEach(t => { t.tags = t.tags.filter(x => x !== tag); });
  ui.editTags.delete(tag);
  ui.newFormTags.delete(tag);
  if(activeFilter === tag) activeFilter = null;
  commit();
}

function saveRename(oldName){
  const inp = $('.tag-rename-input');
  const n = normalizeTag(inp ? inp.value : '');
  if(!n){ ui.renamingTag = null; renderAll(); return; }
  if(n !== oldName){
    if(state.tags.includes(n)){ toast('Такой тег уже существует'); inp && inp.focus(); return; }
    state.tags = state.tags.map(t => t === oldName ? n : t);
    state.tasks.forEach(t => { t.tags = t.tags.map(x => x === oldName ? n : x); });
    if(ui.editTags.has(oldName)){ ui.editTags.delete(oldName); ui.editTags.add(n); }
    if(ui.newFormTags.has(oldName)){ ui.newFormTags.delete(oldName); ui.newFormTags.add(n); }
    if(activeFilter === oldName) activeFilter = n;
  }
  ui.renamingTag = null;
  commit();
}

/* ================= рендер: календарь ================= */
function renderCalendar(){
  $('#calMonth').textContent = MONTHS[viewM];
  $('#calYear').textContent = viewY;

  const stMap = {};
  for(const t of state.tasks){
    const s = stMap[t.date] || (stMap[t.date] = {total:0, done:0});
    s.total++;
    if(t.completed) s.done++;
  }

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const offset = (new Date(viewY, viewM, 1).getDay() + 6) % 7; // неделя с понедельника
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const tk = todayKey();

  let html = WEEKDAYS_SHORT.map(w => `<div class="wd">${w}</div>`).join('');
  for(let i = 0; i < cells; i++){
    const d = new Date(viewY, viewM, i - offset + 1);
    const k = keyOf(d);
    const s = stMap[k];
    let cls = 'cell';
    if(d.getMonth() !== viewM) cls += ' other';
    if(k === tk) cls += ' today';
    if(k === selectedDate) cls += ' selected';
    let cntHtml = '', barHtml = '';
    if(s && s.total > 0){
      const pct = Math.round(s.done / s.total * 100);
      cntHtml = `<span class="cnt">${s.done}/${s.total}</span>`;
      barHtml = `<span class="bar${pct === 100 ? ' full' : ''}"><i style="width:${pct}%"></i></span>`;
    }
    html += `<button type="button" class="${cls}" data-date="${k}"><span class="num">${d.getDate()}</span>${cntHtml}${barHtml}</button>`;
  }
  $('#calGrid').innerHTML = html;
}

/* ================= рендер: шапка дня ================= */
function renderDayHeader(){
  const st = dayStats(selectedDate);
  const d = parseKey(selectedDate);
  const dateStr = `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  const isToday = selectedDate === todayKey();

  /*
    ИСПРАВЛЕНО: бейдж «100% выполнено» показывается ТОЛЬКО если в дне
    есть хотя бы одна задача и все они выполнены. Раньше он мог
    появляться и при пустом дне.
  */
  const isFull = st.total > 0 && st.pct === 100;
  const justHit = isFull && ui.prevPct !== 100;

  let subline = 'Задач пока нет';
  let barHtml = '', statsHtml = '';
  if(st.total > 0){
    subline = `${st.done} из ${st.total} ${plural(st.total,'задачи','задач','задач')} выполнено · ${st.pct}%`;
    barHtml = `<div class="day-bar${isFull ? ' full' : ''}"><i style="width:${st.pct}%"></i></div>`;
    statsHtml = `<div class="day-stats">Задач: ${st.total} · Выполнено: ${st.done} · Подзадач: ${st.subTotal} · Выполнено подзадач: ${st.subDone}</div>`;
  }
  const badge = isFull ? `<div class="full-badge${justHit ? ' pop' : ''}">✦ 100% выполнено</div>` : '';

  $('#dayHeader').innerHTML = `
    <div class="day-date-row">
      <h2 class="day-date">${dateStr}</h2>
      ${isToday ? '<span class="today-chip">сегодня</span>' : ''}
      ${badge}
    </div>
    <div class="day-subline">${subline}</div>
    ${barHtml}${statsHtml}`;

  ui.prevPct = st.pct;
}

/* ================= рендер: фильтр по тегам ================= */
function renderFilterBar(){
  const bar = $('#filterBar');
  if(!state.tags.length){ bar.innerHTML = ''; bar.hidden = true; return; }
  bar.hidden = false;
  let html = `<button type="button" class="chip${activeFilter === null ? ' active' : ''}" data-tag="">Все</button>`;
  for(const tag of state.tags){
    html += `<button type="button" class="chip${activeFilter === tag ? ' active' : ''}" data-tag="${esc(tag)}">#${esc(tag)}</button>`;
  }
  bar.innerHTML = html;
}

/* ================= рендер: список задач ================= */
function renderTaskList(){
  const wrap = $('#taskList');
  const all = tasksOf(selectedDate);
  let list = activeFilter ? all.filter(t => t.tags.includes(activeFilter)) : all.slice();
  // сначала невыполненные, затем выполненные; внутри групп — порядок создания
  list.sort((a,b) => (a.completed - b.completed) || (a.createdAt - b.createdAt));

  if(!list.length){
    if(all.length && activeFilter){
      wrap.innerHTML = `<div class="empty"><div class="empty-ico">◎</div><div class="empty-title">Нет задач с тегом <b>#${esc(activeFilter)}</b></div><button type="button" class="empty-link" data-act="clear-filter">Показать все задачи →</button></div>`;
    }else{
      wrap.innerHTML = `<div class="empty"><div class="empty-ico">○</div><div class="empty-title">На этот день пока нет задач</div><button type="button" class="empty-link" data-act="focus-quick">Добавить первую задачу →</button></div>`;
    }
    return;
  }

  const hasPending = list.some(t => !t.completed);
  const doneCount = list.filter(t => t.completed).length;
  let html = '', dividerAdded = false;
  for(const t of list){
    if(t.completed && hasPending && !dividerAdded){
      html += `<div class="group-label">Выполнено · ${doneCount}</div>`;
      dividerAdded = true;
    }
    html += taskHTML(t);
  }
  wrap.innerHTML = html;
}

function taskHTML(t){
  if(ui.editingTask === t.id){
    return `<div class="task editing" data-id="${t.id}">${editFormHTML(t)}</div>`;
  }
  const overdue = isOverdue(t);
  const meta = [];
  if(t.deadline){
    meta.push(`<span class="dl${overdue ? ' overdue' : ''}">${ICON.clock}<span>${fmtDeadline(t.deadline)}${overdue ? ' · просрочено' : ''}</span></span>`);
  }
  for(const tag of t.tags) meta.push(`<span class="tag-pill">#${esc(tag)}</span>`);

  const canMove = !t.completed && t.date < todayKey();
  const subsHtml = t.subtasks.map(s => subHTML(t.id, s)).join('');
  const addingHere = ui.addingSubFor === t.id;
  const subsBlock = (subsHtml || addingHere)
    ? `<div class="subs">${subsHtml}${addingHere ? '<div class="sub new"><input class="sub-input" placeholder="Новая подзадача…"></div>' : ''}</div>`
    : '';

  return `<div class="task${t.completed ? ' done' : ''}" data-id="${t.id}">
    <div class="task-main">
      <button type="button" class="cb${t.completed ? ' checked' : ''}" data-act="toggle-task" title="${t.completed ? 'Отменить выполнение' : 'Отметить выполненную'}">${ICON.check}</button>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
        ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
      </div>
      <div class="task-actions">
        ${canMove ? `<button type="button" class="icon-btn" data-act="move-today" title="Перенести на сегодня">${ICON.move}</button>` : ''}
        <button type="button" class="icon-btn" data-act="edit-task" title="Редактировать">${ICON.pencil}</button>
        <button type="button" class="icon-btn danger" data-act="delete-task" title="Удалить">${ICON.trash}</button>
      </div>
    </div>
    ${subsBlock}
    <button type="button" class="add-sub" data-act="add-sub">${ICON.plus}<span>Подзадача</span></button>
  </div>`;
}

function subHTML(taskId, s){
  if(ui.editingSub && ui.editingSub.taskId === taskId && ui.editingSub.subId === s.id){
    return `<div class="sub editing" data-subid="${s.id}">
      <input class="sub-edit-input" value="${esc(s.title)}">
      <button type="button" class="icon-btn" data-act="save-sub" title="Сохранить">${ICON.check}</button>
      <button type="button" class="icon-btn" data-act="cancel-sub-edit" title="Отмена">${ICON.x}</button>
    </div>`;
  }
  return `<div class="sub${s.completed ? ' done' : ''}" data-subid="${s.id}">
    <button type="button" class="cb small${s.completed ? ' checked' : ''}" data-act="toggle-sub" title="${s.completed ? 'Отменить выполнение' : 'Отметить выполненную'}">${ICON.check}</button>
    <span class="sub-title">${esc(s.title)}</span>
    <span class="sub-actions">
      <button type="button" class="icon-btn" data-act="edit-sub" title="Редактировать">${ICON.pencil}</button>
      <button type="button" class="icon-btn danger" data-act="delete-sub" title="Удалить">${ICON.x}</button>
    </span>
  </div>`;
}

function editFormHTML(t){
  const chips = state.tags.map(tag =>
    `<button type="button" class="chip tog${ui.editTags.has(tag) ? ' active' : ''}" data-act="toggle-edit-tag" data-tag="${esc(tag)}">#${esc(tag)}</button>`
  ).join('');
  return `<div class="edit-form">
    <input class="inp edit-title" value="${esc(t.title)}" placeholder="Название задачи">
    <textarea class="inp edit-desc" rows="2" placeholder="Описание (необязательно)">${esc(t.description || '')}</textarea>
    <div class="edit-row">
      <label class="field"><span>Дедлайн</span><input type="datetime-local" class="inp edit-deadline" value="${esc(t.deadline || '')}"></label>
      ${t.deadline ? '<button type="button" class="link-btn" data-act="clear-edit-deadline">убрать дедлайн</button>' : ''}
    </div>
    <div class="tags-row">${chips}<input class="inp tiny new-tag-inp" placeholder="${state.tags.length ? 'новый тег…' : 'создать тег…'}"></div>
    <div class="edit-btns">
      <button type="button" class="btn primary" data-act="save-task-edit">Сохранить</button>
      <button type="button" class="btn ghost" data-act="cancel-task-edit">Отмена</button>
    </div>
  </div>`;
}

/* ================= рендер: модалка тегов ================= */
function renderTagModal(){
  if(!ui.tagPanelOpen) return;
  const rows = state.tags.map(tag => {
    const count = state.tasks.filter(t => t.tags.includes(tag)).length;
    if(ui.renamingTag === tag){
      return `<div class="tag-row renaming" data-tag="${esc(tag)}">
        <input class="inp tag-rename-input" value="${esc(tag)}">
        <button type="button" class="icon-btn" data-act="rename-save" title="Сохранить">${ICON.check}</button>
        <button type="button" class="icon-btn" data-act="rename-cancel" title="Отмена">${ICON.x}</button>
      </div>`;
    }
    return `<div class="tag-row" data-tag="${esc(tag)}">
      <span class="tag-pill big">#${esc(tag)}</span>
      <span class="tag-count">${count} ${plural(count,'задача','задачи','задач')}</span>
      <span class="tag-row-actions">
        <button type="button" class="icon-btn" data-act="rename-start" title="Переименовать">${ICON.pencil}</button>
        <button type="button" class="icon-btn danger" data-act="delete-tag" title="Удалить">${ICON.trash}</button>
      </span>
    </div>`;
  }).join('');
  $('#tagList').innerHTML = rows || '<div class="tag-empty">Тегов пока нет — создайте первый выше.</div>';
}

/* ================= общий рендер ================= */
function renderAll(){
  renderCalendar();
  renderDayHeader();
  renderFilterBar();
  renderTaskList();
  renderTagModal();
  postRenderFocus();
}

function postRenderFocus(){
  let el = null;
  if(ui.tagPanelOpen && ui.renamingTag) el = $('.tag-rename-input');
  else if(ui.editingTask) el = document.querySelector(`.task[data-id="${ui.editingTask}"] .edit-title`);
  else if(ui.editingSub) el = $('.sub-edit-input');
  else if(ui.addingSubFor) el = $('.sub-input');
  if(el){
    el.focus();
    try{ el.setSelectionRange(el.value.length, el.value.length); }catch(e){}
  }
}

/* ================= навигация ================= */
function selectDate(k){
  selectedDate = k;
  const d = parseKey(k);
  viewY = d.getFullYear();
  viewM = d.getMonth();
  ui.editingTask = null;
  ui.editingSub = null;
  ui.addingSubFor = null;
  ui.prevPct = dayStats(k).pct; // не проигрывать анимацию 100% при переходе на готовый день
  renderAll();
}

function shiftMonth(delta){
  viewM += delta;
  if(viewM < 0){ viewM = 11; viewY--; }
  if(viewM > 11){ viewM = 0; viewY++; }
  renderCalendar();
}

/* ================= формы ================= */
function openNewForm(){
  ui.newFormOpen = true;
  const f = $('#newTaskForm');
  f.hidden = false;
  renderNewTags();
  $('#newTitle').focus();
}
function closeNewForm(){
  ui.newFormOpen = false;
  ui.newFormTags = new Set();
  const f = $('#newTaskForm');
  f.hidden = true;
  f.reset();
}
function renderNewTags(){
  $('#newTagsRow').innerHTML = state.tags.map(tag =>
    `<button type="button" class="chip tog${ui.newFormTags.has(tag) ? ' active' : ''}" data-tag="${esc(tag)}">#${esc(tag)}</button>`
  ).join('') + `<input id="newTagInput" class="inp tiny" placeholder="${state.tags.length ? 'ещё тег…' : 'создать тег…'}">`;
}
function openTagModal(){
  ui.tagPanelOpen = true;
  $('#tagModal').hidden = false;
  renderTagModal();
  $('#tagCreateInput').focus();
}
function closeTagModal(){
  ui.tagPanelOpen = false;
  ui.renamingTag = null;
  $('#tagModal').hidden = true;
  renderAll();
}

/* ================= быстрый ввод ================= */
function parseQuick(text){
  const tags = [], parts = [];
  for(const w of String(text).split(/\s+/)){
    if(/^#[^\s#]/.test(w)){
      const t = normalizeTag(w);
      if(t) tags.push(t);
    } else if(w) parts.push(w);
  }
  return {title: parts.join(' '), tags};
}

/* ================= тост ================= */
let toastTimer = null;
function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ================= события: список задач ================= */
function onTaskClick(e){
  const actEl = e.target.closest('[data-act]');
  if(!actEl) return;
  const act = actEl.dataset.act;
  const taskEl = actEl.closest('.task');
  const id = taskEl ? taskEl.dataset.id : null;

  switch(act){
    case 'toggle-task': toggleTask(id); break;
    case 'edit-task': startEditTask(id); break;
    case 'save-task-edit': saveTaskEdit(id); break;
    case 'cancel-task-edit': ui.editingTask = null; renderAll(); break;
    case 'delete-task': deleteTask(id); break;
    case 'add-sub':
      ui.addingSubFor = (ui.addingSubFor === id) ? null : id;
      ui.editingSub = null;
      renderAll();
      break;
    case 'toggle-sub': toggleSub(id, actEl.closest('.sub').dataset.subid); break;
    case 'edit-sub':
      ui.editingSub = {taskId: id, subId: actEl.closest('.sub').dataset.subid};
      ui.addingSubFor = null;
      renderAll();
      break;
    case 'save-sub': saveSubEdit(id, actEl.closest('.sub').dataset.subid); break;
    case 'cancel-sub-edit': ui.editingSub = null; renderAll(); break;
    case 'delete-sub': deleteSub(id, actEl.closest('.sub').dataset.subid); break;
    case 'move-today': moveToday(id); break;
    case 'toggle-edit-tag': {
      const tag = actEl.dataset.tag;
      ui.editTags.has(tag) ? ui.editTags.delete(tag) : ui.editTags.add(tag);
      renderAll();
      break;
    }
    case 'clear-edit-deadline': {
      const inp = taskEl && taskEl.querySelector('.edit-deadline');
      if(inp) inp.value = '';
      break;
    }
    case 'focus-quick': $('#quickInput').focus(); break;
    case 'clear-filter':
      activeFilter = null;
      renderFilterBar();
      renderTaskList();
      break;
  }
}

function onTaskKeydown(e){
  const el = e.target;
  const cls = el.classList;
  if(e.key === 'Enter'){
    if(cls.contains('sub-input')){
      e.preventDefault();
      addSub(el.closest('.task').dataset.id, el.value);
    } else if(cls.contains('sub-edit-input')){
      e.preventDefault();
      saveSubEdit(el.closest('.task').dataset.id, el.closest('.sub').dataset.subid);
    } else if(cls.contains('edit-title')){
      e.preventDefault();
      saveTaskEdit(el.closest('.task').dataset.id);
    } else if(cls.contains('new-tag-inp')){
      e.preventDefault();
      const v = normalizeTag(el.value);
      if(!v) return;
      const taskId = el.closest('.task').dataset.id;
      createTag(v);
      ui.editTags.add(v);
      save();
      renderAll();
      const inp = document.querySelector(`.task[data-id="${taskId}"] .new-tag-inp`);
      if(inp){ inp.value = ''; inp.focus(); }
    }
    /* Enter в описании (textarea) — обычный перенос строки */
  } else if(e.key === 'Escape'){
    if(cls.contains('sub-input')){ ui.addingSubFor = null; renderAll(); }
    else if(cls.contains('sub-edit-input')){ ui.editingSub = null; renderAll(); }
    else if(cls.contains('edit-title') || cls.contains('edit-deadline') || cls.contains('new-tag-inp') || cls.contains('edit-desc')){
      ui.editingTask = null;
      renderAll();
    }
  }
}

/* ================= инициализация ================= */
function init(){
  /* календарь */
  $('#prevM').addEventListener('click', () => shiftMonth(-1));
  $('#nextM').addEventListener('click', () => shiftMonth(1));
  $('#todayBtn').addEventListener('click', () => selectDate(todayKey()));
  $('#calGrid').addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if(cell) selectDate(cell.dataset.date);
  });

  /* панель тегов */
  $('#tagsBtn').addEventListener('click', openTagModal);
  $('#tagClose').addEventListener('click', closeTagModal);
  $('#tagModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeTagModal(); });
  $('#tagCreateForm').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#tagCreateInput');
    const v = normalizeTag(inp.value);
    if(!v) return;
    if(state.tags.includes(v)){ toast('Такой тег уже есть'); return; }
    state.tags.push(v);
    inp.value = '';
    save();
    renderAll();
    inp.focus();
  });
  $('#tagList').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const row = btn.closest('.tag-row');
    const tag = row.dataset.tag;
    const act = btn.dataset.act;
    if(act === 'rename-start'){ ui.renamingTag = tag; renderTagModal(); postRenderFocus(); }
    else if(act === 'delete-tag') deleteTag(tag);
    else if(act === 'rename-save') saveRename(tag);
    else if(act === 'rename-cancel'){ ui.renamingTag = null; renderTagModal(); }
  });
  $('#tagList').addEventListener('keydown', e => {
    if(!e.target.classList.contains('tag-rename-input')) return;
    if(e.key === 'Enter'){ e.preventDefault(); saveRename(e.target.closest('.tag-row').dataset.tag); }
    else if(e.key === 'Escape'){ ui.renamingTag = null; renderTagModal(); }
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && ui.tagPanelOpen) closeTagModal();
  });

  /* быстрый ввод */
  $('#quickForm').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#quickInput');
    const text = inp.value.trim();
    if(!text) return;
    const {title, tags} = parseQuick(text);
    inp.value = '';
    if(!title){ inp.focus(); return; }
    tags.forEach(createTag);
    addTask(title, {tags});
    inp.focus();
  });

  /* форма новой задачи */
  $('#newTaskBtn').addEventListener('click', () => { ui.newFormOpen ? closeNewForm() : openNewForm(); });
  $('#newCancel').addEventListener('click', closeNewForm);
  $('#newTaskForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#newTitle').value.trim();
    if(!title){ $('#newTitle').focus(); return; }
    addTask(title, {
      description: $('#newDesc').value.trim(),
      deadline: $('#newDeadline').value ? $('#newDeadline').value.slice(0,16) : null,
      tags: [...ui.newFormTags],
    });
    closeNewForm();
  });
  $('#newTagsRow').addEventListener('click', e => {
    const chip = e.target.closest('[data-tag]');
    if(!chip) return;
    const tag = chip.dataset.tag;
    ui.newFormTags.has(tag) ? ui.newFormTags.delete(tag) : ui.newFormTags.add(tag);
    renderNewTags();
  });
  $('#newTagsRow').addEventListener('keydown', e => {
    if(e.key === 'Enter' && e.target.id === 'newTagInput'){
      e.preventDefault();
      const v = normalizeTag(e.target.value);
      if(!v) return;
      createTag(v);
      ui.newFormTags.add(v);
      save();
      renderNewTags();
      renderFilterBar();
      $('#newTagInput').value = '';
      $('#newTagInput').focus();
    }
  });

  /* фильтр по тегам */
  $('#filterBar').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    activeFilter = chip.dataset.tag || null;
    renderFilterBar();
    renderTaskList();
  });

  /* список задач */
  $('#taskList').addEventListener('click', onTaskClick);
  $('#taskList').addEventListener('keydown', onTaskKeydown);

  ui.prevPct = dayStats(selectedDate).pct;
  renderAll();
}

/* ================= публичный API ================= */
let initialized = false;
window.initTodoApp = function() {
    if(initialized){ renderAll(); return; }
    initialized = true;
    init();
};

/* ================= синхронизация с облаком ================= */
window.syncTodoToCloud = function() {
    syncToFirebase();
};

window.loadTodoFromCloud = function() {
    loadFromFirebase();
};

})();