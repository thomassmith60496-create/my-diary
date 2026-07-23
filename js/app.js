// ============================================
// ГЛАВНЫЙ ФАЙЛ — ВКЛАДКИ, МОДАЛКИ, СИНХРОНИЗАЦИЯ
// ============================================

// === ВКЛАДКИ ===

function switchMainTab(tab) {
    document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.main-tab-btn.${tab}`).classList.add('active');
    document.getElementById(`main-tab-${tab}`).classList.add('active');
    if(tab === 'train') renderTrainAll();
    if(tab === 'finance') renderFinanceDashboard();
}
   
function switchSubTab(tab, event) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`sub-tab-${tab}`).classList.add('active');
    if(tab === 'dashboard') renderDashboard();
}

function switchFinanceSubTab(tab, event) {
    const financeContent = document.getElementById('main-tab-finance');
    financeContent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    financeContent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`fin-sub-${tab}`).classList.add('active');
    
    if(tab === 'dashboard') renderFinanceDashboard();
    if(tab === 'transactions') renderFinanceTransactions();
    if(tab === 'savings') renderFinanceSavings();
    if(tab === 'planned') renderFinancePlanned();
    if(tab === 'categories') renderFinanceCategories();
}

// === МОДАЛКИ ===

function openNutritionModal() {
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

function openTrainModal(id = null) {
    editingWorkoutId = id;
    document.getElementById('train-modal-title').textContent = id ? '✏️ Редактировать' : '➕ Новая тренировка';
    if(id) {
        const w = workouts.find(x => x.id === id);
        if(!w) return;
        document.getElementById('f-train-date').value = w.date || '';
        document.getElementById('f-train-type').value = w.type || '';
        document.getElementById('f-train-duration').value = w.duration || '';
        document.getElementById('f-train-time').value = w.time || '';
        document.getElementById('f-train-log').value = w.log || '';
        document.getElementById('f-train-note').value = w.note || '';
        setFormStars('f-train-feel-before', w.feelBefore || 0);
        setFormStars('f-train-feel-after', w.feelAfter || 0);
        setFormStars('f-train-rating', w.rating || 0);
    } else {
        document.getElementById('f-train-date').value = new Date().toISOString().slice(0,10);
        document.getElementById('f-train-type').value = '';
        document.getElementById('f-train-duration').value = '';
        document.getElementById('f-train-time').value = '';
        document.getElementById('f-train-log').value = '';
        document.getElementById('f-train-note').value = '';
        setFormStars('f-train-feel-before', 0);
        setFormStars('f-train-feel-after', 0);
        setFormStars('f-train-rating', 0);
    }
    document.getElementById('train-modal').classList.add('visible');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('visible'));
    editingWorkoutId = null;
}

function setFormStars(containerId, rating) {
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

// === FIREBASE SYNC FUNCTIONS ===

function showSyncStatus(message, type = 'success') {
    const statusEl = document.getElementById('sync-status');
    if(!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `sync-status visible ${type}`;
    setTimeout(() => { statusEl.classList.remove('visible'); }, 3000);
}

function syncToCloud() {
    if(syncTimeout) clearTimeout(syncTimeout);
    const statusEl = document.getElementById('sync-status');
    if(statusEl && !statusEl.classList.contains('visible')) {
        showSyncStatus('💾 Сохранение...', 'syncing');
    }
    syncTimeout = setTimeout(() => {
        const targetUid = viewingUserId || currentUserId;
        if (!targetUid) {
            // Fallback to old root path if no user
            const data = {
                nutrition: nutritionData,
                workouts: workouts,
                progress: JSON.parse(localStorage.getItem('exercise-progress') || '{}'),
                lastUpdated: Date.now()
            };
            
            diaryRef.set(data);
            
            financeRef.set({
                transactions: financeData.transactions,
                savings: financeData.savings,
                planned: financeData.planned,
                categories: financeData.categories,
                lastUpdated: Date.now()
            })
            .then(() => {
                console.log('✅ Data saved to Firebase');
                showSyncStatus('✅ Сохранено!', 'success');
            })
            .catch((error) => {
                console.error('❌ Firebase error:', error);
                showSyncStatus('❌ Ошибка сохранения', 'error');
            });
            return;
        }
        
        const data = {
            nutrition: nutritionData,
            workouts: workouts,
            progress: JSON.parse(localStorage.getItem('exercise-progress') || '{}'),
            lastUpdated: Date.now()
        };
        
        db.ref(`lera_diary_v1/${targetUid}`).set(data);
        
        db.ref(`lera_finance_v1/${targetUid}`).set({
            transactions: financeData.transactions,
            savings: financeData.savings,
            planned: financeData.planned,
            categories: financeData.categories,
            lastUpdated: Date.now()
        })
            .then(() => {
                console.log(`✅ Data saved to Firebase for user ${targetUid}`);
                showSyncStatus('✅ Сохранено!', 'success');
            })
            .catch((error) => {
                console.error('❌ Firebase error:', error);
                showSyncStatus('❌ Ошибка сохранения', 'error');
            });
    }, 5000);
}

// === ЭКСПОРТ/ИМПОРТ ===

function exportAllData() {
    const data = { nutrition: nutritionData, workouts, progress: JSON.parse(localStorage.getItem('exercise-progress') || '{}'), exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importAllData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if(parsed.nutrition && parsed.nutrition.weeks) {
                const existingIds = new Set(nutritionData.weeks.map(w => w.id));
                parsed.nutrition.weeks.forEach(w => { if(!existingIds.has(w.id)) nutritionData.weeks.push(w); });
                if(parsed.nutrition.currentWeekId && !nutritionData.currentWeekId) nutritionData.currentWeekId = parsed.nutrition.currentWeekId;
            }
            if(parsed.workouts) {
                const existingIds = new Set(workouts.map(w => w.id));
                parsed.workouts.forEach(w => { if(!existingIds.has(w.id)) workouts.push(w); });
            }
            if(parsed.progress) localStorage.setItem('exercise-progress', JSON.stringify(parsed.progress));
            saveNutrition();
            saveTrainings();
            renderNutritionAll();
            renderTrainAll();
            alert('✅ Данные импортированы!');
        } catch(err) { alert('❌ Ошибка чтения'); }
    };
    reader.readAsText(file);
    input.value = '';
}

function importTrainData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if(parsed.workouts) {
                const existingIds = new Set(workouts.map(w => w.id));
                parsed.workouts.forEach(w => { if(!existingIds.has(w.id)) workouts.push(w); });
                if(parsed.progress) localStorage.setItem('exercise-progress', JSON.stringify(parsed.progress));
                saveTrainings();
                renderTrainAll();
                alert(`✅ Импортировано тренировок: ${parsed.workouts.length}`);
            } else { alert('❌ Неверный формат'); }
        } catch(err) { alert('❌ Ошибка чтения'); }
    };
    reader.readAsText(file);
    input.value = '';
}

function resetAllData() {
    if(confirm('Удалить ВСЕ данные (питание + тренировки + финансы)? Это нельзя отменить.')) {
        const targetUid = viewingUserId || currentUserId;
        if (targetUid) {
            db.ref(`lera_diary_v1/${targetUid}`).remove().catch(console.error);
            db.ref(`lera_finance_v1/${targetUid}`).remove().catch(console.error);
        } else {
            diaryRef.remove().catch(console.error);
            financeRef.remove().catch(console.error);
        }
        localStorage.removeItem('nutrition-data');
        localStorage.removeItem('workouts-data');
        localStorage.removeItem('exercise-progress');
        nutritionData = { weeks: [], currentWeekId: null };
        workouts = [];
        financeData = { transactions: [], savings: [], planned: [], categories: [] };
        renderNutritionAll();
        renderTrainAll();
        renderCurrentFinanceTab();
        updateFinanceStats();
    }
}

function saveTrainings() {
    syncToCloud();
}

// === ИНИЦИАЛИЗАЦИЯ ===

// Load fallback from localStorage on page load
(function init() {
    const rawNutrition = localStorage.getItem('nutrition-data');
    if(rawNutrition) { 
        try { 
            const parsed = JSON.parse(rawNutrition);
            if(parsed && parsed.weeks && parsed.weeks.length > 0) {
                nutritionData = parsed;
            }
        } catch(e) { console.error('Error parsing localStorage nutrition:', e); } 
    }
    const rawTrain = localStorage.getItem('workouts-data');
    if(rawTrain) { 
        try { 
            const parsed = JSON.parse(rawTrain);
            if(parsed && parsed.workouts) {
                workouts = parsed.workouts;
            }
        } catch(e) { console.error('Error parsing localStorage workouts:', e); } 
    }
    
    // Render with initial data (auth state will reload if needed)
    if (!currentUser) {
        renderNutritionAll();
        renderTrainAll();
        renderFinanceDashboard();
        updateFinanceStats();
        isInitialLoad = false;
    }
})();

