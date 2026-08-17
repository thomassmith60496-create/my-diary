// ============================================
// 🎬 GIF MANAGER - УПРАВЛЕНИЕ ИЗОБРАЖЕНИЯМИ УПРАЖНЕНИЙ
// ============================================
"use strict";

// === СОСТОЯНИЕ ===
let gifManagerState = {
    searchQuery: '',
    categoryFilter: 'all'
};

// === ГЛАВНАЯ ФУНКЦИЯ ===

window.openGifManager = function() {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay visible';
    modal.id = 'gif-manager-overlay';
    modal.onclick = function(e) {
        if (e.target === modal) closeGifManager();
    };

    const exercises = TrainingExerciseAPI.getExercises();
    const allGifs = getAvailableGifs();

    let html = '<div class="gif-manager-modal">';
    html += '<div class="gif-manager-header">';
    html += '<h2>🎬 Управление GIF упражнений</h2>';
    html += '<button class="gif-manager-close" onclick="closeGifManager()">✕</button>';
    html += '</div>';
    html += '<div class="gif-manager-body">';
    
    // Панель поиска и фильтров
    html += '<div class="gif-manager-controls">';
    html += '<input type="text" class="gif-manager-search" placeholder="🔍 Поиск упражнений..." oninput="filterGifManager(this.value)" id="gif-manager-search">';
    html += '<select class="gif-manager-filter" onchange="filterGifManagerCategory(this.value)" id="gif-manager-category">';
    html += '<option value="all">Все группы</option>';
    MUSCLE_CATEGORIES.forEach(cat => {
        html += '<option value="' + cat + '">' + cat + '</option>';
    });
    html += '</select>';
    html += '</div>';

    // Список упражнений
    html += '<div class="gif-manager-list" id="gif-manager-list">';
    
    exercises.forEach(ex => {
        ex.variants.forEach(v => {
            const currentGif = getCurrentGifForVariant(v.name);
            const categories = v.categories || [];
            const primaryCategory = categories[0] || 'Другое';
            
            const currentGifName = currentGif ? getExerciseNameByGifFromManager(currentGif) || '' : '';
            const variantId = 'gif-variant-' + escapeHtml(v.name).replace(/\s+/g, '_');
            html += '<div class="gif-manager-item" data-name="' + escapeHtml(v.name) + '" data-category="' + primaryCategory + '" data-gif-name="' + escapeHtml(currentGifName) + '">';
            html += '<div class="gif-manager-item-header">';
            html += '<div class="gif-manager-item-name">' + escapeHtml(v.name) + '</div>';
            html += '<div class="gif-manager-item-category">' + primaryCategory + '</div>';
            html += '</div>';
            html += '<div class="gif-manager-item-body">';
            html += '<div class="gif-manager-current">';
            html += '<div class="gif-manager-label">Текущий GIF:</div>';
            html += '<img src="' + (currentGif ? 'exercise-gifs/' + currentGif : '') + '" class="gif-manager-preview" alt="">';
            html += '</div>';
            html += '<div class="gif-manager-select">';
            html += '<div class="gif-manager-label">Выбрать новый:</div>';
            html += '<input type="text" class="gif-combobox-input" placeholder="🔍 Начните ввод..." list="gif-datalist" value="' + (currentGif ? escapeHtml(currentGifName ? currentGifName + ' (' + currentGif + ')' : currentGif) : '') + '" autocomplete="off" data-variant="' + escapeHtml(v.name) + '">';
            html += '<input type="hidden" class="gif-combobox-value" value="' + (currentGif || '') + '" data-variant="' + escapeHtml(v.name) + '">';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });
    });
    
    html += '</div>';
    html += '</div>';
    html += '<div class="gif-manager-footer">';
    html += '<button class="btn" onclick="closeGifManager()">Закрыть</button>';
    html += '<button class="btn primary" onclick="resetAllGifs()">🔄 Сбросить на стандартные</button>';
    html += '</div>';
    // Shared datalist for all GIF inputs (performance: 1324 options in DOM, not 85k+)
    html += '<datalist id="gif-datalist">';
    html += '<option value="">— без GIF —</option>';
    allGifs.forEach(gif => {
        const gifName = getExerciseNameByGifFromManager(gif);
        const displayText = gifName ? gifName + ' (' + gif + ')' : gif;
        html += '<option value="' + gif + '">' + escapeHtml(displayText) + '</option>';
    });
    html += '</datalist>';
    html += '</div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // Инициализируем простые обработчики для datalist
    initGifInputs();
};

// === ИНИЦИАЛИЗАЦИЯ DATALIST INPUTS ===

function initGifInputs() {
    document.querySelectorAll('.gif-combobox-input').forEach(input => {
        const hidden = input.parentElement.querySelector('.gif-combobox-value');
        const variantName = input.dataset.variant;
        
        // When user selects from datalist, sync hidden value and save
        input.addEventListener('change', function() {
            const selectedValue = this.value;
            // Extract the GIF filename from the display text (format: "Name (filename.gif)")
            const match = selectedValue.match(/\(([^)]+\.gif)\)$/);
            const gifFile = match ? match[1] : (selectedValue.endsWith('.gif') ? selectedValue : '');
            if (hidden) hidden.value = gifFile;
            updateVariantGif(variantName, gifFile);
        });
        
        // Also sync on input for real-time preview
        input.addEventListener('input', function() {
            // Update preview image in real-time
            const item = document.querySelector('.gif-manager-item[data-name="' + variantName + '"]');
            if (item) {
                const preview = item.querySelector('.gif-manager-preview');
                if (preview && this.value) {
                    const match = this.value.match(/\(([^)]+\.gif)\)$/);
                    const gifFile = match ? match[1] : (this.value.endsWith('.gif') ? this.value : '');
                    if (gifFile) {
                        preview.src = 'exercise-gifs/' + gifFile;
                    }
                }
            }
        });
    });
}

// === ЗАКРЫТИЕ ===

window.closeGifManager = function() {
    const overlay = document.getElementById('gif-manager-overlay');
    if (overlay) {
        overlay.remove();
    }
};

// === ФИЛЬТРАЦИЯ ===

window.filterGifManager = function(query) {
    gifManagerState.searchQuery = query.toLowerCase();
    applyGifManagerFilters();
};

window.filterGifManagerCategory = function(category) {
    gifManagerState.categoryFilter = category;
    applyGifManagerFilters();
};

function applyGifManagerFilters() {
    const items = document.querySelectorAll('.gif-manager-item');
    const query = gifManagerState.searchQuery;
    
    items.forEach(item => {
        const name = item.dataset.name ? item.dataset.name.toLowerCase() : '';
        const gifName = item.dataset.gifName ? item.dataset.gifName.toLowerCase() : '';
        const category = item.dataset.category;
        
        const matchesSearch = !query || name.includes(query) || gifName.includes(query);
        const matchesCategory = gifManagerState.categoryFilter === 'all' || category === gifManagerState.categoryFilter;
        
        item.style.display = (matchesSearch && matchesCategory) ? 'block' : 'none';
    });
}

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ НАЗВАНИЯ ===

function getExerciseNameByGifFromManager(gifFilename) {
    if (window.ExerciseGifNames && window.ExerciseGifNames.getExerciseNameByGif) {
        return window.ExerciseGifNames.getExerciseNameByGif(gifFilename);
    }
    return null;
}

// === РАБОТА С GIF ===

function getAvailableGifs() {
    // Возвращаем все GIF файлы из папки exercise-gifs
    // Используем полный список из ExerciseGifNames (1324 файла)
    if (window.ExerciseGifNames && window.ExerciseGifNames.getAllMappedGifs) {
        return window.ExerciseGifNames.getAllMappedGifs();
    }
    return [];
}

function getCurrentGifForVariant(variantName) {
    // Сначала проверяем пользовательские настройки
    const customGifs = getCustomGifs();
    if (customGifs[variantName]) {
        return customGifs[variantName];
    }
    
    // Затем используем стандартные
    if (window.ExerciseImageAPI) {
        return window.ExerciseImageAPI.getGif(variantName);
    }
    
    return null;
}

function getCustomGifs() {
    try {
        const stored = localStorage.getItem('custom_exercise_gifs');
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

function saveCustomGifs(gifs) {
    try {
        localStorage.setItem('custom_exercise_gifs', JSON.stringify(gifs));
    } catch (e) {
        console.error('Failed to save custom GIFs:', e);
    }
}

window.updateVariantGif = function(variantName, gifFile) {
    const customGifs = getCustomGifs();
    
    if (gifFile) {
        customGifs[variantName] = gifFile;
    } else {
        delete customGifs[variantName];
    }
    
    saveCustomGifs(customGifs);
    
    // Обновляем отображение
    const item = document.querySelector('.gif-manager-item[data-name="' + variantName + '"]');
    if (item) {
        const preview = item.querySelector('.gif-manager-preview');
        if (preview) {
            preview.src = gifFile ? 'exercise-gifs/' + gifFile : '';
        }
    }
};

window.resetAllGifs = function() {
    customConfirm('Сбросить все пользовательские GIF на стандартные?', 'Подтверждение сброса')
        .then(confirmed => {
            if (!confirmed) return;
            
            localStorage.removeItem('custom_exercise_gifs');
            
            // Обновляем все превью
            const items = document.querySelectorAll('.gif-manager-item');
            items.forEach(item => {
                const variantName = item.dataset.name;
                const currentGif = getCurrentGifForVariant(variantName);
                const currentGifName = currentGif ? getExerciseNameByGifFromManager(currentGif) || '' : '';
                const preview = item.querySelector('.gif-manager-preview');
                const comboInput = item.querySelector('.gif-combobox-input');
                const comboHidden = item.querySelector('.gif-combobox-value');
                
                if (preview) {
                    preview.src = currentGif ? 'exercise-gifs/' + currentGif : '';
                }
                if (comboInput) {
                    comboInput.value = currentGif ? (currentGifName ? currentGifName + ' (' + currentGif + ')' : currentGif) : '';
                }
                if (comboHidden) {
                    comboHidden.value = currentGif || '';
                }
            });
            
            customAlert('Все GIF сброшены на стандартные', 'Готово');
        });
};

// === ИНИЦИАЛИЗАЦИЯ ===

// Переопределяем функцию получения GIF для использования пользовательских настроек
const originalGetExerciseGif = window.ExerciseImageAPI.getGif;
window.ExerciseImageAPI.getGif = function(variantName) {
    const customGifs = getCustomGifs();
    if (customGifs[variantName]) {
        return customGifs[variantName];
    }
    return originalGetExerciseGif(variantName);
};