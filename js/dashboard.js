// ============================================
// ДАШБОРД ПИТАНИЯ
// ============================================

function renderDashboard() { 
    renderWeightChart(); 
    renderKbjuChart(); 
    renderWeeklyAvg(); 
}

function setKbjuMetric(metric) {
    currentKbjuMetric = metric;
    document.querySelectorAll('#sub-tab-dashboard .metric-btn').forEach(b => { b.classList.toggle('active', b.dataset.metric === metric); });
    renderKbjuChart();
}

function renderWeightChart() {
    const period = document.getElementById('weight-period').value;
    const data = collectWeightData(period);
    document.getElementById('weight-chart-container').innerHTML = data.length === 0 ? '<div class="chart-empty">Нет данных о весе</div>' : renderSVGLineChart(data, 'weight', 'кг', '#10b981');
    document.getElementById('weight-stats-container').innerHTML = data.length === 0 ? '' : renderDashStatsBlock(data, 'weight', 'кг');
}

function renderKbjuChart() {
    const period = document.getElementById('kbju-period').value;
    const data = collectKbjuData(period, currentKbjuMetric);
    const units = { cal: 'ккал', prot: 'г', fat: 'г', carb: 'г' };
    document.getElementById('kbju-chart-container').innerHTML = data.length === 0 ? '<div class="chart-empty">Нет данных КБЖУ</div>' : renderSVGLineChart(data, currentKbjuMetric, units[currentKbjuMetric], '#10b981');
    document.getElementById('kbju-stats-container').innerHTML = data.length === 0 ? '' : renderDashStatsBlock(data, currentKbjuMetric, units[currentKbjuMetric]);
}

function collectWeightData(period) {
    const weeks = getFilteredWeeks(period);
    const data = [];
    weeks.forEach(week => {
        if(!week.data) week.data = {};
        const startDate = new Date(week.startDate);
        week.menu.forEach((day, di) => {
            const weight = week.data[`weight-${di}`];
            if(weight) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + di);
                data.push({ date: date.toISOString().slice(0,10), weight: parseFloat(weight) });
            }
        });
    });
    return data.sort((a, b) => a.date.localeCompare(b.date));
}

function collectKbjuData(period, metric) {
    const weeks = getFilteredWeeks(period);
    const data = [];
    weeks.forEach(week => {
        if(!week.data) week.data = {};
        const startDate = new Date(week.startDate);
        week.menu.forEach((day, di) => {
            let total = 0;
            day.meals.forEach((meal, mi) => { total += parseFloat(week.data[`m-${di}-${mi}-${metric}`]) || 0; });
            if(total > 0) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + di);
                data.push({ date: date.toISOString().slice(0,10), [metric]: total });
            }
        });
    });
    return data.sort((a, b) => a.date.localeCompare(b.date));
}

function getFilteredWeeks(period) {
    const sorted = [...nutritionData.weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if(period === 'all') return sorted;
    return sorted.slice(-parseInt(period));
}

function renderSVGLineChart(data, field, unit, color) {
    const width = 800, height = 300;
    const padding = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const values = data.map(d => d[field]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;
    const yMin = Math.max(0, minVal - valRange * 0.1);
    const yMax = maxVal + valRange * 0.15;
    const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;
    const points = data.map((d, i) => {
        const x = padding.left + (data.length > 1 ? i * xStep : chartW / 2);
        const y = padding.top + chartH - ((d[field] - yMin) / (yMax - yMin)) * chartH;
        return { x, y, value: d[field], date: d.date };
    });
    const linePath = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${points[points.length-1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
    const gridLines = [];
    for(let i = 0; i <= 5; i++) {
        const val = yMin + (yMax - yMin) * (i / 5);
        const y = padding.top + chartH - (i / 5) * chartH;
        gridLines.push(`<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#a7f3d0" stroke-width="1" stroke-dasharray="2,4"/>`);
        gridLines.push(`<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#065f46" font-weight="600">${Math.round(val)}</text>`);
    }
    const pointsHtml = points.map((p, i) => {
        const isFirst = i === 0, isLast = i === data.length - 1;
        const pointColor = isLast ? color : (isFirst ? '#2563eb' : color);
        const shortDate = p.date.slice(5).split('-').reverse().join('.');
        return `<circle cx="${p.x}" cy="${p.y}" r="${isFirst||isLast?6:4}" fill="${pointColor}" stroke="white" stroke-width="2"/>
                <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#064e3b">${p.value}</text>
                <text x="${p.x}" y="${padding.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#065f46" font-weight="600">${shortDate}</text>`;
    }).join('');
    return `<div class="dashboard-chart"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="areaGrad-${field}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
        ${gridLines.join('')}
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#065f46" stroke-width="1.5"/>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#065f46" stroke-width="1.5"/>
        <path d="${areaPath}" fill="url(#areaGrad-${field})"/>
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${pointsHtml}
        <text x="${width/2}" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="#064e3b">${unit}</text>
    </svg></div>`;
}

function renderDashStatsBlock(data, field, unit) {
    const values = data.map(d => d[field]);
    const first = values[0], last = values[values.length - 1];
    const diff = last - first;
    const max = Math.max(...values), min = Math.min(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const daysDiff = Math.round((new Date(data[data.length - 1].date) - new Date(data[0].date)) / (1000 * 60 * 60 * 24));
    const periodText = daysDiff === 0 ? 'в один день' : `за ${daysDiff} дней`;
    const trendIcon = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➡️');
    const trendColor = diff > 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#6b7280');
    return `<div class="dashboard-stats">
        <div class="stat-card"><div class="stat-label">Старт</div><div class="stat-value">${first} ${unit}</div><div class="stat-sub">${data[0].date}</div></div>
        <div class="stat-card"><div class="stat-label">Сейчас</div><div class="stat-value">${last} ${unit}</div><div class="stat-sub">${data[data.length-1].date}</div></div>
        <div class="stat-card" style="border-left-color:${trendColor};"><div class="stat-label">Изменение ${trendIcon}</div><div class="stat-value" style="color:${trendColor};">${diff > 0 ? '+' : ''}${Math.round(diff*10)/10} ${unit}</div><div class="stat-sub">${periodText}</div></div>
        <div class="stat-card"><div class="stat-label">Среднее</div><div class="stat-value">${Math.round(avg*10)/10} ${unit}</div><div class="stat-sub">мин: ${min} • макс: ${max}</div></div>
    </div>`;
}

function renderWeeklyAvg() {
    const container = document.getElementById('weekly-avg-container');
    if(nutritionData.weeks.length === 0) { container.innerHTML = '<div class="chart-empty">Нет данных</div>'; return; }
    const weeklyData = nutritionData.weeks.map(week => {
        if(!week.data) week.data = {};
        let cal = 0, prot = 0, fat = 0, carb = 0, days = 0;
        week.menu.forEach((day, di) => {
            let dayCal = 0;
            day.meals.forEach((meal, mi) => {
                dayCal += parseFloat(week.data[`m-${di}-${mi}-cal`]) || 0;
                prot += parseFloat(week.data[`m-${di}-${mi}-prot`]) || 0;
                fat += parseFloat(week.data[`m-${di}-${mi}-fat`]) || 0;
                carb += parseFloat(week.data[`m-${di}-${mi}-carb`]) || 0;
            });
            if(dayCal > 0) { cal += dayCal; days++; }
        });
        return { title: week.title, avgCal: days > 0 ? Math.round(cal / days) : 0, avgProt: days > 0 ? Math.round(prot / days) : 0, avgFat: days > 0 ? Math.round(fat / days) : 0, avgCarb: days > 0 ? Math.round(carb / days) : 0, days };
    });
    container.innerHTML = `<div style="overflow-x:auto;"><table class="weekly-table"><thead><tr><th>Неделя</th><th style="text-align:center;">Дней</th><th style="text-align:center;">Ккал</th><th style="text-align:center;">Б</th><th style="text-align:center;">Ж</th><th style="text-align:center;">У</th></tr></thead><tbody>
        ${weeklyData.map(w => `<tr><td>${w.title}</td><td style="text-align:center;">${w.days}</td><td style="text-align:center;" class="cal">${w.avgCal || '—'}</td><td style="text-align:center;" class="prot">${w.avgProt || '—'}</td><td style="text-align:center;" class="fat">${w.avgFat || '—'}</td><td style="text-align:center;" class="carb">${w.avgCarb || '—'}</td></tr>`).join('')}
    </tbody></table></div>`;
}

