// ============ AUTH FUNCTIONS ============

function showMigrationStatus(message, type) {
    var el = document.getElementById('migration-status');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    el.style.background = type === 'success' ? '#f0fdf4' : (type === 'error' ? '#fef2f2' : '#fffbeb');
    el.style.color = type === 'success' ? '#166534' : (type === 'error' ? '#991b1b' : '#92400e');
    el.style.border = '1px solid ' + (type === 'success' ? '#bbf7d0' : (type === 'error' ? '#fecaca' : '#fde68a'));
    console.log('[MIGRATION] ' + message);
    setTimeout(function() { el.style.display = 'none'; }, 8000);
}

function renderUserBar() {
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
        html += `<button class="user-bar-btn view" onclick="forceMigrateOldData()" title="Перенести старые данные в аккаунт">🔄 Migrate</button>`;
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

function renderReadOnlyBanner() {
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

function applyReadOnlyState() {
    const isReadOnly = currentUserRole === 'reader' || isReadOnlyMode;
    document.querySelectorAll('input:not([type="file"]), textarea, select, button:not(.user-bar-btn):not(.main-tab-btn):not(.sub-tab-btn)').forEach(el => {
        if (isReadOnly) {
            el.classList.add('read-only-input');
            el.disabled = true;
        } else {
            el.classList.remove('read-only-input');
            el.disabled = false;
        }
    });
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isReadOnly ? 'none' : '';
    });
}

function registerUser() {
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
                console.log('✅ User registered as admin:', uid);
                successEl.textContent = '✅ Регистрация успешна!';
                successEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Зарегистрироваться';
                document.getElementById('auth-overlay').classList.add('hidden');
                initUserSession(uid);
            });
        })
        .catch((error) => {
            console.error('❌ Register error:', error);
            errorEl.textContent = '❌ ' + translateFirebaseError(error.code);
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Зарегистрироваться';
        });
}

function loginUser() {
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
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((cred) => {
            const uid = cred.user.uid;
            console.log('✅ User logged in:', uid);
            successEl.textContent = '✅ Вход выполнен!';
            successEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Войти';
            document.getElementById('auth-overlay').classList.add('hidden');
            initUserSession(uid);
        })
        .catch((error) => {
            console.error('❌ Login error:', error);
            errorEl.textContent = '❌ ' + translateFirebaseError(error.code);
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Войти';
        });
}

function logoutUser() {
    firebase.auth().signOut().then(() => {
        currentUser = null;
        currentUserRole = 'admin';
        currentUserId = null;
        isReadOnlyMode = false;
        viewingUserId = null;
        document.getElementById('auth-overlay').classList.remove('hidden');
        renderUserBar();
        applyReadOnlyState();
        console.log('✅ User logged out');
    }).catch((error) => {
        console.error('❌ Logout error:', error);
    });
}

function translateFirebaseError(code) {
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

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.auth-form-content').forEach(f => f.classList.toggle('active', f.id === 'auth-form-' + tab));
    
    const btn = document.querySelector('#auth-form-register .auth-btn');
    const errorEl = document.getElementById('auth-reg-error');
    const successEl = document.getElementById('auth-reg-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (tab === 'login') {
        btn.textContent = 'Войти';
        btn.onclick = loginUser;
    } else {
        btn.textContent = 'Зарегистрироваться';
        btn.onclick = registerUser;
    }
}

function initUserSession(uid) {
    currentUserId = uid;
    usersRef.child(uid).once('value').then((snap) => {
        const userData = snap.val();
        if (userData) {
            currentUserRole = userData.role || 'admin';
            viewingUserId = userData.ownerUid || uid;
            
            // Check if migration was already completed
            var migrationCompleted = userData.migration && userData.migration.completed === true;
            
            if (currentUserRole === 'reader') {
                const ownerUid = userData.ownerUid;
                if (ownerUid) {
                    viewingUserId = ownerUid;
                    switchDataContext(ownerUid);
                }
            } else {
                viewingUserId = uid;
                
                // If migration not completed yet, run it before loading data
                if (!migrationCompleted) {
                    migrateOldData(uid).then(() => {
                        switchDataContext(uid);
                        renderUserBar();
                        applyReadOnlyState();
                    }).catch(() => {
                        switchDataContext(uid);
                        renderUserBar();
                        applyReadOnlyState();
                    });
                    return;
                }
                
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
            migrateOldData(uid).then(() => {
                switchDataContext(uid);
            }).catch(() => {
                switchDataContext(uid);
            });
            return;
        }
        
        renderUserBar();
        applyReadOnlyState();
    });
}

// ============ MIGRATION ============

function forceMigrateOldData() {
    var uid = currentUserId || viewingUserId;
    if (!uid) {
        showMigrationStatus('❌ Сначала войдите в аккаунт', 'error');
        return;
    }
    showMigrationStatus('⏳ Проверяю старые данные...', 'info');
    console.log('[MIGRATION] Manual migration triggered for user:', uid);
    
    // Reset migration flag so it runs again
    usersRef.child(uid).child('migration').update({ completed: false }).then(function() {
        migrateOldData(uid).then(function() {
            showMigrationStatus('✅ Миграция завершена! Перезагружаю данные...', 'success');
            // Reload data
            switchDataContext(uid);
        }).catch(function(error) {
            showMigrationStatus('❌ Ошибка миграции: ' + error.message, 'error');
        });
    }).catch(function(error) {
        showMigrationStatus('❌ Ошибка: ' + error.message, 'error');
    });
}

function migrateOldData(uid) {
    return new Promise(function(resolve, reject) {
        var oldDiaryRef = db.ref('lera_diary_v1');
        var oldFinanceRef = db.ref('lera_finance_v1');
        var diaryPath = 'lera_diary_v1/' + uid;
        var financePath = 'lera_finance_v1/' + uid;
        var promises = [];
        var diaryMigrated = false;
        var financeMigrated = false;
        
        // Step 1: Read existing user data (to not overwrite)
        Promise.all([
            db.ref(diaryPath).once('value'),
            db.ref(financePath).once('value'),
            oldDiaryRef.once('value'),
            oldFinanceRef.once('value')
        ]).then(function(results) {
            var userDiarySnap = results[0];
            var userFinanceSnap = results[1];
            var oldDiarySnap = results[2];
            var oldFinanceSnap = results[3];
            
            var userDiaryData = userDiarySnap.val();
            var userFinanceData = userFinanceSnap.val();
            var oldDiaryData = oldDiarySnap.val();
            var oldFinData = oldFinanceSnap.val();
            
            // ======================================================
            // MIGRATE FROM ROOT FIREBASE NODE (lera_diary_v1 root)
            // ======================================================
            if (oldDiaryData && oldDiaryData.nutrition && oldDiaryData.nutrition.weeks && oldDiaryData.nutrition.weeks.length > 0) {
                // Check if user already has data — merge, don't overwrite
                var targetNutrition = (userDiaryData && userDiaryData.nutrition) ? 
                    mergeNutritionData(userDiaryData.nutrition, oldDiaryData.nutrition) : 
                    oldDiaryData.nutrition;
                var targetWorkouts = (userDiaryData && userDiaryData.workouts && userDiaryData.workouts.length > 0) ?
                    mergeWorkoutsData(userDiaryData.workouts, oldDiaryData.workouts || []) :
                    (oldDiaryData.workouts || []);
                var targetProgress = (userDiaryData && userDiaryData.progress) ?
                    mergeProgressData(userDiaryData.progress, oldDiaryData.progress || {}) :
                    (oldDiaryData.progress || {});
                
                promises.push(db.ref(diaryPath).update({
                    nutrition: targetNutrition,
                    workouts: targetWorkouts,
                    progress: targetProgress,
                    lastUpdated: Date.now()
                }));
                diaryMigrated = true;
                console.log('Migrating root Firebase diary data to user:', uid);
            }
            
            // ======================================================
            // MIGRATE FROM ROOT FIREBASE NODE (lera_finance_v1 root)
            // ======================================================
            if (oldFinData) {
                var hasFinanceData = (
                    (oldFinData.transactions && oldFinData.transactions.length > 0) ||
                    (oldFinData.savings && oldFinData.savings.length > 0) ||
                    (oldFinData.planned && oldFinData.planned.length > 0)
                );
                
                if (hasFinanceData) {
                    var targetFinance = {};
                    
                    if (userFinanceData && userFinanceData.transactions && userFinanceData.transactions.length > 0) {
                        targetFinance.transactions = mergeFinanceTransactions(userFinanceData.transactions, oldFinData.transactions || []);
                    } else {
                        targetFinance.transactions = oldFinData.transactions || [];
                    }
                    
                    if (userFinanceData && userFinanceData.savings && userFinanceData.savings.length > 0) {
                        targetFinance.savings = mergeById(userFinanceData.savings, oldFinData.savings || []);
                    } else {
                        targetFinance.savings = oldFinData.savings || [];
                    }
                    
                    if (userFinanceData && userFinanceData.planned && userFinanceData.planned.length > 0) {
                        targetFinance.planned = mergeById(userFinanceData.planned, oldFinData.planned || []);
                    } else {
                        targetFinance.planned = oldFinData.planned || [];
                    }
                    
                    targetFinance.categories = oldFinData.categories || [];
                    targetFinance.lastUpdated = Date.now();
                    
                    promises.push(db.ref(financePath).update(targetFinance));
                    financeMigrated = true;
                    console.log('Migrating root Firebase finance data to user:', uid);
                }
            }
            
            // ======================================================
            // MIGRATE FROM localStorage (if no Firebase root data)
            // ======================================================
            if (!diaryMigrated) {
                var lsNutrition = localStorage.getItem('nutrition-data');
                var lsWorkouts = localStorage.getItem('workouts-data');
                var lsProgress = localStorage.getItem('exercise-progress');
                
                if (lsNutrition || lsWorkouts) {
                    var lsData = { nutrition: null, workouts: [], progress: {} };
                    try {
                        if (lsNutrition) {
                            var parsed = JSON.parse(lsNutrition);
                            if (parsed && parsed.weeks && parsed.weeks.length > 0) {
                                lsData.nutrition = parsed;
                            }
                        }
                        if (lsWorkouts) {
                            var parsed2 = JSON.parse(lsWorkouts);
                            if (parsed2 && parsed2.workouts) {
                                lsData.workouts = parsed2.workouts;
                            }
                        }
                        if (lsProgress) {
                            lsData.progress = JSON.parse(lsProgress);
                        }
                        
                        if (lsData.nutrition || lsData.workouts.length > 0) {
                            // Merge with existing user data
                            var targetNutrition = lsData.nutrition || { weeks: [], currentWeekId: null };
                            var targetWorkouts = lsData.workouts || [];
                            var targetProgress = lsData.progress || {};
                            
                            if (userDiaryData && userDiaryData.nutrition) {
                                targetNutrition = mergeNutritionData(userDiaryData.nutrition, targetNutrition);
                            }
                            if (userDiaryData && userDiaryData.workouts && userDiaryData.workouts.length > 0) {
                                targetWorkouts = mergeWorkoutsData(userDiaryData.workouts, targetWorkouts);
                            }
                            if (userDiaryData && userDiaryData.progress) {
                                targetProgress = mergeProgressData(userDiaryData.progress, targetProgress);
                            }
                            
                            promises.push(db.ref(diaryPath).update({
                                nutrition: targetNutrition,
                                workouts: targetWorkouts,
                                progress: targetProgress,
                                lastUpdated: Date.now()
                            }));
                            diaryMigrated = true;
                            console.log('Migrating localStorage diary data for user:', uid);
                            
                            // Also update in-memory data
                            if (lsData.nutrition) {
                                nutritionData = targetNutrition;
                            }
                            if (lsData.workouts.length > 0) {
                                workouts = targetWorkouts;
                            }
                            if (lsData.progress) {
                                localStorage.setItem('exercise-progress', JSON.stringify(lsData.progress));
                            }
                        }
                    } catch(e) {
                        console.error('Error parsing localStorage data:', e);
                    }
                }
            }
            
            // ======================================================
            // MIGRATE localStorage finance (if no Firebase root finance)
            // ======================================================
            if (!financeMigrated) {
                var lsFinance = localStorage.getItem('finance-data');
                if (lsFinance) {
                    try {
                        var parsedFinance = JSON.parse(lsFinance);
                        var hasLsFinance = (
                            (parsedFinance.transactions && parsedFinance.transactions.length > 0) ||
                            (parsedFinance.savings && parsedFinance.savings.length > 0) ||
                            (parsedFinance.planned && parsedFinance.planned.length > 0)
                        );
                        
                        if (hasLsFinance) {
                            var targetFinance = {
                                transactions: parsedFinance.transactions || [],
                                savings: parsedFinance.savings || [],
                                planned: parsedFinance.planned || [],
                                categories: parsedFinance.categories || [],
                                lastUpdated: Date.now()
                            };
                            
                            // Merge with existing user finance data
                            if (userFinanceData && userFinanceData.transactions && userFinanceData.transactions.length > 0) {
                                targetFinance.transactions = mergeFinanceTransactions(userFinanceData.transactions, targetFinance.transactions);
                            }
                            if (userFinanceData && userFinanceData.savings && userFinanceData.savings.length > 0) {
                                targetFinance.savings = mergeById(userFinanceData.savings, targetFinance.savings);
                            }
                            if (userFinanceData && userFinanceData.planned && userFinanceData.planned.length > 0) {
                                targetFinance.planned = mergeById(userFinanceData.planned, targetFinance.planned);
                            }
                            if (userFinanceData && userFinanceData.categories) {
                                targetFinance.categories = userFinanceData.categories;
                            }
                            
                            promises.push(db.ref(financePath).update(targetFinance));
                            financeMigrated = true;
                            console.log('Migrating localStorage finance data for user:', uid);
                        }
                    } catch(e) {
                        console.error('Error parsing localStorage finance data:', e);
                    }
                }
            }
            
            if (promises.length === 0) {
                console.log('No old data to migrate');
                resolve();
                return;
            }
            
            Promise.all(promises).then(function() {
                console.log('Old data migrated to user:', uid);
                showSyncStatus('✅ Старые данные перенесены в ваш аккаунт!', 'success');
                
                // Mark migration as completed in user profile
                usersRef.child(uid).child('migration').update({
                    completed: true,
                    diaryMigrated: diaryMigrated,
                    financeMigrated: financeMigrated,
                    migratedAt: Date.now()
                }).catch(console.error);
                
                resolve();
            }).catch(function(error) {
                console.error('Migration error:', error);
                reject(error);
            });
        }).catch(function(error) { reject(error); });
    });
}

// ============ MERGE HELPERS ============

function mergeNutritionData(existing, incoming) {
    if (!existing || !existing.weeks) return incoming;
    if (!incoming || !incoming.weeks) return existing;
    
    var existingIds = {};
    existing.weeks.forEach(function(w) { existingIds[w.id] = true; });
    
    var merged = {
        weeks: existing.weeks.slice(),
        currentWeekId: existing.currentWeekId || incoming.currentWeekId,
        data: Object.assign({}, incoming.data || {}, existing.data || {})
    };
    
    incoming.weeks.forEach(function(w) {
        if (!existingIds[w.id]) {
            merged.weeks.push(w);
        } else {
            // Merge week data
            var existingWeek = merged.weeks.find(function(ew) { return ew.id === w.id; });
            if (existingWeek && w.data) {
                existingWeek.data = Object.assign({}, w.data, existingWeek.data || {});
            }
        }
    });
    
    return merged;
}

function mergeWorkoutsData(existing, incoming) {
    var existingIds = {};
    existing.forEach(function(w) { existingIds[w.id] = true; });
    var merged = existing.slice();
    incoming.forEach(function(w) {
        if (!existingIds[w.id]) {
            merged.push(w);
        }
    });
    return merged;
}

function mergeProgressData(existing, incoming) {
    var merged = Object.assign({}, incoming || {}, existing || {});
    // Deep merge: for each exercise name, merge by workoutId
    Object.keys(merged).forEach(function(exName) {
        if (existing && existing[exName] && incoming && incoming[exName]) {
            var existingWorkoutIds = {};
            existing[exName].forEach(function(e) { existingWorkoutIds[e.workoutId] = true; });
            var mergedEntries = existing[exName].slice();
            incoming[exName].forEach(function(e) {
                if (!existingWorkoutIds[e.workoutId]) {
                    mergedEntries.push(e);
                }
            });
            merged[exName] = mergedEntries;
        }
    });
    return merged;
}

function mergeFinanceTransactions(existing, incoming) {
    var existingIds = {};
    existing.forEach(function(t) { existingIds[t.id] = true; });
    var merged = existing.slice();
    incoming.forEach(function(t) {
        if (t.id && !existingIds[t.id]) {
            merged.push(t);
        }
    });
    return merged;
}

function mergeById(existing, incoming) {
    var existingIds = {};
    existing.forEach(function(item) { existingIds[item.id] = true; });
    var merged = existing.slice();
    incoming.forEach(function(item) {
        if (item.id && !existingIds[item.id]) {
            merged.push(item);
        }
    });
    return merged;
}

function switchDataContext(uid) {
    window._activeDiaryRef = db.ref('lera_diary_v1/' + uid);
    window._activeFinanceRef = db.ref('lera_finance_v1/' + uid);
    loadDataForUser(uid);
}

function loadDataForUser(uid) {
    var diaryPath = 'lera_diary_v1/' + uid;
    var financePath = 'lera_finance_v1/' + uid;
    
    var diaryLoad = db.ref(diaryPath).once('value');
    var financeLoad = db.ref(financePath).once('value');
    
    Promise.all([diaryLoad, financeLoad]).then(function(results) {
        var diarySnap = results[0];
        var financeSnap = results[1];
        var diaryData = diarySnap.val();
        var financeDataSnap = financeSnap.val();
        
        if (diaryData) {
            if (diaryData.nutrition) nutritionData = diaryData.nutrition;
            if (diaryData.workouts) workouts = diaryData.workouts;
            if (diaryData.progress) localStorage.setItem('exercise-progress', JSON.stringify(diaryData.progress));
        } else {
            nutritionData = { weeks: [], currentWeekId: null };
            workouts = [];
        }
        
        if (financeDataSnap) {
            if (financeDataSnap.transactions) financeData.transactions = financeDataSnap.transactions;
            if (financeDataSnap.savings) financeData.savings = financeDataSnap.savings;
            if (financeDataSnap.planned) financeData.planned = financeDataSnap.planned;
            if (financeDataSnap.categories) financeData.categories = financeDataSnap.categories;
        }
        
        isInitialLoad = false;
        renderNutritionAll();
        renderTrainAll();
        renderFinanceDashboard();
        updateFinanceStats();
    }).catch(function(error) {
        console.error('Load data error:', error);
        isInitialLoad = false;
    });
}

// ============ ACCESS MANAGEMENT ============

function openAccessModal() {
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

function closeAccessModal() {
    var modal = document.getElementById('access-modal');
    if (modal) modal.remove();
}

function addReader() {
    var email = document.getElementById('add-reader-email').value.trim();
    var errorEl = document.getElementById('add-reader-error');
    errorEl.style.display = 'none';
    
    if (!email) { errorEl.textContent = 'Введите email'; errorEl.style.display = 'block'; return; }
    
    createReaderUser(email);
}

function createReaderUser(email) {
    // Find if user exists in Firebase Auth by searching users db
    var errorEl = document.getElementById('add-reader-error');
    
    usersRef.orderByChild('email').equalTo(email).once('value', function(snap) {
        var found = false;
        snap.forEach(function(childSnap) {
            var userData = childSnap.val();
            var existingUid = childSnap.key;
            
            // Check this user is not already a reader for current admin
            if (existingUid === currentUserId) {
                errorEl.textContent = '❌ Это ваш собственный аккаунт';
                errorEl.style.display = 'block';
                found = true;
                return;
            }
            
            // Set role to reader and link to current admin
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

function removeReader(readerUid) {
    if (!confirm('Удалить читателя?')) return;
    
    usersRef.child(currentUserId).child('readers').child(readerUid).remove().then(function() {
        usersRef.child(readerUid).update({
            role: 'reader',
            ownerUid: null
        }).catch(console.error);
        showSyncStatus('✅ Читатель удалён', 'success');
        closeAccessModal();
        openAccessModal();
    });
}

function toggleViewMode() {
    if (currentUserRole !== 'admin') return;
    isReadOnlyMode = !isReadOnlyMode;
    renderUserBar();
    applyReadOnlyState();
    showSyncStatus(isReadOnlyMode ? '👁 Режим просмотра' : '✏️ Режим редактирования', 'success');
}

// ============ AUTH STATE LISTENER ============

firebase.auth().onAuthStateChanged(function(user) {
    currentUser = user;
    if (user) {
        currentUserId = user.uid;
        document.getElementById('auth-overlay').classList.add('hidden');
        initUserSession(user.uid);
    } else {
        currentUser = null;
        currentUserId = null;
        currentUserRole = 'admin';
        isReadOnlyMode = false;
        viewingUserId = null;
        document.getElementById('auth-overlay').classList.remove('hidden');
        renderUserBar();
        applyReadOnlyState();
    }
});
