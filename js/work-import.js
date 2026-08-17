// ============================================
// 🔄 WORK IMPORT — синхронизация с Obsidian
// ============================================
"use strict";

/**
 * Запускает выбор папки vault
 */
function syncWorkFromObsidian() {
    const input = document.getElementById('work-vault-folder');
    if (input) input.click();
}

/**
 * Обработчик выбора папки
 * @param {HTMLInputElement} input — file input с webkitdirectory
 */
async function handleWorkFolderSelected(input) {
    const files = input.files;
    if (!files || files.length === 0) {
        customAlert('Папка не выбрана', 'Информация');
        return;
    }
    
    // Показываем индикатор загрузки
    showSyncStatus('📥 Чтение файлов из Obsidian...', 'syncing');
    
    try {
        // Определяем имя vault (первая часть пути)
        const firstPath = files[0].webkitRelativePath || files[0].name;
        const vaultName = firstPath.split('/')[0] || 'my vault';
        WorkData.workState.vaultName = vaultName;
        
        // Читаем только нужные .md файлы
        const relevantFiles = [];
        const allowedPrefixes = ['01 Projects/', '02 Meetings/', '03 Tasks/', '04 Knowledge/Ideas/'];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relPath = file.webkitRelativePath || file.name;
            
            // Фильтруем: только .md в нужных папках
            if (!relPath.endsWith('.md')) continue;
            if (!allowedPrefixes.some(p => relPath.startsWith(p))) continue;
            
            // Пропускаем шаблоны и системные файлы
            if (relPath.includes('_templates') || relPath.includes('.obsidian')) continue;
            
            const content = await readFileAsText(file);
            relevantFiles.push({ path: relPath, content });
        }
        
        if (relevantFiles.length === 0) {
            showSyncStatus('⚠️ Не найдено подходящих .md файлов в выбранных папках', 'warning');
            customAlert('В выбранной папке не найдено заметок в папках:\n01 Projects/, 02 Meetings/, 03 Tasks/, 04 Knowledge/Ideas/', 'Ошибка');
            return;
        }
        
        showSyncStatus(`📊 Парсинг ${relevantFiles.length} файлов...`, 'syncing');
        
        // Парсим файлы
        const entities = WorkParser.parseWorkFiles(relevantFiles, vaultName);
        
        // Идеи — отдельно из папки 04 Knowledge/Ideas
        const ideas = relevantFiles
            .filter(f => f.path.startsWith('04 Knowledge/Ideas/'))
            .map(f => {
                const parsed = WorkParser.parseMarkdownFile(f.content, f.path);
                return {
                    id: f.path,
                    name: f.path.replace(/^04 Knowledge\/Ideas\//, '').replace(/\.md$/, ''),
                    path: f.path,
                    status: WorkParser.normalizeStatus(parsed.frontmatter.статус) || 'новая',
                    text: parsed.body || '',
                    obsidianUrl: `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(f.path)}`
                };
            });
        entities.ideas = ideas;
        
        // Собираем snapshot
        const snapshot = WorkData.buildSnapshot(entities, vaultName);
        
        // Сохраняем в Firebase
        showSyncStatus('☁️ Сохранение в Firebase...', 'syncing');
        const saved = await WorkData.saveWorkSnapshot(snapshot);
        
        if (saved) {
            const stats = {
                projects: snapshot.projects.length,
                tasks: snapshot.tasks.length,
                meetings: snapshot.meetings.length,
                ideas: snapshot.ideas.length
            };
            showSyncStatus(`✅ Синхронизировано: ${stats.projects} проектов, ${stats.tasks} задач, ${stats.meetings} встреч, ${stats.ideas} идей`, 'success');
            updateWorkSyncInfo();
            
            // Перерисовываем текущую подвкладку
            if (typeof renderWorkSubTab === 'function') {
                const activeBtn = document.querySelector('#global-tab-work .work-sub-tab-btn.active');
                if (activeBtn) {
                    const tab = activeBtn.getAttribute('onclick').match(/'([^']+)'/);
                    if (tab) renderWorkSubTab(tab[1]);
                }
            }
        } else {
            showSyncStatus('❌ Ошибка сохранения в Firebase', 'error');
        }
        
    } catch (e) {
        console.error('Import error:', e);
        showSyncStatus('❌ Ошибка импорта: ' + e.message, 'error');
        customAlert('Ошибка при импорте: ' + e.message, 'Ошибка');
    }
    
    // Сбрасываем input
    input.value = '';
}

/**
 * Читает File как текст
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e.target.error);
        reader.readAsText(file);
    });
}

/**
 * Обновляет инфо о последней синхронизации
 */
function updateWorkSyncInfo() {
    const el = document.getElementById('work-sync-info');
    if (!el || !WorkData.workState.lastSyncTime) return;
    
    const date = new Date(WorkData.workState.lastSyncTime);
    const formatted = date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    el.textContent = `Последняя синхронизация: ${formatted} · Vault: ${WorkData.workState.vaultName}`;
    
    // Также показываем diff count
    const diff = WorkData.computeWorkDiff();
    if (diff.length > 0) {
        el.innerHTML += ` <span class="work-diff-badge">${diff.length} изменений</span>`;
    }
}

/**
 * Показывает/скрывает только файлы из нужных папок (для отладки)
 */
function debugListFiles(files) {
    const counts = {};
    for (let i = 0; i < files.length; i++) {
        const rel = files[i].webkitRelativePath || files[i].name;
        const top = rel.split('/')[0];
        counts[top] = (counts[top] || 0) + 1;
    }
    console.table(counts);
}

// Экспорт
window.WorkImport = {
    syncWorkFromObsidian,
    handleWorkFolderSelected,
    updateWorkSyncInfo
};