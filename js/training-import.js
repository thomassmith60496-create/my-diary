// ============================================
// 📥 ИМПОРТ ТРЕНИРОВОК (GymKeeper → Новая система)
// ============================================
"use strict";

// === СОСТОЯНИЕ ИМПОРТА ===
let _importState = null;

// === ПАРСИНГ ===

const RU_MONTHS = {
    'янв': '01', 'фев': '02', 'мар': '03', 'апр': '04',
    'май': '05', 'июн': '06', 'июл': '07', 'авг': '08',
    'сен': '09', 'окт': '10', 'ноя': '11', 'дек': '12'
};

function _normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function _tryParseDate(str) {
    // DD.MM.YYYY or DD/MM/YYYY
    let m = str.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    // YYYY-MM-DD
    m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    // Russian: D month YYYY  (23 июл. 2026)
    const ruRe = str.match(/(\d{1,2})\s+(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)\S*\s+(\d{4})/i);
    if (ruRe) return ruRe[3] + '-' + (RU_MONTHS[ruRe[2].toLowerCase().slice(0, 3)] || '01') + '-' + ruRe[1].padStart(2, '0');
    return null;
}

function _parseDuration(str) {
    // "59 мин", "1ч 15мин", "1 час 30 мин"
    let m = str.match(/(\d+)\s*(?:мин|min)/i);
    let min = m ? parseInt(m[1]) : 0;
    m = str.match(/(\d+)\s*(?:ч|час)/i);
    if (m) min += parseInt(m[1]) * 60;
    return min || null;
}

// === ПАРСИНГ ОДНОГО СЕТА ===

function _parseSetToken(body) {
    if (!body || !body.trim()) return null;
    const t = body.trim();

    // Комментарий-слово
    if (t.match(/^(норм|тяжел|легк|norm|heavy|light|easy)$/i)) {
        return { type: 'comment', val: t };
    }

    // Паттерн 1: weight*reps  (10кг*15, 60lb*10, 7.5кг*12)
    let m = t.match(/^(\d+(?:[.,]\d+)?)\s*(кг|lb|kg|lbs?|kgs?)?\s*[*×x]\s*(\d+(?:[.,]\d+)?)$/i);
    if (m) return {
        type: 'reps_weight',
        weight: parseFloat(m[1].replace(',', '.')),
        unit: (m[2] || 'кг').toLowerCase(),
        reps: parseInt(m[3])
    };

    // Паттерн 2: time:distance  (25мин:3.8км)
    m = t.match(/^(\d+(?:[.,]\d+)?)\s*(мин|min)?\s*[:]\s*(\d+(?:[.,]\d+)?)\s*(км|м|миль|km|m|mi)$/i);
    if (m) return {
        type: 'cardio',
        time: parseFloat(m[1].replace(',', '.')),
        timeUnit: 'мин',
        distance: parseFloat(m[3].replace(',', '.')),
        distUnit: m[4].toLowerCase()
    };

    // Паттерн 2b: time:distance with seconds
    m = t.match(/^(\d+(?:[.,]\d+)?)\s*(сек|с|sec|s)?\s*[:]\s*(\d+(?:[.,]\d+)?)\s*(м|m)$/i);
    if (m) return {
        type: 'cardio',
        time: parseFloat(m[1].replace(',', '.')),
        timeUnit: (m[2] || 'сек').toLowerCase(),
        distance: parseFloat(m[3].replace(',', '.')),
        distUnit: m[4].toLowerCase()
    };

    // Паттерн 3: time*0 or time:0  (30сек*0кг, 30сек:0, 10сек:0)
    m = t.match(/^(\d+(?:[.,]\d+)?)\s*(сек|с|мин|sec|s|min)?\s*(?:[*×x]\s*0\s*(?:кг|lb)?|[:]\s*0)$/i);
    if (m) return {
        type: 'time',
        time: parseFloat(m[1].replace(',', '.')),
        timeUnit: (m[2] || 'сек').toLowerCase()
    };

    // Паттерн 4: lone number — reps only (6)
    m = t.match(/^(\d+(?:[.,]\d+)?)$/);
    if (m) return {
        type: 'reps_weight',
        weight: 0,
        unit: 'кг',
        reps: parseInt(m[1])
    };

    return null;
}

// === ПАРСИНГ СТРОКИ С ПОДХОДАМИ ===

function _parseSetLine(line) {
    // 1. Извлекаем всё в скобках (комментарий)
    const parens = [];
    let clean = line.replace(/\(([^)]*)\)/g, (_, c) => { parens.push(c.trim()); return ''; });
    clean = clean.replace(/\s+/g, ' ').trim();

    // 2. Разбиваем по запятой
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return null;

    const sets = [];
    let pendingComment = '';

    for (const part of parts) {
        const parsed = _parseSetToken(part);
        if (!parsed) continue;

        if (parsed.type === 'comment') {
            pendingComment = (pendingComment ? pendingComment + '; ' : '') + parsed.val;
            continue;
        }

        if (pendingComment) {
            parsed.comment = pendingComment;
            pendingComment = '';
        }

        sets.push(parsed);
    }

    // Остаток комментария + paren — к последнему сету
    const parts_c = [];
    if (pendingComment) parts_c.push(pendingComment);
    if (parens.length) parts_c.push(parens[0]);
    const allPending = parts_c.join('; ');
    if (allPending && sets.length) {
        const last = sets[sets.length - 1];
        last.comment = last.comment ? last.comment + '; ' + allPending : allPending;
    }

    return sets.length ? sets : null;
}

// === ОСНОВНОЙ ПАРСИНГ ===

const _SKIP_HEADERS = /^(тренировк|упражнени|суперсет|круговая|сет|подход|[•·\-–—=]{2,})|\(\s*отдых/i;

function _isNoteLine(line) {
    const s = line.trim().toLowerCase();
    // Строка с "подхода", "суперсет" и т.п. без данных подходов
    if (s.match(/^(суперсет|круговая|сет|подход|отдых)/i)) return true;
    if (s.match(/\d+\s*подход/i)) return true;
    if (s.match(/из\s+\d+\s+упражнени/i)) return true;
    if (s.match(/отдых\s+(между|после)/i)) return true;
    return false;
}

function _cleanExerciseName(name) {
    let s = name.trim();
    // Убираем нумерацию: "1) Приседания" → "Приседания"
    s = s.replace(/^\d+\s*[)\].]\s*/, '');
    // Убираем лишнюю пунктуацию
    s = s.replace(/:$/, '').trim();
    return s;
}

function parseGymKeeperText(text) {
    const lines = text.split('\n');
    const workouts = [];
    let current = null;
    let currentExercise = null;

    function flushExercise() {
        if (currentExercise && current) {
            // Пустые упражнения не сохраняем
            if (currentExercise.sets.length > 0) {
                current.exercises.push(currentExercise);
            }
            currentExercise = null;
        }
    }

    function flushWorkout() {
        flushExercise();
        if (current && (current.exercises.length > 0 || current.date || current.duration)) {
            workouts.push(current);
        }
        current = null;
    }

    for (let raw of lines) {
        const line = raw.trim();
        if (!line) { flushExercise(); continue; }

        // Дата (включая строки с "GymKeeper" + дата)
        const date = _tryParseDate(line);
        if (date) {
            flushWorkout();
            const dur = _parseDuration(line);
            current = { date, duration: dur, exercises: [] };
            continue;
        }

        if (!current) current = { date: null, duration: null, exercises: [] };

        // Длительность
        if (/^длительность/i.test(line)) {
            const dur = _parseDuration(line);
            if (dur) current.duration = dur;
            continue;
        }

        // Пропускаем заголовки
        if (_SKIP_HEADERS.test(line)) {
            flushExercise();
            continue;
        }

        // Заметки (суперсет на плечи..., гиперэкстензия, 3 подхода)
        if (_isNoteLine(line)) {
            flushExercise();
            continue;
        }

        // Строка с подходами
        const sets = _parseSetLine(line);
        if (sets && sets.length > 0) {
            if (currentExercise) {
                // Накапливаем сеты в текущем упражнении
                currentExercise.sets = currentExercise.sets.concat(sets);
            } else {
                // Подходы без имени упражнения — создаём временное
                currentExercise = { name: '(без названия)', sets };
            }
            // НЕ сбрасываем — ждём следующее имя или пустую строку
            continue;
        }

        // Всё остальное — имя упражнения (или текст)
        flushExercise();
        const cleanName = _cleanExerciseName(line);
        if (cleanName && !_isNoteLine(cleanName)) {
            currentExercise = { name: cleanName, sets: [] };
        }
    }

    // Сбрасываем последнее
    flushExercise();
    if (current && (current.exercises.length > 0 || current.date || current.duration)) {
        workouts.push(current);
    }

    for (const w of workouts) {
        if (!w.date) w.date = new Date().toISOString().slice(0, 10);
    }

    return workouts;
}

// === ПОИСК ВАРИАНТОВ ===

function _findVariant(exerciseName) {
    const exercises = TrainingExerciseAPI.getExercises();
    const normalized = _normalize(exerciseName);

    // Собираем все варианты с их базовыми именами
    const allVariants = [];
    for (const ex of exercises) {
        for (const v of ex.variants) {
            allVariants.push({
                variant: v,
                baseId: ex.id,
                baseName: ex.name,
                fullName: _normalize(ex.name + ' ' + v.name),
                exName: _normalize(ex.name),
                vName: _normalize(v.name)
            });
        }
    }

    // 0. Совпадение по алиасам варианта
    var match0 = allVariants.find(item => item.variant.aliases && item.variant.aliases.some(a => _normalize(a) === normalized));
    if (match0) return match0;

    // 1. Полное совпадение (базовое + вариант)
    var match1 = allVariants.find(item => item.fullName === normalized);
    if (match1) return match1;

    // 2. Совпадение по базовому имени
    var match2 = allVariants.find(item => item.exName === normalized);
    if (match2) return match2;

    // 3. Совпадение по имени варианта
    var match3 = allVariants.find(item => item.vName === normalized);
    if (match3) return match3;

    // 4. Базовое имя содержится в импортированном
    var match4 = allVariants.find(item => normalized.includes(item.exName) || item.exName.includes(normalized));
    if (match4) return match4;

    // 5. Вариант содержится в импортированном
    var match5 = allVariants.find(item => normalized.includes(item.vName) || item.vName.includes(normalized));
    if (match5) return match5;

    return null;
}

// === КОНВЕРТАЦИЯ В ФОРМАТ API ===

function _convertSets(parsedSets) {
    const mt = _detectMeasurementType(parsedSets);
    return parsedSets.map(s => {
        const set = { warmup: false, comment: s.comment || '' };
        switch (mt) {
            case 'reps_weight':
                set.weight = s.type === 'reps_weight' ? s.weight : 0;
                set.reps = s.type === 'reps_weight' ? s.reps : 0;
                if (s.unit && s.unit !== 'кг') {
                    if (s.unit === 'lb' || s.unit === 'lbs') {
                        set.weight = Math.round(set.weight * 0.453592 * 100) / 100;
                    }
                    set.comment = (set.comment ? set.comment + '; ' : '') + 'единица: ' + s.unit;
                }
                break;
            case 'cardio':
                set.time = s.type === 'cardio' ? s.time : 0;
                set.distance = s.type === 'cardio' ? s.distance : 0;
                break;
            case 'time':
                set.time = s.type === 'time' ? s.time : 0;
                break;
        }
        return set;
    });
}

function _detectMeasurementType(parsedSets) {
    const types = new Set(parsedSets.map(s => s.type));
    if (types.has('cardio')) return 'cardio';
    if (types.has('time') && !types.has('reps_weight')) return 'time';
    if (types.has('reps_weight')) return 'reps_weight';
    return 'reps_weight';
}



// === UI ===

window.openImportTraining = function() {
    // Сохраняем текущее состояние перед открытием
    const container = document.getElementById('training-exercises-content');
    if (!container) return;

    let html = '<div class="train-import-overlay" onclick="if(event.target===this)closeImportTraining()">';
    html += '<div class="train-import-modal">';

    // Header
    html += '<div class="train-progress-header">';
    html += '<h2>📥 Импорт тренировок из GymKeeper</h2>';
    html += '<button class="train-progress-close" onclick="closeImportTraining()">✕</button>';
    html += '</div>';

    html += '<p style="margin:0 0 12px;color:#64748b;font-size:13px;">Вставьте текст экспорта из GymKeeper. Система распознает даты, упражнения и подходы.</p>';

    // Textarea
    html += '<textarea id="train-import-textarea" class="train-import-textarea" placeholder="Вставьте текст из GymKeeper..."></textarea>';
    html += '<details style="margin:-8px 0 12px;font-size:12px;color:#94a3b8;"><summary style="cursor:pointer;">Пример формата (GymKeeper)</summary><pre style="background:#f8fafc;padding:10px;border-radius:8px;margin:6px 0 0;font-size:12px;line-height:1.5;white-space:pre-wrap;">23 июл. 2026, 59 мин\n\nБеговая дорожка\n25мин:3.8км, норм (6 наклон, скорость 5.5)\n\nЖим над головой сидя · гантели\n4кг*15, норм\n6кг*12, норм\n7кг*10, норм\n\nПодтягивания\n0кг*8(с противовесом 60 lbs)\n\nПланка\n30сек*0кг, норм</pre></details>';

    // Buttons
    html += '<div class="train-import-actions">';
    html += '<button class="btn primary" onclick="parseImportText()">🔍 Разобрать</button>';
    html += '</div>';

    // Results area
    html += '<div id="train-import-results"></div>';

    html += '</div>'; // modal
    html += '</div>'; // overlay

    const div = document.createElement('div');
    div.id = 'train-import-container';
    div.innerHTML = html;
    document.body.appendChild(div);

    // Focus textarea
    setTimeout(() => {
        const ta = document.getElementById('train-import-textarea');
        if (ta) ta.focus();
    }, 100);
};

window.closeImportTraining = function() {
    const el = document.getElementById('train-import-container');
    if (el) el.remove();
    _importState = null;
};

window.parseImportText = function() {
    const ta = document.getElementById('train-import-textarea');
    if (!ta || !ta.value.trim()) {
        customAlert('❌ Вставьте текст для импорта', 'Ошибка');
        return;
    }

    const workouts = parseGymKeeperText(ta.value);

    if (workouts.length === 0 || workouts.every(w => w.exercises.length === 0)) {
        customAlert('❌ Не удалось распознать тренировки. Проверьте формат текста.', 'Ошибка');
        return;
    }

    // Сопоставляем упражнения с вариантами
    let totalSets = 0;
    let matchedCount = 0;
    let unknownCount = 0;

    for (const w of workouts) {
        for (const ex of w.exercises) {
            const match = _findVariant(ex.name);
            ex.matched = match;
            if (match) {
                matchedCount++;
            } else {
                unknownCount++;
            }
            // Определяем measurement type по сетам
            ex.detectedMt = ex.sets.length > 0 ? _detectMeasurementType(ex.sets) : 'reps_weight';
            ex.setsCount = ex.sets.length;
            totalSets += ex.sets.length;
        }
    }

    _importState = { workouts, totalWorkouts: workouts.length, totalSets, matchedCount, unknownCount };

    _renderImportPreview();
};

function _renderImportPreview() {
    const container = document.getElementById('train-import-results');
    if (!container || !_importState) return;

    const state = _importState;
    let html = '';

    // Summary
    html += '<div class="train-import-summary">';
    html += '<div class="train-import-summary-item">📅 Тренировок: <strong>' + state.totalWorkouts + '</strong></div>';
    html += '<div class="train-import-summary-item">🏋️ Найдено упражнений: <strong>' + state.matchedCount + '</strong></div>';
    html += '<div class="train-import-summary-item">❓ Неизвестных: <strong>' + state.unknownCount + '</strong></div>';
    html += '<div class="train-import-summary-item">📦 Подходов: <strong>' + state.totalSets + '</strong></div>';
    html += '</div>';

    // Detail per workout
    for (let wi = 0; wi < state.workouts.length; wi++) {
        const w = state.workouts[wi];
        html += '<div class="train-import-workout">';
        html += '<div class="train-import-workout-header">';
        html += '<strong>📅 ' + window.formatDateForDisplay(w.date) + '</strong>';
        if (w.duration) html += ' <span class="train-tag">⏱ ' + w.duration + ' мин</span>';
        html += '</div>';

        for (let ei = 0; ei < w.exercises.length; ei++) {
            const ex = w.exercises[ei];
            const mt = ex.detectedMt;
            const mtLabel = MEASUREMENT_TYPES.find(m => m.id === mt);
            const mtTag = mtLabel ? '<span class="train-tag">' + mtLabel.label + '</span>' : '';

            html += '<div class="train-import-exercise">';
            html += '<div class="train-import-exercise-header">';
            if (ex.matched) {
                html += '<span class="train-import-exercise-name matched">✅ ' + escapeHtml(ex.name) + '</span>';
                html += '<span class="train-tag" style="background:#dcfce7;color:#166534;">→ ' + escapeHtml(ex.matched.baseName) + ' — ' + escapeHtml(ex.matched.variant.name) + '</span>';
            } else {
                html += '<span class="train-import-exercise-name unmatched">❌ ' + escapeHtml(ex.name) + '</span>';
                html += '<span class="train-tag" style="background:#fef2f2;color:#dc2626;">не найдено</span>';
            }
            html += mtTag;
            html += '<span class="train-tag">' + ex.setsCount + ' подходов</span>';
            html += '</div>';

            // Sets preview
            html += '<div class="train-import-sets-preview">';
            const s = ex.sets.slice(0, 6);
            for (const set of s) {
                html += '<span class="train-import-set">' + _formatSetPreview(set) + '</span>';
            }
            if (ex.sets.length > 6) {
                html += '<span class="train-import-set" style="background:transparent;border-color:transparent;color:#94a3b8;">+ещё ' + (ex.sets.length - 6) + '</span>';
            }
            html += '</div>';

            html += '</div>'; // exercise
        }

        html += '</div>'; // workout
    }

    // Save button
    if (state.matchedCount > 0) {
        html += '<div class="train-import-save-area">';
        if (state.unknownCount > 0) {
            html += '<p style="color:#9333ea;font-size:13px;margin:0 0 8px;">⚠️ Неизвестные упражнения не будут импортированы. Создайте их вручную и повторите импорт.</p>';
        }
        html += '<button class="btn primary" onclick="confirmImportTraining()">💾 Сохранить в тренировки</button>';
        html += '</div>';
    } else {
        html += '<div class="train-import-save-area">';
        html += '<p style="color:#dc2626;font-size:13px;margin:0 0 8px;">❌ Нет распознанных упражнений. Создайте варианты упражнений с такими же названиями в базе и повторите импорт.</p>';
        html += '</div>';
    }

    container.innerHTML = html;
}

function _formatSetPreview(set) {
    switch (set.type) {
        case 'reps_weight':
            return set.weight + (set.unit || '') + ' × ' + set.reps + (set.comment ? ' (' + set.comment + ')' : '');
        case 'cardio':
            return set.time + set.timeUnit + ' : ' + set.distance + set.distUnit;
        case 'time':
            return set.time + set.timeUnit;
        default:
            return set.raw || '';
    }
}

window.confirmImportTraining = function() {
    if (!_importState || _importState.matchedCount === 0) return;

    // Сохраняем состояние до закрытия окна
    var state = _importState;
    // Закрываем окно импорта, чтобы модалка подтверждения не пряталась за ним
    closeImportTraining();

    customConfirm('Создать ' + state.totalWorkouts + ' тренировок(и) с ' + state.matchedCount + ' упражнениями и ' + state.totalSets + ' подходами?', 'Подтверждение импорта')
        .then(confirmed => {
            if (!confirmed) return;

            let created = 0;
            let errors = 0;

            for (const w of state.workouts) {
                // Создаём тренировку
                const workout = TrainingWorkoutAPI.createWorkout({
                    date: w.date,
                    comment: w.duration ? 'Импортировано из GymKeeper (⏱' + w.duration + ' мин)' : 'Импортировано из GymKeeper'
                });
                if (!workout) { errors++; continue; }

                let hasExercises = false;
                for (const ex of w.exercises) {
                    if (!ex.matched) continue;

                    // Добавляем упражнение
                    const added = TrainingWorkoutAPI.addExerciseToWorkout(workout.id, ex.matched.variant.id);
                    if (!added) { errors++; continue; }
                    hasExercises = true;

                    // Конвертируем сеты и добавляем
                    const convertedSets = _convertSets(ex.sets);
                    for (const set of convertedSets) {
                        const result = TrainingWorkoutAPI.addSet(workout.id, ex.matched.variant.id, set);
                        if (!result) errors++;
                    }
                }

                if (hasExercises) created++;
            }

            if (created > 0) {
                customAlert('✅ Импортировано ' + created + ' из ' + state.totalWorkouts + ' тренировок' + (errors > 0 ? ' (' + errors + ' ошибок)' : ''), 'Импорт завершён');
                // Переключаем на вкладку тренировок, чтобы увидеть результат
                renderTrainingWorkouts();
            } else {
                customAlert('❌ Не удалось импортировать ни одной тренировки', 'Ошибка');
            }
        });
};
