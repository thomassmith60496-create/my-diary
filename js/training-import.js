// ============================================
// 📥 ИМПОРТ ТРЕНИРОВОК (GymKeeper → Новая система)
// ============================================
"use strict";

// === СОСТОЯНИЕ ИМПОРТА ===
let _importState = null;

// === ПАРСИНГ ===

function _normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function _tryParseDate(str) {
    // DD.MM.YYYY or DD/MM/YYYY
    let m = str.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    // YYYY-MM-DD already
    m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    return null;
}

function _parseDuration(str) {
    const m = str.match(/(\d+)\s*ч(?:ас)?(?:\s*(\d+)\s*мин)?|(\d+)\s*мин/);
    if (!m) return null;
    let min = 0;
    if (m[1] !== undefined) min += parseInt(m[1]) * 60;
    if (m[2] !== undefined) min += parseInt(m[2]);
    if (m[3] !== undefined) min += parseInt(m[3]);
    return min || null;
}

// Парсинг одного сета (токена)
function _parseSetToken(token) {
    const t = token.trim();
    if (!t) return null;

    // Извлекаем комментарий в скобках и trailing comment (норм/тяжел/легк)
    let body = t;
    let comment = '';
    const parenM = t.match(/\(([^)]*)\)/);
    if (parenM) {
        comment = parenM[1].trim();
        body = body.replace(/\([^)]*\)/, '').trim();
    }
    const trailing = body.match(/\s+(норм|тяжел|легк|norm|heavy|light|easy)\s*$/i);
    if (trailing) {
        comment = (comment ? comment + '; ' : '') + trailing[1];
        body = body.replace(/\s+норм|тяжел|легк|norm|heavy|light|easy\s*$/i, '').trim();
    }

    // Паттерн A: weight*reps  (10кг*15, 60lb*10, 0кг*8)
    let m = body.match(/^(\d+(?:[.,]\d+)?)\s*(кг|lb|kg|lbs?)?\s*[*×x]\s*(\d+(?:[.,]\d+)?)$/);
    if (m) {
        const weight = parseFloat(m[1].replace(',', '.'));
        const unit = m[2] ? m[2].toLowerCase() : 'кг';
        const reps = parseInt(m[3]);
        return { type: 'reps_weight', weight, unit, reps, comment, raw: t };
    }

    // Паттерн B: time:distance  (25мин:3.8км)
    m = body.match(/^(\d+(?:[.,]\d+)?)\s*(мин|сек|с|min|sec|s)?\s*[:]\s*(\d+(?:[.,]\d+)?)\s*(км|м|миль|km|m|mi)?$/i);
    if (m) {
        const time = parseFloat(m[1].replace(',', '.'));
        const timeUnit = m[2] ? m[2].toLowerCase() : 'мин';
        const distance = parseFloat(m[3].replace(',', '.'));
        const distUnit = m[4] ? m[4].toLowerCase() : 'км';
        return { type: 'cardio', time, timeUnit, distance, distUnit, comment, raw: t };
    }

    // Паттерн C: time*0  (30сек*0, 30сек*0кг)
    m = body.match(/^(\d+(?:[.,]\d+)?)\s*(сек|с|мин|sec|s|min)?\s*[*×x]\s*0\s*(кг|lb|kg|lbs?)?$/i);
    if (m) {
        const time = parseFloat(m[1].replace(',', '.'));
        const timeUnit = m[2] ? m[2].toLowerCase() : 'сек';
        return { type: 'time', time, timeUnit, comment, raw: t };
    }

    // Паттерн D: time:0  (10сек:0)
    m = body.match(/^(\d+(?:[.,]\d+)?)\s*(сек|с|мин|sec|s|min)?\s*[:]\s*0$/i);
    if (m) {
        const time = parseFloat(m[1].replace(',', '.'));
        const timeUnit = m[2] ? m[2].toLowerCase() : 'сек';
        return { type: 'time', time, timeUnit, comment, raw: t };
    }

    // Паттерн E: weight*reps (альтернативный разделитель)
    m = body.match(/^(\d+(?:[.,]\d+)?)\s*(кг|lb|kg|lbs?)?\s*[*×x]\s*(\d+(?:[.,]\d+)?)$/i);
    if (m) {
        const weight = parseFloat(m[1].replace(',', '.'));
        const unit = m[2] ? m[2].toLowerCase() : 'кг';
        const reps = parseInt(m[3]);
        return { type: 'reps_weight', weight, unit, reps, comment, raw: t };
    }

    // Если ничего не подошло — просто комментарий (тип none)
    return { type: 'unknown', raw: t, comment };
}

function _tryParseSetLine(line) {
    // Разбиваем по запятым, каждую часть парсим как сет
    const parts = line.split(',').filter(p => p.trim());
    const sets = [];
    for (const part of parts) {
        const parsed = _parseSetToken(part);
        if (parsed) sets.push(parsed);
    }
    return sets.length ? sets : null;
}

function _isExerciseNameLine(line) {
    // Если строка не похожа на сет, не пустая, не дата, не длительность, не заголовок
    const s = line.trim();
    if (!s) return false;
    if (s.match(/^тренировк/i)) return false;
    if (s.match(/^длительность/i)) return false;
    if (_tryParseDate(s)) return false;
    if (_tryParseSetLine(s)) return false;
    if (s.match(/^упражнени/i)) return false;
    if (s.match(/^[-=]{3,}$/)) return false;
    return true;
}

// === ОСНОВНОЙ ПАРСИНГ ===

function parseGymKeeperText(text) {
    const lines = text.split('\n');
    const workouts = [];
    let current = null;
    let currentExercise = null;

    for (let raw of lines) {
        const line = raw.trim();
        if (!line) {
            if (currentExercise && current) {
                current.exercises.push(currentExercise);
                currentExercise = null;
            }
            continue;
        }

        // Дата
        const date = _tryParseDate(line);
        if (date) {
            if (currentExercise && current) {
                current.exercises.push(currentExercise);
                currentExercise = null;
            }
            if (current) {
                workouts.push(current);
            }
            current = { date, duration: null, exercises: [] };
            continue;
        }

        // Длительность
        if (/^длительность/i.test(line)) {
            const dur = _parseDuration(line);
            if (current && dur) current.duration = dur;
            continue;
        }

        // Пропускаем заголовки
        if (line.match(/^тренировк/i) || line.match(/^упражнени/i) || line.match(/^[-=]{3,}$/)) {
            if (currentExercise && current) {
                current.exercises.push(currentExercise);
                currentExercise = null;
            }
            continue;
        }

        // Проверка: строка вида "Имя: 10кг*15, 40кг*12" (двоеточие + сеты)
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const before = line.slice(0, colonIdx).trim();
            const after = line.slice(colonIdx + 1).trim();
            const afterSets = _tryParseSetLine(after);
            if (afterSets && afterSets.length > 0) {
                if (currentExercise && current) current.exercises.push(currentExercise);
                if (!current) current = { date: null, duration: null, exercises: [] };
                currentExercise = { name: before, sets: [...afterSets] };
                current.exercises.push(currentExercise);
                currentExercise = null;
                continue;
            }
        }

        // Проверяем, является ли строка строкой с подходами
        const sets = _tryParseSetLine(line);
        if (sets) {
            // Это строка с подходами
            if (!current) {
                current = { date: null, duration: null, exercises: [] };
            }
            if (currentExercise) {
                currentExercise.sets = currentExercise.sets.concat(sets);
                current.exercises.push(currentExercise);
                currentExercise = null;
            } else {
                // Подходы без имени упражнения — создаём с заглушкой
                currentExercise = { name: 'Упражнение', sets: [...sets] };
                current.exercises.push(currentExercise);
                currentExercise = null;
            }
        } else {
            // Это имя упражнения (строка без сетов)
            if (currentExercise && current) {
                current.exercises.push(currentExercise);
            }
            if (!current) {
                current = { date: null, duration: null, exercises: [] };
            }
            currentExercise = {
                name: line.replace(/:$/, '').trim(),
                sets: []
            };
        }
    }

    // Финиш
    if (currentExercise && current) {
        current.exercises.push(currentExercise);
    }
    if (current) {
        workouts.push(current);
    }

    // Если нет даты — используем сегодня
    for (const w of workouts) {
        if (!w.date) {
            w.date = new Date().toISOString().slice(0, 10);
        }
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

    // 1. Полное совпадение (базовое + вариант)
    let match = allVariants.find(item => item.fullName === normalized);
    if (match) return match;

    // 2. Совпадение по базовому имени
    match = allVariants.find(item => item.exName === normalized);
    if (match) return match;

    // 3. Совпадение по имени варианта
    match = allVariants.find(item => item.vName === normalized);
    if (match) return match;

    // 4. Базовое имя содержится в импортированном
    match = allVariants.find(item => normalized.includes(item.exName) || item.exName.includes(normalized));
    if (match) return match;

    // 5. Вариант содержится в импортированном
    match = allVariants.find(item => normalized.includes(item.vName) || item.vName.includes(normalized));
    if (match) return match;

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

function _detectLoadType(mt) {
    if (mt === 'cardio') return 'cardio';
    if (mt === 'time') return 'static';
    return 'weight';
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
    html += '<details style="margin:-8px 0 12px;font-size:12px;color:#94a3b8;"><summary style="cursor:pointer;">Пример формата</summary><pre style="background:#f8fafc;padding:10px;border-radius:8px;margin:6px 0 0;font-size:12px;line-height:1.5;white-space:pre-wrap;">Тренировка 15.03.2026\nДлительность: 1ч 15мин\n\nЖим штанги лёжа:\n10кг*15, 40кг*12, 50кг*8 (норм)\n\nТяга гантели 20кг:\n15кг*12, 20кг*10\n\nБеговая дорожка:\n25мин:3.8км\n\nПланка:\n30сек*0кг</pre></details>';

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

    customConfirm('Создать ' + _importState.totalWorkouts + ' тренировок(и) с ' + _importState.matchedCount + ' упражнениями и ' + _importState.totalSets + ' подходами?', 'Подтверждение импорта')
        .then(confirmed => {
            if (!confirmed) return;

            let created = 0;
            let errors = 0;

            for (const w of _importState.workouts) {
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

            // Закрываем импорт
            closeImportTraining();

            if (created > 0) {
                customAlert('✅ Импортировано ' + created + ' из ' + _importState.totalWorkouts + ' тренировок' + (errors > 0 ? ' (' + errors + ' ошибок)' : ''), 'Импорт завершён');
                // Переключаем на вкладку тренировок, чтобы увидеть результат
                if (typeof switchTrainingSubTab === 'function') {
                    switchTrainingSubTab('workouts');
                }
            } else {
                customAlert('❌ Не удалось импортировать ни одной тренировки', 'Ошибка');
            }
        });
};
