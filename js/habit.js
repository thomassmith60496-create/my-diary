// ============================================
// 🎯 HABIT TRACKER (Привычки)
// Отдельный от задач модуль: отметки по дням (в т.ч. несколько раз в день),
// гибкая регулярность (как у повторяющихся задач) и статистика/серии.
// ============================================
(function() {
'use strict';

const $ = s => document.querySelector(s);
const LS_KEY = 'local-habits-v1';
const FB_PATH = 'lera_habit_v1';

const WD_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

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
function dayDiff(a,b){ return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
function weekdayNum(d){ return (d.getDay()+6)%7 + 1; }
function uid(){ return 'hb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
const esc = s => (typeof window.esc === 'function') ? window.esc(s) : String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ============ STATE ============ */
function normalizeSchedule(s){
  s = s || {};
  return {
    freq: ['day','week','month'].includes(s.freq) ? s.freq : 'day',
    interval: Math.max(1, parseInt(s.interval,10) || 1),
    byDay: Array.isArray(s.byDay) ? s.byDay.map(n => parseInt(n,10)).filter(n => n>=1 && n<=7) : [],
    byMonthDay: (typeof s.byMonthDay === 'number') ? s.byMonthDay : 1,
    startDate: s.startDate || todayKey()
  };
}
function normalizeHabit(h){
  return {
    id: h.id || uid(),
    name: String(h.name || ''),
    type: 'binary',
    goal: (h.goal && typeof h.goal === 'object') ? {
      period: ['day','week','month'].includes(h.goal.period) ? h.goal.period : 'day',
      count: Math.max(1, parseInt(h.goal.count,10) || 1)
    } : { period: 'day', count: 1 },
    schedule: normalizeSchedule(h.schedule),
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
    const completions = {};
    if(data.completions && typeof data.completions === 'object'){
      Object.keys(data.completions).forEach(k => {
        const day = data.completions[k];
        if(!day || typeof day !== 'object') return;
        completions[k] = {};
        Object.keys(day).forEach(id => {
          let v = day[id];
          if(v === true || v === 1 || v === '1') v = 1;
          else v = Number(v) || 0;
          if(v > 0) completions[k][id] = v;
        });
      });
    }
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

/* ============ SCHEDULE / COMPLETION HELPERS ============ */
function matchesSchedule(habit, k){
  const s = habit.schedule;
  if(!s) return true;
  const start = parseKey(s.startDate || keyOf(new Date(habit.createdAt || Date.now())));
  const d = parseKey(k);
  const diff = Math.round((d - start) / 86400000);
  if(s.freq === 'day'){ return diff >= 0 && diff % (s.interval || 1) === 0; }
  if(s.freq === 'week'){
    const wd = weekdayNum(d);
    if(!s.byDay || !s.byDay.includes(wd)) return false;
    const weekDiff = Math.floor(diff / 7);
    return weekDiff >= 0 && weekDiff % (s.interval || 1) === 0;
  }
  if(s.freq === 'month'){
    if(typeof s.byMonthDay !== 'number') return false;
    const mDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
    if(mDiff < 0 || mDiff % (s.interval || 1) !== 0) return false;
    if(s.byMonthDay === -1){ const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return d.getDate() === last; }
    return d.getDate() === s.byMonthDay;
  }
  return false;
}

function isScheduled(habit, k){ return habit.active && matchesSchedule(habit, k); }
function dayCount(habitId, k){ const v = state.completions[k] && state.completions[k][habitId]; return v ? Number(v) : 0; }
function setDayCount(habitId, k, n){
  n = Math.max(0, Math.min(n, 99));
  if(!state.completions[k]) state.completions[k] = {};
  if(n <= 0) delete state.completions[k][habitId];
  else state.completions[k][habitId] = n;
  if(state.completions[k] && Object.keys(state.completions[k]).length === 0) delete state.completions[k];
}
function habitDoneToday(habit, k){
  if(!isScheduled(habit, k)) return false;
  const c = dayCount(habit.id, k);
  if(habit.goal.period === 'day') return c >= habit.goal.count;
  return c >= 1;
}

function activeHabits(){ return state.habits.filter(h => h.active); }

function getHabitDayProgress(k){
  let total = 0, done = 0;
  activeHabits().forEach(h => { if(isScheduled(h, k)){ total++; if(habitDoneToday(h, k)) done++; } });
  return { done, total };
}

function getHabitDayHabits(k){
  return activeHabits().filter(h => isScheduled(h, k)).map(h => ({
    id: h.id, name: h.name, type: h.type, goal: h.goal, schedule: h.schedule, active: h.active,
    scheduled: true, count: dayCount(h.id, k), target: h.goal.count, done: habitDoneToday(h, k)
  }));
}

function scheduleText(habit){
  const s = habit.schedule; const i = s.interval || 1;
  if(s.freq === 'day') return i === 1 ? 'каждый день' : `каждые ${i} ${plural(i,'день','дня','дней')}`;
  if(s.freq === 'week'){
    const days = (s.byDay && s.byDay.length) ? s.byDay.slice().sort((a,b)=>a-b).map(n => WD_NAMES[n-1]).join(', ') : '';
    return (i === 1 ? 'каждую неделю' : `каждые ${i} недель`) + (days ? ` · ${days}` : '');
  }
  if(s.freq === 'month'){
    const dt = s.byMonthDay === -1 ? 'в последний день месяца' : `${s.byMonthDay}-го числа`;
    return (i === 1 ? 'каждый месяц' : `каждый ${i}-й месяц`) + ` · ${dt}`;
  }
  return 'регулярно';
}
function goalText(goal){
  const c = goal.count;
  const w = goal.period === 'day' ? 'в день' : goal.period === 'week' ? 'в неделю' : 'в месяц';
  return `${c} ${plural(c,'раз','раза','раз')} ${w}`;
}

/* ============ MUTATIONS ============ */
function markHabitCompletion(habitId, k, value){ setDayCount(habitId, k, value ? 1 : 0); save(); refreshUI(); }
function toggleHabit(habitId, k){
  const h = state.habits.find(x => x.id === habitId);
  if(!h) return;
  if(h.goal.period === 'day'){ setDayCount(habitId, k, dayCount(habitId, k) >= h.goal.count ? 0 : h.goal.count); }
  else { setDayCount(habitId, k, dayCount(habitId, k) >= 1 ? 0 : 1); }
  save(); refreshUI();
}
function habitInc(habitId, k){
  const h = state.habits.find(x => x.id === habitId); if(!h) return;
  setDayCount(habitId, k, Math.min(dayCount(habitId, k) + 1, h.goal.count)); save(); refreshUI();
}
function habitDec(habitId, k){
  setDayCount(habitId, k, dayCount(habitId, k) - 1); save(); refreshUI();
}

function addHabit(data){
  state.habits.push({
    id: uid(),
    name: String(data.name || '').trim() || 'Новая привычка',
    type: 'binary',
    goal: { period: (data.goal && data.goal.period) || 'day', count: Math.max(1, parseInt((data.goal && data.goal.count) || 1, 10) || 1) },
    schedule: normalizeSchedule(data.schedule),
    active: true,
    createdAt: Date.now()
  });
  save(); refreshUI();
}
function updateHabit(id, patch){
  const h = state.habits.find(x => x.id === id); if(!h) return;
  if(patch.name != null) h.name = String(patch.name).trim();
  if(patch.goal) h.goal = { period: patch.goal.period || h.goal.period, count: Math.max(1, parseInt(patch.goal.count,10) || 1) };
  if(patch.schedule) h.schedule = normalizeSchedule(patch.schedule);
  if(patch.active != null) h.active = !!patch.active;
  save(); refreshUI();
}
function deleteHabit(id){
  state.habits = state.habits.filter(x => x.id !== id);
  Object.keys(state.completions).forEach(k => { if(state.completions[k]) delete state.completions[k][id]; });
  save(); refreshUI();
}

/* ============ STATS ============ */
function periodDone(habit, start, end){
  let sum = 0; let d = parseKey(start), g = 0;
  while(keyOf(d) <= end && g < 2000){
    const k = keyOf(d);
    if(matchesSchedule(habit, k)) sum += Math.min(dayCount(habit.id, k), habit.goal.count);
    d = addDays(d, 1); g++;
  }
  return Math.min(sum, habit.goal.count);
}
function periodRangeForStreak(period, d){
  if(period === 'week'){ const s = startOfWeek(d); return { start: keyOf(s), end: keyOf(addDays(s,6)) }; }
  const s = startOfMonth(d); return { start: keyOf(s), end: keyOf(new Date(s.getFullYear(), s.getMonth()+1, 0)) };
}

function getHabitStats(start, end){
  const acts = activeHabits();
  let totalCount = 0, doneCount = 0, doneDays = 0, fullDoneDays = 0, totalDays = 0;
  let rateSum = 0, rateDays = 0;
  const byHabit = {};
  acts.forEach(h => byHabit[h.id] = { id:h.id, name:h.name, done:0, total:0, goal:h.goal, schedule:h.schedule });
  let d = parseKey(start), guard = 0;
  while(keyOf(d) <= end && guard < 20000){
    const k = keyOf(d);
    acts.forEach(h => {
      if(!isScheduled(h, k)) return;
      totalCount++; totalDays++;
      const fully = habitDoneToday(h, k);
      if(fully){ doneCount++; doneDays++; fullDoneDays++; }
      else if(dayCount(h.id, k) > 0) doneDays++;
      rateSum += fully ? 1 : 0; rateDays++;
      byHabit[h.id].done += fully ? 1 : 0; byHabit[h.id].total++;
    });
    d = addDays(d, 1); guard++;
  }
  const rate = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : null;
  const avgDayRate = rateDays > 0 ? Math.round(rateSum / rateDays * 100) : null;
  const byHabitArr = acts.map(h => {
    const b = byHabit[h.id];
    return { id:h.id, name:h.name, done:b.done, total:b.total, rate: b.total > 0 ? Math.round(b.done / b.total * 100) : 0, goal:h.goal, schedule:h.schedule };
  }).sort((a,b) => b.rate - a.rate);
  return {
    totalHabits: acts.length, totalCount, doneCount, rate, avgDayRate,
    doneDays, fullDoneDays, totalDays,
    currentStreak: currentStreakDays(start, end),
    longestStreak: bestStreakDays(start, end),
    byHabit: byHabitArr,
    bestHabit: byHabitArr.length ? byHabitArr[0] : null,
    worstHabit: byHabitArr.length ? byHabitArr[byHabitArr.length - 1] : null
  };
}

function dayDone(d){ const p = getHabitDayProgress(keyOf(d)); return p.total > 0 && p.done > 0; }
function currentStreakDays(start, end){
  const todayStr = todayKey();
  const asOf = (parseKey(end) >= parseKey(todayStr)) ? todayStr : end;
  let d = parseKey(asOf);
  if(keyOf(d) === todayStr && !dayDone(d)) d = addDays(d, -1);
  let streak = 0, guard = 0;
  while(keyOf(d) >= start && guard < 5000){ if(dayDone(d)){ streak++; d = addDays(d,-1); } else break; guard++; }
  return streak;
}
function bestStreakDays(start, end){
  let best = 0, cur = 0, d = parseKey(start), g = 0;
  while(keyOf(d) <= end && g < 20000){
    if(dayDone(d)){ cur++; if(cur > best) best = cur; } else cur = 0;
    d = addDays(d, 1); g++;
  }
  return best;
}
function computeHabitStreak(habit, asOfKey){
  if(!habit) return 0;
  const isDay = habit.goal.period === 'day';
  const asOf = asOfKey || todayKey();
  let streak = 0, d = parseKey(asOf), g = 0;
  if(isDay){
    if(isScheduled(habit, keyOf(d)) && dayCount(habit.id, keyOf(d)) < habit.goal.count) d = addDays(d, -1);
    while(g < 5000){
      const k = keyOf(d);
      if(!isScheduled(habit, k)){ d = addDays(d, -1); g++; if(g < 5000) continue; else break; }
      if(dayCount(habit.id, k) >= habit.goal.count){ streak++; d = addDays(d, -1); } else break;
      g++;
    }
    return streak;
  }
  while(g < 500){
    const range = periodRangeForStreak(habit.goal.period, d);
    if(periodDone(habit, range.start, range.end) >= habit.goal.count){
      streak++; d = (habit.goal.period === 'week') ? addDays(startOfWeek(d), -1) : addDays(startOfMonth(d), -1);
    } else break;
    g++;
  }
  return streak;
}

/* ============ UI STATE ============ */
let habitViewMode = 'week';
let habitViewDate = todayKey();
let habitEditorDate = null;
let habitEditingId = null;
let modalForm = null;

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

function dayCell(habit, k){
  if(!isScheduled(habit, k)) return '<div class="ht-cell empty"></div>';
  const cnt = dayCount(habit.id, k);
  const target = habit.goal.count;
  if(habit.goal.period === 'day'){
    const complete = cnt >= target;
    return '<div class="ht-cell day'+(complete?' complete':'')+'">' +
      '<button class="ht-step" type="button" onclick="window.habitDec(\''+habit.id+'\',\''+k+'\')"'+(cnt<=0?' disabled':'')+' aria-label="минус">−</button>' +
      '<span class="ht-count">'+cnt+'/'+target+'</span>' +
      '<button class="ht-step" type="button" onclick="window.habitInc(\''+habit.id+'\',\''+k+'\')"'+(cnt>=target?' disabled':'')+' aria-label="плюс">+</button>' +
    '</div>';
  }
  const done = cnt >= 1;
  return '<button class="ht-cell tog'+(done?' on':'')+'" type="button" onclick="window.toggleHabit(\''+habit.id+'\',\''+k+'\')">'+(done?'✓':'')+'</button>';
}

function renderWeekView(){
  const ws = startOfWeek(parseKey(habitViewDate));
  const acts = activeHabits();
  let html = '<div class="habit-week-nav">';
  html += '<button class="icon-btn" type="button" onclick="window.habitShiftWeek(-1)" title="Пред. неделя">‹</button>';
  html += '<span class="habit-week-label">'+ ws.getDate() +' '+ MONTHS_GEN[ws.getMonth()] +' — '+ addDays(ws,6).getDate() +' '+ MONTHS_GEN[addDays(ws,6).getMonth()] +'</span>';
  html += '<button class="icon-btn" type="button" onclick="window.habitShiftWeek(1)" title="След. неделя">›</button>';
  html += '</div>';

  html += '<div class="ht-week">';
  html += '<div class="ht-week-head"><div class="ht-corner">Привычка</div>';
  for(let i=0;i<7;i++){ const d = addDays(ws,i); const isToday = keyOf(d)===todayKey(); html += '<div class="ht-daycol'+(isToday?' today':'')+'"><span class="wd">'+WD_NAMES[i]+'</span><span class="dn">'+d.getDate()+'</span></div>'; }
  html += '</div>';

  if(acts.length === 0){
    html += '<div class="ht-empty">Нет активных привычек.</div>';
  } else {
    acts.forEach(h => {
      html += '<div class="ht-habit-row">';
      html += '<div class="ht-habit-name"><span class="hn">'+esc(h.name)+'</span><span class="hg">'+goalText(h.goal)+'</span></div>';
      for(let i=0;i<7;i++){ html += dayCell(h, keyOf(addDays(ws,i))); }
      html += '</div>';
    });
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
  WD_NAMES.forEach(w => html += '<div class="habit-cal-wd">'+w+'</div>');
  let d = gridStart, g = 0;
  while(g < 42){
    const k = keyOf(d);
    const inMonth = d.getMonth() === monthStart.getMonth();
    const p = getHabitDayProgress(k);
    let cls = 'habit-cal-cell'+(inMonth ? '' : ' out')+(p.total > 0 ? (p.done === p.total ? ' full' : (p.done > 0 ? ' part' : ' empty')) : '')+(k === todayKey() ? ' today' : '');
    let badge = '';
    if(p.total > 0){
      const acts = activeHabits().filter(h => isScheduled(h, k));
      const info = acts.map(h => h.goal.period === 'day' ? (dayCount(h.id, k)+'/'+h.goal.count) : (dayCount(h.id, k) >= 1 ? '✓' : '')).filter(Boolean).join(' ');
      badge = info ? '<span class="hcc-badge">'+info+'</span>' : '';
    }
    html += '<button class="'+cls+'" type="button" onclick="window.habitSelectDay(\''+k+'\')"><span class="hcc-num">'+d.getDate()+'</span>'+badge+'</button>';
    d = addDays(d, 1); g++;
  }
  html += '</div>';
  if(habitEditorDate){
    const ek = habitEditorDate;
    const ed = parseKey(ek);
    const acts = activeHabits().filter(h => isScheduled(h, ek));
    html += '<div class="habit-day-editor"><div class="hde-head">📅 '+ ed.getDate() +' '+ MONTHS_GEN[ed.getMonth()] +' — отметь привычки</div><div class="hde-body">';
    if(acts.length === 0) html += '<div class="hde-none">На эту дату нет запланированных привычек.</div>';
    acts.forEach(h => {
      const cnt = dayCount(h.id, ek);
      if(h.goal.period === 'day'){
        const complete = cnt >= h.goal.count;
        html += '<div class="hde-item'+(complete?' complete':'')+'"><span class="hde-name">'+esc(h.name)+'</span>' +
          '<span class="hde-step"><button class="ht-step" type="button" onclick="window.habitDec(\''+h.id+'\',\''+ek+'\')"'+(cnt<=0?' disabled':'')+'>−</button>' +
          '<span class="ht-count">'+cnt+'/'+h.goal.count+'</span>' +
          '<button class="ht-step" type="button" onclick="window.habitInc(\''+h.id+'\',\''+ek+'\')"'+(cnt>=h.goal.count?' disabled':'')+'>+</button></span></div>';
      } else {
        const done = cnt >= 1;
        html += '<button class="hde-check'+(done?' on':'')+'" type="button" onclick="window.toggleHabit(\''+h.id+'\',\''+ek+'\')">'+esc(h.name)+(done?' ✓':'')+'</button>';
      }
    });
    html += '</div><button class="btn ghost sm" type="button" onclick="window.habitCloseDayEditor()">Закрыть</button></div>';
  }
  return html;
}

function renderHabitManage(){
  if(state.habits.length === 0) return '';
  let html = '<div class="habit-manage"><div class="hm-title">Все привычки ('+state.habits.length+')</div>';
  state.habits.forEach(h => {
    const streak = computeHabitStreak(h, todayKey());
    html += '<div class="hm-row'+(h.active?'':' inactive')+'">';
    html += '<div class="hm-info"><span class="hm-name">'+esc(h.name)+'</span><span class="hm-meta">'+scheduleText(h)+' · '+goalText(h.goal)+' · серия '+streak+'</span></div>';
    html += '<div class="hm-acts">';
    html += '<button class="icon-btn sm" type="button" title="Изменить" onclick="window.habitOpenEdit(\''+h.id+'\')">✎</button>';
    html += '<button class="icon-btn sm" type="button" title="'+(h.active?'Скрыть':'Показать')+'" onclick="window.habitToggleActive(\''+h.id+'\')">'+(h.active?'👁':'🚫')+'</button>';
    html += '<button class="icon-btn sm danger" type="button" title="Удалить" onclick="window.habitDelete(\''+h.id+'\')">🗑</button>';
    html += '</div></div>';
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
  html += '<div class="habit-head"><div class="habit-head-title">🎯 Привычки</div><div class="habit-head-actions">';
  html += '<div class="habit-mode-switch">';
  html += '<button class="hmode-btn'+(habitViewMode==='week'?' active':'')+'" type="button" onclick="window.habitSwitchMode(\'week\')">Неделя</button>';
  html += '<button class="hmode-btn'+(habitViewMode==='calendar'?' active':'')+'" type="button" onclick="window.habitSwitchMode(\'calendar\')">Календарь</button>';
  html += '</div>';
  html += '<button class="btn primary sm" type="button" onclick="window.habitOpenAdd()">➕ Добавить</button>';
  html += '</div></div>';

  let sum = '';
  let range;
  if(habitViewMode === 'week'){ const ws = startOfWeek(parseKey(habitViewDate)); range = { start: keyOf(ws), end: keyOf(addDays(ws,6)) }; }
  else { const ms = startOfMonth(parseKey(habitViewDate)); range = { start: keyOf(ms), end: keyOf(new Date(ms.getFullYear(), ms.getMonth()+1, 0)) }; }
  const stats = getHabitStats(range.start, range.end);
  sum += statPill('Активных', acts.length + (state.habits.length - acts.length ? ' (+'+(state.habits.length - acts.length)+')' : ''));
  sum += statPill('Сегодня', acts.length ? (todayP.done + '/' + acts.length) : '—');
  sum += statPill('Серия', stats.currentStreak + ' дн');
  sum += statPill('Рекорд', stats.longestStreak + ' дн');
  html += '<div class="habit-summary">'+sum+'</div>';

  if(acts.length === 0) html += '<div class="habit-empty">Привычек пока нет. Нажми «➕ Добавить» и настрой регулярность — например, «Пить воду» 3 раза в день или «Читать» через день.</div>';
  else html += (habitViewMode === 'week') ? renderWeekView() : renderCalendarView();
  html += renderHabitManage();
  root.innerHTML = html;
}

/* ============ MODAL ============ */
function ensureModal(){
  let overlay = document.getElementById('habit-modal');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'habit-modal';
    overlay.onclick = function(e){ if(e.target === overlay) window.habitModalClose(); };
    document.body.appendChild(overlay);
  }
  return overlay;
}
function openHabitModal(id){
  const h = id ? state.habits.find(x => x.id === id) : null;
  modalForm = {
    id: id || null,
    name: h ? h.name : '',
    goal: h ? { period: h.goal.period, count: h.goal.count } : { period: 'day', count: 1 },
    schedule: normalizeSchedule(h ? h.schedule : { freq: 'day', interval: 1, byDay: [], byMonthDay: 1, startDate: todayKey() })
  };
  const overlay = ensureModal();
  overlay.innerHTML =
    '<div class="modal"><div class="todo-app">' +
      '<div class="modal-header"><h3 class="modal-title">'+(h?'✏️ Изменить привычку':'➕ Новая привычка')+'</h3>' +
      '<button class="modal-close" type="button" onclick="window.habitModalClose()">✕</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-field"><label>Название</label><input id="htName" class="inp" type="text" value="'+esc(modalForm.name)+'" placeholder="Напр. Пить 2 л воды" oninput="window.habitModalName(this.value)"></div>' +
        '<div class="form-section-title">🔁 Регулярность</div>' +
        '<div id="htFreq" class="chip-row"></div>' +
        '<div class="ht-interval-row"><span id="htIntLabel">Каждые</span> <input id="htInterval" class="inp" type="number" min="1" max="365" value="'+modalForm.schedule.interval+'" oninput="window.habitModalInterval(this.value)" style="width:64px"> <span id="htIntUnit"></span></div>' +
        '<div id="htWeekWrap" class="ht-week-wrap"></div>' +
        '<div id="htMonthWrap" class="ht-month-wrap"></div>' +
        '<div class="form-section-title">🎯 Цель</div>' +
        '<div class="ht-goal-row">' +
          '<select id="htPeriod" class="inp" onchange="window.habitModalPeriod(this.value)">' +
            '<option value="day"'+(modalForm.goal.period==='day'?' selected':'')+'>в день</option>' +
            '<option value="week"'+(modalForm.goal.period==='week'?' selected':'')+'>в неделю</option>' +
            '<option value="month"'+(modalForm.goal.period==='month'?' selected':'')+'>в месяц</option>' +
          '</select>' +
          '<input id="htCount" class="inp" type="number" min="1" max="99" value="'+modalForm.goal.count+'" oninput="window.habitModalCount(this.value)" style="width:64px">' +
          '<span id="htCountUnit"></span>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer"><button class="btn" type="button" onclick="window.habitModalClose()">Отмена</button>' +
      '<button class="btn primary" type="button" onclick="window.habitModalSave()">'+(h?'Сохранить':'Создать')+'</button></div>' +
    '</div></div>';
  overlay.classList.add('visible');
  renderHabitModalDynamic();
  setTimeout(function(){ const inp = document.getElementById('htName'); if(inp) inp.focus(); }, 30);
}
function renderHabitModalDynamic(){
  const f = modalForm; if(!f) return;
  const freqs = [{v:'day',l:'Каждые N дней'},{v:'week',l:'Каждые N недель'},{v:'month',l:'Каждый N-й месяц'}];
  const freqEl = document.getElementById('htFreq');
  if(freqEl) freqEl.innerHTML = freqs.map(x => '<button type="button" class="chip tog'+(f.schedule.freq===x.v?' active':'')+'" onclick="window.habitModalFreq(\''+x.v+'\')">'+x.l+'</button>').join('');
  const intLabel = document.getElementById('htIntLabel');
  const intUnit = document.getElementById('htIntUnit');
  if(intLabel) intLabel.textContent = f.schedule.freq === 'day' ? 'Каждые' : f.schedule.freq === 'week' ? 'Каждые' : 'Каждый';
  if(intUnit) intUnit.textContent = f.schedule.freq === 'day' ? plural(f.schedule.interval,'день','дня','дней') : f.schedule.freq === 'week' ? plural(f.schedule.interval,'неделя','недели','недель') : plural(f.schedule.interval,'месяц','месяца','месяцев');
  const weekWrap = document.getElementById('htWeekWrap');
  if(weekWrap){
    weekWrap.style.display = f.schedule.freq === 'week' ? 'block' : 'none';
    weekWrap.innerHTML = '<div class="chip-row">' + WD_NAMES.map((name,i) => { const n = i+1; return '<button type="button" class="chip wd-chip'+(f.schedule.byDay.includes(n)?' active':'')+'" onclick="window.habitModalToggleDay('+n+')">'+name+'</button>'; }).join('') + '</div>';
  }
  const monthWrap = document.getElementById('htMonthWrap');
  if(monthWrap){
    monthWrap.style.display = f.schedule.freq === 'month' ? 'block' : 'none';
    const isLast = f.schedule.byMonthDay === -1;
    monthWrap.innerHTML = '<label class="ht-md"><input type="number" id="htMonthDay" class="inp" min="1" max="31" value="'+(isLast?'':f.schedule.byMonthDay)+'"'+(isLast?' disabled':'')+' oninput="window.habitModalMonthDay(this.value)"> -го числа</label>' +
      '<label class="ht-md-last"><input type="checkbox" '+(isLast?'checked':'')+' onchange="window.habitModalLastDay(this.checked)"> последний день месяца</label>';
  }
  const countUnit = document.getElementById('htCountUnit');
  if(countUnit) countUnit.textContent = f.goal.period === 'day' ? 'раз в день' : f.goal.period === 'week' ? 'раз в неделю' : 'раз в месяц';
}
function habitModalValidate(){
  const f = modalForm; if(!f) return false;
  if(!f.name.trim()){ if(typeof window.customAlert==='function') window.customAlert('Введите название привычки'); return false; }
  if(f.schedule.freq === 'week' && (!f.schedule.byDay || f.schedule.byDay.length === 0)){ if(typeof window.customAlert==='function') window.customAlert('Выберите хотя бы один день недели'); return false; }
  if(f.schedule.freq === 'month' && f.schedule.byMonthDay !== -1 && !(f.schedule.byMonthDay >= 1 && f.schedule.byMonthDay <= 31)){ if(typeof window.customAlert==='function') window.customAlert('Укажите число от 1 до 31'); return false; }
  return true;
}

/* ============ PUBLIC HANDLERS ============ */
window.habitSwitchMode = function(m){ habitViewMode = m; renderHabitsView(); };
window.habitShiftWeek = function(d){ habitViewDate = keyOf(addDays(parseKey(habitViewDate), d * 7)); renderHabitsView(); };
window.habitShiftMonth = function(d){ const dt = parseKey(habitViewDate); habitViewDate = keyOf(new Date(dt.getFullYear(), dt.getMonth() + d, 1)); renderHabitsView(); };
window.habitSelectDay = function(k){ habitEditorDate = (habitEditorDate === k) ? null : k; renderHabitsView(); };
window.habitCloseDayEditor = function(){ habitEditorDate = null; renderHabitsView(); };
window.habitToggleActive = function(id){ const h = state.habits.find(x => x.id === id); if(h){ h.active = !h.active; save(); refreshUI(); } };
window.habitDelete = function(id){
  const doit = function(){ deleteHabit(id); };
  if(typeof window.customConfirm === 'function') window.customConfirm('Удалить привычку и все её отметки?', doit);
  else if(confirm('Удалить привычку и все её отметки?')) doit();
};
window.habitOpenAdd = function(){ habitEditingId = null; openHabitModal(null); };
window.habitOpenEdit = function(id){ habitEditingId = id; openHabitModal(id); };
window.habitPeriodChange = function(){};
window.habitModalClose = function(){ modalForm = null; const o = document.getElementById('habit-modal'); if(o) o.classList.remove('visible'); };
window.habitModalName = function(v){ if(modalForm) modalForm.name = v; };
window.habitModalInterval = function(v){ if(!modalForm) return; modalForm.schedule.interval = Math.max(1, parseInt(v,10) || 1); const l=document.getElementById('htIntLabel'), u=document.getElementById('htIntUnit'); if(l) l.textContent = modalForm.schedule.freq==='day'?'Каждые':modalForm.schedule.freq==='week'?'Каждые':'Каждый'; if(u) u.textContent = modalForm.schedule.freq==='day'?plural(modalForm.schedule.interval,'день','дня','дней'):modalForm.schedule.freq==='week'?plural(modalForm.schedule.interval,'неделя','недели','недель'):plural(modalForm.schedule.interval,'месяц','месяца','месяцев'); };
window.habitModalCount = function(v){ if(!modalForm) return; modalForm.goal.count = Math.max(1, parseInt(v,10) || 1); };
window.habitModalMonthDay = function(v){ if(!modalForm) return; const n = parseInt(v,10); modalForm.schedule.byMonthDay = (n >= 1 && n <= 31) ? n : 1; };
window.habitModalPeriod = function(v){ if(!modalForm) return; modalForm.goal.period = v; renderHabitModalDynamic(); };
window.habitModalFreq = function(v){ if(!modalForm) return; modalForm.schedule.freq = v; if(v === 'week' && (!modalForm.schedule.byDay || !modalForm.schedule.byDay.length)) modalForm.schedule.byDay = [1]; if(v === 'month' && typeof modalForm.schedule.byMonthDay !== 'number') modalForm.schedule.byMonthDay = 1; renderHabitModalDynamic(); };
window.habitModalToggleDay = function(n){ if(!modalForm) return; const a = modalForm.schedule.byDay; const i = a.indexOf(n); if(i >= 0) a.splice(i,1); else a.push(n); renderHabitModalDynamic(); };
window.habitModalLastDay = function(on){ if(!modalForm) return; modalForm.schedule.byMonthDay = on ? -1 : (parseInt(document.getElementById('htMonthDay').value,10) || 1); renderHabitModalDynamic(); };
window.habitModalSave = function(){
  if(!habitModalValidate()) return;
  const f = modalForm;
  const data = { name: f.name.trim(), goal: { period: f.goal.period, count: f.goal.count }, schedule: normalizeSchedule(f.schedule) };
  if(f.id) updateHabit(f.id, data); else addHabit(data);
  window.habitModalClose();
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
window.habitInc = habitInc;
window.habitDec = habitDec;
window.addHabit = addHabit;
window.updateHabit = updateHabit;
window.deleteHabit = deleteHabit;
window.getHabitStats = getHabitStats;
window.computeHabitStreak = computeHabitStreak;
window.renderHabitsView = renderHabitsView;
window.habitGoalLabel = goalText;
window.habitScheduleLabel = scheduleText;

window.loadHabitsFromFirebase = function(data){
  if(!data) return;
  if(Array.isArray(data.habits)) state.habits = data.habits.map(normalizeHabit);
  if(data.completions && typeof data.completions === 'object'){
    state.completions = {};
    Object.keys(data.completions).forEach(k => {
      const day = data.completions[k]; if(!day || typeof day !== 'object') return;
      state.completions[k] = {};
      Object.keys(day).forEach(id => { let v = day[id]; if(v === true || v === 1 || v === '1') v = 1; else v = Number(v) || 0; if(v > 0) state.completions[k][id] = v; });
    });
  }
  save(); refreshUI();
};

})();
