// ============================================
// 💰 ФИНАНСЫ: ИМПОРТ ОПЕРАЦИЙ
// ============================================
"use strict";

// Палитра цветов для категорий, создаваемых при импорте
const FINANCE_IMPORT_CATEGORY_COLORS = ['#7e22ce', '#a855f7', '#c084fc', '#d8b4fe', '#9333ea', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e'];

// --- Вспомогательные функции ---

// Нормализация текста перед сравнением: обрезка пробелов + нижний регистр
function financeImportNorm(val) {
    if (val == null) return '';
    return String(val).trim().toLowerCase();
}

// Округление суммы до копеек (защита от ошибок плавающей точки)
function financeImportRound(amount) {
    return Math.round(amount * 100) / 100;
}

// "Отпечаток" операции для проверки на дубли.
// Дубль = полное совпадение по категории, подкатегории, дате, сумме и комментарию.
function financeTxnFingerprint(categoryName, subcategory, date, amount, comment) {
    return [
        financeImportNorm(categoryName),
        financeImportNorm(subcategory),
        String(date || '').trim(),
        String(financeImportRound(Math.abs(amount))),
        financeImportNorm(comment)
    ].join('|');
}

// Проверка, что год/месяц/день образуют реальную календарную дату
function financeIsValidDate(y, m, d) {
    const numY = parseInt(y, 10);
    const numM = parseInt(m, 10);
    const numD = parseInt(d, 10);
    if (isNaN(numY) || isNaN(numM) || isNaN(numD)) return false;
    const dt = new Date(numY, numM - 1, numD);
    return dt.getFullYear() === numY && dt.getMonth() === numM - 1 && dt.getDate() === numD;
}

// Парсинг даты из различных форматов:
// Excel-серийник, DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, DD.MM (без года), ISO-строка
function financeParseDate(dateRaw) {
    if (dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
        return getLocalDateStr(dateRaw);
    }

    // Серийный номер даты из Excel
    if (typeof dateRaw === 'number' && isFinite(dateRaw) && dateRaw > 1 && dateRaw < 200000) {
        const excelEpoch = new Date(1899, 11, 30);
        const parsed = new Date(excelEpoch.getTime() + dateRaw * 86400000);
        if (!isNaN(parsed.getTime())) return getLocalDateStr(parsed);
        return null;
    }

    const dateStr = String(dateRaw || '').trim();
    if (dateStr === '') return null;

    // DD.MM.YYYY или D.M.YY
    let match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (match) {
        const y = match[3].length === 2 ? '20' + match[3] : match[3];
        if (financeIsValidDate(y, match[2], match[1])) {
            return y + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
        }
        return null;
    }

    // DD/MM/YYYY или D/M/YY
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
        const y = match[3].length === 2 ? '20' + match[3] : match[3];
        if (financeIsValidDate(y, match[2], match[1])) {
            return y + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
        }
        return null;
    }

    // YYYY-MM-DD
    match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        if (financeIsValidDate(match[1], match[2], match[3])) {
            return match[1] + '-' + match[2].padStart(2, '0') + '-' + match[3].padStart(2, '0');
        }
        return null;
    }

    // DD.MM без года — берём текущий год
    match = dateStr.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (match) {
        const y = String(new Date().getFullYear());
        if (financeIsValidDate(y, match[2], match[1])) {
            return y + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
        }
        return null;
    }

    // Другие распознаваемые JavaScript-ом форматы (например, ISO-строка)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return getLocalDateStr(d);
    return null;
}

// Парсинг суммы (число или строка вида "1 234,56", "-1500", "1 500 ₽" и т.п.)
function financeParseAmount(amountRaw) {
    let amount;
    if (typeof amountRaw === 'number' && isFinite(amountRaw)) {
        amount = amountRaw;
    } else {
        const cleaned = String(amountRaw || '').replace(/[^\d.,\-]/g, '').replace(/,/g, '.');
        amount = parseFloat(cleaned);
    }
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount) || amount === 0) return null;
    return amount;
}

// Определение карты колонок по строке-заголовку (порядок колонок может быть любым)
function financeBuildColumnMap(row) {
    const map = {};
    if (!row || !Array.isArray(row)) return map;
    for (let i = 0; i < row.length; i++) {
        const norm = financeImportNorm(row[i]);
        if (!norm) continue;
        if (map.date === undefined && norm.indexOf('дата') !== -1) {
            map.date = i;
        } else if (map.type === undefined && norm.indexOf('тип') !== -1) {
            map.type = i;
        } else if (map.amount === undefined && norm.indexOf('сум') !== -1) {
            map.amount = i;
        } else if (map.subcategory === undefined && (norm.indexOf('подкатегор') !== -1 || norm.indexOf('субкатегор') !== -1)) {
            map.subcategory = i;
        } else if (map.category === undefined && norm.indexOf('категор') !== -1) {
            map.category = i;
        } else if (map.comment === undefined && norm.indexOf('коммент') !== -1) {
            map.comment = i;
        }
    }
    return map;
}

// Разбор одной строки файла в объект операции
function financeParseRow(row, colMap) {
    if (!row || !Array.isArray(row) || !colMap) return null;

    const get = function(idx) {
        if (idx === undefined || idx === null) return '';
        const v = row[idx];
        return (v === undefined || v === null) ? '' : v;
    };

    const dateRaw = get(colMap.date);
    const typeRaw = financeImportNorm(get(colMap.type));
    const amountRaw = get(colMap.amount);
    const categoryName = String(get(colMap.category) || '').trim();
    const subcategory = String(get(colMap.subcategory) || '').trim();
    const comment = String(get(colMap.comment) || '').trim();

    if (dateRaw === '' || amountRaw === '' || !categoryName) return null;

    const date = financeParseDate(dateRaw);
    if (!date) return null;

    const amount = financeParseAmount(amountRaw);
    if (amount === null) return null;

    // Определяем тип операции
    let type = '';
    const expenseWords = ['расход', 'трата', 'списание', 'покупка', 'expense'];
    const incomeWords = ['доход', 'приход', 'зачисление', 'пополнение', 'начисление', 'income'];
    if (typeRaw) {
        if (expenseWords.some(function(w) { return typeRaw.indexOf(w) !== -1; })) {
            type = 'expense';
        } else if (incomeWords.some(function(w) { return typeRaw.indexOf(w) !== -1; })) {
            type = 'income';
        }
    }
    if (!type) {
        type = amount < 0 ? 'expense' : 'income';
    }

    return {
        date: date,
        amount: Math.abs(amount),
        type: type,
        categoryName: categoryName,
        subcategory: subcategory,
        comment: comment
    };
}

// Похожа ли строка на строку с данными (для файлов без заголовков)
function financeLooksLikeDataRow(row, colMap) {
    if (!row || !Array.isArray(row) || !colMap) return false;
    const dateRaw = colMap.date !== undefined ? row[colMap.date] : '';
    const amountRaw = colMap.amount !== undefined ? row[colMap.amount] : '';
    if (dateRaw === '' || dateRaw === undefined || dateRaw === null) return false;
    if (amountRaw === '' || amountRaw === undefined || amountRaw === null) return false;
    return financeParseDate(dateRaw) !== null && financeParseAmount(amountRaw) !== null;
}

// ============================================
// 📋 Скачивание примера таблицы (шаблон импорта)
// ============================================
window.downloadFinanceImportTemplate = function() {
    if (typeof XLSX === 'undefined') {
        customAlert('❌ Библиотека XLSX не загружена. Проверьте подключение к интернету.', 'Ошибка');
        return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const pad = function(n) { return String(n).padStart(2, '0'); };

    // Используем реальные категории пользователя, если они есть
    const expenseCats = financeData.categories.filter(function(c) { return c.type === 'expense'; });
    const incomeCat = financeData.categories.find(function(c) { return c.type === 'income'; });

    function exampleExpenseRow(dayNum, amount, cat, comment) {
        const name = cat ? cat.name : 'Продукты';
        const sub = (cat && Array.isArray(cat.subcategories) && cat.subcategories.length > 0) ? cat.subcategories[0] : (cat ? '' : 'Магазин');
        return [pad(dayNum) + '.' + month + '.' + year, 'Расход', amount, name, sub, comment];
    }

    const headers = ['Дата', 'Тип', 'Сумма', 'Категория', 'Подкатегория', 'Комментарий'];
    const rows = [
        exampleExpenseRow(1, 1543.50, expenseCats[0], 'Пример: расход с подкатегорией и комментарием'),
        exampleExpenseRow(3, 800, expenseCats[1] || expenseCats[0], ''),
        [pad(5) + '.' + month + '.' + year, 'Доход', 75000, incomeCat ? incomeCat.name : 'Зарплата', '', 'Пример: доход']
    ];

    const aoa = [headers].concat(rows);
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
        { wch: 12 }, // Дата
        { wch: 10 }, // Тип
        { wch: 12 }, // Сумма
        { wch: 25 }, // Категория
        { wch: 25 }, // Подкатегория
        { wch: 42 }  // Комментарий
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Операции');

    XLSX.writeFile(wb, 'finance_import_example.xlsx');
    customAlert('✅ Скачан файл-пример. Заполните его своими операциями (строки-примеры можно удалить) и нажмите «Импорт из Excel».', 'Шаблон импорта');
};

// ============================================
// 📥 Импорт операций из Excel/CSV
// ============================================
// Операции ДОБАВЛЯЮТСЯ к существующим, история не перезаписывается.
// Дубли (категория + подкатегория + дата + сумма + комментарий) пропускаются.
window.importFinanceExcel = function(input) {
    const file = input.files[0];
    if (!file) {
        customAlert('❌ Файл не выбран', 'Ошибка');
        return;
    }
    if (isReadOnlyActive()) {
        customAlert('❌ Импорт недоступен в режиме просмотра', 'Ошибка');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                customAlert('❌ В файле нет листов с данными', 'Ошибка');
                return;
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            if (!rows || rows.length === 0) {
                customAlert('❌ Файл пуст', 'Ошибка');
                return;
            }

            // 1. Ищем строку с заголовками среди первых 15 строк
            let startRow = 0;
            let colMap = null;
            for (let r = 0; r < Math.min(rows.length, 15); r++) {
                const map = financeBuildColumnMap(rows[r]);
                if (map.date !== undefined && map.amount !== undefined && map.category !== undefined) {
                    startRow = r + 1;
                    colMap = map;
                    break;
                }
            }

            // 2. Запасной вариант: файл без заголовков — колонки как в экспорте приложения
            if (!colMap) {
                colMap = { date: 0, type: 1, amount: 2, category: 3, subcategory: 4, comment: 5 };
                startRow = financeLooksLikeDataRow(rows[0], colMap) ? 0 : 1;
            }

            // 3. Индексы существующих операций для проверки на дубли
            const existingKeys = new Set();
            financeData.transactions.forEach(function(t) {
                const cat = financeData.categories.find(function(c) { return c.id === t.category; });
                existingKeys.add(financeTxnFingerprint(cat ? cat.name : '', t.subcategory, t.date, t.amount, t.comment));
            });

            // 4. Обрабатываем строки: операции ДОБАВЛЯЮТСЯ, история не перезаписывается
            let imported = 0;
            let duplicates = 0;
            let errors = 0;

            for (let i = startRow; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row)) continue;

                // Пропускаем полностью пустые строки
                let isEmpty = true;
                for (let c = 0; c < row.length; c++) {
                    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
                        isEmpty = false;
                        break;
                    }
                }
                if (isEmpty) continue;

                const parsed = financeParseRow(row, colMap);
                if (!parsed) {
                    errors++;
                    continue;
                }

                const fp = financeTxnFingerprint(parsed.categoryName, parsed.subcategory, parsed.date, parsed.amount, parsed.comment);
                if (existingKeys.has(fp)) {
                    duplicates++;
                    continue;
                }

                // Ищем категорию по названию и типу; если её нет — создаём новую
                let category = financeData.categories.find(function(c) {
                    return financeImportNorm(c.name) === financeImportNorm(parsed.categoryName) && c.type === parsed.type;
                });
                if (!category) {
                    category = financeData.categories.find(function(c) {
                        return financeImportNorm(c.name) === financeImportNorm(parsed.categoryName);
                    });
                }
                if (!category) {
                    category = {
                        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        name: parsed.categoryName,
                        type: parsed.type,
                        limit: 0,
                        subcategories: [],
                        subcategoryLimits: {},
                        color: FINANCE_IMPORT_CATEGORY_COLORS[financeData.categories.length % FINANCE_IMPORT_CATEGORY_COLORS.length]
                    };
                    financeData.categories.push(category);
                }

                // Добавляем подкатегорию, если её ещё нет
                if (parsed.subcategory && category.subcategories.indexOf(parsed.subcategory) === -1) {
                    category.subcategories.push(parsed.subcategory);
                }

                const txn = {
                    id: 'txn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    date: parsed.date,
                    type: parsed.type,
                    amount: parsed.type === 'expense' ? -Math.abs(parsed.amount) : Math.abs(parsed.amount),
                    category: category.id,
                    subcategory: parsed.subcategory || '',
                    comment: parsed.comment,
                    createdAt: Date.now()
                };

                financeData.transactions.push(txn);
                existingKeys.add(fp);
                imported++;
            }

            // 5. Сохраняем результат и показываем итог
            if (imported === 0 && duplicates === 0 && errors === 0) {
                customAlert('ℹ️ В файле не найдено ни одной операции для импорта', 'Информация');
                return;
            }

            if (imported > 0) {
                saveFinance();
                renderCurrentFinanceTab();
                updateFinanceStats();
            }

            let msg = '✅ Добавлено операций: ' + imported;
            if (duplicates > 0) msg += '<br>⏭ Пропущено дублей: ' + duplicates;
            if (errors > 0) msg += '<br>⚠️ Строк с ошибками: ' + errors;
            customAlert(msg, 'Результат импорта');
        } catch (err) {
            customAlert('❌ Ошибка при импорте Excel: ' + err.message, 'Ошибка');
        }
    };

    reader.readAsArrayBuffer(file);
    input.value = '';
}