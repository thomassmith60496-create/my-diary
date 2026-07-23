// ============ AUTH FUNCTIONS ============

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

function migrateOldData(uid) {
    return new Promise(function(resolve, reject) {
        var oldDiaryRef = db.ref('lera_diary_v1');
        var oldFinanceRef = db.ref('lera_finance_v1');
        var firebaseHasData = false;
        
        oldDiaryRef.once('value').then(function(snap) {
            var oldData = snap.val();
            var hasDiaryData = oldData && oldData.nutrition && oldData.nutrition.weeks && oldData.nutrition.weeks.length > 0;
            
            oldFinanceRef.once('value').then(function(finSnap) {
                var oldFinData = finSnap.val();
                var hasFinanceData = oldFinData && oldFinData.transactions && oldFinData.transactions.length > 0;
                firebaseHasData = hasDiaryData || hasFinanceData;
                
                var diaryPath = 'lera_diary_v1/' + uid;
                var financePath = 'lera_finance_v1/' + uid;
                var promises = [];
                
                if (hasDiaryData) {
                    var migrationData = {
                        nutrition: oldData.nutrition,
                        workouts: oldData.workouts || [],
                        progress: oldData.progress || {},
                        migratedFrom: 'root',
                        migratedAt: Date.now(),
                        lastUpdated: Date.now()
                    };
                    promises.push(db.ref(diaryPath).set(migrationData));
                    console.log('Migrating Firebase diary data for user:', uid);
                }
                
                if (hasFinanceData) {
                    promises.push(db.ref(financePath).set({
                        transactions: oldFinData.transactions || [],
                        savings: oldFinData.savings || [],
                        planned: oldFinData.planned || [],
                        categories: oldFinData.categories || [],
                        migratedFrom: 'root',
                        migratedAt: Date.now(),
                        lastUpdated: Date.now()
                    }));
                    console.log('Migrating Firebase finance data for user:', uid);
                }
                
                if (!firebaseHasData) {
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
                                promises.push(db.ref(diaryPath).set({
                                    nutrition: lsData.nutrition || { weeks: [], currentWeekId: null },
                                    workouts: lsData.workouts || [],
                                    progress: lsData.progress || {},
                                    migratedFrom: 'localStorage',
                                    migratedAt: Date.now(),
                                    lastUpdated: Date.now()
                                }));
                                console.log('Migrating localStorage diary data for user:', uid);
                                if (lsData.nutrition) nutritionData = lsData.nutrition;
                                if (lsData.workouts.length > 0) workouts = lsData.workouts;
                                if (lsData.progress) localStorage.setItem('exercise-progress', JSON.stringify(lsData.progress));
                            }
                        } catch(e) {
                            console.error('Error parsing localStorage data:', e);
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
                    showSyncStatus('Starye dannye pereneseny v vash akkaunt!', 'success');
                    resolve();
                }).catch(function(error) {
                    console.error('Migration error:', error);
                    reject(error);
                });
            }).catch(function(error) { reject(error); });
        }).catch(function(error) { reject(error); });
    });
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
                    <h3 class="modal-title">👥 Upravlenie dostupom</h3>\
                    <button class="modal-close" onclick="closeAccessModal()">✕</button>\
                </div>\
                <div class="modal-body reader-modal">\
                    <h4 style="margin:0 0 12px;color:#7e22ce;">Spisok chitateley</h4>';
        
        var readerKeys = Object.keys(readers);
        if (readerKeys.length === 0) {
            html += '<p style="color:#94a3b8;font-size:13px;">Net dobavlennykh chitateley</p>';
        } else {
            for (var i = 0; i < readerKeys.length; i++) {
                var rUid = readerKeys[i];
                var rEmail = readers[rUid] || 'Neizvestno';
                html += '<div class="reader-item">\
                    <span>📧 ' + rEmail + '</span>\
                    <button class="remove-reader" onclick="removeReader(\'' + rUid + '\')">🗑 Udalit</button>\
                </div>';
            }
        }
        
        html += '<h4 style="margin:16px 0 8px;color:#7e22ce;">Dobavit chitatelya</h4>\
                    <div class="add-reader-row">\
                        <input type="email" id="add-reader-email" placeholder="Email chitatelya">\
                        <button onclick="addReader()">Dobavit</button>\
                    </div>\
                    <div id="add-reader-error" style="color:#dc2626;font-size:12px;margin-top:6px;display:none;"></div>\
                </div>\
                <div class="modal-footer">\
                    <button class="btn" onclick="closeAccessModal()">Zakryt</button>\
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
    
    if (!email) { errorEl.textContent = 'Vvedite email'; errorEl.style.display = 'block'; return; }
    
    createReaderUser(email);
}

function createReaderUser(email) {
    var tempUid = 'reader-' + email.replace(/[^a-zA-Z0-9]/g, '');
    usersRef.child(tempUid).set({
        email: email,
        role: 'reader',
        ownerUid: currentUserId,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(function() {
        usersRef.child(currentUserId).child('readers').child(tempUid).set(email);
        showSyncStatus('Chitatel dobavlen!', 'success');
        closeAccessModal();
        openAccessModal();
    }).catch(function(error) {
        document.getElementById('add-reader-error').textContent = 'Oshibka: ' + error.message;
        document.getElementById('add-reader-error').style.display = 'block';
    });
}

function removeReader(readerUid) {
    if (!confirm('Udalit chitatelya?')) return;
    
    usersRef.child(currentUserId).child('readers').child(readerUid).remove().then(function() {
        usersRef.child(readerUid).update({
            role: 'reader',
            ownerUid: null
        }).catch(console.error);
        showSyncStatus('Chitatel udalen', 'success');
        closeAccessModal();
        openAccessModal();
    });
}

function toggleViewMode() {
    if (currentUserRole !== 'admin') return;
    isReadOnlyMode = !isReadOnlyMode;
    renderUserBar();
    applyReadOnlyState();
    showSyncStatus(isReadOnlyMode ? 'Rezhim prosmotra' : 'Rezhim redaktirovaniya', 'success');
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
