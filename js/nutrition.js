// ============================================
// ПИТАНИЕ: ЛОГИКА
// ============================================
"use strict";

window.downloadMenuTemplate = function() {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const tuesday = new Date(monday);
    tuesday.setDate(monday.getDate() + 1);
    
    const template = {
        "menu": [
            {
                "day": "Понедельник",
                "date": formatDateWithYear(getLocalDateStr(monday)),
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
                "date": formatDateWithYear(getLocalDateStr(tuesday)),
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
    customAlert('✅ Шаблон меню скачан!', 'Успех');
}

window.importMenu = function() {
    if (isReadOnlyActive()) { customAlert('❌ Импорт недоступен в режиме просмотра', 'Ошибка'); return; }
    const startDate = document.getElementById('f-start-date').value;
    const endDate = document.getElementById('f-end-date').value;
    const menuJson = document.getElementById('f-menu-json').value.trim();
    if(!startDate || !endDate) { customAlert('Укажите даты', 'Ошибка'); return; }
    let menu;
    try {
        menu = JSON.parse(menuJson);
        if(!Array.isArray(menu)) throw new Error('Меню должно быть массивом');
    } catch(e) { customAlert('❌ Ошибка в JSON: ' + e.message, 'Ошибка'); return; }
    
    const weekId = 'week-' + Date.now();
    nutritionData.weeks.push({
        id: weekId, startDate, endDate,
        title: `Неделя ${formatDateWithYear(startDate)} – ${formatDateWithYear(endDate)}`,
        menu, data: {}
    });
    nutritionData.currentWeekId = weekId;
    saveNutrition();
    closeAllModals();
    renderNutritionAll();
    customAlert('✅ Меню импортировано!', 'Успех');
}

window.createEmptyWeek = function() {
    if (isReadOnlyActive()) { customAlert('❌ Создание недели недоступно в режиме просмотра', 'Ошибка'); return; }
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
        return { day, date: formatDateWithYear(getLocalDateStr(date)), training: false, meals: [] };
    });
    nutritionData.weeks.push({
        id: weekId, startDate: getLocalDateStr(startOfWeek), endDate: getLocalDateStr(endOfWeek),
        title: `Неделя ${formatDateWithYear(getLocalDateStr(startOfWeek))} – ${formatDateWithYear(getLocalDateStr(endOfWeek))}`,
        menu, data: {}
    });
    nutritionData.currentWeekId = weekId;
    saveNutrition();
    renderNutritionAll();
}

window.migrateNutritionDates = function() {
    if (!nutritionData || !nutritionData.weeks) return;
    
    let needsUpdate = false;
    const currentYear = new Date().getFullYear();
    
    function parseDateSafe(dateStr) {
        if (!dateStr) return null;
        // Try DD.MM.YYYY or DD.MM.YY
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                const year = y < 100 ? 2000 + y : y;
                return new Date(year, m, d);
            }
        }
        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return null;
    }
    
    function formatISO(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime())) return null;
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    
    nutritionData.weeks.forEach(week => {
        // Update week title if it doesn't have year
        if (week.title && !week.title.match(/\d{4}/)) {
            const startDate = parseDateSafe(week.startDate) || parseDateSafe(week.menu?.[0]?.date) || new Date();
            const endDate = parseDateSafe(week.endDate) || parseDateSafe(week.menu?.[week.menu.length - 1]?.date) || new Date();
            const startISO = formatISO(startDate);
            const endISO = formatISO(endDate);
            if (startISO && endISO) {
                week.title = `Неделя ${formatDateWithYear(startISO)} – ${formatDateWithYear(endISO)}`;
                needsUpdate = true;
            }
        }
        
        // Update menu dates if they don't have year
        if (week.menu) {
            week.menu.forEach(day => {
                if (day.date && !day.date.match(/\.\d{4}$/)) {
                    const parsed = parseDateSafe(day.date);
                    if (parsed) {
                        day.date = `${String(parsed.getDate()).padStart(2,'0')}.${String(parsed.getMonth()+1).padStart(2,'0')}.${parsed.getFullYear()}`;
                        needsUpdate = true;
                    }
                }
            });
        }
    });
    
    if (needsUpdate) {
        saveNutrition();
    }
}

window.switchWeek = function() {
    nutritionData.currentWeekId = document.getElementById('week-select').value;
    saveNutrition();
    renderDays();
}

window.deleteWeek = function() {
    if (isReadOnlyActive()) { customAlert('❌ Удаление недоступно в режиме просмотра', 'Ошибка'); return; }
    customConfirm('Удалить эту неделю?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            if(!nutritionData.currentWeekId) return;
            nutritionData.weeks = nutritionData.weeks.filter(w => w.id !== nutritionData.currentWeekId);
            nutritionData.currentWeekId = nutritionData.weeks.length > 0 ? nutritionData.weeks[0].id : null;
            saveNutrition();
            renderNutritionAll();
        });
}

window.renderNutritionAll = function() {
    renderWeekSelector();
    renderDays();
};

window.renderWeekSelector = function() {
    const select = document.getElementById('week-select');
    if(nutritionData.weeks.length === 0) {
        select.innerHTML = '<option value="">— нет недель —</option>';
        return;
    }
    select.innerHTML = nutritionData.weeks.map(w => `<option value="${w.id}">${w.title}</option>`).join('');
    if(nutritionData.currentWeekId) select.value = nutritionData.currentWeekId;
}

window.renderDays = function() {
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
                return `<button class="day-nav-btn ${day.training?'training':''}" onclick="scrollToDay(${di})">${esc(shortName)} ${esc(day.date)}</button>`;
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
                <div class="day-title" onclick="toggleDay(${di})">
                    <span class="day-toggle">▼</span>
                    <span class="day-date">${esc(day.day)} • ${esc(day.date)}</span>
                    ${day.training?'<span class="day-tag training">💪 ТРЕНИРОВКА</span>':''}
                </div>
                <div class="day-content">
                    <div class="day-section">
                        <div class="day-section-title">🌅 Утренние показатели</div>
                        <div class="day-field">
                            <label>⚖️ Вес утром, кг:</label>
                            <input type="number" step="0.1" data-week="${week.id}" data-key="weight-${di}" data-day="${di}" data-meal="" data-field="weight" oninput="debouncedSaveNutrition()" placeholder="65.4" value="${getWeekData(week.id, `weight-${di}`) !== '' ? getWeekData(week.id, `weight-${di}`) : ''}">
                        </div>
                    </div>
                    ${mealsHtml}
                    <div class="day-section">
                        <div class="day-section-title">📊 Итоги дня</div>
                        <div class="day-totals">
                            <div class="total-pill cal">🔥 <span id="sum-cal-${week.id}-${di}">0</span> ккал</div>
                            <div class="total-pill prot">Б: <span id="sum-prot-${week.id}-${di}">0</span> г</div>
                            <div class="total-pill fat">Ж: <span id="sum-fat-${week.id}-${di}">0</span> г</div>
                            <div class="total-pill carb">У: <span id="sum-carb-${week.id}-${di}">0</span> г</div>
                        </div>
                        <div class="day-field">
                            <label>😊 Самочувствие</label>
                            <select class="mood-select" data-week="${week.id}" data-key="mood-${di}" onchange="debouncedSaveNutrition()">
                                <option value="">— выбрать —</option>
                                <option value="5" ${getWeekData(week.id, `mood-${di}`)==='5'?'selected':''}>⭐ Отлично</option>
                                <option value="4" ${getWeekData(week.id, `mood-${di}`)==='4'?'selected':''}>🙂 Хорошо</option>
                                <option value="3" ${getWeekData(week.id, `mood-${di}`)==='3'?'selected':''}>😐 Нормально</option>
                                <option value="2" ${getWeekData(week.id, `mood-${di}`)==='2'?'selected':''}>😕 Так себе</option>
                                <option value="1" ${getWeekData(week.id, `mood-${di}`)==='1'?'selected':''}>😫 Плохо</option>
                            </select>
                        </div>
                        <div class="day-field">
                            <label>📝 Заметки дня</label>
                            <textarea class="notes-input" data-week="${week.id}" data-key="notes-${di}" oninput="debouncedSaveNutrition()" placeholder="Как прошёл день?">${getWeekData(week.id, `notes-${di}`) || ''}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = navHtml + daysHtml;
    week.menu.forEach((_, di) => updateTotals(week.id, di));
}

window.renderMeal = function(m, di, mi, weekId) {
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
                c.items.forEach(item => itemsList.push(`[${esc(c.label)}] ${esc(item)}`));
            });
        }
        
        if (itemsList.length > 0) {
            content = `<div class="meal-items-list">`;
            itemsList.forEach((item, idx) => {
                const eatenVal = getWeekData(weekId, `eaten-${di}-${mi}-${idx}`);
                const eaten = eatenVal !== '0';
                const note = getWeekData(weekId, `note-${di}-${mi}-${idx}`) || '';
                
                content += `
                    <div class="meal-item-row ${eaten ? 'eaten' : 'not-eaten'}">
                        <input type="checkbox" 
                               data-week="${weekId}" 
                               data-idx="${idx}"
                               ${eaten ? 'checked' : ''}
                               onchange="toggleMealItem(this, '${weekId}', ${di}, ${mi})">
                        <span class="meal-item-text">${esc(item)}</span>
                        ${!eaten ? `<input type="text" 
                            data-week="${weekId}" 
                            data-key="note-${di}-${mi}-${idx}"
                            value="${note.replace(/"/g, '"')}"
                            oninput="debouncedSaveNutrition()"
                            placeholder="что вместо?" 
                            class="meal-item-note">` : ''}
                    </div>
                `;
            });
            content += `</div>`;
        } else {
            content = `<div class="meal-items-empty">Список продуктов не указан</div>`;
        }
    } else {
        if(m.items) content=`<ul>${m.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
        else if(m.choices) content=m.choices.map(c=>`<div class="or-choice"><span class="or-label">${esc(c.label)}</span> ${c.items.map(i => esc(i)).join(', ')}</div>`).join('');
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
            <textarea class="meal-comment" data-week="${weekId}" data-key="comment-${di}-${mi}" oninput="debouncedSaveNutrition()" placeholder="💬 Комментарий...">${commentVal}</textarea>
        </div>
    `;
    
    const mealTypeClass = 'meal-' + (m.type || 'snack');
    return `
        <div class="meal ${prepClass}">
            <div class="meal-head ${mealTypeClass}">
                <div class="meal-icon">${icon}</div>
                <div class="meal-name">${m.name}</div>
                ${showTime?`<input type="time" class="meal-time" data-week="${weekId}" data-key="time-${di}-${mi}" oninput="debouncedSaveNutrition()" value="${timeVal}">`:''}
            </div>
            <div class="meal-content">${content}${trackerHtml}</div>
        </div>`;
}

window.getWeekData = function(weekId, key) {
    const week = nutritionData.weeks.find(w => w.id === weekId);
    if(!week || !week.data) return '';
    return week.data[key] || '';
}

window.setStars = function(el, rating) {
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

window.toggleMealItem = function(checkbox, weekId, di, mi) {
    const idx = checkbox.dataset.idx;
    const week = nutritionData.weeks.find(w => w.id === weekId);
    if (!week) return;
    if (!week.data) week.data = {};
    week.data[`eaten-${di}-${mi}-${idx}`] = checkbox.checked ? '1' : '0';
    
    // Update only the visual state of this item without re-rendering all days
    const itemDiv = checkbox.closest('.meal-item-row');
    if (itemDiv) {
        const span = itemDiv.querySelector('.meal-item-text');
        const noteInput = itemDiv.querySelector('.meal-item-note');
        if (checkbox.checked) {
            itemDiv.classList.remove('not-eaten');
            itemDiv.classList.add('eaten');
            if (span) {
                span.style.textDecoration = 'none';
                span.style.color = '';
            }
            if (noteInput) noteInput.remove();
        } else {
            itemDiv.classList.remove('eaten');
            itemDiv.classList.add('not-eaten');
            if (span) {
                span.style.textDecoration = 'line-through';
                span.style.color = '';
            }
            // Add note input if it doesn't exist
            if (!noteInput) {
                const newNote = document.createElement('input');
                newNote.type = 'text';
                newNote.dataset.week = weekId;
                newNote.dataset.key = `note-${di}-${mi}-${idx}`;
                newNote.value = week.data[`note-${di}-${mi}-${idx}`] || '';
                newNote.placeholder = 'что вместо?';
                newNote.className = 'meal-item-note';
                newNote.oninput = function() { debouncedSaveNutrition(); };
                itemDiv.appendChild(newNote);
            }
        }
    }
    
    debouncedSaveNutrition();
}

window.updateTotals = function(weekId, di) {
    let s = { cal: 0, prot: 0, fat: 0, carb: 0 };
    document.querySelectorAll(`input[data-week="${weekId}"][data-day="${di}"][data-field]`).forEach(inp => {
        const f = inp.dataset.field;
        const v = parseFloat(inp.value) || 0;
        if(s[f] !== undefined) s[f] += v;
        const meal = inp.dataset.meal;
        if (meal !== undefined && meal !== '') {
            const week = nutritionData.weeks.find(w => w.id === weekId);
            if(week && week.data) {
                week.data[`m-${inp.dataset.day}-${meal}-${inp.dataset.field}`] = inp.value;
            }
        }
    });
    ['cal','prot','fat','carb'].forEach(f => {
        const el = document.getElementById(`sum-${f}-${weekId}-${di}`);
        if(el) el.textContent = Math.round(s[f]);
    });
    saveNutrition();
}

// Debounce timer for saveNutrition
let _saveNutritionTimer = null;

window.debouncedSaveNutrition = function() {
    if (_saveNutritionTimer) clearTimeout(_saveNutritionTimer);
    _saveNutritionTimer = setTimeout(function() {
        saveNutrition();
        _saveNutritionTimer = null;
    }, 300);
};

window.saveNutrition = function() {
    const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
    if(!week) return;
    
    if(!week.data) week.data = {};
    
    // Collect data only from elements inside days-container (skip modal elements)
    const container = document.getElementById('days-container');
    if (!container) return;
    
    container.querySelectorAll(`[data-week="${week.id}"]`).forEach(el => {
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
    
    container.querySelectorAll(`input[data-week="${week.id}"][data-field]`).forEach(inp => {
        const key = `m-${inp.dataset.day}-${inp.dataset.meal}-${inp.dataset.field}`;
        week.data[key] = inp.value;
    });
    
    // Use syncToCloud for consistent saving
    syncToCloud();
}

window.exportMenuAsText = function() {
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

window.printMenu = function() {
    const week = nutritionData.weeks.find(w => w.id === nutritionData.currentWeekId);
    if(!week) return;
    document.querySelectorAll('.day-card').forEach(c => c.classList.remove('collapsed'));
    const printArea = document.getElementById('print-area');
    let html = `<h1 class="print-title">МЕНЮ: ${esc(week.title)}</h1>`;
    html += `<p class="print-subtitle">Цель: 1250-1300 ккал | Б: 100-110г | Ж: 50-55г | У: 80-100г</p>`;
    week.menu.forEach(day => {
        html += `<div class="print-day">`;
        html += `<h2 class="print-day-header">${esc(day.day)} • ${esc(day.date)}${day.training?' 💪':''}</h2>`;
        day.meals.forEach(meal => {
            const isPrep = ['prep','preworkout','postworkout'].includes(meal.type);
            html += `<div class="print-meal ${isPrep ? 'print-meal-prep' : ''}"><strong>${esc(meal.name)}</strong><br>`;
            if(meal.items) {
                html += `<ul>`;
                meal.items.forEach(item => { html += `<li>${esc(item)}</li>`; });
                html += `</ul>`;
            } else if(meal.choices) {
                meal.choices.forEach(c => {
                    html += `<div class="print-choice">`;
                    html += `<span class="print-choice-label">${esc(c.label)}</span>${c.items.map(i => esc(i)).join(', ')}</div>`;
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