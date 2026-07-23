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
    return new Promise((resolve, reject) => {
        const oldDiaryRef = db.ref('lera_diary_v1');
        const oldFinanceRef = db.ref('lera_finance_v1');
        
        oldDiaryRef.once('value').then((snap) => {
            const oldData = snap.val();
            const hasDiaryData = oldData && oldData.nutrition && oldData.nutrition.weeks && oldData.nutrition.weeks.length > 0;
            
            oldFinanceRef.once('value').then((finSnap) => {
                const oldFinData = finSnap.val();
                const hasFinanceData = oldFinData && oldFinData.transactions && oldFinData.transactions.length > 0;
                
                if (!hasDiaryData && !hasFinanceData) {
                    console.log('ℹ️ No old data to migrate');
                    resolve();
                    return;
                }
                
                const diaryPath = `lera_diary_v1/${uid}`;
                const financePath = `lera_finance_v1/${uid}`;
                
                const promises = [];
                
                if (hasDiaryData) {
                    const migrationData = {
                        nutrition: oldData.nutrition,
                        workouts: oldData.workouts || [],
                        progress: oldData.progress || {},
                        migratedFrom: 'root',
                        migratedAt: Date.now(),
                        lastUpdated: Date.now()
                    };
                    promises.push(db.ref(diaryPath).set(migrationData));
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
                }
                
                Promise.all(promises).then(() => {
                    console.log('✅ Old data migrated to user:', uid);
                    showSyncStatus('📦 Старые данные перенесены в ваш аккаунт!', 'success');
                    resolve();
                }).catch((error) => {
                    console.error('❌ Migration error:', error);
                    reject(error);
                });
            }).catch(reject);
        }).catch(reject);
    });
}

function switchDataContext(uid) {
    window._activeDiaryRef = db.ref(`lera_diary_v1/${uid}`);
    window._activeFinanceRef = db.ref(`lera_finance_v1/${uid}`);
    loadDataForUser(uid);
}

function loadDataForUser(uid) {
    const diaryPath = `lera_diary_v1/${uid}`;
    const financePath = `lera_finance_v1/${uid}`;
    
    const diaryLoad = db.ref(diaryPath).once('value');
    const financeLoad = db.ref(financePath).once('value');
    
    Promise.all([diaryLoad, financeLoad]).then(([diarySnap, financeSnap]) => {
        const diaryData = diarySnap.val();
        const financeDataSnap = financeSnap.val();
        
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
    }).catch((error) => {
        console.error('❌ Load data error:', error);
        isInitialLoad = false;
    });
}

// ============ ACCESS MANAGEMENT ============

function openAccessModal() {
    const uid = currentUserId;
    if (!uid) return;
    
    usersRef.child(uid).once('value').then((snap) => {
        const userData = snap.val() || { readers: {} };
        const readers = userData.readers || {};
        
        let html = `<div class="modal-overlay visible" id="access-modal" onclick="if(event.target===this)closeAccessModal()">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">👥 Управление доступом</h3>
                    <button class="modal-close" onclick="closeAccessModal()">✕</button>
                </div>
                <div class="modal-body reader-modal">
                    <h4 style="margin:0 0 12px;color:#7e22ce;">📋 Список читателей</h4>`;
        
        const readerKeys = Object.keys(readers);
        if (readerKeys.length === 0) {
            html += `<p style="color:#94a3b8;font-size:13px;">Нет добавленных читателей</p>`;
        } else {
            readerKeys.forEach(rUid => {
                const rEmail = readers[rUid] || 'Неизвестно';
                html += `<div class="reader-item">
                    <span>📧 ${rEmail}</span>
                    <button class="remove-reader" onclick="removeReader('${rUid}')">🗑 Удалить</button>
                </div>`;
            });
        }
        
        html += `<h4 style="margin:16px 0 8px;color:#7e22ce;">➕ Добавить читателя</h4>
                    <div class="add-reader-row">
                        <input type="email" id="add-reader-email" placeholder="Email читателя">
                        <button onclick="addReader()">➕ Добавить</button>
                    </div>
                    <div id="add-reader-error" style="color:#dc2626;font-size:12px;margin-top:6px;display:none;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="closeAccessModal()">Закрыть</button>
                </div>
            </div>
        </div>`;
        
        const old = document.getElementById('access-modal');
        if (old) old.remove();
        
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function closeAccessModal() {
    const modal = document.getElementById('access-modal');
    if (modal) modal.remove();
}

function addReader() {
    const email = document.getElementById('add-reader-email').value.trim();
    const errorEl = document.getElementById('add-reader-error');
    errorEl.style.display = 'none';
    
    if (!email) { errorEl.textContent = '❌ Введите email'; errorEl.style.display = 'block'; return; }
    
    usersRef.orderByChild('email').equalTo(email).once('value').then((snap) => {
        let foundUid = null;
        snap.forEach(child => {
            const data = child.val();
            if (data.role === 'reader' && data.ownerUid === currentUserId) {
                foundUid = child.key;
            }
        });
        
        firebase.auth().fetchSignInMethodsForEmail(email).then((methods) => {
            if (methods.length > 0) {
                usersRef.orderByChild('email').equalTo(email).once('value').then((snap2) => {
                    let existingUid = null;
                    snap2.forEach(child => {
                        existingUid = child.key;
                    });
                    
                    if (existingUid) {
                        usersRef.child(existingUid).update({
                            role: 'reader',
                            ownerUid: currentUserId
                        }).then(() => {
                            usersRef.child(currentUserId).child('readers').child(existingUid).set(email);
                            showSyncStatus('✅ Читатель добавлен!', 'success');
                            closeAccessModal();
                            openAccessModal();
                        });
                    } else {
                        createReaderUser(email);
                    }
                });
            } else {
                createReaderUser(email);
            }
        }).catch(() => {
            createReaderUser(email);
        });
    });
}

function createReaderUser(email) {
    const tempUid = 'reader-' + email.replace(/[^a-zA-Z0-9]/g, '');
    usersRef.child(tempUid).set({
        email: email,
        role: 'reader',
        ownerUid: currentUserId,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        usersRef.child(currentUserId).child('readers').child(tempUid).set(email);
        showSyncStatus('✅ Читатель добавлен!', 'success');
        closeAccessModal();
        openAccessModal();
    }).catch((error) => {
        document.getElementById('add-reader-error').textContent = '❌ Ошибка: ' + error.message;
        document.getElementById('add-reader-error').style.display = 'block';
    });
}

function removeReader(readerUid) {
    if (!confirm('Удалить читателя?')) return;
    
    usersRef.child(currentUserId).child('readers').child(readerUid).remove().then(() => {
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
firebase.auth().onAuthStateChanged((user) => {
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

