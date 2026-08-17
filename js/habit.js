// ============================================
// 🎯 HABIT TRACKER (Привычки)
// Отдельный от задач модуль отслеживания привычек:
// отметки по дням, цели (день/неделя/месяц), серии и статистика.
// ============================================
(function() {
'use strict';

const $ = s => document.querySelector(s);
const LS_KEY = 'local-habits-v1';
const FB_PATH = 'lera_habit_v1';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WEEKDAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function plural(n, one, few, many){
  const n10 = n % 10, n100 = n % 100;
  if(n10 === 1 && n100 !== 11) return one;
  if(n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
const pad = n => String(n).padStart(2,'0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
const parseKey = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
function addDays(d, n){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x; }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(k){ const d = parseKey(k); return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function lastDayOfMonthKey(k){ const d = parseKey(k); return keyOf(new Date(d.getFullYear(), d.getMonth()+1, 0)); }
function uid(){ return 'hb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
const esc = s => (typeof window.esc === 'function') ? window.esc(s) : String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ============ STATE ============ */
function normalizeHabit(h){
  return {
    id: h.id || uid(),
    name: String(h.name || ''),
    type: 'binary',
    goal: (h.goal && typeof h.goal === 'object') ? {
      period: ['day','week','month'].includes(h.goal.period) ? h.goal.period : 'day',
      count: Math.max(1, parseInt(h.goal.count,10) || 1)
    } : { period: 'day', count: 1 },
    active: h.active !== false,
    createdAt: h.createdAt || Date.now()
  };
}

function loadState(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { habits: [], completions: {}, lastUpdated: null };
    const data = JSON.parse(raw);
    const habits = Array.isArray(data.habits) ? data.habits.map(normalizeHabit) : [];
    const completions = (data.completions && typeof data.completions === 'object') ? data.completions : {};
    return { habits, completions, lastUpdated: data.lastUpdated || null };
  } catch(e){ return { habits: [], completions: {}, lastUpdated: null }; }
}

let state = loadState();

function save(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e){}
  try {
    if (typeof db !== 'undefined' && typeof getTargetUid === 'function' && typeof isReadOnlyActive === 'function') {
      if (isReadOnlyActive()) return;
      const uidv = getTargetUid();
      if (!uidv) return;
      const data = { habits: state.habits, completions: state.completions, lastUpdated: Date.now() };
      db.ref(FB_PATH + '/' + uidv).set(data).catch(function(){});
    }
  } catch(e){}
}

/* ============ HELPERS ============ */
function activeHabits(){ return state.habits.filter(h => h.active); }
function isDone(habitId, k){ return !!(state.completions[k] && state.completions[k][habitId]); }
function goalLabel(goal){
  if(!goal || goal.period === 'day') return 'каждый день';
  const word = goal.period === 'week' ? 'в неделю' : 'в месяц';
  return goal.count + ' ' + plural(goal.count,'раз','раза','раз') + ' ' + word;
}

function getHabitDayProgress(k){
  const acts = activeHabits();
  const total = acts.length;
  let done = 0;
  acts.forEach(h => { if (isDone(h.id, k)) done++; });
  return { done, total };
}

function getHabitDayHabits(k){
  return activeHabits().map(h => ({
    id: h.id, name: h.name, type: h.type, goal: h.goal, active: h.active,
    done: isDone(h.id, k)
  }));
}

function markHabitCompletion(habitId, k, value){
  if(!state.completions[k]) state.completions[k] = {};
  if(value) state.completions[k][habitId] = true;
  else delete state.completions[k][habitId];
  if(state.completions[k] && Object.keys(state.completions[k]).length === 0) delete state.completions[k];
  save();
  refreshUI();
}

function toggleHabit(habitId, k){ markHabitCompletion(habitId, k, !isDone(habitId, k)); }

function addHabit(data){
  const goal = data.goal || { period: 'day', count: 1 };
  state.habits.push({
    id: uid(),
    name: String(data.name || '').trim() || 'Новая привычка',
    type: 'binary',
    goal: { period: goal.period || 'day', count: Math.max(1, parseInt(goal.count,10) || 1) },
    active: true,
    createdAt: Date.now()
  });
  save();
  refreshUI();
}

function updateHabit(id, patch){
  const h = state.habits.find(x => x.id === id);
  if(!h) return;
  if(patch.name != null) h.name = String(patch.name).trim();
  if(patch.goal) h.goal = { period: patch.goal.period || h.goal.period, count: Math.max(1, parseInt(patch.goal.count,10) || 1) };
  if(patch.active != null) h.active = !!patch.active;
  save();
  refreshUI();
}

function deleteHabit(id){
  state.habits = state.habits.filter(x => x.id !== id);
  Object.keys(state.completions).forEach(k => { if(state.completions[k]) delete state.completions[k][id]; });
  save();
  refreshUI();
}

/* ============ STATS ============ */
function dayDone(d){ const p = getHabitDayProgress(keyOf(d)); return p.total > 0 && p.done > 0; }

function currentStreakDays(start, end){
  const todayStr = todayKey();
  const asOf = (parseKey(end) >= parseKey(todayStr)) ? todayStr : end;
  let d = parseKey(asOf);
  if(keyOf(d) === todayStr && !dayDone(d)) d = addDays(d, -1);
  let streak = 0, guard = 0;
  while(keyOf(d) >= start && guard < 5000){
    if(dayDone(d)){ streak++; d = addDays(d,-1); } else break;
    guard++;
  }
  return streak;
}

function bestStreakDays(start, end){
  let best = 0, cur = 0, d = parseKey(start), g = 0;
  while(keyOf(d) <= end && g < 20000){
    if(dayDone(d)){ cur++; if(cur > best) best = cur; } else cur = 0;
    d = addDays(d,1); g++;
  }
  return best;
}

function periodRange(period, d){
  if(period === 'week'){ const s = startOfWeek(d); return { start: keyOf(s), end: keyOf(addDays(s,6)) }; }
  const s = startOfMonth(d); return { start: keyOf(s), end: lastDayOfMonthKey(keyOf(s)) };
}
function countDoneInRange(habitId, start, end){
  let c = 0, d = parseKey(start), g = 0;
  while(keyOf(d) <= end && g < 2000){ if(isDone(habitId, keyOf(d))) c++; d = addDays(d,1); g++; }
  return c;
}
function computeHabitStreak(habit, asOfKey){
  if(!habit) return 0;
  const asOf = parseKey(asOfKey);
  if(habit.goal.period === 'day'){
    let streak = 0, d = asOf, g = 0;
    if(keyOf(d) === todayKey() && !isDone(habit.id, keyOf(d))) d = addDays(d,-1);
    while(g < 5000){
      if(isDone(habit.id, keyOf(d))){ streak++; d = addDays(d,-1); } else break;
      g++;
    }
    return streak;
  }
  let streak = 0, d = asOf, g = 0;
  while(g < 500){
    const range = periodRange(habit.goal.period, d);
    const cnt = countDoneInRange(habit.id, range.start, range.end);
    if(cnt >= habit.goal.count){ streak++; d = (habit.goal.period === 'week') ? addDays(startOfWeek(d), -1) : addDays(startOfMonth(d), -1); }
    else break;
    g++;
  }
  return streak;
}

function getHabitStats(start, end){
  const acts = activeHabits();
  const totalHabits = acts.length;
  let totalCount = 0, doneCount = 0, doneDays = 0, fullDoneDays = 0, totalDays = 0;
  let rateSum = 0, rateDays = 0;
  const byHabit = {};
  acts.forEach(h => byHabit[h.id] = { id:h.id, name:h.name, done:0, total:0, goal:h.goal });
  let d = parseKey(start), guard = 0;
  while(keyOf(d) <= end && guard < 20000){
    const k = keyOf(d);
    const p = getHabitDayProgress(k);
    totalDays++;
    if(p.total > 0){
      totalCount += p.total;
      doneCount += p.done;
      if(p.done > 0) doneDays++;
      if(p.done === p.total) fullDoneDays++;
      const r = p.done / p.total;
      rateSum += r; rateDays++;
      acts.forEach(h => { if(isDone(h.id, k)) byHabit[h.id].done++; byHabit[h.id].total++; });
    }
    d = addDays(d, 1);
    guard++;
  }
  const rate = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : null;
  const avgDayRate = rateDays > 0 ? Math.round(rateSum / rateDays * 100) : null;
  const byHabitArr = acts.map(h => {
    const b = byHabit[h.id];
    return { id:h.id, name:h.name, done:b.done, total:b.total, rate: b.total > 0 ? Math.round(b.done / b.total * 100) : 0, goal:h.goal };
  }).sort((a,b) => b.rate - a.rate);
  return {
    totalHabits, totalCount, doneCount, rate, avgDayRate,
    doneDays, fullDoneDays, totalDays,
    currentStreak: currentStreakDays(start, end),
    longestStreak: bestStreakDays(start, end),
    byHabit: byHabitArr,
    bestHabit: byHabitArr.length ? byHabitArr[0] : null,
    worstHabit: byHabitArr.length ? byHabitArr[byHabitArr.length - 1] : null
  };
}

/* ============ UI STATE ============ */
let habitViewMode = 'week';
let habitViewDate = todayKey();
let habitEditorDate = null;
let habitEditingId = null;

function refreshUI(){
  const sub = document.getElementById('todo-sub-habits');
  if(sub && sub.classList.contains('active')) renderHabitsView();
  const home = document.getElementById('home-sub-today');
  const homeTab = document.getElementById('main-tab-home');
  if(home && homeTab && homeTab.classList.contains('active') && home.classList.contains('active')){
    if(typeof window.renderHomeToday === 'function') window.renderHomeToday();
  }
}

function statPill(label, val){ return '<div class="habit-pill"><span class="hp-label">'+label+'</span><span class="hp-value">'+val+'</span></div>'; }

function renderWeekView(){
  const ws = startOfWeek(parseKey(habitViewDate));
  const we = addDays(ws, 6);
  let html = '<div class="habit-week-nav">';
  html += '<button class="icon-btn" type="button" onclick="window.habitShiftWeek(-1)" title="Пред. неделя">‹</button>';
  html += '<span class="habit-week-label">'+ ws.getDate() +' '+ MONTHS_GEN[ws.getMonth()] +' — '+ we.getDate() +' '+ MONTHS_GEN[we.getMonth()] +'</span>';
  html += '<button class="icon-btn" type="button" onclick="window.habitShiftWeek(1)" title="След. неделя">›</button>';
  html += '</div>';
  html += '<div class="habit-week-grid">';
  for(let i = 0; i < 7; i++){
    const d = addDays(ws, i);
    const k = keyOf(d);
    const p = getHabitDayProgress(k);
    const isToday = k === todayKey();
    html += '<div class="habit-day'+(isToday?' today':'')+'">';
    html += '<div class="habit-day-head"><span class="hd-wd">'+WEEKDAYS_SHORT[i]+'</span><span class="hd-num">'+d.getDate()+'</span><span class="hd-prog">'+(p.total ? p.done+'/'+p.total : '')+'</span></div>';
    html += '<div class="habit-day-body">';
    activeHabits().forEach(h => {
      const done = isDone(h.id, k);
      html += '<button class="habit-chip'+(done?' done':'')+'" type="button" onclick="window.toggleHabit(\''+h.id+'\',\''+k+'\')" title="'+esc(h.name)+'">'+(done?'✓ ':'')+esc(h.name)+'</button>';
    });
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}

function renderCalendarView(){
  const monthStart = startOfMonth(parseKey(habitViewDate));
  const gridStart = startOfWeek(monthStart);
  let html = '<div class="habit-week-nav">';
  html += '<button class="icon-btn" type="button" onclick="window.habitShiftMonth(-1)" title="Пред. месяц">‹</button>';
  html += '<span class="habit-week-label">'+ MONTHS[monthStart.getMonth()] +' '+ monthStart.getFullYear() +'</span>';
  html += '<button class="icon-btn" type="button" onclick="window.habitShiftMonth(1)" title="След. месяц">›</button>';
  html += '</div>';
  html += '<div class="habit-cal">';
  WEEKDAYS_SHORT.forEach(w => html += '<div class="habit-cal-wd">'+w+'</div>');
  let d = gridStart, g = 0;
  while(g < 42){
    const k = keyOf(d);
    const inMonth = d.getMonth() === monthStart.getMonth();
    const p = getHabitDayProgress(k);
    let cls = 'habit-cal-cell'+(inMonth ? '' : ' out')+(p.total > 0 ? (p.done === p.total ? ' full' : (p.done > 0 ? ' part' : ' empty')) : '')+(k === todayKey() ? ' today' : '');
    html += '<button class="'+cls+'" type="button" onclick="window.habitSelectDay(\''+k+'\')">';
    html += '<span class="hcc-num">'+d.getDate()+'</span>';
    if(p.total > 0) html += '<span class="hcc-badge">'+p.done+'/'+p.total+'</span>';
    html += '</button>';
    d = addDays(d, 1); g++;
  }
  html += '</div>';
  if(habitEditorDate){
    const ek = habitEditorDate;
    const ed = parseKey(ek);
    html += '<div class="habit-day-editor">';
    html += '<div class="hde-head">📅 '+ ed.getDate() +' '+ MONTHS_GEN[ed.getMonth()] +' — отметь привычки</div>';
    html += '<div class="hde-body">';
    activeHabits().forEach(h => {
      const done = isDone(h.id, ek);
      html += '<button class="habit-chip'+(done?' done':'')+'" type="button" onclick="window.toggleHabit(\''+h.id+'\',\''+ek+'\')">'+(done?'✓ ':'')+esc(h.name)+'</button>';
    });
    html += '</div>';
    html += '<button class="btn ghost sm" type="button" onclick="window.habitCloseDayEditor()">Закрыть</button>';
    html += '</div>';
  }
  return html;
}

function renderHabitManage(){
  if(state.habits.length === 0) return '';
  let html = '<div class="habit-manage">';
  html += '<div class="hm-title">Все привычки ('+state.habits.length+')</div>';
  state.habits.forEach(h => {
    const streak = computeHabitStreak(h, todayKey());
    html += '<div class="hm-row'+(h.active?'':' inactive')+'">';
    html += '<div class="hm-info"><span class="hm-name">'+esc(h.name)+'</span><span class="hm-meta">'+goalLabel(h.goal)+' · серия '+streak+'</span></div>';
    html += '<div class="hm-acts">';
    html += '<button class="icon-btn sm" type="button" title="Изменить" onclick="window.habitOpenEdit(\''+h.id+'\')">✎</button>';
    html += '<button class="icon-btn sm" type="button" title="'+(h.active?'Скрыть':'Показать')+'" onclick="window.habitToggleActive(\''+h.id+'\')">'+(h.active?'👁':'🚫')+'</button>';
    html += '<button class="icon-btn sm danger" type="button" title="Удалить" onclick="window.habitDelete(\''+h.id+'\')">🗑</button>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function renderHabitsView(){
  const root = document.getElementById('todo-sub-habits');
  if(!root) return;
  const acts = activeHabits();
  const today = todayKey();
  const todayP = getHabitDayProgress(today);

  let html = '';
  html += '<div class="habit-head">';
  html += '<div class="habit-head-title">🎯 Привычки</div>';
  html += '<div class="habit-head-actions">';
  html += '<div class="habit-mode-switch">';
  html += '<button class="hmode-btn'+(habitViewMode==='week'?' active':'')+'" type="button" onclick="window.habitSwitchMode(\'week\')">Неделя</button>';
  html += '<button class="hmode-btn'+(habitViewMode==='calendar'?' active':'')+'" type="button" onclick="window.habitSwitchMode(\'calendar\')">Календарь</button>';
  html += '</div>';
  html += '<button class="btn primary sm" type="button" onclick="window.habitOpenAdd()">➕ Добавить</button>';
  html += '</div>';
  html += '</div>';

  let sum = '';
  let range;
  if(habitViewMode === 'week'){
    const ws = startOfWeek(parseKey(habitViewDate));
    range = { start: keyOf(ws), end: keyOf(addDays(ws,6)) };
  } else {
    const ms = startOfMonth(parseKey(habitViewDate));
    range = { start: keyOf(ms), end: lastDayOfMonthKey(keyOf(ms)) };
  }
  const stats = getHabitStats(range.start, range.end);
  sum += statPill('Активных', acts.length + (state.habits.length - acts.length ? ' (+'+(state.habits.length - acts.length)+')' : ''));
  sum += statPill('Сегодня', acts.length ? (todayP.done + '/' + acts.length) : '—');
  sum += statPill('Серия', stats.currentStreak + ' дн');
  sum += statPill('Рекорд', stats.longestStreak + ' дн');
  html += '<div class="habit-summary">'+sum+'</div>';

  if(acts.length === 0){
    html += '<div class="habit-empty">Привычек пока нет. Нажми «➕ Добавить», чтобы создать первую — например, «Пить воду» или «Читать 20 мин».</div>';
  } else {
    html += (habitViewMode === 'week') ? renderWeekView() : renderCalendarView();
  }
  html += renderHabitManage();
  root.innerHTML = html;
}

/* ============ MODAL ============ */
function openHabitModal(id){
  const h = id ? state.habits.find(x => x.id === id) : null;
  const name = h ? h.name : '';
  const period = h ? h.goal.period : 'day';
  const count = h ? h.goal.count : 1;
  let overlay = document.getElementById('habit-modal');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'habit-modal';
    overlay.onclick = function(e){ if(e.target === overlay) window.habitCloseModal(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML =
    '<div class="modal">' +
      '<div class="modal-header"><h3 class="modal-title">'+(h?'✏️ Изменить привычку':'➕ Новая привычка')+'</h3>' +
      '<button class="modal-close" type="button" onclick="window.habitCloseModal()">✕</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-field"><label>Название</label><input id="habit-name" type="text" value="'+esc(name)+'" placeholder="Напр. Пить 2 л воды"></div>' +
        '<div class="form-field"><label>Частота</label>' +
          '<select id="habit-period" onchange="window.habitPeriodChange()">' +
            '<option value="day"'+(period==='day'?' selected':'')+'>Каждый день</option>' +
            '<option value="week"'+(period==='week'?' selected':'')+'>N раз в неделю</option>' +
            '<option value="month"'+(period==='month'?' selected':'')+'>N раз в месяц</option>' +
          '</select></div>' +
        '<div class="form-field" id="habit-count-field"'+(period==='day'?' style="display:none"':'')+'><label>Сколько раз</label><input id="habit-count" type="number" min="1" max="31" value="'+count+'"></div>' +
      '</div>' +
      '<div class="modal-footer"><button class="btn" type="button" onclick="window.habitCloseModal()">Отмена</button>' +
      '<button class="btn primary" type="button" onclick="window.habitSave()">'+(h?'Сохранить':'Создать')+'</button></div>' +
    '</div>';
  overlay.classList.add('visible');
  setTimeout(function(){ const inp = document.getElementById('habit-name'); if(inp) inp.focus(); }, 30);
}

/* ============ PUBLIC UI HANDLERS ============ */
window.habitSwitchMode = function(m){ habitViewMode = m; renderHabitsView(); };
window.habitShiftWeek = function(d){ habitViewDate = keyOf(addDays(parseKey(habitViewDate), d * 7)); renderHabitsView(); };
window.habitShiftMonth = function(d){ const dt = parseKey(habitViewDate); habitViewDate = keyOf(new Date(dt.getFullYear(), dt.getMonth() + d, 1)); renderHabitsView(); };
window.habitSelectDay = function(k){ habitEditorDate = (habitEditorDate === k) ? null : k; renderHabitsView(); };
window.habitCloseDayEditor = function(){ habitEditorDate = null; renderHabitsView(); };
window.habitToggleActive = function(id){ const h = state.habits.find(x => x.id === id); if(h){ h.active = !h.active; save(); refreshUI(); } };
window.habitDelete = function(id){
  const doit = function(){ deleteHabit(id); };
  if(typeof window.customConfirm === 'function') window.customConfirm('Удалить привычку и все её отметки?', doit);
  else if(typeof window.customAlert === 'function') { if(confirm('Удалить привычку и все её отметки?')) doit(); }
  else { if(confirm('Удалить привычку и все её отметки?')) doit(); }
};
window.habitOpenAdd = function(){ habitEditingId = null; openHabitModal(null); };
window.habitOpenEdit = function(id){ habitEditingId = id; openHabitModal(id); };
window.habitPeriodChange = function(){
  const p = document.getElementById('habit-period').value;
  const f = document.getElementById('habit-count-field');
  if(f) f.style.display = (p === 'day') ? 'none' : 'block';
};
window.habitCloseModal = function(){ const o = document.getElementById('habit-modal'); if(o) o.classList.remove('visible'); };
window.habitSave = function(){
  const name = (document.getElementById('habit-name').value || '').trim();
  const period = document.getElementById('habit-period').value;
  const count = period === 'day' ? 1 : Math.max(1, parseInt(document.getElementById('habit-count').value,10) || 1);
  if(!name){ if(typeof window.customAlert === 'function') window.customAlert('Введите название привычки'); return; }
  if(habitEditingId) updateHabit(habitEditingId, { name, goal: { period, count } });
  else addHabit({ name, goal: { period, count } });
  window.habitCloseModal();
};

window.habitOpenDate = function(dateKey){
  if(typeof switchMainTab === 'function') switchMainTab('todo');
  habitViewMode = 'week';
  habitViewDate = dateKey;
  const tasksBtn = document.getElementById('todo-subtab-tasks');
  const habBtn = document.getElementById('todo-subtab-habits');
  const tasksPane = document.getElementById('todo-sub-tasks');
  const habPane = document.getElementById('todo-sub-habits');
  if(tasksBtn) tasksBtn.classList.remove('active');
  if(habBtn) habBtn.classList.add('active');
  if(tasksPane) tasksPane.classList.remove('active');
  if(habPane) habPane.classList.add('active');
  renderHabitsView();
};

window.switchTodoSubTab = function(tab){
  const tabs = ['tasks','habits'];
  tabs.forEach(t => {
    const btn = document.getElementById('todo-subtab-' + t);
    const pane = document.getElementById('todo-sub-' + t);
    if(btn) btn.classList.toggle('active', t === tab);
    if(pane) pane.classList.toggle('active', t === tab);
  });
  if(tab === 'habits') renderHabitsView();
  else if(typeof window.initTodoApp === 'function') window.initTodoApp();
};

/* ============ PUBLIC API ============ */
window.getHabitState = function(){ return state; };
window.getAllHabits = function(){ return state.habits; };
window.getHabitDayProgress = getHabitDayProgress;
window.getHabitDayHabits = getHabitDayHabits;
window.markHabitCompletion = markHabitCompletion;
window.toggleHabit = toggleHabit;
window.addHabit = addHabit;
window.updateHabit = updateHabit;
window.deleteHabit = deleteHabit;
window.getHabitStats = getHabitStats;
window.computeHabitStreak = computeHabitStreak;
window.renderHabitsView = renderHabitsView;
window.habitGoalLabel = goalLabel;

window.loadHabitsFromFirebase = function(data){
  if(!data) return;
  if(Array.isArray(data.habits)) state.habits = data.habits.map(normalizeHabit);
  if(data.completions && typeof data.completions === 'object') state.completions = data.completions;
  save();
  refreshUI();
};

})();
