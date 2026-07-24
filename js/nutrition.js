// ============================================
// ПИТАНИЕ: ЛОГИКА
// ============================================

function downloadMenuTemplate() {
    const template = {
        "menu": [
            {
                "day": "Понедельник",
                "date": "24.07",
                "training": false,
                "meals": [
                    {
                        "type": "breakfast",
                        "name": "Завтрак",
                        "items": [
                            "Овсяная каша на воде",
                            "Яблоко",
                            "Кофе без сахара"
                        ]
                    },
                    {
                        "type": "snack",
                        "name": "Перекус",
                        "items": [
                            "Греческий йогурт",
                            "Горсть миндаля"
                        ]
                    },
                    {
                        "type": "lunch",
                        "name": "Обед",
                        "items": [
                            "Куриная грудка на пару",
                            "Рис бурый",
                            "Салат из свежих овощей"
                        ]
                    },
                    {
                        "type": "snack",
                        "name": "Перекус",
                        "items": [
                            "Творог 5%",
                            "Банан"
                        ]
                    },
                    {
                        "type": "dinner",
                        "name": "Ужин",
                        "items": [
                            "Запеченная рыба",
                            "Брокколи на пару",
                            "Картофель отварной"
                        ]
                    }
                ]
            },
            {
                "day": "Вторник",
                "date": "25.07",
                "training": true,
                "meals": [
                    {
                        "type": "breakfast",
                        "name": "Завтрак",
                        "items": [
                            "Яичница из 2 яиц",
                            "Цельнозерновой хлеб",
                            "Овощи"
                        ]
                    },
                    {
                        "type": "preworkout",
                        "name": "Перед тренировкой",
                        "items": [
                            "Банан",
                            "Кофе с корицей"
                        ]
                    },
                    {
                        "type": "lunch",
                        "name": "Обед",
                        "items": [
                            "Тунец",
                            "Паста цельнозерновая",
                            "Салат"
                        ]
                    },
                    {
                        "type": "snack",
                        "name": "Перекус",
                        "items": [
                            "Протеиновый коктейль",
                            "Яблоко"
                        ]
                    },
                    {
                        "type": "dinner",
                        "name": "Ужин",
                        "items": [
                            "Индейка",
                            "Киноа",
                            "Овощи гриль"
                        ]
                    }
                ]
            }
        ]
    };
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-template.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Шаблон меню скачан!');
}

function importMenu() {
    const startDate = document.getElementById('f-start-date').value;
    const endDate = document.getElementById('f-end-date').value;
    const menuJson = document.getElementById('f-menu-json').value.trim();
    if(!startDate || !endDate) { alert('Укажите даты'); return; }
    let menu;
    try {
        menu = JSON.parse(menuJson);
        if(!Array.isArray(menu)) throw new Error('Меню должно быть массивом');
    } catch(e) { alert('❌ Ошибка в JSON: ' + e.message); return; }
    
    const weekId = 'week-' + Date.now();
    nutritionData.weeks.push({
        id: weekId, startDate, endDate,
        title: `Неделя ${formatDateShort(startDate)} – ${formatDateShort(endDate)}`,
        menu, data: {}
    });
    nutritionData.currentWeekId = weekId;
    saveNutrition();
    closeAllModals();
    renderNutritionAll();
    alert('✅ Меню импортировано!');
}

function createEmptyWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const weekId = 'week-' + Date.now();
    const days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    const menu = days.map((day, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return { day, date: formatDateShort(date.toISOString().slice(0,10)), training: false, meals: [] };
    });
    nutritionData.weeks.push({
        id: weekId, startDate: startOfWeek.toISOString().slice(0,10), endDate: endOfWeek.toISOString().slice(0,10),
        title: `Неделя ${formatDateShort(startOfWeek.toISOString().slice(0,10))} – ${formatDateShort(endOfWeek.toISOString().slice(0,10))}`,
        menu, data: {}
    });
    nutritionData.currentWeekId = weekId;
    saveNutrition();
    renderNutritionAll();
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
}

function switchWeek() {
    nutritionData.currentWeekId = document.getElementById('week-select').value;
    saveNutrition();
    renderDays();
}

function deleteWeek() {
    if(!nutritionData.currentWeekId || !confirm('Удалить эту неделю?')) return;
    nutritionData.weeks = nutritionData.weeks.filter(w => w.id !== nutritionData.currentWeekId);
    nutritionData.currentWeekId = nutritionData.weeks.length > 0 ? nutritionData.weeks[0].id : null;
    saveNutrition();
    renderNutritionAll();
}

function renderNutritionAll() {
    renderWeekSelector();
    renderDays();
}

function renderWeekSelector() {
    const select = document.getElementById('week-select');
    if(nutritionData.weeks.length === 0) {
        select.innerHTML = '<option value="">— нет недель —</option>';
        return;
    }
    select.innerHTML = nutritionData.weeks.map(w => `<option value="${w.id}">${w.title}</option>`).join('');
    if(nutritionData.currentWeekId) select.value = nutritionData.currentWeekId;
}

function renderDays() {
    const container = document.getElementById('days-container');
    if(nutritionData.weeks.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📘</div><div class="empty-state-title">Нет недель</div><div class="empty-state-text">Импортируйте меню или создайте пустую неделю</div></div>`;
        return;
    }
    if(!nutritionData.currentWeekId || !nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId)) {
        nutritionData.currentWeekId = nutritionData.weeks[0].id;
    }
    const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
    if(!week) return;
    
    const navHtml = `
        <div class="days-nav">
            <span class="days-nav-label">📅 Перейти:</span>
            ${week.menu.map((day, di) => {
                const dayShort = { 'Понедельник': 'Пн', 'Вторник': 'Вт', 'Среда': 'Ср', 'Четверг': 'Чт', 'Пятница': 'Пт', 'Суббота': 'Сб', 'Воскресенье': 'Вс' };
                const shortName = dayShort[day.day] || day.day.slice(0, 2);
                return `<button class="day-nav-btn ${day.training?'training':''}" onclick="scrollToDay(${di})">${shortName} ${day.date}</button>`;
            }).join('')}
            <div class="nav-actions">
                <button class="nav-action-btn" onclick="toggleAllDays()">🔽 Все</button>
                <button class="nav-action-btn" onclick="exportMenuAsText()">📥 .txt</button>
                <button class="nav-action-btn" onclick="printMenu()">🖨 PDF</button>
            </div>
        </div>
    `;
    
    const daysHtml = week.menu.map((day, di) => {
        const mealsHtml = day.meals.map((m, mi) => renderMeal(m, di, mi, week.id)).join('');
        return `
            <div class="day-card" id="day-${di}">
                <div class="day-header ${day.training?'training':''}">
                    <div class="day-title">${day.day} <span style="opacity:0.7;font-weight:400;font-size:16px;">• ${day.date}</span></div>
                    <div class="day-header-actions">
                        ${day.training?'<div class="day-tag training">💪 ТРЕНИРОВКА</div>':''}
                        <button class="day-toggle-btn" onclick="toggleDay(${di})" title="Свернуть/развернуть">▼</button>
                    </div>
                </div>
                <div class="day-body">
                    <div class="morning-block">
                        <div class="morning-title">🌅 Утренние показатели</div>
                        <div class="morning-field">
                            <label>⚖️ Вес утром, кг:</label>
                            <input type="number" step="0.1" data-week="${week.id}" data-key="weight-${di}" data-day="${di}" data-field="weight" oninput="saveNutrition()" placeholder="65.4" value="${getWeekData(week.id, `weight-${di}`) !== '' ? getWeekData(week.id, `weight-${di}`) : ''}">
                        </div>
                    </div>
                    ${mealsHtml}
                    <div class="day-summary">
                        <div class="summary-title">📊 Итоги дня</div>
                        <div class="summary-row"><div class="summary-totals">
                            <div class="total-pill cal">🔥 <span id="sum-cal-${week.id}-${di}">0</span> ккал</div>
                            <div class="total-pill prot">Б: <span id="sum-prot-${week.id}-${di}">0</span> г</div>
                            <div class="total-pill fat">Ж: <span id="sum-fat-${week.id}-${di}">0</span> г</div>
                            <div class="total-pill carb">У: <span id="sum-carb-${week.id}-${di}">0</span> г</div>
                        </div></div>
                        <div class="summary-grid">
                            <div class="summary-field">
                                <label>😊 Самочувствие</label>
                                <select class="mood-select" data-week="${week.id}" data-key="mood-${di}" onchange="saveNutrition()">
                                    <option value="">— выбрать —</option>
                                    <option value="5" ${getWeekData(week.id, `mood-${di}`)==='5'?'selected':''}>⭐ Отлично</option>
                                    <option value="4" ${getWeekData(week.id, `mood-${di}`)==='4'?'selected':''}>🙂 Хорошо</option>
                                    <option value="3" ${getWeekData(week.id, `mood-${di}`)==='3'?'selected':''}>😐 Нормально</option>
                                    <option value="2" ${getWeekData(week.id, `mood-${di}`)==='2'?'selected':''}>😕 Так себе</option>
                                    <option value="1" ${getWeekData(week.id, `mood-${di}`)==='1'?'selected':''}>😫 Плохо</option>
                                </select>
                            </div>
                        </div>
                        <div class="summary-field" style="margin-top:10px;">
                            <label>📝 Заметки дня</label>
                            <textarea class="notes-input" data-week="${week.id}" data-key="notes-${di}" oninput="saveNutrition()" placeholder="Как прошёл день?">${getWeekData(week.id, `notes-${di}`) || ''}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = navHtml + daysHtml;
    week.menu.forEach((_, di) => updateTotals(week.id, di));
}

function renderMeal(m, di, mi, weekId) {
    const icon = mealIcons[m.type]||"•";
    const isPrep = ['prep','preworkout','postworkout'].includes(m.type);
    const prepClass = isPrep ? 'prep-block' : '';
    const showTime = !isPrep;
    let content = '';
    const isEditable = (m.type === 'breakfast' || m.type === 'lunch' || m.type === 'dinner' || m.type === 'preworkout' || m.type === 'postworkout' || m.type === 'snack');
    
    if (isEditable) {
        let itemsList = [];
        if (m.items) itemsList = m.items;
        else if (m.choices) {
            m.choices.forEach(c => {
                c.items.forEach(item => itemsList.push(`[${c.label}] ${item}`));
            });
        }
        
        if (itemsList.length > 0) {
            content = `<div class="meal-items-list" style="margin-bottom:8px;">`;
            itemsList.forEach((item, idx) => {
                const eatenVal = getWeekData(weekId, `eaten-${di}-${mi}-${idx}`);
                const eaten = eatenVal !== '0';
                const note = getWeekData(weekId, `note-${di}-${mi}-${idx}`) || '';
                
                content += `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; padding:6px 10px; background:${eaten ? '#f0fdf4' : '#fef2f2'}; border-radius:6px; border:1px solid ${eaten ? '#bbf7d0' : '#fecaca'};">
                        <input type="checkbox" 
                               data-week="${weekId}" 
                               data-idx="${idx}"
                               ${eaten ? 'checked' : ''}
                               onchange="toggleMealItem(this, '${weekId}', ${di}, ${mi})"
                               style="width:18px; height:18px; cursor:pointer; accent-color:${eaten ? '#16a34a' : '#dc2626'}; flex-shrink:0;">
                        <span style="flex:1; font-size:13px; ${!eaten ? 'text-decoration:line-through; color:#94a3b8;' : 'color:#1e293b;'}">${item}</span>
                        ${!eaten ? `<input type="text" 
                            data-week="${weekId}" 
                            data-key="note-${di}-${mi}-${idx}"
                            value="${note.replace(/"/g, '"')}"
                            oninput="saveNutrition()"
                            placeholder="что вместо?" 
                            style="flex:1; min-width:120px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; background:white;">` : ''}
                    </div>
                `;
            });
            content += `</div>`;
        } else {
            content = `<div style="color:#94a3b8; font-size:13px; font-style:italic; padding:4px 10px;">Список продуктов не указан</div>`;
        }
    } else {
        if(m.items) content=`<ul>${m.items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
        else if(m.choices) content=m.choices.map(c=>`<div class="or-choice"><span class="or-label">${c.label}</span> ${c.items.join(', ')}</div>`).join('');
    }
    
    const timeVal = getWeekData(weekId, `time-${di}-${mi}`) || '';
    const starsVal = parseInt(getWeekData(weekId, `stars-${di}-${mi}`) || 0);
    const commentVal = getWeekData(weekId, `comment-${di}-${mi}`) || '';
    
    const trackerHtml = (isPrep && m.type === 'prep') ? '' : `
        <div class="meal-tracker">
            <div class="tracker-row">
                <div class="kbju-group cal"><label>К</label><input type="number" data-week="${weekId}" data-day="${di}" data-meal="${mi}" data-field="cal" oninput="updateTotals('${weekId}',${di})" value="${getWeekData(weekId, `m-${di}-${mi}-cal`) || ''}"><span class="unit">ккал</span></div>
                <div class="kbju-group prot"><label>Б</label><input type="number" data-week="${weekId}" data-day="${di}" data-meal="${mi}" data-field="prot" oninput="updateTotals('${weekId}',${di})" value="${getWeekData(weekId, `m-${di}-${mi}-prot`) || ''}"><span class="unit">г</span></div>
                <div class="kbju-group fat"><label>Ж</label><input type="number" data-week="${weekId}" data-day="${di}" data-meal="${mi}" data-field="fat" oninput="updateTotals('${weekId}',${di})" value="${getWeekData(weekId, `m-${di}-${mi}-fat`) || ''}"><span class="unit">г</span></div>
                <div class="kbju-group carb"><label>У</label><input type="number" data-week="${weekId}" data-day="${di}" data-meal="${mi}" data-field="carb" oninput="updateTotals('${weekId}',${di})" value="${getWeekData(weekId, `m-${di}-${mi}-carb`) || ''}"><span class="unit">г</span></div>
                <div class="stars" data-week="${weekId}" data-key="stars-${di}-${mi}">
                    ${[1,2,3,4,5].map(n=>`<span class="star ${n<=starsVal?'active':''}" data-rating="${n}" onclick="setStars(this,${n})">★</span>`).join('')}
                </div>
            </div>
            <textarea class="meal-comment" data-week="${weekId}" data-key="comment-${di}-${mi}" oninput="saveNutrition()" placeholder="💬 Комментарий...">${commentVal}</textarea>
        </div>
    `;
    
    return `
        <div class="meal ${prepClass}">
            <div class="meal-head">
                <div class="meal-icon">${icon}</div>
                <div class="meal-name">${m.name}</div>
                ${showTime?`<input type="time" class="meal-time" data-week="${weekId}" data-key="time-${di}-${mi}" oninput="saveNutrition()" value="${timeVal}">`:''}
            </div>
            <div class="meal-content">${content}${trackerHtml}</div>
        </div>`;
}

function getWeekData(weekId, key) {
    const week = nutritionData.weeks.find(w => w.id === weekId);
    if(!week || !week.data) return '';
    return week.data[key] || '';
}

function setStars(el, rating) {
    const container = el.parentElement;
    const weekId = container.dataset.week;
    const key = container.dataset.key;
    const current = parseInt(getWeekData(weekId, key) || 0);
    const newVal = current === rating ? 0 : rating;
    const week = nutritionData.weeks.find(w => w.id === weekId);
    if(week) {
        if(!week.data) week.data = {};
        week.data[key] = newVal;
    }
    container.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.rating) <= newVal);
    });
    saveNutrition();
}

function toggleMealItem(checkbox, weekId, di, mi) {
    const idx = checkbox.dataset.idx;
    const week = nutritionData.weeks.find(w => w.id === weekId);
    if (!week) return;
    if (!week.data) week.data = {};
    week.data[`eaten-${di}-${mi}-${idx}`] = checkbox.checked ? '1' : '0';
    renderDays();
    saveNutrition();
}

function updateTotals(weekId, di) {
    let s = { cal: 0, prot: 0, fat: 0, carb: 0 };
    document.querySelectorAll(`input[data-week="${weekId}"][data-day="${di}"][data-field]`).forEach(inp => {
        const f = inp.dataset.field;
        const v = parseFloat(inp.value) || 0;
        if(s[f] !== undefined) s[f] += v;
        const week = nutritionData.weeks.find(w => w.id === weekId);
        if(week && week.data) {
            week.data[`m-${inp.dataset.day}-${inp.dataset.meal}-${inp.dataset.field}`] = inp.value;
        }
    });
    ['cal','prot','fat','carb'].forEach(f => {
        const el = document.getElementById(`sum-${f}-${weekId}-${di}`);
        if(el) el.textContent = Math.round(s[f]);
    });
    saveNutrition();
}

function saveNutrition() {
    const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
    if(!week) return;
    
    if(!week.data) week.data = {};
    
    // Collect data from form elements only (skip divs, spans, etc.)
    document.querySelectorAll(`[data-week="${week.id}"]`).forEach(el => {
        const key = el.dataset.key;
        if(!key) return;
        
        // Only process INPUT, SELECT, and TEXTAREA elements (skip DIVs with data-key)
        const tagName = el.tagName;
        if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
            let value;
            if (el.type === 'checkbox') {
                value = el.checked ? '1' : '0';
            } else {
                value = el.value;
            }
            week.data[key] = value;
        }
    });
    
    document.querySelectorAll(`input[data-week="${week.id}"][data-field]`).forEach(inp => {
        const key = `m-${inp.dataset.day}-${inp.dataset.meal}-${inp.dataset.field}`;
        week.data[key] = inp.value;
    });
    
    // Use syncToCloud for consistent saving
    syncToCloud();
}

function exportMenuAsText() {
    const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
    if(!week) return;
    let text = `МЕНЮ: ${week.title}\n${'='.repeat(50)}\n\nЦель: 1250-1300 ккал | Б: 100-110г | Ж: 50-55г | У: 80-100г\n\n`;
    week.menu.forEach(day => {
        text += `${'─'.repeat(50)}\n${day.day.toUpperCase()} (${day.date})${day.training ? ' 💪 ТРЕНИРОВКА' : ''}\n${'─'.repeat(50)}\n\n`;
        day.meals.forEach(meal => {
            text += `  ${meal.name}\n`;
            if(meal.items) meal.items.forEach(item => { text += `    • ${item}\n`; });
            else if(meal.choices) meal.choices.forEach(c => { text += `    [${c.label}] ${c.items.join(', ')}\n`; });
            text += `\n`;
        });
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${week.title.replace(/[\s–]/g,'-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function printMenu() {
    const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
    if(!week) return;
    document.querySelectorAll('.day-card').forEach(c => c.classList.remove('collapsed'));
    const printArea = document.getElementById('print-area');
    let html = `<h1 style="text-align:center;color:#1e3a8a;margin-bottom:20px;">МЕНЮ: ${week.title}</h1>`;
    html += `<p style="text-align:center;color:#64748b;margin-bottom:30px;">Цель: 1250-1300 ккал | Б: 100-110г | Ж: 50-55г | У: 80-100г</p>`;
    week.menu.forEach(day => {
        html += `<div style="margin-bottom:25px;page-break-inside:avoid;">`;
        html += `<h2 style="background:#1e40af;color:white;padding:10px 15px;border-radius:8px;margin:0 0 10px;">${day.day} • ${day.date}${day.training?' 💪':''}</h2>`;
        day.meals.forEach(meal => {
            const isPrep = ['prep','preworkout','postworkout'].includes(meal.type);
            const bg = isPrep ? 'background:#fefce8;border:2px dashed #fbbf24;padding:10px;border-radius:8px;margin:10px 0;' : '';
            html += `<div style="${bg}margin-bottom:10px;"><strong style="color:#1e3a8a;">${meal.name}</strong><br>`;
            if(meal.items) {
                html += `<ul style="margin:5px 0;padding-left:20px;">`;
                meal.items.forEach(item => { html += `<li>${item}</li>`; });
                html += `</ul>`;
            } else if(meal.choices) {
                meal.choices.forEach(c => {
                    html += `<div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:5px 10px;margin:3px 0;border-radius:4px;">`;
                    html += `<strong style="background:#3b82f6;color:white;padding:2px 6px;border-radius:3px;font-size:11px;margin-right:6px;">${c.label}</strong>${c.items.join(', ')}</div>`;
                });
            }
            html += `</div>`;
        });
        html += `</div>`;
    });
    printArea.innerHTML = html;
    printArea.style.display = 'block';
    setTimeout(() => { window.print(); printArea.style.display = 'none'; }, 100);
}

