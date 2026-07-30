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
            
            html += '<div class="gif-manager-item" data-name="' + escapeHtml(v.name) + '" data-category="' + primaryCategory + '">';
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
            html += '<select class="gif-manager-select-input" onchange="updateVariantGif(\'' + escapeHtml(v.name) + '\', this.value)">';
            html += '<option value="">— без GIF —</option>';
            allGifs.forEach(gif => {
                const selected = currentGif === gif ? 'selected' : '';
                html += '<option value="' + gif + '" ' + selected + '>' + gif + '</option>';
            });
            html += '</select>';
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
    html += '</div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);
};

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
    
    items.forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const category = item.dataset.category;
        
        const matchesSearch = name.includes(gifManagerState.searchQuery);
        const matchesCategory = gifManagerState.categoryFilter === 'all' || category === gifManagerState.categoryFilter;
        
        item.style.display = (matchesSearch && matchesCategory) ? 'block' : 'none';
    });
}

// === РАБОТА С GIF ===

function getAvailableGifs() {
    // Получаем список всех GIF файлов из папки exercise-gifs
    // В реальном приложении это может быть через API, здесь возвращаем статический список
    const gifs = [];
    for (let i = 1; i <= 1324; i++) {
        const num = String(i).padStart(4, '0');
        // Здесь нужно получить реальные имена файлов
        // Для начала используем примеры
    }
    
    // Получаем из exercise-images.js
    const map = window.EXERCISE_IMAGE_MAP || {};
    const uniqueGifs = new Set(Object.values(map));
    return Array.from(uniqueGifs).sort();
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
                const preview = item.querySelector('.gif-manager-preview');
                const select = item.querySelector('.gif-manager-select-input');
                
                if (preview) {
                    preview.src = currentGif ? 'exercise-gifs/' + currentGif : '';
                }
                if (select) {
                    select.value = currentGif || '';
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