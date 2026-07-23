// ============================================
// ТРЕНИРОВКИ
// ============================================

function saveWorkout() {
    const date = document.getElementById('f-train-date').value;
    if(!date) { alert('Укажите дату'); return; }
    const log = document.getElementById('f-train-log').value.trim();
    const parsedExercises = log ? extractExercises(log) : [];
    const workout = {
        id: editingWorkoutId || ('w-' + Date.now()), date,
        type: document.getElementById('f-train-type').value,
        duration: parseInt(document.getElementById('f-train-duration').value) || 0,
        time: document.getElementById('f-train-time').value, log, parsedExercises,
        note: document.getElementById('f-train-note').value.trim(),
        rating: formStarsData['f-train-rating'] || 0,
        feelBefore: formStarsData['f-train-feel-before'] || 0,
        feelAfter: formStarsData['f-train-feel-after'] || 0
    };
    if(editingWorkoutId) {
        removeProgressByWorkout(editingWorkoutId);
        const idx = workouts.findIndex(w => w.id === editingWorkoutId);
        if(idx >= 0) workouts[idx] = workout;
    } else { workouts.push(workout); }
    if(parsedExercises.length > 0) saveExerciseProgress(workout);
    saveTrainings();
    closeAllModals();
    renderTrainAll();
}

function deleteWorkout(id) {
    if(!confirm('Удалить эту тренировку?')) return;
    removeProgressByWorkout(id);
    workouts = workouts.filter(w => w.id !== id);
    saveTrainings();
    renderTrainAll();
}

function toggleWorkout(id) {
    const card = document.querySelector(`.workout-card[data-id="${id}"]`);
    if(card) card.classList.toggle('collapsed');
}

function extractExercises(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const exercises = [];
    let current = null;
    for(let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if(line.match(/^(СУПЕРСЕТ|КРУГОВАЯ|🏋️|GymKeeper)/i)) continue;
        const isExercise = line.match(/^\d+\)\s+.+/) || (line.includes('·') && !line.match(/\d+(кг|lb)\*/i));
        if(isExercise) {
            if(current) exercises.push(current);
            current = { name: line.replace(/^\d+\)\s*/, '').trim(), sets: [] };
        } else if(current && line.match(/\d+(кг|lb)\*/i)) {
            const match = line.match(/(\d+)(кг|lb)\*(\d+)/i);
            if(match) {
                const weight = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                const reps = parseInt(match[3]);
                current.sets.push({ weight: unit === 'lb' ? Math.round(weight * 0.4536) : weight, reps });
            }
        }
    }
    if(current) exercises.push(current);
    return exercises.filter(e => e.sets.length > 0);
}

function saveExerciseProgress(workout) {
    const allProgress = JSON.parse(localStorage.getItem('exercise-progress') || '{}');
    Object.keys(allProgress).forEach(exName => {
        allProgress[exName] = allProgress[exName].filter(e => e.workoutId !== workout.id);
        if(allProgress[exName].length === 0) delete allProgress[exName];
    });
    workout.parsedExercises.forEach(ex => {
        if(!allProgress[ex.name]) allProgress[ex.name] = [];
        const maxWeight = Math.max(...ex.sets.map(s => s.weight));
        const totalReps = ex.sets.reduce((sum, s) => sum + s.reps, 0);
        const volume = ex.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        allProgress[ex.name].push({ date: workout.date, workoutId: workout.id, sets: ex.sets.length, maxWeight, totalReps, volume });
    });
    localStorage.setItem('exercise-progress', JSON.stringify(allProgress));
}

function removeProgressByWorkout(workoutId) {
    const allProgress = JSON.parse(localStorage.getItem('exercise-progress') || '{}');
    let changed = false;
    Object.keys(allProgress).forEach(exName => {
        const before = allProgress[exName].length;
        allProgress[exName] = allProgress[exName].filter(e => e.workoutId !== workoutId);
        if(allProgress[exName].length !== before) changed = true;
        if(allProgress[exName].length === 0) delete allProgress[exName];
    });
    if(changed) localStorage.setItem('exercise-progress', JSON.stringify(allProgress));
}

function renderTrainAll() { renderTrainStats(); renderWorkouts(); renderTrainProgress(); }

function renderTrainStats() {
    const total = workouts.length;
    const exSet = new Set();
    let totalTime = 0;
    workouts.forEach(w => {
        totalTime += w.duration || 0;
        (w.parsedExercises || []).forEach(e => exSet.add(e.name));
    });
    document.getElementById('stat-total').textContent = `💪 ${total} ${total===1?'тренировка':'тренировок'}`;
    document.getElementById('stat-exercises').textContent = `🎯 ${exSet.size} упражнений`;
    document.getElementById('stat-time').textContent = `⏱ ${totalTime} мин`;
}

function formatDate(dateStr) {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
}

function renderWorkouts() {
    const list = document.getElementById('workouts-list');
    if(workouts.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏋️</div><div class="empty-state-title">Пока нет тренировок</div><div class="empty-state-text">Нажмите «➕ Добавить тренировку»</div><button class="btn orange primary" onclick="openTrainModal()">➕ Добавить первую тренировку</button></div>`;
        return;
    }
    const sorted = [...workouts].sort((a, b) => {
        if(a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.time || '').localeCompare(a.time || '');
    });
    list.innerHTML = sorted.map(w => {
        const parsedHtml = (w.parsedExercises && w.parsedExercises.length > 0) ? `
            <div class="section-title">🎯 Извлечённые упражнения (${w.parsedExercises.length})</div>
            <div class="parsed-list">${w.parsedExercises.map(ex => `<div class="parsed-item"><div class="parsed-name">${ex.name}</div><div class="parsed-stats">${ex.sets.length} подходов • макс. ${Math.max(...ex.sets.map(s=>s.weight))} кг • ${ex.sets.reduce((s,x)=>s+x.reps,0)} повт.</div></div>`).join('')}</div>` : '';
        const feelBeforeHtml = w.feelBefore ? `<div class="stars">${[1,2,3,4,5].map(n => `<span class="star ${n<=w.feelBefore?'active':''}">★</span>`).join('')}</div>` : '<span style="color:#9a3412;font-size:12px;">—</span>';
        const feelAfterHtml = w.feelAfter ? `<div class="stars">${[1,2,3,4,5].map(n => `<span class="star ${n<=w.feelAfter?'active':''}">★</span>`).join('')}</div>` : '<span style="color:#9a3412;font-size:12px;">—</span>';
        const ratingHtml = w.rating ? `<div class="stars">${[1,2,3,4,5].map(n => `<span class="star ${n<=w.rating?'active':''}">★</span>`).join('')}</div>` : '';
        return `
            <div class="workout-card" data-id="${w.id}">
                <div class="workout-header" onclick="toggleWorkout('${w.id}')">
                    <div class="workout-header-left">
                        <div class="workout-date">${formatDate(w.date)}</div>
                        ${w.type ? `<div class="workout-type-badge">${typeLabels[w.type] || w.type}</div>` : ''}
                        ${ratingHtml}
                    </div>
                    <div class="workout-toggle-icon">▼</div>
                </div>
                <div class="workout-body">
                    <div class="workout-info-grid">
                        ${w.duration ? `<div class="info-item"><div class="info-label">⏱ Длительность</div><div class="info-value">${w.duration} мин</div></div>` : ''}
                        ${w.time ? `<div class="info-item"><div class="info-label">🕐 Время</div><div class="info-value">${w.time}</div></div>` : ''}
                        <div class="info-item"><div class="info-label">😊 До</div><div class="info-value">${feelBeforeHtml}</div></div>
                        <div class="info-item"><div class="info-label">🔥 После</div><div class="info-value">${feelAfterHtml}</div></div>
                    </div>
                    ${w.log ? `<div class="section-title">📋 Лог тренировки</div><div class="log-box">${escapeHtml(w.log)}</div>` : ''}
                    ${parsedHtml}
                    ${w.note ? `<div class="section-title">💬 Заметки</div><div class="note-box">${escapeHtml(w.note)}</div>` : ''}
                    <div class="workout-actions">
                        <button class="action-btn edit" onclick="event.stopPropagation();openTrainModal('${w.id}')">✏️ Редактировать</button>
                        <button class="action-btn delete" onclick="event.stopPropagation();deleteWorkout('${w.id}')">🗑 Удалить</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function renderTrainProgress() {
    const allProgress = JSON.parse(localStorage.getItem('exercise-progress') || '{}');
    const section = document.getElementById('progress-section');
    const select = document.getElementById('progress-exercise-select');
    const exerciseNames = Object.keys(allProgress).filter(n => allProgress[n].length > 0).sort();
    if(exerciseNames.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    const currentValue = select.value;
    select.innerHTML = '<option value="">— выберите упражнение —</option>' + exerciseNames.map(name => `<option value="${name.replace(/"/g,'"')}">${name} (${allProgress[name].length})</option>`).join('');
    if(currentValue && exerciseNames.includes(currentValue)) select.value = currentValue;
    renderTrainChart();
}

function setTrainMetric(metric) {
    currentTrainMetric = metric;
    document.querySelectorAll('#main-tab-train .metric-btn').forEach(b => { b.classList.toggle('active', b.dataset.metric === metric); });
    renderTrainChart();
}

function renderTrainChart() {
    const select = document.getElementById('progress-exercise-select');
    const name = select.value;
    const chartC = document.getElementById('progress-chart-container');
    const statsC = document.getElementById('progress-stats-container');
    const histC = document.getElementById('progress-history-container');
    if(!name) { chartC.innerHTML = '<div class="chart-empty">Выберите упражнение</div>'; statsC.innerHTML = ''; histC.innerHTML = ''; return; }
    const allProgress = JSON.parse(localStorage.getItem('exercise-progress') || '{}');
    const history = allProgress[name];
    if(!history || history.length === 0) { chartC.innerHTML = '<div class="chart-empty">Нет данных</div>'; return; }
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const values = sorted.map(e => currentTrainMetric === 'weight' ? e.maxWeight : e.volume);
    const unit = currentTrainMetric === 'weight' ? 'кг' : 'кг·повт';
    const metricLabel = currentTrainMetric === 'weight' ? 'Макс. вес' : 'Объём';
    chartC.innerHTML = renderTrainSVGChart(sorted, values, unit, metricLabel);
    statsC.innerHTML = renderTrainStatsBlock(sorted, values, unit);
    histC.innerHTML = renderTrainHistoryBlock(sorted, values, unit);
}

function renderTrainSVGChart(entries, values, unit, metricLabel) {
    const width = 800, height = 280;
    const padding = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const minVal = Math.min(...values), maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;
    const yMin = Math.max(0, minVal - valRange * 0.1), yMax = maxVal + valRange * 0.15;
    const xStep = entries.length > 1 ? chartW / (entries.length - 1) : chartW / 2;
    const points = entries.map((e, i) => {
        const x = padding.left + (entries.length > 1 ? i * xStep : chartW / 2);
        const y = padding.top + chartH - ((values[i] - yMin) / (yMax - yMin)) * chartH;
        return { x, y, value: values[i], date: e.date };
    });
    const linePath = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${points[points.length-1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
    const gridLines = [];
    for(let i = 0; i <= 5; i++) {
        const val = yMin + (yMax - yMin) * (i / 5);
        const y = padding.top + chartH - (i / 5) * chartH;
        gridLines.push(`<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#fdba74" stroke-width="1" stroke-dasharray="2,4"/>`);
        gridLines.push(`<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#9a3412" font-weight="600">${Math.round(val)}</text>`);
    }
    const pointsHtml = points.map((p, i) => {
        const isFirst = i === 0, isLast = i === entries.length - 1;
        const color = isLast ? '#ea580c' : (isFirst ? '#2563eb' : '#f97316');
        const shortDate = p.date.slice(5).split('-').reverse().join('.');
        return `<circle cx="${p.x}" cy="${p.y}" r="${isFirst||isLast?6:4}" fill="${color}" stroke="white" stroke-width="2"/>
                <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#7c2d12">${p.value}</text>
                <text x="${p.x}" y="${padding.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#9a3412" font-weight="600">${shortDate}</text>`;
    }).join('');
    return `<div class="progress-chart"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="areaGrad-train" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ea580c" stop-opacity="0.3"/><stop offset="100%" stop-color="#ea580c" stop-opacity="0"/></linearGradient></defs>
        ${gridLines.join('')}
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#9a3412" stroke-width="1.5"/>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#9a3412" stroke-width="1.5"/>
        <path d="${areaPath}" fill="url(#areaGrad-train)"/>
        <path d="${linePath}" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${pointsHtml}
        <text x="${width/2}" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="#7c2d12">${metricLabel} (${unit})</text>
    </svg></div>`;
}

function renderTrainStatsBlock(entries, values, unit) {
    const first = values[0], last = values[values.length - 1];
    const diff = last - first;
    const percent = first > 0 ? (diff / first) * 100 : 0;
    const max = Math.max(...values), min = Math.min(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const daysDiff = Math.round((new Date(entries[entries.length - 1].date) - new Date(entries[0].date)) / (1000 * 60 * 60 * 24));
    let periodText = daysDiff === 0 ? 'в один день' : (daysDiff === 1 ? 'за 1 день' : (daysDiff < 30 ? `за ${daysDiff} дней` : `за ${Math.round(daysDiff / 30)} месяцев`));
    const trendIcon = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➡️');
    const trendColor = diff > 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#6b7280');
    return `<div class="progress-stats">
        <div class="stat-card"><div class="stat-label">Старт</div><div class="stat-value">${first} ${unit}</div><div class="stat-sub">${entries[0].date}</div></div>
        <div class="stat-card"><div class="stat-label">Сейчас</div><div class="stat-value">${last} ${unit}</div><div class="stat-sub">${entries[entries.length-1].date}</div></div>
        <div class="stat-card" style="border-left-color:${trendColor};"><div class="stat-label">Прогресс ${trendIcon}</div><div class="stat-value" style="color:${trendColor};">${diff > 0 ? '+' : ''}${Math.round(diff)} ${unit}</div><div class="stat-sub">${percent > 0 ? '+' : ''}${percent.toFixed(1)}% ${periodText}</div></div>
        <div class="stat-card"><div class="stat-label">Рекорд</div><div class="stat-value">${max} ${unit}</div><div class="stat-sub">мин: ${min} • сред: ${Math.round(avg)}</div></div>
    </div>`;
}

function renderTrainHistoryBlock(entries, values, unit) {
    const rows = [...entries].reverse().map((entry, idx) => {
        const realIdx = entries.length - 1 - idx;
        const prev = realIdx > 0 ? values[realIdx - 1] : null;
        const curr = values[realIdx];
        let trendHtml = '';
        if(prev === null) trendHtml = '<span class="history-trend first">старт</span>';
        else {
            const diff = curr - prev;
            if(diff > 0) trendHtml = `<span class="history-trend up">↑ +${diff}</span>`;
            else if(diff < 0) trendHtml = `<span class="history-trend down">↓ ${diff}</span>`;
            else trendHtml = `<span class="history-trend same">=</span>`;
        }
        return `<div class="history-entry"><span class="history-date">${entry.date}</span><span class="history-data">${entry.sets} подх. • ${entry.maxWeight} кг макс. • ${entry.totalReps} повт.</span>${trendHtml}</div>`;
    }).join('');
    return `<div class="progress-history"><div class="history-title">📜 Вся история (${entries.length} записей)</div><div class="history-list">${rows}</div></div>`;
}

