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
    if(!raw) return {tasks:[], tags:[], recurring:[], sleep:{}};
    const data = JSON.parse(raw);
    const tasks = Array.isArray(data.tasks) ? data.tasks.map(t => ({
      id: t.id || uid(),
      date: t.date || todayKey(),
      title: String(t.title || ''),
      description: String(t.description || ''),
      completed: !!t.completed,
      important: !!t.important,
      deadline: t.deadline || null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      createdAt: t.createdAt || Date.now(),
      subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
        id: s.id || uid(), title: String(s.title || ''), completed: !!s.completed
      })) : []
    })) : [];
    const recurring = Array.isArray(data.recurring) ? data.recurring.map(r => ({
      id: r.id || uid(),
      title: String(r.title || ''),
      description: String(r.description || ''),
      deadline: r.deadline || null,
      important: !!r.important,
      tags: Array.isArray(r.tags) ? r.tags : [],
      subtasks: Array.isArray(r.subtasks) ? r.subtasks.map(s => ({
        id: s.id || uid(), title: String(s.title || '')
      })) : [],
      schedule: {
        freq: (r.schedule && r.schedule.freq) || 'day',
        interval: Math.max(1, parseInt((r.schedule && r.schedule.interval) || 1, 10) || 1),
        byDay: Array.isArray(r.schedule && r.schedule.byDay) ? r.schedule.byDay : null,
        byMonthDay: (r.schedule && typeof r.schedule.byMonthDay === 'number') ? r.schedule.byMonthDay : null,
      },
      startDate: r.startDate || todayKey(),
      endDate: r.endDate || null,
      exceptions: Array.isArray(r.exceptions) ? r.exceptions : [],
      occurrences: (r.occurrences && typeof r.occurrences === 'object') ? r.occurrences : {},
      createdAt: r.createdAt || Date.now()
    })) : [];
    return { tasks, tags: Array.isArray(data.tags) ? data.tags : [], recurring, sleep: (data.sleep && typeof data.sleep === 'object') ? data.sleep : {} };
  }catch(e){ return {tasks:[], tags:[], recurring:[], sleep:{}}; }
}

let state = loadState();

function save(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){ console.warn('Не удалось сохранить данные', e); }
  
  // Сохраняем в Firebase (если пользователь авторизован и не в режиме чтения)
  try {
    if (typeof db !== 'undefined' && typeof getTargetUid === 'function' && typeof isReadOnlyActive === 'function') {
      if (isReadOnlyActive()) return;
      const targetUid = getTargetUid();
      if (!targetUid) return;
      
      const data = {
        tasks: state.tasks,
        tags: state.tags,
        recurring: state.recurring,
        sleep: state.sleep || {},
        lastUpdated: Date.now()
      };
      
      db.ref(`lera_todo_v1/${targetUid}`).set(data).catch(function(error) {
        if (error && error.code === 'PERMISSION_DENIED') {
          console.warn('Нет прав на запись todo в Firebase');
        }
      });
    }
  } catch(e) { console.warn('Ошибка сохранения todo в Firebase', e); }
}

const now0 = new Date();
let viewY = now0.getFullYear();
let viewM = now0.getMonth();
let selectedDate = todayKey();   // при запуске всегда сегодня
let activeFilter = null;         // тег-фильтр или null = «Все»
let overdueFilter = false;       // фильтр «Просроченные»

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
  recChoice: null,       // {mode:'edit'|'delete', recId}
  seriesModal: null,     // 'create' | recId (редактирование) | null
  seriesForm: null,      // буфер формы серии {title, description, deadline, tags, subtasks:[], freq, interval, byDay, byMonthDay, startDate, endDate}
  seriesListOpen: false,
  seriesSubs: [],        // [{id,title}]
  moveTask: null,        // id задачи на перенос
  shopTaskId: null,      // id задачи-списка покупок, открытой в модалке
  shopEditingSub: null,  // id пункта, редактируемого внутри модалки
  sleepExpanded: false,  // развернут ли блок сна
  sleepFactors: [],      // пользовательские факторы (из localStorage)
};

/* ================= доступ к данным ================= */
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

/* ================= регулярные задачи ================= */
const WEEKDAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function startOfDay(d){
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d, n){
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}
function dayDiff(a, b){ // b - a в днях
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}
function weekdayNum(d){ // Пн=1..Вс=7
  return (d.getDay() + 6) % 7 + 1;
}

/* матчит дату по правилу шаблона */
function occursOn(tpl, k){
  if(!tpl || !tpl.schedule) return false;
  if(tpl.exceptions.includes(k)) return false;
  const s = tpl.schedule;
  if(k < tpl.startDate) return false;
  if(tpl.endDate && k > tpl.endDate) return false;

  const d = parseKey(k);
  const start = parseKey(tpl.startDate);
  const interval = s.interval || 1;

  if(s.freq === 'day'){
    const diff = dayDiff(start, d);
    return diff >= 0 && diff % interval === 0;
  }

  if(s.freq === 'week'){
    const wd = weekdayNum(d);
    if(!s.byDay || !s.byDay.includes(wd)) return false;
    const weekDiff = Math.floor(dayDiff(start, d) / 7);
    return weekDiff >= 0 && weekDiff % interval === 0;
  }

  if(s.freq === 'month'){
    if(typeof s.byMonthDay !== 'number') return false;
    const mDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
    if(mDiff < 0 || mDiff % interval !== 0) return false;
    if(s.byMonthDay === -1){
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return d.getDate() === lastDay;
    }
    return d.getDate() === s.byMonthDay;
  }

  return false;
}

/* человекочитаемое описание расписания */
function scheduleText(tpl){
  const s = tpl.schedule;
  const i = s.interval || 1;
  if(s.freq === 'day') return i === 1 ? 'каждый день' : `каждые ${i} ${plural(i,'день','дня','дней')}`;
  if(s.freq === 'week'){
    if(!s.byDay || !s.byDay.length) return i === 1 ? 'каждую неделю' : `каждые ${i} недель`;
    const days = s.byDay.slice().sort((a,b)=>a-b).map(n => WEEKDAY_NAMES[n-1]).join(', ');
    return (i === 1 ? 'каждую неделю' : `каждые ${i} недель`) + ` · ${days}`;
  }
  if(s.freq === 'month'){
    const dayTxt = s.byMonthDay === -1 ? 'в последний день месяца' : `${s.byMonthDay}-го числа`;
    return (i === 1 ? 'каждый месяц' : `каждый ${i}-й месяц`) + ` · ${dayTxt}`;
  }
  return 'регулярно';
}

/* подзадачи на конкретный день (прогресс хранится в occurrences) */
function instanceSubtasks(tpl, k){
  const occ = tpl.occurrences[k];
  if(occ && Array.isArray(occ.subtasks)) return occ.subtasks;
  return tpl.subtasks.map(() => false);
}

/* сгенерировать «виртуальную» задачу для дня */
function recurringInstance(tpl, k){
  const occ = tpl.occurrences[k] || {completed:false};
  return {
    id: 'rec:' + tpl.id,
    recId: tpl.id,
    date: k,
    title: tpl.title,
    description: tpl.description || '',
    completed: !!occ.completed,
    important: !!tpl.important,
    deadline: tpl.deadline || null,
    tags: [...tpl.tags],
    createdAt: tpl.createdAt,
    scheduleText: scheduleText(tpl),
    subtasks: tpl.subtasks.map((s, idx) => ({
      id: 'rec-sub:' + s.id,
      title: s.title,
      completed: instanceSubtasks(tpl, k)[idx] === true
    }))
  };
}

/* все задачи дня: обычные + регулярные */
function tasksOf(k){
  const out = state.tasks.filter(t => t.date === k);
  for(const tpl of state.recurring){
    if(occursOn(tpl, k)) out.push(recurringInstance(tpl, k));
  }
  return out;
}

/* toggle выполнения регулярной задачи на конкретный день */
function toggleRecurring(recId, k){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  const occ = tpl.occurrences[k] || {completed:false};
  const target = !occ.completed;
  occ.completed = target;
  if(target){
    occ.subtasks = tpl.subtasks.map(() => true);
  }
  tpl.occurrences[k] = occ;
  commit();
}

/* toggle подзадачи регулярной задачи на конкретный день */
function toggleRecurringSub(recId, k, subId){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  const realId = String(subId).replace(/^rec-sub:/, '');
  const subIdx = tpl.subtasks.findIndex(s => s.id === realId);
  if(subIdx === -1) return;
  const occ = tpl.occurrences[k] || {completed:false};
  const arr = instanceSubtasks(tpl, k).slice();
  arr[subIdx] = !arr[subIdx];
  occ.subtasks = arr;
  occ.completed = arr.every(v => v);
  tpl.occurrences[k] = occ;
  commit();
}

/* отсоединить один день: дата уходит в exceptions, на день создаётся обычная задача */
function detachOccurrence(recId, k){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  if(!tpl.exceptions.includes(k)) tpl.exceptions.push(k);
  const occ = tpl.occurrences[k];
  state.tasks.push({
    id: uid(),
    date: k,
    title: tpl.title,
    description: tpl.description || '',
    completed: !!(occ && occ.completed),
    important: !!tpl.important,
    deadline: tpl.deadline || null,
    tags: [...tpl.tags],
    createdAt: tpl.createdAt,
    subtasks: tpl.subtasks.map((s, idx) => ({
      id: uid(), title: s.title, completed: !!(occ && occ.subtasks && occ.subtasks[idx])
    })),
  });
  delete tpl.occurrences[k];
  commit();
  toast('Задача отсоединена от серии');
}

/* удалить один день из серии (не создавая задачу) */
function removeRecurringOccurrence(recId, k){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  if(!tpl.exceptions.includes(k)) tpl.exceptions.push(k);
  delete tpl.occurrences[k];
  commit();
}

function deleteRecurring(recId){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  if(!customConfirm()) return;
  state.recurring = state.recurring.filter(r => r.id !== recId);
  commit();
}

function restoreException(recId, k){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  tpl.exceptions = tpl.exceptions.filter(x => x !== k);
  commit();
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
  cart:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2.5h1.6l1.2 7.3a1.6 1.6 0 0 0 1.6 1.3h5.9a1.6 1.6 0 0 0 1.6-1.3l1.3-6H4.3"/><circle cx="6.1" cy="13.5" r="1.1"/><circle cx="11.2" cy="13.5" r="1.1"/></svg>',
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
    important: !!opts.important,
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
  if(!customConfirm()) return;
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
  const impEl = root.querySelector('.edit-important');
  t.important = !!(impEl && impEl.checked);
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
  if(!customConfirm()) return;
  const t = findTask(taskId); if(!t) return;
  t.subtasks = t.subtasks.filter(s => s.id !== subId);
  syncParent(t);
  commit();
}

function openMoveModal(id){
  const t = findTask(id); if(!t) return;
  ui.moveTask = id;
  $('#moveInput').value = t.date || todayKey();
  $('#moveModal').hidden = false;
}
function closeMoveModal(){
  ui.moveTask = null;
  $('#moveModal').hidden = true;
}
function confirmMove(){
  const id = ui.moveTask;
  const t = id && findTask(id);
  const k = $('#moveInput').value;
  if(!t || !k){ closeMoveModal(); return; }
  t.date = k;
  commit();
  closeMoveModal();
  toast('Задача перенесена');
  selectDate(k);
}

/* ================= теги ================= */
function createTag(name){
  const n = normalizeTag(name);
  if(!n) return null;
  if(!state.tags.includes(n)) state.tags.push(n);
  return n;
}

function deleteTag(tag){
  if(!customConfirm()) return;
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

/* ================= сон ================= */
const SLEEP_LS_KEY = 'local-sleep-factors-v1';

function loadCustomSleepFactors(){
  try{
    const raw = localStorage.getItem(SLEEP_LS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

function saveCustomSleepFactors(){
  try{ localStorage.setItem(SLEEP_LS_KEY, JSON.stringify(ui.sleepFactors)); }catch(e){}
}

function getAllSleepFactors(){
  const defaults = (typeof DEFAULT_SLEEP_FACTORS !== 'undefined') ? DEFAULT_SLEEP_FACTORS : [];
  return [...defaults, ...ui.sleepFactors.map(f => ({ id: f.id || f, label: f.label || f }))];
}

function getSleep(k){
  return (state.sleep && state.sleep[k]) ? state.sleep[k] : null;
}

function calcSleepDuration(bedtime, wakeTime){
  if(!bedtime || !wakeTime) return 0;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if(wakeMin <= bedMin) wakeMin += 24 * 60;
  return wakeMin - bedMin;
}

function fmtSleepDuration(min){
  if(!min || min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + 'ч ' + (m < 10 ? '0' : '') + m + 'мин';
}

function renderSleepBlock(){
  const wrap = $('#sleepBlock');
  if(!wrap) return;
  const k = selectedDate;
  const data = getSleep(k);
  const hasData = data && (data.bedtime || data.wakeTime);

  if(hasData && !ui.sleepExpanded){
    const dur = fmtSleepDuration(data.duration || calcSleepDuration(data.bedtime, data.wakeTime));
    const pulseTxt = data.heartRate ? data.heartRate + ' уд/мин' : '';
    const allFactors = getAllSleepFactors();
    const activeFactors = [...(data.factors || []), ...(data.customFactors || [])];
    const factorLabels = activeFactors.map(id => {
      const f = allFactors.find(x => x.id === id);
      return f ? f.label : id;
    });

    wrap.innerHTML = `<div class="sleep-block" id="sleepToggle">
      <div class="sleep-collapsed">
        <span class="sleep-icon">🌙</span>
        <div class="sleep-summary">
          <span class="sleep-summary-duration">${dur}</span>
          ${pulseTxt ? `<span class="sleep-summary-pill">❤ ${pulseTxt}</span>` : ''}
          ${factorLabels.length ? `<div class="sleep-summary-factors">${factorLabels.map(l => `<span class="sleep-summary-factor">${esc(l)}</span>`).join('')}</div>` : ''}
        </div>
        <span class="sleep-expand-icon">▼</span>
      </div>
    </div>`;
  } else {
    const bedVal = data ? (data.bedtime || '') : '';
    const wakeVal = data ? (data.wakeTime || '') : '';
    const hr = data ? (data.heartRate || '') : '';
    const p = data ? (data.phases || {}) : {};
    const activeSet = new Set([...(data ? data.factors : []) || []]);
    const activeCustom = new Set([...(data ? data.customFactors : []) || []]);
    const allFactors = getAllSleepFactors();

    const factorChips = allFactors.map(f => {
      const isActive = activeSet.has(f.id);
      return `<button type="button" class="sleep-factor-chip${isActive ? ' active' : ''}" data-factor="${esc(f.id)}">${esc(f.label)}</button>`;
    }).join('');
    const customChips = (data ? data.customFactors : []).map(id => {
      return `<button type="button" class="sleep-factor-chip active" data-factor="${esc(id)}">${esc(id)}<span class="sleep-factor-remove" data-rm-factor="${esc(id)}">✕</span></button>`;
    }).join('');

    wrap.innerHTML = `<div class="sleep-block expanded" id="sleepToggle">
      <div class="sleep-collapsed">
        <span class="sleep-icon">🌙</span>
        <div class="sleep-summary">
          <span class="sleep-summary-empty">Сон</span>
        </div>
        <span class="sleep-expand-icon">▼</span>
      </div>
      <div class="sleep-form">
        <div class="sleep-form-grid">
          <div class="sleep-field">
            <label>🌙 Лёг</label>
            <input type="time" id="sleepBedtime" value="${esc(bedVal)}">
          </div>
          <div class="sleep-field">
            <label>☀️ Проснулся</label>
            <input type="time" id="sleepWakeTime" value="${esc(wakeVal)}">
          </div>
        </div>
        <div class="sleep-phases-title">Фазы сна</div>
        <div class="sleep-phases-grid">
          <div class="sleep-phase">
            <label>Глубокий</label>
            <div class="sleep-phase-row">
              <input type="number" id="sleepDeepH" min="0" max="24" value="${Math.floor((p.deep||0)/60) || ''}" placeholder="ч">
              <span class="sleep-phase-sep">:</span>
              <input type="number" id="sleepDeepM" min="0" max="59" value="${(p.deep||0)%60 || ''}" placeholder="мм">
            </div>
            <div class="sleep-phase-pct" id="sleepDeepPct"></div>
          </div>
          <div class="sleep-phase">
            <label>Лёгкий</label>
            <div class="sleep-phase-row">
              <input type="number" id="sleepLightH" min="0" max="24" value="${Math.floor((p.light||0)/60) || ''}" placeholder="ч">
              <span class="sleep-phase-sep">:</span>
              <input type="number" id="sleepLightM" min="0" max="59" value="${(p.light||0)%60 || ''}" placeholder="мм">
            </div>
            <div class="sleep-phase-pct" id="sleepLightPct"></div>
          </div>
          <div class="sleep-phase">
            <label>REM</label>
            <div class="sleep-phase-row">
              <input type="number" id="sleepRemH" min="0" max="24" value="${Math.floor((p.rem||0)/60) || ''}" placeholder="ч">
              <span class="sleep-phase-sep">:</span>
              <input type="number" id="sleepRemM" min="0" max="59" value="${(p.rem||0)%60 || ''}" placeholder="мм">
            </div>
            <div class="sleep-phase-pct" id="sleepRemPct"></div>
          </div>
          <div class="sleep-phase">
            <label>Пробуждения</label>
            <input type="number" id="sleepAwakenings" min="0" value="${p.awakenings || ''}" placeholder="0">
            <div class="sleep-phase-pct"></div>
          </div>
        </div>
        <div class="sleep-field" style="max-width:160px;margin-bottom:var(--spacing-lg);">
          <label>❤️ Средний пульс</label>
          <input type="number" id="sleepHeartRate" min="30" max="220" value="${esc(hr)}" placeholder="уд/мин">
        </div>
        <div class="sleep-factors-title">Факторы перед сном</div>
        <div class="sleep-factors-row" id="sleepFactorsRow">
          ${factorChips}${customChips}
          <div class="sleep-add-factor-row">
            <input class="sleep-add-factor-input" id="sleepNewFactor" placeholder="Свой фактор…">
            <button type="button" class="sleep-add-factor-btn" id="sleepAddFactorBtn">+</button>
          </div>
        </div>
        <div class="sleep-actions">
          <button type="button" class="btn sleep-btn-clear" id="sleepClearBtn">🗑 Очистить</button>
          <button type="button" class="btn sleep-btn-save" id="sleepSaveBtn">💾 Сохранить</button>
        </div>
      </div>
    </div>`;
  }

  wrap.onclick = function(e){
    const toggle = e.target.closest('#sleepToggle');
    if(!toggle) return;
    const collapsed = e.target.closest('.sleep-collapsed');
    if(collapsed){
      if(toggle.classList.contains('expanded')){
        ui.sleepExpanded = false;
      } else {
        ui.sleepExpanded = true;
      }
      renderSleepBlock();
      return;
    }
    const rmFactor = e.target.closest('[data-rm-factor]');
    if(rmFactor){
      e.stopPropagation();
      const fid = rmFactor.dataset.rmFactor;
      const data = getSleep(selectedDate);
      if(data){
        data.customFactors = (data.customFactors || []).filter(x => x !== fid);
        commit();
        renderSleepBlock();
      }
      return;
    }
    const factorChip = e.target.closest('.sleep-factor-chip');
    if(factorChip && !factorChip.classList.contains('sleep-add-factor-btn')){
      e.stopPropagation();
      const fid = factorChip.dataset.factor;
      const data = getSleep(selectedDate) || {};
      if(!state.sleep) state.sleep = {};
      if(!state.sleep[selectedDate]) state.sleep[selectedDate] = {};
      const d = state.sleep[selectedDate];
      if(!d.factors) d.factors = [];
      if(!d.customFactors) d.customFactors = [];
      const isDefault = (typeof DEFAULT_SLEEP_FACTORS !== 'undefined') && DEFAULT_SLEEP_FACTORS.some(f => f.id === fid);
      const arr = isDefault ? d.factors : d.customFactors;
      const idx = arr.indexOf(fid);
      if(idx >= 0) arr.splice(idx, 1); else arr.push(fid);
      commit();
      renderSleepBlock();
      return;
    }
    const saveBtn = e.target.closest('#sleepSaveBtn');
    if(saveBtn){
      e.stopPropagation();
      saveSleepData();
      return;
    }
    const clearBtn = e.target.closest('#sleepClearBtn');
    if(clearBtn){
      e.stopPropagation();
      if(state.sleep) delete state.sleep[selectedDate];
      ui.sleepExpanded = false;
      commit();
      renderSleepBlock();
      toast('Данные сна очищены');
      return;
    }
    const addBtn = e.target.closest('#sleepAddFactorBtn');
    if(addBtn){
      e.stopPropagation();
      addCustomSleepFactor();
      return;
    }
  };

  wrap.onkeydown = function(e){
    if(e.key === 'Enter' && e.target.id === 'sleepNewFactor'){
      e.preventDefault();
      addCustomSleepFactor();
    }
  };

  wrap.oninput = function(e){
    if(e.target.id === 'sleepBedtime' || e.target.id === 'sleepWakeTime'
      || e.target.id === 'sleepDeepH' || e.target.id === 'sleepDeepM'
      || e.target.id === 'sleepLightH' || e.target.id === 'sleepLightM'
      || e.target.id === 'sleepRemH' || e.target.id === 'sleepRemM'){
      updateSleepPhasePcts();
    }
  };
}

function addCustomSleepFactor(){
  const inp = $('#sleepNewFactor');
  if(!inp) return;
  const v = inp.value.trim();
  if(!v) return;
  const id = 'custom_' + v.toLowerCase().replace(/[^a-zа-яё0-9]/g, '_');
  if(!ui.sleepFactors.some(f => f.id === id)){
    ui.sleepFactors.push({ id, label: v });
    saveCustomSleepFactors();
  }
  const data = getSleep(selectedDate) || {};
  if(!state.sleep) state.sleep = {};
  if(!state.sleep[selectedDate]) state.sleep[selectedDate] = {};
  const d = state.sleep[selectedDate];
  if(!d.customFactors) d.customFactors = [];
  if(!d.customFactors.includes(id)) d.customFactors.push(id);
  inp.value = '';
  commit();
  renderSleepBlock();
}

function updateSleepPhasePcts(){
  const bed = $('#sleepBedtime');
  const wake = $('#sleepWakeTime');
  if(!bed || !wake) return;
  const dur = calcSleepDuration(bed.value, wake.value);
  [{h:'sleepDeepH',m:'sleepDeepM',p:'sleepDeepPct'},
   {h:'sleepLightH',m:'sleepLightM',p:'sleepLightPct'},
   {h:'sleepRemH',m:'sleepRemM',p:'sleepRemPct'}].forEach(({h,m,p}) => {
    const el = document.getElementById(p);
    if(!el) return;
    const hInp = document.getElementById(h);
    const mInp = document.getElementById(m);
    const val = (parseInt(hInp && hInp.value, 10) || 0) * 60 + (parseInt(mInp && mInp.value, 10) || 0);
    if(dur > 0 && val > 0){
      el.textContent = Math.round(val / dur * 100) + '%';
    } else {
      el.textContent = '';
    }
  });
}

function saveSleepData(){
  const bed = $('#sleepBedtime');
  const wake = $('#sleepWakeTime');
  const deepH = $('#sleepDeepH');
  const deepM = $('#sleepDeepM');
  const lightH = $('#sleepLightH');
  const lightM = $('#sleepLightM');
  const remH = $('#sleepRemH');
  const remM = $('#sleepRemM');
  const awak = $('#sleepAwakenings');
  const hr = $('#sleepHeartRate');

  if(!bed || !wake) return;
  const bedtime = bed.value;
  const wakeTime = wake.value;
  if(!bedtime && !wakeTime){ toast('Укажите время сна'); return; }

  const duration = calcSleepDuration(bedtime, wakeTime);
  const toMin = (hInp, mInp) => (parseInt(hInp && hInp.value, 10) || 0) * 60 + (parseInt(mInp && mInp.value, 10) || 0);

  if(!state.sleep) state.sleep = {};
  state.sleep[selectedDate] = {
    bedtime,
    wakeTime,
    duration,
    phases: {
      deep: toMin(deepH, deepM),
      light: toMin(lightH, lightM),
      rem: toMin(remH, remM),
      awakenings: parseInt(awak && awak.value, 10) || 0,
    },
    heartRate: parseInt(hr && hr.value, 10) || 0,
    factors: state.sleep[selectedDate] ? [...(state.sleep[selectedDate].factors || [])] : [],
    customFactors: state.sleep[selectedDate] ? [...(state.sleep[selectedDate].customFactors || [])] : [],
  };

  ui.sleepExpanded = false;
  commit();
  renderSleepBlock();
  toast('Сон сохранён');
}

/* ================= рендер: календарь ================= */
function renderCalendar(){
  $('#calMonth').textContent = MONTHS[viewM];
  $('#calYear').textContent = viewY;

  const stMap = {};
  const overdueSet = new Set();
  for(const t of state.tasks){
    const s = stMap[t.date] || (stMap[t.date] = {total:0, done:0});
    s.total++;
    if(t.completed) s.done++;
    if(isOverdue(t)) overdueSet.add(t.date);
  }
  // учитываем регулярные задачи в видимом месяце
  const firstDay = new Date(viewY, viewM, 1);
  const lastDay = new Date(viewY, viewM + 1, 0);
  for(const tpl of state.recurring){
    const ck = keyOf(firstDay);
    const ek = keyOf(lastDay);
    for(let d = parseKey(ck); keyOf(d) <= ek; d = addDays(d, 1)){
      const k = keyOf(d);
      if(!occursOn(tpl, k)) continue;
      const occ = tpl.occurrences[k] || {completed:false};
      const s = stMap[k] || (stMap[k] = {total:0, done:0});
      s.total++;
      if(occ.completed) s.done++;
      if(!occ.completed && tpl.deadline && new Date(tpl.deadline) < new Date()) overdueSet.add(k);
    }
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
    if(overdueSet.has(k)) cls += ' overdue';
    let cntHtml = '', barHtml = '';
    if(s && s.total > 0){
      const pct = Math.round(s.done / s.total * 100);
      cntHtml = `<span class="cnt">${s.done}/${s.total}</span>`;
      barHtml = `<span class="bar${pct === 100 ? ' full' : ''}"><i style="width:${pct}%"></i></span>`;
    }
    html += `<button type="button" class="${cls}" data-date="${k}"><span class="num">${d.getDate()}</span>${cntHtml}${barHtml}${overdueSet.has(k) ? '<span class="od-dot"></span>' : ''}</button>`;
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
  bar.hidden = false;
  let html = `<button type="button" class="chip${!overdueFilter && activeFilter === null ? ' active' : ''}" data-filt="">Все</button>`;
  html += `<button type="button" class="chip overdue-chip${overdueFilter ? ' active' : ''}" data-filt="overdue">⚠ Просроченные</button>`;
  for(const tag of state.tags){
    const count = state.tasks.filter(t => t.tags.includes(tag)).length;
    html += `<button type="button" class="chip${!overdueFilter && activeFilter === tag ? ' active' : ''}" data-filt="tag" data-tag="${esc(tag)}">#${esc(tag)}${count ? `<span class="chip-count">${count}</span>` : ''}</button>`;
  }
  bar.innerHTML = html;
}

/* ================= рендер: список задач ================= */
function renderTaskList(){
  const wrap = $('#taskList');
  const all = tasksOf(selectedDate);
  let list = overdueFilter ? all.filter(t => isOverdue(t)) : (activeFilter ? all.filter(t => t.tags.includes(activeFilter)) : all.slice());
  // сначала невыполненные, затем выполненные; важные — выше в своей группе
  list.sort((a,b) => (a.completed - b.completed) || ((b.important?1:0) - (a.important?1:0)) || (a.createdAt - b.createdAt));

  if(!list.length){
    if(overdueFilter){
      wrap.innerHTML = `<div class="empty"><div class="empty-ico">🎉</div><div class="empty-title">Просроченных задач нет</div><button type="button" class="empty-link" data-act="clear-filter">Показать все задачи →</button></div>`;
    } else if(all.length && activeFilter){
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
    return `<div class="task editing" data-id="${esc(t.id)}">${editFormHTML(t)}</div>`;
  }
  const isRec = !!t.recId;
  const isShop = isShoppingTask(t);
  const overdue = isOverdue(t);
  const meta = [];
  if(isRec){
    meta.push(`<span class="rec-badge">🔁 <span>${esc(t.scheduleText)}</span></span>`);
  }
  if(isShop){
    const doneN = t.subtasks.filter(s => s.completed).length;
    meta.push(`<span class="shop-chip" title="Список покупок">${ICON.cart}<span>${doneN}/${t.subtasks.length}</span></span>`);
  }
  if(t.deadline){
    meta.push(`<span class="dl${overdue ? ' overdue' : ''}">${ICON.clock}<span>${fmtDeadline(t.deadline)}${overdue ? ' · просрочено' : ''}</span></span>`);
  }
  for(const tag of t.tags) meta.push(`<span class="tag-pill">#${esc(tag)}</span>`);

  const canMove = !isRec;
  const subsHtml = t.subtasks.map(s => subHTML(t.id, s)).join('');
  const addingHere = ui.addingSubFor === t.id && !isRec;
  const subsBlock = (subsHtml || addingHere)
    ? `<div class="subs">${subsHtml}${addingHere ? '<div class="sub new"><input class="sub-input" placeholder="Новая подзадача…"></div>' : ''}</div>`
    : '';
  const addSubBtn = isRec ? '' : `<button type="button" class="add-sub" data-act="add-sub">${ICON.plus}<span>Подзадача</span></button>`;

  return `<div class="task${t.completed ? ' done' : ''}${isRec ? ' rec' : ''}" data-id="${esc(t.id)}"${isRec ? ` data-rec="${esc(t.recId)}"` : ''}>\r
    <div class="task-main">
      <button type="button" class="cb${t.completed ? ' checked' : ''}" data-act="toggle-task" title="${t.completed ? 'Отменить выполнение' : 'Отметить выполненной'}">${ICON.check}</button>
      <div class="task-body">
        <div class="task-title">${t.important ? '<span class="imp-badge" title="Важно">!</span>' : ''}${esc(t.title)}</div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
        ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
      </div>
      <div class="task-actions">
        ${isShop ? `<button type="button" class="icon-btn shop-open-btn" data-act="open-shop" title="Открыть список покупок">${ICON.cart}</button>` : ''}
        ${canMove ? `<button type="button" class="icon-btn" data-act="move-task" title="Перенести на другую дату">${ICON.move}</button>` : ''}
        <button type="button" class="icon-btn" data-act="edit-task" title="${isRec ? 'Редактировать серию или этот день' : 'Редактировать'}">${ICON.pencil}</button>
        <button type="button" class="icon-btn danger" data-act="delete-task" title="${isRec ? 'Удалить серию или этот день' : 'Удалить'}">${ICON.trash}</button>
      </div>
    </div>
    ${subsBlock}
    ${addSubBtn}
  </div>`;
}

function subHTML(taskId, s){
  const isRec = String(taskId).indexOf('rec:') === 0;
  if(!isRec && ui.editingSub && ui.editingSub.taskId === taskId && ui.editingSub.subId === s.id){
    return `<div class="sub editing" data-subid="${s.id}">
      <input class="sub-edit-input" value="${esc(s.title)}">
      <button type="button" class="icon-btn" data-act="save-sub" title="Сохранить">${ICON.check}</button>
      <button type="button" class="icon-btn" data-act="cancel-sub-edit" title="Отмена">${ICON.x}</button>
    </div>`;
  }
  const actions = isRec ? '' : `<span class="sub-actions">
      <button type="button" class="icon-btn" data-act="edit-sub" title="Редактировать">${ICON.pencil}</button>
      <button type="button" class="icon-btn danger" data-act="delete-sub" title="Удалить">${ICON.x}</button>
    </span>`;
  return `<div class="sub${s.completed ? ' done' : ''}" data-subid="${s.id}">
    <button type="button" class="cb small${s.completed ? ' checked' : ''}" data-act="toggle-sub" title="${s.completed ? 'Отменить выполнение' : 'Отметить выполненной'}">${ICON.check}</button>
    <span class="sub-title">${esc(s.title)}</span>
    ${actions}
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
      <label class="series-check imp-check"><input type="checkbox" class="edit-important"${t.important ? ' checked' : ''}> ⭐ Важно</label>
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

/* ================= регулярные: модалка выбора ================= */
function openRecurringChoice(mode, recId){
  const tpl = state.recurring.find(r => r.id === recId);
  if(!tpl) return;
  ui.recChoice = {mode, recId};
  $('#recChoiceModal').hidden = false;
  const title = $('#recChoiceTitle');
  title.innerHTML = `${mode === 'edit' ? '✏️' : '🗑'} «${esc(tpl.title)}» — <span class="rec-badge">🔁 <span>${esc(scheduleText(tpl))}</span></span>`;
  $('#recChoiceMode').textContent = mode === 'edit' ? 'Что редактировать?' : 'Что удалить?';
  $('#recChoiceThis').innerHTML = (mode === 'edit' ? '✏️ Только этот день' : '🗑 Только этот день') +
    '<small>День отсоединится от серии и станет обычной задачей</small>';
  $('#recChoiceAll').innerHTML = (mode === 'edit' ? '✏️ Все повторения' : '🗑 Всю серию') +
    '<small>' + (mode === 'edit' ? 'Изменить шаблон — обновятся все дни серии' : 'Удалить серию и все её повторы') + '</small>';
}
function closeRecurringChoice(){
  ui.recChoice = null;
  $('#recChoiceModal').hidden = true;
  renderAll();
}

/* ================= регулярные: модалка серии ================= */
function defaultSeriesForm(){
  return {
    title:'', description:'', deadline:'', tags:new Set(),
    important:false,
    freq:'day', interval:1, byDay:[], byMonthDay:1,
    startDate:todayKey(), endDate:''
  };
}

function openSeriesModal(recId){
  ui.seriesModal = recId || 'create';
  const tpl = recId ? state.recurring.find(r => r.id === recId) : null;
  const f = tpl ? {
    title:tpl.title, description:tpl.description || '', deadline:tpl.deadline || '',
    tags:new Set(tpl.tags), important:!!tpl.important, freq:tpl.schedule.freq, interval:tpl.schedule.interval,
    byDay:[...(tpl.schedule.byDay || [])], byMonthDay:typeof tpl.schedule.byMonthDay==='number' ? tpl.schedule.byMonthDay : 1,
    startDate:tpl.startDate, endDate:tpl.endDate || ''
  } : defaultSeriesForm();
  ui.seriesForm = f;
  ui.seriesSubs = tpl ? tpl.subtasks.map(s => ({id:s.id, title:s.title})) : [];
  $('#seriesModal').hidden = false;
  $('#seriesModalTitle').textContent = tpl ? '✏️ Редактировать серию' : '🔁 Новая регулярная задача';
  renderSeriesForm();
  renderSeriesSubs();
  $('#seriesTitle').focus();
}

function closeSeriesModal(){
  ui.seriesModal = null;
  ui.seriesForm = null;
  $('#seriesModal').hidden = true;
  renderAll();
}

function renderSeriesForm(){
  const f = ui.seriesForm;
  if(!f) return;
  $('#seriesTitle').value = f.title;
  $('#seriesDesc').value = f.description;
  $('#seriesDeadline').value = f.deadline ? f.deadline.slice(0,16) : '';
  $('#seriesStart').value = f.startDate;
  $('#seriesEnd').value = f.endDate;
  $('#seriesImportant').checked = !!f.important;

  const chips = state.tags.map(tag =>
    `<button type="button" class="chip tog${f.tags.has(tag) ? ' active' : ''}" data-sel-tag="${esc(tag)}">#${esc(tag)}</button>`
  ).join('');
  $('#seriesTags').innerHTML = chips + `<input id="seriesNewTag" class="inp tiny" placeholder="${state.tags.length ? 'ещё тег…' : 'создать тег…'}">`;

  // переключатель частоты
  const freqs = [
    {v:'day', l:'Каждые N дней'},
    {v:'week', l:'Каждые N недель'},
    {v:'month', l:'Каждый N-й месяц'},
  ];
  $('#seriesFreq').innerHTML = freqs.map(x =>
    `<button type="button" class="chip tog${f.freq === x.v ? ' active' : ''}" data-freq="${x.v}">${x.l}</button>`
  ).join('');

  $('#seriesInterval').value = f.interval;

  // недели: выбор дней
  $('#seriesWeekDays').innerHTML = WEEKDAY_NAMES.map((name, i) => {
    const n = i + 1;
    return `<button type="button" class="chip wd-chip${f.byDay.includes(n) ? ' active' : ''}" data-wd="${n}">${name}</button>`;
  }).join('');

  // месяцы: число дня + опция последний день
  const isLast = f.byMonthDay === -1;
  $('#seriesMonthDay').value = isLast ? '' : f.byMonthDay;
  $('#seriesLastDay').checked = isLast;

  toggleSeriesFields();
}

function toggleSeriesFields(){
  const f = ui.seriesForm;
  if(!f) return;
  $('#seriesWeekWrap').style.display = f.freq === 'week' ? '' : 'none';
  $('#seriesMonthWrap').style.display = f.freq === 'month' ? '' : 'none';
  const dayTxt = f.freq === 'day' ? plural(f.interval,'день','дня','дней')
    : f.freq === 'week' ? plural(f.interval,'неделя','недели','недель')
    : plural(f.interval,'месяц','месяца','месяцев');
  $('#seriesIntervalLabel').textContent = f.freq === 'day' ? 'Каждые' : f.freq === 'week' ? 'Каждые' : 'Каждый';
  $('#seriesIntervalUnit').textContent = dayTxt;
}

function renderSeriesSubs(){
  const rows = ui.seriesSubs.map((s, idx) =>
    `<div class="rec-sub-row" data-idx="${idx}">
      <input class="inp rec-sub-inp" value="${esc(s.title)}" placeholder="Подзадача">
      <button type="button" class="icon-btn danger" data-act="del-series-sub" data-idx="${idx}">${ICON.x}</button>
    </div>`
  ).join('');
  $('#seriesSubsList').innerHTML = rows + '<button type="button" class="link-btn" data-act="add-series-sub">+ добавить подзадачу</button>';
}

function addSeriesSub(){
  ui.seriesSubs.push({id: uid(), title:''});
  renderSeriesSubs();
  const list = $('#seriesSubsList');
  const inputs = list.querySelectorAll('.rec-sub-inp');
  if(inputs.length) inputs[inputs.length-1].focus();
}

function saveSeriesForm(){
  const f = ui.seriesForm;
  if(!f) return;
  const title = $('#seriesTitle').value.trim();
  if(!title){ toast('Введите название'); $('#seriesTitle').focus(); return; }
  const interval = Math.max(1, parseInt($('#seriesInterval').value, 10) || 1);
  let byDay = null, byMonthDay = null;
  if(f.freq === 'week'){
    byDay = f.byDay.slice().sort((a,b)=>a-b);
    if(!byDay.length){ toast('Выберите хотя бы один день недели'); return; }
  }
  if(f.freq === 'month'){
    if($('#seriesLastDay').checked){
      byMonthDay = -1;
    } else {
      byMonthDay = parseInt($('#seriesMonthDay').value, 10);
      if(!byMonthDay || byMonthDay < 1 || byMonthDay > 31){ toast('Укажите число от 1 до 31'); return; }
    }
  }
  const startDate = $('#seriesStart').value || todayKey();
  const endDate = $('#seriesEnd').value || null;
  // id подзадач сохраняются из буфера (у новых уже сгенерированы через uid)
  const subtaskDefs = ui.seriesSubs
    .map(s => ({id: s.id, title: s.title.trim()}))
    .filter(s => s.title);

  const data = {
    title,
    description: $('#seriesDesc').value.trim(),
    deadline: $('#seriesDeadline').value ? $('#seriesDeadline').value.slice(0,16) : null,
    important: $('#seriesImportant').checked,
    tags: [...f.tags].filter(tag => state.tags.includes(tag)),
    schedule: {freq: f.freq, interval, byDay, byMonthDay},
    startDate, endDate,
    subtasks: subtaskDefs,
  };

  const tpl = ui.seriesModal !== 'create' ? state.recurring.find(r => r.id === ui.seriesModal) : null;
  if(tpl){
    Object.assign(tpl, data);
    toast('Серия обновлена');
  } else {
    state.recurring.push({
      id: uid(),
      createdAt: Date.now(),
      exceptions: [],
      occurrences: {},
      ...data
    });
    toast('Регулярная задача создана');
  }
  save();
  closeSeriesModal();
  renderAll();
}

/* ================= регулярные: список серий ================= */
function openSeriesList(){
  ui.seriesListOpen = true;
  $('#seriesListModal').hidden = false;
  renderSeriesList();
}
function closeSeriesList(){
  ui.seriesListOpen = false;
  $('#seriesListModal').hidden = true;
  renderAll();
}
function renderSeriesList(){
  const wrap = $('#seriesListWrap');
  if(!state.recurring.length){
    wrap.innerHTML = '<div class="tag-empty">Регулярных задач пока нет — создайте первую через кнопку «🔁 Регулярная».</div>';
    return;
  }
  wrap.innerHTML = state.recurring.map(tpl => {
    const next = nextOccurrences(tpl, 3);
    const nextTxt = next.length ? 'ближайшие: ' + next.map(k => {
      const d = parseKey(k); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
    }).join(', ') : 'повторов нет';
    return `<div class="rec-series-row" data-recid="${esc(tpl.id)}">
      <div class="rec-series-head">
        <span class="task-title">${esc(tpl.title)}</span>
        <span class="rec-badge">🔁 <span>${esc(scheduleText(tpl))}</span></span>
      </div>
      <div class="rec-series-sub">${nextTxt}</div>
      <div class="rec-series-actions">
        <button type="button" class="btn ghost sm" data-act="series-edit">✏️ Изменить</button>
        <button type="button" class="btn ghost sm danger" data-act="series-delete">🗑 Удалить</button>
      </div>
    </div>`;
  }).join('');
}

function nextOccurrences(tpl, n){
  const res = [];
  const start = parseKey(tpl.startDate);
  let d = new Date();
  if(keyOf(d) < tpl.startDate) d = start;
  let guard = 0;
  while(res.length < n && guard < 3660){
    const k = keyOf(d);
    if(occursOn(tpl, k)) res.push(k);
    d = addDays(d, 1);
    guard++;
  }
  return res;
}

function renderAll(){
  renderCalendar();
  renderDayHeader();
  renderSleepBlock();
  renderFilterBar();
  renderTaskList();
  renderTagModal();
  renderPinnedShop();
  if(ui.shopTaskId) renderShopModal();
  if(ui.seriesListOpen) renderSeriesList();
  if(ui.seriesModal) renderSeriesForm();
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
  ui.sleepExpanded = false;
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
  let important = false, deadline = null;
  const m = String(text).match(/до\s+(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?/i);
  if(m){
    const day = +m[1], month = +m[2];
    const yearGiven = !!m[3];
    let year = yearGiven ? +m[3] : new Date().getFullYear();
    if(yearGiven && m[3].length === 2) year = 2000 + +m[3];
    const date = new Date(year, month - 1, day);
    const valid = day >= 1 && day <= 31 && month >= 1 && month <= 12
      && date.getDate() === day && date.getMonth() === month - 1;
    if(valid){
      if(!yearGiven && keyOf(date) < todayKey()) date.setFullYear(date.getFullYear() + 1);
      const hh = m[4] ? +m[4] : 0;
      const mm = m[5] ? +m[5] : 0;
      if(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59){
        deadline = `${keyOf(date)}T${pad(hh)}:${pad(mm)}`;
        text = text.replace(m[0], ' ');
      }
    }
  }
  for(const w of String(text).split(/\s+/)){
    if(/^#[^\s#]/.test(w)){
      const t = normalizeTag(w);
      if(t) tags.push(t);
    } else if(/^!/.test(w)){
      important = true;
    } else if(w){
      parts.push(w);
    }
  }
  return {title: parts.join(' '), tags, important, deadline};
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
  const isRec = taskEl && taskEl.dataset.rec;

  switch(act){
    case 'toggle-task':
      if(isRec){ toggleRecurring(isRec, selectedDate); break; }
      toggleTask(id); break;
    case 'edit-task':
      if(isRec){ openRecurringChoice('edit', isRec); break; }
      startEditTask(id); break;
    case 'delete-task':
      if(isRec){ openRecurringChoice('delete', isRec); break; }
      deleteTask(id); break;
    case 'save-task-edit': saveTaskEdit(id); break;
    case 'cancel-task-edit': ui.editingTask = null; renderAll(); break;
    case 'add-sub':
      ui.addingSubFor = (ui.addingSubFor === id) ? null : id;
      ui.editingSub = null;
      renderAll();
      break;
    case 'toggle-sub':
      if(isRec){ toggleRecurringSub(isRec, selectedDate, actEl.closest('.sub').dataset.subid); break; }
      toggleSub(id, actEl.closest('.sub').dataset.subid); break;
    case 'edit-sub':
      ui.editingSub = {taskId: id, subId: actEl.closest('.sub').dataset.subid};
      ui.addingSubFor = null;
      renderAll();
      break;
    case 'save-sub': saveSubEdit(id, actEl.closest('.sub').dataset.subid); break;
    case 'cancel-sub-edit': ui.editingSub = null; renderAll(); break;
    case 'delete-sub': deleteSub(id, actEl.closest('.sub').dataset.subid); break;
    case 'open-shop': openShopModal(id); break;
    case 'move-task': openMoveModal(id); break;
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
      overdueFilter = false;
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

  /* статистика */
  $('#statsBtn').addEventListener('click', openTodoStats);
  $('#statsModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeTodoStats(); });
  $('#statsModal').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(btn && btn.dataset.act === 'stats-close') closeTodoStats();
  });

  /* список покупок */
  $('#pinnedShop').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="open-shop"]');
    if(btn) openShopModal(btn.dataset.id);
  });
  $('#shopModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeShopModal(); });
  $('#shopModal').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const act = btn.dataset.act;
    if(act === 'shop-close') closeShopModal();
    else if(act === 'shop-toggle-item') shopToggleItem(btn.dataset.id, btn.dataset.sub);
    else if(act === 'shop-edit-item'){ ui.shopEditingSub = btn.dataset.sub; renderShopModal(); shopFocusEdit(); }
    else if(act === 'shop-save-item') shopSaveEdit(btn.dataset.id, btn.dataset.sub);
    else if(act === 'shop-cancel-item'){ ui.shopEditingSub = null; renderShopModal(); }
    else if(act === 'shop-delete-item') shopDelete(btn.dataset.id, btn.dataset.sub);
    else if(act === 'shop-clear-done') shopClearDone(btn.dataset.id);
  });
  $('#shopModal').addEventListener('submit', e => {
    if(e.target.id !== 'shopForm') return;
    e.preventDefault();
    const id = ui.shopTaskId;
    if(!id) return;
    const inp = $('#shopInput');
    const v = inp ? inp.value.trim() : '';
    if(v) addSub(id, v);
    const fresh = $('#shopInput');
    if(fresh) fresh.focus();
  });
  $('#shopModal').addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    if(e.target.classList.contains('shop-edit-input')){
      e.preventDefault();
      shopSaveEdit(ui.shopTaskId, e.target.closest('.shop-item').dataset.subid);
    }
  });

  /* регулярные задачи */
  $('#seriesBtn').addEventListener('click', openSeriesList);
  $('#newSeriesBtn').addEventListener('click', () => openSeriesModal(null));

  $('#recChoiceModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeRecurringChoice(); });
  $('#moveModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeMoveModal(); });
  $('#seriesModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeSeriesModal(); });
  $('#seriesListModal').addEventListener('mousedown', e => { if(e.target === e.currentTarget) closeSeriesList(); });

  $('#moveModal').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const act = btn.dataset.act;
    if(act === 'move-close') closeMoveModal();
    else if(act === 'move-confirm') confirmMove();
  });

  $('#recChoiceModal').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const act = btn.dataset.act;
    if(act === 'rec-choice-close') closeRecurringChoice();
    else if(act === 'rec-choice-this'){
      const c = ui.recChoice;
      if(!c) return;
      const recId = c.recId;
      const k = selectedDate;
      closeRecurringChoice();
      if(c.mode === 'edit'){
        detachOccurrence(recId, k);
        const detached = state.tasks[state.tasks.length-1];
        if(detached) startEditTask(detached.id);
      } else if(c.mode === 'delete'){
        if(customConfirm()) removeRecurringOccurrence(recId, k);
      }
    }
    else if(act === 'rec-choice-all'){
      const c = ui.recChoice;
      if(!c) return;
      closeRecurringChoice();
      if(c.mode === 'edit') openSeriesModal(c.recId);
      else if(c.mode === 'delete') deleteRecurring(c.recId);
    }
  });

  $('#seriesModal').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const act = btn.dataset.act;
    if(act === 'series-close') closeSeriesModal();
    else if(act === 'series-save') saveSeriesForm();
    else if(act === 'add-series-sub') addSeriesSub();
    else if(act === 'del-series-sub'){
      const idx = parseInt(btn.dataset.idx, 10);
      ui.seriesSubs.splice(idx, 1);
      renderSeriesSubs();
    }
  });
  $('#seriesFreq').addEventListener('click', e => {
    const b = e.target.closest('[data-freq]');
    if(!b) return;
    ui.seriesForm.freq = b.dataset.freq;
    if(b.dataset.freq !== 'week') ui.seriesForm.byDay = [];
    renderSeriesForm();
  });
  $('#seriesWeekDays').addEventListener('click', e => {
    const b = e.target.closest('[data-wd]');
    if(!b) return;
    const n = parseInt(b.dataset.wd, 10);
    const arr = ui.seriesForm.byDay;
    arr.includes(n) ? arr.splice(arr.indexOf(n), 1) : arr.push(n);
    renderSeriesForm();
  });
  $('#seriesTags').addEventListener('click', e => {
    const b = e.target.closest('[data-sel-tag]');
    if(!b) return;
    const tag = b.dataset.selTag;
    ui.seriesForm.tags.has(tag) ? ui.seriesForm.tags.delete(tag) : ui.seriesForm.tags.add(tag);
    renderSeriesForm();
  });
  $('#seriesInterval').addEventListener('input', e => {
    ui.seriesForm.interval = Math.max(1, parseInt(e.target.value, 10) || 1);
    toggleSeriesFields();
  });
  $('#seriesModal').addEventListener('input', e => {
    const f = ui.seriesForm;
    if(!f) return;
    const id = e.target.id;
    if(id === 'seriesTitle') f.title = e.target.value;
    else if(id === 'seriesDesc') f.description = e.target.value;
    else if(id === 'seriesDeadline') f.deadline = e.target.value;
    else if(id === 'seriesStart') f.startDate = e.target.value;
    else if(id === 'seriesEnd') f.endDate = e.target.value;
    else if(id === 'seriesMonthDay'){ if(e.target.value === '') f.byMonthDay = 1; else f.byMonthDay = parseInt(e.target.value, 10) || 1; }
  });
  $('#seriesLastDay').addEventListener('change', e => {
    if(e.target.checked){ $('#seriesMonthDay').value = ''; ui.seriesForm.byMonthDay = -1; }
    else { ui.seriesForm.byMonthDay = parseInt($('#seriesMonthDay').value, 10) || 1; }
  });
  $('#seriesImportant').addEventListener('change', e => { if(ui.seriesForm) ui.seriesForm.important = e.target.checked; });
  $('#seriesTags').addEventListener('keydown', e => {
    if(e.key === 'Enter' && e.target.id === 'seriesNewTag'){
      e.preventDefault();
      const v = normalizeTag(e.target.value);
      if(!v) return;
      createTag(v);
      ui.seriesForm.tags.add(v);
      save();
      renderSeriesForm();
      $('#seriesNewTag').value = '';
      $('#seriesNewTag').focus();
    }
  });

  $('#seriesSubsList').addEventListener('input', e => {
    const inp = e.target.closest('.rec-sub-inp');
    if(!inp) return;
    const idx = parseInt(inp.closest('.rec-sub-row').dataset.idx, 10);
    if(ui.seriesSubs[idx]) ui.seriesSubs[idx].title = inp.value;
  });

  $('#seriesListModal').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const act = btn.dataset.act;
    if(act === 'series-list-close') closeSeriesList();
    else if(act === 'series-list-new'){ closeSeriesList(); openSeriesModal(null); }
    else if(act === 'series-edit'){
      const recId = btn.closest('.rec-series-row').dataset.recid;
      closeSeriesList();
      openSeriesModal(recId);
    }
    else if(act === 'series-delete'){
      const recId = btn.closest('.rec-series-row').dataset.recid;
      deleteRecurring(recId);
      renderSeriesList();
    }
  });
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
    if(e.key !== 'Escape') return;
    if(ui.sleepExpanded){ ui.sleepExpanded = false; renderSleepBlock(); return; }
    if(ui.tagPanelOpen) closeTagModal();
    else if(ui.recChoice) closeRecurringChoice();
    else if(ui.seriesModal) closeSeriesModal();
    else if(ui.seriesListOpen) closeSeriesList();
    else if(ui.moveTask) closeMoveModal();
    else if(!$('#statsModal').hidden) closeTodoStats();
    else if(ui.shopTaskId) closeShopModal();
  });

  /* быстрый ввод */
  $('#quickForm').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#quickInput');
    const text = inp.value.trim();
    if(!text) return;
    const {title, tags, important, deadline} = parseQuick(text);
    inp.value = '';
    if(!title){ inp.focus(); return; }
    tags.forEach(createTag);
    addTask(title, {tags, important, deadline});
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
      important: $('#newImportant').checked,
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

  /* фильтр по тегам и просроченным */
  $('#filterBar').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    const f = chip.dataset.filt;
    if(f === 'overdue'){ overdueFilter = true; activeFilter = null; }
    else if(f === 'tag'){ overdueFilter = false; activeFilter = chip.dataset.tag; }
    else { overdueFilter = false; activeFilter = null; }
    renderFilterBar();
    renderTaskList();
  });

  /* список задач */
  $('#taskList').addEventListener('click', onTaskClick);
  $('#taskList').addEventListener('keydown', onTaskKeydown);

  ui.prevPct = dayStats(selectedDate).pct;
  ui.sleepFactors = loadCustomSleepFactors();
  renderAll();
}

/* ================= статистика ================= */
function renderTodoStats(){
  const streaks = $('#statsStreaks');
  if(streaks && typeof renderActivityStreaks === 'function') renderActivityStreaks(streaks, { only: ['todo'] });
  const heatmap = $('#statsHeatmap');
  if(heatmap && typeof renderActivityHeatmap === 'function'){
    renderActivityHeatmap(heatmap, 'todo', {
      onDayClick: function(date){
        selectDate(date);
        closeTodoStats();
      }
    });
  }
}
function openTodoStats(){
  $('#statsModal').hidden = false;
  renderTodoStats();
}
function closeTodoStats(){
  $('#statsModal').hidden = true;
}

/* ================= список покупок ================= */
function isShoppingTask(t){
  return !!t && !!t.title && String(t.title).trim().toLowerCase() === 'список продуктов';
}

function shoppingTasks(){
  return state.tasks.filter(t => isShoppingTask(t) && !t.completed);
}

function fmtShortDate(k){
  const d = parseKey(k);
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function renderPinnedShop(){
  const wrap = $('#pinnedShop');
  if(!wrap) return;
  const lists = shoppingTasks();
  if(!lists.length){ wrap.innerHTML = ''; wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  wrap.innerHTML = lists.map(t => {
    const doneN = t.subtasks.filter(s => s.completed).length;
    const totalN = t.subtasks.length;
    const pct = totalN ? Math.round(doneN/totalN*100) : 0;
    return `<div class="shop-pinned">
      <button type="button" class="shop-pin-btn" data-act="open-shop" data-id="${esc(t.id)}" title="Открыть список покупок">${ICON.cart}</button>\r
      <div class="shop-pin-body">
        <div class="shop-pin-title">Список продуктов<span class="shop-pin-date">${fmtShortDate(t.date)}</span></div>
        <div class="shop-pin-bar"><i style="width:${pct}%"></i></div>
        <div class="shop-pin-sub">${doneN} из ${totalN}${totalN ? ' · ' + pct + '%' : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function openShopModal(id){
  const isRec = String(id).indexOf('rec:') === 0;
  const t = findTask(id);
  if(!t && !isRec) return;
  ui.shopTaskId = id;
  ui.shopEditingSub = null;
  renderShopModal();
  $('#shopModal').hidden = false;
}

function closeShopModal(){
  ui.shopTaskId = null;
  ui.shopEditingSub = null;
  $('#shopModal').hidden = true;
}

function renderShopModal(){
  const id = ui.shopTaskId;
  if(!id) return;
  if(String(id).indexOf('rec:') === 0){
    const tpl = state.recurring.find(r => r.id === String(id).slice(4));
    if(!tpl){ closeShopModal(); return; }
    renderShopContent(recurringInstance(tpl, selectedDate));
    return;
  }
  const t = findTask(id);
  if(!t){ closeShopModal(); return; }
  renderShopContent(t);
}

function renderShopContent(t){
  const isRec = !!t.recId;
  const doneN = t.subtasks.filter(s => s.completed).length;
  const totalN = t.subtasks.length;
  const pct = totalN ? Math.round(doneN/totalN*100) : 0;

  $('#shopTitle').textContent = (isRec ? '🔁 ' : '🛒 ') + t.title;
  $('#shopProgress').innerHTML = `
    <div class="shop-progress-bar"><i style="width:${pct}%"></i></div>
    <div class="shop-progress-text">${doneN} из ${totalN}${totalN ? ' · ' + pct + '%' : ''}</div>`;
  $('#shopList').innerHTML = totalN
    ? t.subtasks.map(s => shopItemHTML(t, s)).join('')
    : `<div class="shop-empty">Пока пусто — добавьте первый продукт</div>`;
  $('#shopAdd').innerHTML = isRec
    ? `<div class="shop-add-hint">Пункты заданы в серии — редактировать их можно в самой серии.</div>`
    : `<form id="shopForm" class="shop-add" autocomplete="off">
        <input id="shopInput" class="inp" placeholder="Добавить продукт…">
        <button class="btn primary" type="submit">Добавить</button>
      </form>`;
}

function shopItemHTML(t, s){
  const isRec = !!t.recId;
  if(!isRec && ui.shopEditingSub === s.id){
    return `<div class="shop-item editing" data-subid="${s.id}">
      <input class="inp shop-edit-input" value="${esc(s.title)}" placeholder="Название продукта">
      <button type="button" class="icon-btn" data-act="shop-save-item" data-sub="${s.id}" title="Сохранить">${ICON.check}</button>
      <button type="button" class="icon-btn" data-act="shop-cancel-item" title="Отмена">${ICON.x}</button>
    </div>`;
  }
  const actions = isRec ? '' : `<span class="shop-item-actions">
      <button type="button" class="icon-btn" data-act="shop-edit-item" data-sub="${s.id}" title="Переименовать">${ICON.pencil}</button>
      <button type="button" class="icon-btn danger" data-act="shop-delete-item" data-sub="${s.id}" title="Удалить">${ICON.trash}</button>
    </span>`;
  return `<div class="shop-item${s.completed ? ' done' : ''}" data-subid="${s.id}">
    <button type="button" class="cb small${s.completed ? ' checked' : ''}" data-act="shop-toggle-item" data-id="${esc(t.id)}" data-sub="${esc(s.id)}" title="${s.completed ? 'Отменить' : 'Отметить купленным'}">${ICON.check}</button>\r
    <span class="shop-item-title">${esc(s.title)}</span>
    ${actions}
  </div>`;
}

function shopToggleItem(id, subId){
  if(String(id).indexOf('rec:') === 0){
    toggleRecurringSub(String(id).slice(4), selectedDate, subId);
  } else {
    toggleSub(id, subId);
  }
}

function shopSaveEdit(id, subId){
  const t = findTask(id);
  if(!t){ ui.shopEditingSub = null; return; }
  const s = t.subtasks.find(x => x.id === subId);
  ui.shopEditingSub = null;
  if(s){
    const inp = document.querySelector(`#shopModal .shop-item[data-subid="${subId}"] .shop-edit-input`);
    const v = inp ? inp.value.trim() : '';
    if(v) s.title = v;
  }
  commit();
}

function shopDelete(id, subId){
  if(String(id).indexOf('rec:') === 0) return;
  deleteSub(id, subId);
}

function shopClearDone(id){
  const t = findTask(id);
  if(!t) return;
  t.subtasks = t.subtasks.filter(s => !s.completed);
  syncParent(t);
  commit();
}

function shopFocusEdit(){
  const el = $('#shopModal .shop-item.editing .shop-edit-input');
  if(el){
    el.focus();
    try{ el.setSelectionRange(el.value.length, el.value.length); }catch(e){}
  }
}

/* ================= публичный API ================= */
let initialized = false;
window.getTodoState = function() {
    return state;
}

window.getTodoSleepData = function(dateKey) {
    return getSleep(dateKey);
}

window.getTodoSleepAll = function() {
    return state.sleep || {};
}

window.getTodoDayTasks = function(k) {
    return tasksOf(k);
}

window.loadTodoFromFirebase = function(data) {
    if(!data) return;
    if(Array.isArray(data.tasks)) {
        state.tasks = data.tasks.map(t => ({
            id: t.id || uid(),
            date: t.date || todayKey(),
            title: String(t.title || ''),
            description: String(t.description || ''),
            completed: !!t.completed,
            important: !!t.important,
            deadline: t.deadline || null,
            tags: Array.isArray(t.tags) ? t.tags : [],
            createdAt: t.createdAt || Date.now(),
            subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
                id: s.id || uid(), title: String(s.title || ''), completed: !!s.completed
            })) : []
        }));
    }
    if(Array.isArray(data.tags)) {
        state.tags = data.tags;
    }
    if(Array.isArray(data.recurring)) {
        state.recurring = data.recurring.map(r => ({
            id: r.id || uid(),
            title: String(r.title || ''),
            description: String(r.description || ''),
            deadline: r.deadline || null,
            important: !!r.important,
            tags: Array.isArray(r.tags) ? r.tags : [],
            subtasks: Array.isArray(r.subtasks) ? r.subtasks.map(s => ({
                id: s.id || uid(), title: String(s.title || '')
            })) : [],
            schedule: {
                freq: (r.schedule && r.schedule.freq) || 'day',
                interval: Math.max(1, parseInt((r.schedule && r.schedule.interval) || 1, 10) || 1),
                byDay: Array.isArray(r.schedule && r.schedule.byDay) ? r.schedule.byDay : null,
                byMonthDay: (r.schedule && typeof r.schedule.byMonthDay === 'number') ? r.schedule.byMonthDay : null,
            },
            startDate: r.startDate || todayKey(),
            endDate: r.endDate || null,
            exceptions: Array.isArray(r.exceptions) ? r.exceptions : [],
            occurrences: (r.occurrences && typeof r.occurrences === 'object') ? r.occurrences : {},
            createdAt: r.createdAt || Date.now()
        }));
    }
    if(data.sleep && typeof data.sleep === 'object') {
        state.sleep = data.sleep;
    }
    save();
    if(initialized) renderAll();
}

window.initTodoApp = function() {
    if(initialized){ renderAll(); return; }
    initialized = true;
    init();
};

window.todoSelectDate = function(k) {
    selectDate(k);
};

window.openTodoStats = openTodoStats;
window.closeTodoStats = closeTodoStats;

})();