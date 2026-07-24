// ============================================
// 💰 FINANCE IMPORT FUNCTIONS
// ============================================

function importFinanceExcel(input) {
    const file = input.files[0];
    if(!file) { alert('Файл не выбран'); return; }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            if(jsonData.length < 2) {
                alert('Файл пуст или содержит только заголовки');
                return;
            }
            
            let imported = 0;
            let errors = 0;
            
            for(let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if(!row || row.length < 3) continue;
                
                const dateRaw = row[1];
                const typeRaw = String(row[2] || '').trim().toLowerCase();
                const amountRaw = row[3];
                const categoryName = String(row[4] || '').trim();
                const subcategory = row[5] ? String(row[5]).trim() : '';
                const comment = row[6] ? String(row[6]).trim() : '';
                
                if(!dateRaw || amountRaw === undefined || amountRaw === null || amountRaw === '' || !categoryName) continue;
                
                let date = '';
                
                if(dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
                    date = dateRaw.toISOString().slice(0,10);
                }
                else if(typeof dateRaw === 'number' && dateRaw > 1 && dateRaw < 200000) {
                    const excelEpoch = new Date(1899, 11, 30);
                    const parsed = new Date(excelEpoch.getTime() + dateRaw * 86400000);
                    date = parsed.toISOString().slice(0,10);
                }
                else {
                    const dateStr = String(dateRaw).trim();
                    if(/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(dateStr)) {
                        const parts = dateStr.split('.');
                        const d = parts[0].padStart(2,'0');
                        const m = parts[1].padStart(2,'0');
                        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                        date = `${y}-${m}-${d}`;
                    }
                    else if(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
                        const parts = dateStr.split('/');
                        const d = parts[0].padStart(2,'0');
                        const m = parts[1].padStart(2,'0');
                        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                        date = `${y}-${m}-${d}`;
                    }
                    else if(/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        date = dateStr;
                    }
                    else if(/^\d{1,2}\.\d{1,2}$/.test(dateStr)) {
                        const parts = dateStr.split('.');
                        date = `${new Date().getFullYear()}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                    }
                    else {
                        const d = new Date(dateStr);
                        if(!isNaN(d.getTime())) {
                            date = d.toISOString().slice(0,10);
                        }
                    }
                }
                
                if(!date) { errors++; continue; }
                const dateObj = new Date(date);
                if(isNaN(dateObj.getTime())) { errors++; continue; }
                date = dateObj.toISOString().slice(0,10);
                
                let amount = 0;
                if(typeof amountRaw === 'number') {
                    amount = amountRaw;
                } else {
                    amount = parseFloat(String(amountRaw).replace(/[^\d.,\-]/g, '').replace(',', '.'));
                }
                if(isNaN(amount) || amount === 0) { errors++; continue; }
                
                const isExpense = typeRaw === 'расход' || typeRaw === 'expense' || typeRaw === 'трата' || amount < 0;
                
                let category = financeData.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                if(!category) {
                    category = {
                        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
                        name: categoryName,
                        type: isExpense ? 'expense' : 'income',
                        limit: 0,
                        subcategories: []
                    };
                    financeData.categories.push(category);
                }
                
                if(subcategory && category.subcategories.indexOf(subcategory) === -1) {
                    category.subcategories.push(subcategory);
                }
                
                const txn = {
                    id: 'txn-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
                    date: date,
                    type: isExpense ? 'expense' : 'income',
                    amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
                    category: category.id,
                    subcategory: subcategory || '',
                    comment: comment,
                    createdAt: Date.now()
                };
                
                financeData.transactions.push(txn);
                imported++;
            }
            
            saveFinance();
            renderCurrentFinanceTab();
            updateFinanceStats();
            alert(`✅ Импортировано ${imported} операций${errors ? `, пропущено с ошибками: ${errors}` : ''}`);
        } catch(err) {
            console.error('Excel import error:', err);
            alert('❌ Ошибка при импорте Excel: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}