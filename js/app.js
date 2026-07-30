// ============================================
// 🚀 ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
// ============================================
"use strict";

// === ВКЛАДКИ ===

window.switchMainTab = function(tab) {
    document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.main-tab-btn.${tab}`).classList.add('active');
    document.getElementById(`main-tab-${tab}`).classList.add('active');
    if(tab === 'home') renderHomePage();
    if(tab === 'finance') renderFinanceDashboard();
    if(tab === 'food') {
        renderNutritionAll();
        setTimeout(() => scrollToToday(), 100);
    }
    if(tab === 'train') {
        renderTrainingExercises();
        renderTrainingProgress();
    }
    setTimeout(() => applyReadOnlyState(), 50);
}
   
window.switchSubTab = function(tab, event) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`sub-tab-${tab}`).classList.add('active');
    if(tab === 'dashboard') renderDashboard();
    setTimeout(() => applyReadOnlyState(), 50);
}

window.switchTrainingSubTab = function(tab, event) {
    const trainContent = document.getElementById('main-tab-train');
    trainContent.querySelectorAll('.train-sub-tab-btn').forEach(b => b.classList.remove('active'));
    trainContent.querySelectorAll('.train-sub-tab-content').forEach(c => c.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        const btn = trainContent.querySelector('.train-sub-tab-btn[onclick*="' + tab + '"]');
        if (btn) btn.classList.add('active');
    }
    document.getElementById(`train-sub-${tab}`).classList.add('active');
    
    if(tab === 'exercises') renderTrainingExercises();
    if(tab === 'workouts') renderTrainingWorkouts();
    if(tab === 'progress') renderTrainingProgress();
}

window.switchFinanceSubTab = function(tab, event) {
    const financeContent = document.getElementById('main-tab-finance');
    financeContent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    financeContent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`fin-sub-${tab}`).classList.add('active');
    
    if(tab === 'dashboard') renderFinanceDashboard();
    if(tab === 'transactions') renderFinanceTransactions();
    if(tab === 'savings') renderFinanceSavings();
    if(tab === 'planned') renderFinancePlanned();
    if(tab === 'mandatory') renderFinanceMandatory();
    if(tab === 'categories') renderFinanceCategories();
    setTimeout(() => applyReadOnlyState(), 50);
}

// === МОДАЛКИ ===

window.openNutritionModal = function() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    document.getElementById('f-start-date').value = startOfWeek.toISOString().slice(0,10);
    document.getElementById('f-end-date').value = endOfWeek.toISOString().slice(0,10);
    document.getElementById('f-menu-json').value = '';
    document.getElementById('nutrition-modal').classList.add('visible');
}

window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('visible'));
}

window.setFormStars = function(containerId, rating) {
    const current = formStarsData[containerId] || 0;
    const newVal = current === rating ? 0 : rating;
    formStarsData[containerId] = newVal;
    const container = document.getElementById(containerId);
    container.querySelectorAll('.form-star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.rating) <= newVal);
    });
}

// === НАВИГАЦИЯ ===

function scrollToDay(di) {
    const el = document.getElementById(`day-${di}`);
    if(!el) return;
    el.classList.remove('collapsed');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.transition = 'box-shadow 0.3s';
    el.style.boxShadow = '0 0 0 3px #2563eb';
    setTimeout(() => { el.style.boxShadow = ''; }, 1500);
}
function toggleDay(di) {
    const el = document.getElementById(`day-${di}`);
    if(el) el.classList.toggle('collapsed');
}
function toggleAllDays() {
    const cards = document.querySelectorAll('.day-card');
    const allCollapsed = Array.from(cards).every(c => c.classList.contains('collapsed'));
    cards.forEach(c => { if(allCollapsed) c.classList.remove('collapsed'); else c.classList.add('collapsed'); });
}

function scrollToToday() {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    
    const dayCards = document.querySelectorAll('.day-card');
    for (const card of dayCards) {
        const dayDateEl = card.querySelector('.day-title');
        if (dayDateEl && dayDateEl.textContent.includes(todayStr)) {
            card.classList.remove('collapsed');
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            card.style.transition = 'box-shadow 0.3s';
            card.style.boxShadow = '0 0 0 3px #2563eb';
            setTimeout(() => { card.style.boxShadow = ''; }, 1500);
            break;
        }
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// === FIREBASE SYNC FUNCTIONS ===

function showSyncStatus(message, type = 'success') {
    const statusEl = document.getElementById('sync-status');
    if(!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `sync-status visible ${type}`;
    setTimeout(() => { statusEl.classList.remove('visible'); }, 3000);
}

function getTargetUid() {
    return viewingUserId || currentUserId;
}

function syncToCloud() {
    if (isReadOnlyActive()) return;
    if(syncTimeout) clearTimeout(syncTimeout);
    const statusEl = document.getElementById('sync-status');
    if(statusEl && !statusEl.classList.contains('visible')) {
        showSyncStatus('💾 Сохранение...', 'syncing');
    }
    syncTimeout = setTimeout(() => {
        const targetUid = getTargetUid();
        if (!targetUid) return;
        const data = {
            nutrition: nutritionData,
            financeData: financeData,
            lastUpdated: Date.now()
        };
        
        db.ref(`lera_diary_v1/${targetUid}`).set(data).catch(() => {});
        
        // Также сохраняем тренировки отдельным ключом
        try {
            if (typeof TrainingExerciseAPI !== 'undefined') {
                var td = TrainingExerciseAPI.getRawData();
                if (td) {
                    db.ref('lera_training_v1/' + targetUid).set({
                        version: td.version,
                        exercises: td.exercises,
                        workouts: td.workouts,
                        lastUpdated: Date.now()
                    }).catch(() => {});
                }
            }
        } catch(e) {}
        
        showSyncStatus('✅ Сохранено!', 'success');
    }, 5000);
}

// === ЭКСПОРТ/ИМПОРТ ===

function exportAllData() {
    var trainingExport = null;
    try {
        if (typeof TrainingExerciseAPI !== 'undefined') {
            trainingExport = TrainingExerciseAPI.getRawData();
        }
    } catch(e) {}
    const data = { 
        nutrition: nutritionData, 
        financeData: financeData,
        trainingData: trainingExport,
        exportedAt: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importAllData(input) {
    if (isReadOnlyActive()) { customAlert('❌ Импорт недоступен в режиме просмотра', 'Ошибка'); return; }
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if(!parsed || typeof parsed !== 'object') {
                customAlert('❌ Неверный формат файла', 'Ошибка');
                return;
            }
            if(parsed.nutrition && parsed.nutrition.weeks && Array.isArray(parsed.nutrition.weeks)) {
                const existingIds = new Set(nutritionData.weeks.map(w => w.id));
                parsed.nutrition.weeks.forEach(w => { 
                    if(w && w.id && !existingIds.has(w.id)) nutritionData.weeks.push(w); 
                });
                if(parsed.nutrition.currentWeekId && !nutritionData.currentWeekId) nutritionData.currentWeekId = parsed.nutrition.currentWeekId;
            }
            if(parsed.financeData) {
                if(parsed.financeData.transactions && Array.isArray(parsed.financeData.transactions)) {
                    const existingIds = new Set(financeData.transactions.map(t => t.id));
                    parsed.financeData.transactions.forEach(t => {
                        if(t && t.id && !existingIds.has(t.id)) financeData.transactions.push(t);
                    });
                }
                if(parsed.financeData.savings && Array.isArray(parsed.financeData.savings)) {
                    const existingIds = new Set(financeData.savings.map(s => s.id));
                    parsed.financeData.savings.forEach(s => {
                        if(s && s.id && !existingIds.has(s.id)) financeData.savings.push(s);
                    });
                }
                if(parsed.financeData.planned && Array.isArray(parsed.financeData.planned)) {
                    const existingIds = new Set(financeData.planned.map(p => p.id));
                    parsed.financeData.planned.forEach(p => {
                        if(p && p.id && !existingIds.has(p.id)) financeData.planned.push(p);
                    });
                }
                if(parsed.financeData.mandatoryPayments && Array.isArray(parsed.financeData.mandatoryPayments)) {
                    const existingIds = new Set(financeData.mandatoryPayments.map(p => p.id));
                    parsed.financeData.mandatoryPayments.forEach(p => {
                        if(p && p.id && !existingIds.has(p.id)) financeData.mandatoryPayments.push(p);
                    });
                }
                if(parsed.financeData.categories && Array.isArray(parsed.financeData.categories)) {
                    const existingIds = new Set(financeData.categories.map(c => c.id));
                    parsed.financeData.categories.forEach(c => {
                        if(c && c.id && !existingIds.has(c.id)) financeData.categories.push(c);
                    });
                }
            }
            // Импорт тренировок
            if (parsed.trainingData && typeof TrainingExerciseAPI !== 'undefined' && TrainingExerciseAPI.loadFromFirebase) {
                var existing = TrainingExerciseAPI.getExercises();
                if (existing.length === 0) {
                    TrainingExerciseAPI.loadFromFirebase(parsed.trainingData);
                } else {
                    // Объединяем: добавляем недостающие тренировки
                    var td = TrainingExerciseAPI.getRawData();
                    if (parsed.trainingData.exercises) {
                        var exIds = new Set(td.exercises.map(function(e) { return e.id; }));
                        parsed.trainingData.exercises.forEach(function(ex) {
                            if (ex && ex.id && !exIds.has(ex.id)) {
                                td.exercises.push(ex);
                                exIds.add(ex.id);
                            }
                        });
                    }
                    if (parsed.trainingData.workouts) {
                        var wIds = new Set(td.workouts.map(function(w) { return w.id; }));
                        parsed.trainingData.workouts.forEach(function(w) {
                            if (w && w.id && !wIds.has(w.id)) {
                                td.workouts.push(w);
                                wIds.add(w.id);
                            }
                        });
                    }
                    TrainingExerciseAPI.save();
                }
            }
            syncToCloud();
            renderNutritionAll();
            renderFinanceDashboard();
            updateFinanceStats();
            customAlert('✅ Данные импортированы!', 'Успех');
        } catch(err) { 
            customAlert('❌ Ошибка чтения файла', 'Ошибка'); 
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function resetAllData() {
    if (isReadOnlyActive()) { customAlert('❌ Очистка недоступна в режиме просмотра', 'Ошибка'); return; }
    customConfirm('Удалить ВСЕ данные (питание + финансы + тренировки)? Это нельзя отменить.', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            const targetUid = getTargetUid();
            db.ref(`lera_diary_v1/${targetUid}`).remove();
            db.ref(`lera_finance_v1/${targetUid}`).remove();
            db.ref(`lera_training_v1/${targetUid}`).remove();
            nutritionData = { weeks: [], currentWeekId: null };
            financeData = { transactions: [], savings: [], planned: [], mandatoryPayments: [], categories: [] };
            // Сброс тренировок
            if (typeof TrainingExerciseAPI !== 'undefined' && TrainingExerciseAPI.loadFromFirebase) {
                TrainingExerciseAPI.loadFromFirebase({ version: 2, exercises: [], workouts: [] });
            }
            renderNutritionAll();
            renderCurrentFinanceTab();
            updateFinanceStats();
        });
}

// === ИНИЦИАЛИЗАЦИЯ ===

(function init() {
    if (typeof migrateNutritionDates === 'function') {
        migrateNutritionDates();
    }
    if (typeof migrateCategoryColors === 'function') {
        migrateCategoryColors();
    }
    
    // Render home page immediately (doesn't require auth)
    renderHomePage();
    
    // Other tabs will be rendered when user switches to them
    // or after authentication in loadDataForUser()
    isInitialLoad = false;
})();
