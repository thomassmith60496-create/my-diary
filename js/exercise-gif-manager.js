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
    // Возвращаем все GIF файлы из папки exercise-gifs
    // Список всех доступных файлов для выбора
    const allGifFiles = [
        '0001-2gPfomN.gif', '0002-Hy9D21L.gif', '0003-1ZFqTDN.gif', '0006-qaZVsGk.gif',
        '0007-4IKbhHV.gif', '0009-PAgTVaK.gif', '0010-8K0w2yA.gif', '0011-03lzqwk.gif',
        '0012-UGhRD1A.gif', '0013-VX5YKR5.gif', '0014-r7cT9YD.gif', '0015-vrhHa6D.gif',
        '0016-VedGSby.gif', '0017-kiJ4Z2K.gif', '0018-7HcfMBP.gif', '0019-J60bN17.gif',
        '0020-xAySMB0.gif', '0022-znLogoF.gif', '0023-Yza7XrQ.gif', '0024-Y7YcmIJ.gif',
        '0025-EIeI8Vf.gif', '0026-W9pFVv1.gif', '0027-eZyBC3j.gif', '0028-SGY8Zui.gif',
        '0029-qi996YS.gif', '0030-J6Dx1Mu.gif', '0031-25GPyDY.gif', '0032-ila4NZS.gif',
        '0033-GrO65fd.gif', '0034-hMEptv0.gif', '0035-LMGXZn8.gif', '0036-hl8DUh8.gif',
        '0037-Hj4FOCd.gif', '0038-IENzBdA.gif', '0039-IeTIEqg.gif', '0040-33AzZeV.gif',
        '0041-b2Uoz54.gif', '0042-zG0zs85.gif', '0043-qXTaZnJ.gif', '0044-XlZ4lAC.gif',
        '0045-GXoaSgn.gif', '0046-5VCj6iH.gif', '0047-3TZduzM.gif', '0048-641mIfk.gif',
        '0049-dmgMp3n.gif', '0050-xi0yckC.gif', '0051-pkSoCW9.gif', '0052-ZsiqXYa.gif',
        '0053-1gFNTZV.gif', '0054-t8iSghb.gif', '0055-EcaV7aL.gif', '0056-HJ63mSO.gif',
        '0057-EMpUwRI.gif', '0058-SNFfUff.gif', '0059-SYJ4Bkt.gif', '0060-h8LFzo9.gif',
        '0061-iZop9xO.gif', '0063-elhhVgj.gif', '0064-Jsgsc27.gif', '0065-vtusOWT.gif',
        '0066-2DxtqHL.gif', '0067-xHKN2s8.gif', '0068-uKyN64F.gif', '0069-gfk9kD4.gif',
        '0070-qOgPVf6.gif', '0071-wnEscH8.gif', '0072-WLvTAv5.gif', '0073-i6LWjok.gif',
        '0074-za9Ni4z.gif', '0075-Ln9iTbU.gif', '0076-S9zHIvU.gif', '0077-62Nw60O.gif',
        '0078-VaP75jl.gif', '0079-qDnGfDb.gif', '0080-xNrS20v.gif', '0081-4LIG9xr.gif',
        '0082-LsZkfU6.gif', '0083-Gxg9lDc.gif', '0084-7M66AVi.gif', '0085-wQ2c4XD.gif',
        '0086-ngPpyRS.gif', '0087-0dCyly0.gif', '0088-ktsFQAZ.gif', '0089-1V1gj1u.gif',
        '0090-d960PgE.gif', '0091-kTbSH9h.gif', '0092-5uFK1xr.gif', '0094-dFSNDOA.gif',
        '0095-dG7tG5y.gif', '0096-i4JkUaL.gif', '0097-HUEqZ1y.gif', '0098-W31mMjd.gif',
        '0099-gGNQmVt.gif', '0100-4Leypho.gif', '0101-euI1BwR.gif', '0102-oR7O9LW.gif',
        '0103-xnInPfE.gif', '0104-2qTvJAZ.gif', '0105-dCPESfR.gif', '0106-4dUn2iv.gif',
        '0107-S8mo30S.gif', '0108-rGwhJ5o.gif', '0109-dZl9Q27.gif', '0110-LWuA3aZ.gif',
        '0111-6HiHHe0.gif', '0112-yQe5HpE.gif', '0113-NdIb5Z1.gif', '0114-Kxquu2E.gif',
        '0115-JrOHAZc.gif', '0116-hrVQWvE.gif', '0117-KgI0tqW.gif', '0118-SzX3uzM.gif',
        '0119-83HoW9X.gif', '0120-UDlhcO8.gif', '0121-fI18Rbc.gif', '0122-JsKq9so.gif',
        '0123-RgJDRR1.gif', '0124-s7HX1BY.gif', '0125-6kSxYnw.gif', '0126-82LxxkW.gif',
        '0127-LSTChY9.gif', '0128-RJa4tCo.gif', '0129-RrLske5.gif', '0130-u27Kcdz.gif',
        '0137-U6G2gk9.gif', '0138-CI6baTY.gif', '0139-50BETrz.gif', '0140-guT8YnS.gif',
        '0148-KHPZL0b.gif', '0149-Gchi5Tr.gif', '0150-eYnzaCm.gif', '0151-7xI5MXA.gif',
        '0152-Db7eEgw.gif', '0153-OQ1otBN.gif', '0154-aqvSOQE.gif', '0155-0CXGHya.gif',
        '0157-eGDudUV.gif', '0158-7saC5zz.gif', '0159-kesXOpB.gif', '0160-veXwo0D.gif',
        '0161-hvHhCv8.gif', '0162-u2X71Np.gif', '0164-mTT3KLn.gif', '0165-HPlPoQA.gif',
        '0167-ZSJNetl.gif', '0168-hBGWILP.gif', '0169-Vh0GsK4.gif', '0170-27NNGFr.gif',
        '0171-tBWXbIT.gif', '0172-1PK5Uo3.gif', '0173-Hx1WC8I.gif', '0174-MvQPqVW.gif',
        '0175-WW95auq.gif', '0176-KWdF2JI.gif', '0177-CuaWCmC.gif', '0178-goJ6ezq.gif',
        '0179-FVmZVhk.gif', '0180-hvV79Si.gif', '0182-61GrD55.gif', '0184-Q2Eu1Ax.gif',
        '0185-lJJ7Yq8.gif', '0186-uxJcFUU.gif', '0188-xLYSdtg.gif', '0189-EIsE3u8.gif',
        '0190-YTur5nR.gif', '0191-dB07vDu.gif', '0192-wEulIzp.gif', '0193-WrYPP2g.gif',
        '0194-2IxROQ1.gif', '0195-P2lNrGL.gif', '0196-OM46QHm.gif', '0197-qdRxqCj.gif',
        '0198-RVwzP10.gif', '0199-PskORrA.gif', '0200-dU605di.gif', '0201-3ZflifB.gif',
        '0202-yUdIGNs.gif', '0203-wqNPGCg.gif', '0204-c3QQLPi.gif', '0205-SpsOSXk.gif',
        '0206-eOG0r6v.gif', '0207-VjYliFZ.gif', '0208-PNtsX17.gif', '0209-IwX5NqK.gif',
        '0210-eYmsEPR.gif', '0211-d9Xaxq6.gif', '0212-8xUv4J7.gif', '0213-pwt0pnM.gif',
        '0214-vpp9Ku2.gif', '0215-x825CZm.gif', '0216-YPoVrBi.gif', '0218-qcY50ZD.gif',
        '0219-PzQanLE.gif', '0220-Eg98Ft9.gif', '0221-qatbkEd.gif', '0222-wPypxFY.gif',
        '0223-q2ADGqV.gif', '0224-VhX2JdE.gif', '0225-P5p0j8B.gif', '0226-jpgqxiS.gif'
    ];
    
    return allGifFiles.sort();
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