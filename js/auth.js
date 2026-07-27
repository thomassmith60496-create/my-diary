// ============ AUTH FUNCTIONS ============
"use strict";

window.renderUserBar = function() {
    const container = document.getElementById('user-bar-container');
    if (!currentUser) {
        container.innerHTML = '';
        return;
    }
    const roleLabel = currentUserRole === 'admin' ? '👑 Админ' : '👁 Читатель';
    const roleClass = currentUserRole === 'admin' ? 'admin' : 'reader';
    const isReader = currentUserRole === 'reader';
    
    let html = `<div class="user-bar">
        <span class="user-bar-email">📧 ${currentUser.email}</span>
        <span class="user-bar-role ${roleClass}">${roleLabel}</span>`;
    
    if (currentUserRole === 'admin') {
        html += `<button class="user-bar-btn access" onclick="openAccessModal()">👥 Доступ</button>`;
        if (isReadOnlyMode) {
            html += `<button class="user-bar-btn view active" onclick="toggleViewMode()">👁 Просмотр</button>`;
        } else {
            html += `<button class="user-bar-btn view" onclick="toggleViewMode()">✏️ Редактирование</button>`;
        }
    }
    
    html += `<button class="user-bar-btn logout" onclick="logoutUser()">🚪 Выйти</button>
    </div>`;
    container.innerHTML = html;
    
    renderReadOnlyBanner();
}

window.renderReadOnlyBanner = function() {
    const container = document.getElementById('read-only-banner-container');
    if (currentUserRole === 'reader' || (currentUserRole === 'admin' && isReadOnlyMode)) {
        const msg = currentUserRole === 'reader' 
            ? '👁 Вы просматриваете дневник в режиме «только чтение»'
            : '👁 Режим просмотра — изменения не будут сохранены';
        container.innerHTML = `<div class="read-only-banner">${msg}</div>`;
    } else {
        container.innerHTML = '';
    }
}

window.applyReadOnlyState = function() {
    const isReadOnly = currentUserRole === 'reader' || isReadOnlyMode;
    
    // Disable ALL inputs/selects/buttons by default in read-only mode
    // Then selectively RE-ENABLE view controls
    
    document.querySelectorAll('input:not([type="file"]), textarea, select, button:not(.user-bar-btn):not(.main-tab-btn):not(.sub-tab-btn)').forEach(el => {
        if (isReadOnly) {
            el.classList.add('read-only-input');
            el.disabled = true;
        } else {
            el.classList.remove('read-only-input');
            el.disabled = false;
        }
    });
    
    // === RE-ENABLE view controls for readers ===
    if (isReadOnly) {
        // 1. Питание - Недели: week-select (селектор текущей недели)
        document.querySelectorAll('#week-select, .week-select').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 2. Питание - Недели: "Скачать шаблон меню" и "Экспорт всего"
        document.querySelectorAll('button[onclick*="downloadMenuTemplate"], button[onclick*="exportAllData"]').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 3. Питание - Дашборд: селекторы периодов для веса и КБЖУ
        document.querySelectorAll('#weight-period, #kbju-period, .dashboard-select').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 4. Питание - Дашборд: кнопки метрик (Калории/Белки/Жиры/Углеводы)
        document.querySelectorAll('#sub-tab-dashboard .metric-btn').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 5. Питание - Дашборд: кнопка "Обновить"
        document.querySelectorAll('button[onclick*="renderDashboard"]').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 6. Тренировки - Прогресс по упражнениям: селектор упражнения
        document.querySelectorAll('#progress-exercise-select, .progress-select').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 7. Тренировки - Прогресс по упражнениям: кнопки "Макс. вес" и "Объём"
        document.querySelectorAll('#main-tab-train .metric-btn').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 8. Финансы - Дашборд: селектор месяца
        document.querySelectorAll('#fin-month-select, .fin-month-selector select').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 9. Финансы - все подвкладки: селекторы фильтров периода/типа
        document.querySelectorAll('#fin-filter-period, #fin-filter-type, .fin-filter-select').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 10. Финансы - кнопка "Обновить" на дашборде
        document.querySelectorAll('#fin-sub-dashboard button[onclick*="renderFinanceDashboard"]').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 11. Кнопка "Наверх" (scroll to top)
        document.querySelectorAll('.btn-scroll-top').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
        
        // 12. Экспорт/импорт - кнопки экспорта в любой вкладке
        document.querySelectorAll('button[onclick*="exportAllData"], button[onclick*="exportMenuAsText"], button[onclick*="printMenu"]').forEach(el => {
            el.classList.remove('read-only-input');
            el.disabled = false;
        });
    }
    
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isReadOnly ? 'none' : '';
    });
}

window.registerUser = function() {
    const email = document.getElementById('auth-reg-email').value.trim();
    const password = document.getElementById('auth-reg-password').value;
    const errorEl = document.getElementById('auth-reg-error');
    const successEl = document.getElementById('auth-reg-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (!email || !password) { errorEl.textContent = '❌ Заполните email и пароль'; errorEl.style.display = 'block'; return; }
    if (password.length < 6) { errorEl.textContent = '❌ Пароль должен быть минимум 6 символов'; errorEl.style.display = 'block'; return; }
    
    const btn = document.querySelector('#auth-form-register .auth-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Регистрация...';
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            const uid = cred.user.uid;
            return usersRef.child(uid).set({
                email: email,
                role: 'admin',
                ownerUid: uid,
                readers: {},
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                currentUserId = uid;
                currentUserRole = 'admin';
                isReadOnlyMode = false;
                viewingUserId = uid;
                successEl.textContent = '✅ Регистрация успешна!';
                successEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Зарегистрироваться';
                document.getElementById('auth-overlay').classList.add('hidden');
                initUserSession(uid);
            });
        })
        .catch((error) => {
            errorEl.textContent = '❌ ' + translateFirebaseError(error.code);
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Зарегистрироваться';
        });
}

window.loginUser = function() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (!email || !password) { errorEl.textContent = '❌ Заполните email и пароль'; errorEl.style.display = 'block'; return; }
    
    const btn = document.getElementById('auth-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Вход...';
    
    window._authInitInProgress = true;
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((cred) => {
            const uid = cred.user.uid;
            successEl.textContent = '✅ Вход выполнен!';
            successEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Войти';
            document.getElementById('auth-overlay').style.display = 'none';
            initUserSession(uid);
        })
        .catch((error) => {
            errorEl.textContent = '❌ ' + translateFirebaseError(error.code);
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Войти';
        });
}

window.logoutUser = function() {
    firebase.auth().signOut().then(() => {
        currentUser = null;
        currentUserRole = 'admin';
        currentUserId = null;
        isReadOnlyMode = false;
        viewingUserId = null;
        document.getElementById('auth-overlay').style.display = 'flex';
        renderUserBar();
        applyReadOnlyState();
    }).catch((error) => {
        // Silently handle logout errors
    });
}

window.translateFirebaseError = function(code) {
    const map = {
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/email-already-in-use': 'Email уже используется',
        'auth/invalid-email': 'Неверный формат email',
        'auth/weak-password': 'Слишком простой пароль',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
        'auth/user-disabled': 'Пользователь заблокирован',
        'auth/invalid-credential': 'Неверный email или пароль'
    };
    return map[code] || code;
}

window.switchAuthTab = function(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.auth-form-content').forEach(f => f.classList.toggle('active', f.id === 'auth-form-' + tab));
    
    // Hide all error and success messages
    document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
        el.style.display = 'none';
    });
    
    if (tab === 'login') {
        const btn = document.getElementById('auth-btn');
        btn.textContent = 'Войти';
        btn.onclick = loginUser;
    } else {
        const btn = document.querySelector('#auth-form-register .auth-btn');
        btn.textContent = 'Зарегистрироваться';
        btn.onclick = registerUser;
    }
}

window.initUserSession = function(uid) {
    currentUserId = uid;
    usersRef.child(uid).once('value').then((snap) => {
        const userData = snap.val();
        if (userData) {
            currentUserRole = userData.role || 'admin';
            viewingUserId = userData.ownerUid || uid;
            
            if (currentUserRole === 'reader') {
                const ownerUid = userData.ownerUid;
                if (ownerUid) {
                    viewingUserId = ownerUid;
                    switchDataContext(ownerUid);
                }
            } else {
                viewingUserId = uid;
                switchDataContext(uid);
            }
        } else {
            currentUserRole = 'admin';
            viewingUserId = uid;
            usersRef.child(uid).set({
                email: currentUser.email,
                role: 'admin',
                ownerUid: uid,
                readers: {},
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            switchDataContext(uid);
            return;
        }
        
        renderUserBar();
        applyReadOnlyState();
    });
}

window.switchDataContext = function(uid) {
    window._activeDiaryRef = db.ref('lera_diary_v1/' + uid);
    window._activeFinanceRef = db.ref('lera_finance_v1/' + uid);
    loadDataForUser(uid);
}

window.loadDataForUser = function(uid) {
    var diaryPath = 'lera_diary_v1/' + uid;
    var financePath = 'lera_finance_v1/' + uid;
    var trainingPath = 'lera_training_v1/' + uid;
    
    var diaryLoad = db.ref(diaryPath).once('value');
    var financeLoad = db.ref(financePath).once('value');
    var trainingLoad = db.ref(trainingPath).once('value');
    
    Promise.all([diaryLoad, financeLoad, trainingLoad]).then(function(results) {
        var diarySnap = results[0];
        var financeSnap = results[1];
        var trainingSnap = results[2];
        var diaryData = diarySnap.val();
        var financeDataSnap = financeSnap.val();
        var trainingDataSnap = trainingSnap.val();
        
        if (diaryData) {
            if (diaryData.nutrition) nutritionData = diaryData.nutrition;
        } else {
            nutritionData = { weeks: [], currentWeekId: null };
        }
        
        // Migrate old dates to include year
        if (typeof migrateNutritionDates === 'function') {
            migrateNutritionDates();
        }
        
        if (financeDataSnap) {
            if (financeDataSnap.transactions) financeData.transactions = financeDataSnap.transactions;
            if (financeDataSnap.savings) financeData.savings = financeDataSnap.savings;
            if (financeDataSnap.planned) financeData.planned = financeDataSnap.planned;
            if (financeDataSnap.categories) financeData.categories = financeDataSnap.categories;
        }
        
        // Загружаем тренировки из Firebase (или сидируем если пусто)
        if (typeof TrainingExerciseAPI !== 'undefined') {
            if (trainingDataSnap) {
                var tv = trainingDataSnap.version || 1;
                var te = trainingDataSnap.exercises || [];
                var tw = trainingDataSnap.workouts || [];
                TrainingExerciseAPI.loadFromFirebase({ version: tv, exercises: te, workouts: tw });
            } else {
                // Нет данных в Firebase — load из localStorage (там может быть сид)
                TrainingExerciseAPI.load();
            }
        }
        
        isInitialLoad = false;
        renderNutritionAll();
        renderFinanceDashboard();
        updateFinanceStats();
        
        // Re-render home page if it's currently visible
        const homeTab = document.getElementById('main-tab-home');
        if(homeTab && homeTab.classList.contains('active')) {
            renderHomePage();
        }
        
        // Apply read-only state AFTER all rendering is done
        applyReadOnlyState();
    }).catch(function(error) {
        isInitialLoad = false;
    });
}

// ============ ACCESS MANAGEMENT ============

window.openAccessModal = function() {
    var uid = currentUserId;
    if (!uid) return;
    
    usersRef.child(uid).once('value').then(function(snap) {
        var userData = snap.val() || { readers: {} };
        var readers = userData.readers || {};
        
        var html = '<div class="modal-overlay visible" id="access-modal" onclick="if(event.target===this)closeAccessModal()">\
            <div class="modal">\
                <div class="modal-header">\
                    <h3 class="modal-title">👥 Управление доступом</h3>\
                    <button class="modal-close" onclick="closeAccessModal()">✕</button>\
                </div>\
                <div class="modal-body reader-modal">\
                    <h4 style="margin:0 0 12px;color:#7e22ce;">Список читателей</h4>';
        
        var readerKeys = Object.keys(readers);
        if (readerKeys.length === 0) {
            html += '<p style="color:#94a3b8;font-size:13px;">Нет добавленных читателей</p>';
        } else {
            for (var i = 0; i < readerKeys.length; i++) {
                var rUid = readerKeys[i];
                var rEmail = readers[rUid] || 'Неизвестно';
                html += '<div class="reader-item">\
                    <span>📧 ' + rEmail + '</span>\
                    <button class="remove-reader" onclick="removeReader(\'' + rUid + '\')">🗑 Удалить</button>\
                </div>';
            }
        }
        
        html += '<h4 style="margin:16px 0 8px;color:#7e22ce;">Добавить читателя</h4>\
                    <div class="add-reader-row">\
                        <input type="email" id="add-reader-email" placeholder="Email читателя">\
                        <button onclick="addReader()">Добавить</button>\
                    </div>\
                    <div id="add-reader-error" style="color:#dc2626;font-size:12px;margin-top:6px;display:none;"></div>\
                    <div style="font-size:11px;color:#7e22ce;margin-top:8px;">ℹ️ Читатель должен быть зарегистрирован в приложении. Введите его email.</div>\
                </div>\
                <div class="modal-footer">\
                    <button class="btn" onclick="closeAccessModal()">Закрыть</button>\
                </div>\
            </div>\
        </div>';
        
        var old = document.getElementById('access-modal');
        if (old) old.remove();
        
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

window.closeAccessModal = function() {
    var modal = document.getElementById('access-modal');
    if (modal) modal.remove();
}

window.addReader = function() {
    var email = document.getElementById('add-reader-email').value.trim();
    var errorEl = document.getElementById('add-reader-error');
    errorEl.style.display = 'none';
    
    if (!email) { errorEl.textContent = 'Введите email'; errorEl.style.display = 'block'; return; }
    
    createReaderUser(email);
}

window.createReaderUser = function(email) {
    var errorEl = document.getElementById('add-reader-error');
    
    usersRef.orderByChild('email').equalTo(email).once('value', function(snap) {
        var found = false;
        snap.forEach(function(childSnap) {
            var userData = childSnap.val();
            var existingUid = childSnap.key;
            
            if (existingUid === currentUserId) {
                errorEl.textContent = '❌ Это ваш собственный аккаунт';
                errorEl.style.display = 'block';
                found = true;
                return;
            }
            
            usersRef.child(existingUid).update({
                role: 'reader',
                ownerUid: currentUserId
            }).then(function() {
                usersRef.child(currentUserId).child('readers').child(existingUid).set(email);
                showSyncStatus('✅ Читатель добавлен!', 'success');
                closeAccessModal();
                openAccessModal();
            }).catch(function(error) {
                errorEl.textContent = '❌ Ошибка: ' + error.message;
                errorEl.style.display = 'block';
            });
            found = true;
        });
        
        if (!found) {
            errorEl.textContent = '❌ Пользователь с таким email не найден. Убедитесь, что он зарегистрирован в приложении.';
            errorEl.style.display = 'block';
        }
    }).catch(function(error) {
        errorEl.textContent = '❌ Ошибка: ' + error.message;
        errorEl.style.display = 'block';
    });
}

window.removeReader = function(readerUid) {
    customConfirm('Удалить читателя?', 'Подтверждение удаления')
        .then(confirmed => {
            if (!confirmed) return;
            
            usersRef.child(currentUserId).child('readers').child(readerUid).remove().then(function() {
                usersRef.child(readerUid).update({
                    role: 'reader',
                    ownerUid: null
                }).catch(console.error);
                showSyncStatus('✅ Читатель удалён', 'success');
                closeAccessModal();
                openAccessModal();
            });
        });
}

window.toggleViewMode = function() {
    if (currentUserRole !== 'admin') return;
    isReadOnlyMode = !isReadOnlyMode;
    renderUserBar();
    applyReadOnlyState();
    showSyncStatus(isReadOnlyMode ? '👁 Режим просмотра' : '✏️ Режим редактирования', 'success');
}

// ============ AUTH STATE LISTENER ============

window.hideAuthOverlay = function() {
    var el = document.getElementById('auth-overlay');
    if (el) el.style.display = 'none';
}

window.showAuthOverlay = function() {
    var el = document.getElementById('auth-overlay');
    if (el) el.style.display = 'flex';
}

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        currentUser = user;
        currentUserId = user.uid;
        hideAuthOverlay();
        // Don't call initUserSession here - it's called from loginUser/registerUser
        // to avoid duplicate data loading. Only call if not already initializing.
        if (!window._authInitInProgress) {
            window._authInitInProgress = true;
            initUserSession(user.uid);
        }
    } else {
        currentUser = null;
        currentUserId = null;
        currentUserRole = 'admin';
        isReadOnlyMode = false;
        viewingUserId = null;
        window._authInitInProgress = false;
        showAuthOverlay();
        renderUserBar();
        applyReadOnlyState();
    }
});
