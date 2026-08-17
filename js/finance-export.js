// ============================================
// 💰 ФИНАНСЫ: ЭКСПОРТ ОПЕРАЦИЙ
// ============================================
"use strict";

window.openFinanceExportModal = function() {
    const startInput = document.getElementById('f-export-start');
    const endInput = document.getElementById('f-export-end');
    
    // Default period: first day of current month to today
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    startInput.value = getLocalDateStr(firstDay);
    endInput.value = getLocalDateStr(today);
    
    document.getElementById('finance-export-modal').classList.add('visible');
}

window.exportFinanceOperations = function() {
    const startStr = document.getElementById('f-export-start').value;
    const endStr = document.getElementById('f-export-end').value;
    
    if(!startStr || !endStr) {
        customAlert('Укажите даты начала и окончания периода', 'Ошибка');
        return;
    }
    
    if(startStr > endStr) {
        customAlert('Дата начала не может быть позже даты окончания', 'Ошибка');
        return;
    }
    
    // Filter transactions by period
    const filtered = financeData.transactions.filter(t => {
        return t.date >= startStr && t.date <= endStr;
    });
    
    if(filtered.length === 0) {
        customAlert('Нет операций за выбранный период', 'Информация');
        return;
    }
    
    // Build table data with headers: Дата, Тип, Сумма, Категория, Подкатегория, Комментарий
    const headers = ['Дата', 'Тип', 'Сумма', 'Категория', 'Подкатегория', 'Комментарий'];
    
    const rows = filtered.slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt).map(t => {
        const cat = financeData.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name : '';
        const typeText = t.type === 'expense' ? 'Расход' : 'Доход';
        const amount = Math.abs(t.amount);
        return [
            formatFinanceDate(t.date),
            typeText,
            amount,
            catName,
            t.subcategory || '',
            t.comment || ''
        ];
    });
    
    const aoa = [headers].concat(rows);
    
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    
    // Set column widths for better readability
    ws['!cols'] = [
        { wch: 12 }, // Дата
        { wch: 10 }, // Тип
        { wch: 12 }, // Сумма
        { wch: 25 }, // Категория
        { wch: 25 }, // Подкатегория
        { wch: 40 }  // Комментарий
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Операции');
    
    // Generate filename with period
    const startFormatted = startStr.replace(/-/g, '');
    const endFormatted = endStr.replace(/-/g, '');
    const fileName = `operations_${startFormatted}-${endFormatted}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
    closeAllModals();
    customAlert(`✅ Экспортировано операций: ${filtered.length}`, 'Успех');
}