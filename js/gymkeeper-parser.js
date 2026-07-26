// ============================================
// ПАРСЕР ДАННЫХ ИЗ GYMKEEPER
// ============================================
"use strict";

function parseGymKeeperText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const workouts = [];
    let currentWorkout = null;
    let currentExercise = null;
    
    const monthMap = {
        'янв': '01', 'января': '01',
        'фев': '02', 'февраля': '02',
        'мар': '03', 'марта': '03',
        'апр': '04', 'апреля': '04',
        'мая': '05', 'май': '05',
        'июн': '06', 'июня': '06',
        'июл': '07', 'июля': '07',
        'авг': '08', 'августа': '08',
        'сен': '09', 'сентября': '09',
        'окт': '10', 'октября': '10',
        'ноя': '11', 'ноября': '11',
        'дек': '12', 'декабря': '12'
    };
    
    for(let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Пропускаем заголовки
        if(line.match(/^ТРЕНИРОВКИ/i)) continue;
        if(line.match(/^(СУПЕРСЕТ|КРУГОВАЯ|🏋️|GymKeeper)/i)) continue;
        
        // Парсим дату и длительность
        const dateMatch = line.match(/^(\d{1,2})\s+([а-яА-Я]+)\.?\s+(\d{4}),?\s*(\d+)?\s*мин/i);
        if(dateMatch) {
            if(currentWorkout && currentExercise) {
                currentWorkout.parsedExercises.push(currentExercise);
            }
            if(currentWorkout) {
                workouts.push(currentWorkout);
            }
            
            const day = dateMatch[1].padStart(2, '0');
            const monthKey = dateMatch[2].toLowerCase();
            const month = monthMap[monthKey] || '01';
            const year = dateMatch[3];
            const duration = dateMatch[4] ? parseInt(dateMatch[4]) : 0;
            
            currentWorkout = {
                id: 'w-import-' + Date.now() + '-' + i,
                date: `${year}-${month}-${day}`,
                type: '',
                duration: duration,
                time: '',
                log: '',
                parsedExercises: [],
                note: '',
                rating: 0,
                feelBefore: 0,
                feelAfter: 0
            };
            currentExercise = null;
            continue;
        }
        
        if(!currentWorkout) continue;
        
        // Добавляем строку в лог
        if(currentWorkout.log) {
            currentWorkout.log += '\n' + line;
        } else {
            currentWorkout.log = line;
        }
        
        // Проверяем, является ли строка упражнением
        const isExercise = line.match(/^\d+\)\s+.+/) || 
                          (line.includes('·') && !line.match(/\d+(кг|lb)\*/i));
        
        if(isExercise) {
            if(currentExercise) {
                currentWorkout.parsedExercises.push(currentExercise);
            }
            currentExercise = {
                name: line.replace(/^\d+\)\s*/, '').trim(),
                sets: []
            };
        } else if(currentExercise && line.match(/\d+(кг|lb)\*(\d+)/i)) {
            const match = line.match(/(\d+(?:\.\d+)?)(кг|lb)\*(\d+)/i);
            if(match) {
                const weight = parseFloat(match[1]);
                const unit = match[2].toLowerCase();
                const reps = parseInt(match[3]);
                currentExercise.sets.push({
                    weight: unit === 'lb' ? Math.round(weight * 0.4536) : weight,
                    reps: reps
                });
            }
        }
    }
    
    // Добавляем последнюю тренировку
    if(currentWorkout) {
        if(currentExercise) {
            currentWorkout.parsedExercises.push(currentExercise);
        }
        workouts.push(currentWorkout);
    }
    
    // Определяем тип тренировки и фильтруем упражнения
    workouts.forEach(w => {
        const hasCardio = w.log && w.log.match(/беговая дорожка|велотренажёр|эллипс|степпер/i);
        const hasStrength = w.parsedExercises && w.parsedExercises.length > 0;
        
        if(hasCardio && hasStrength) {
            w.type = 'mix';
        } else if(hasCardio) {
            w.type = 'cardio';
        } else if(hasStrength) {
            w.type = 'strength';
        } else {
            w.type = 'other';
        }
        
        // Фильтруем только упражнения с подходами
        w.parsedExercises = w.parsedExercises.filter(e => e.sets.length > 0);
    });
    
    return workouts;
}

window.importGymKeeperData = function(input) {
    const file = input.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedWorkouts = parseGymKeeperText(e.target.result);
            
            if(parsedWorkouts.length === 0) {
                alert('❌ Не найдено тренировок в файле');
                return;
            }
            
            const existingIds = new Set(workouts.map(w => w.id));
            let imported = 0;
            
            parsedWorkouts.forEach(w => {
                if(w && w.id && !existingIds.has(w.id)) {
                    workouts.push(w);
                    imported++;
                    
                    // Сохраняем прогресс упражнений
                    if(w.parsedExercises && w.parsedExercises.length > 0) {
                        saveExerciseProgress(w);
                    }
                }
            });
            
            syncToCloud();
            renderTrainAll();
            alert(`✅ Импортировано тренировок: ${imported}`);
        } catch(err) {
            alert('❌ Ошибка чтения файла: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsText(file);
    input.value = '';
}
