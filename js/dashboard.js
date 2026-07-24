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
    document.getElementById('weight-chart-container').innerHTML = data.length === 0 ? '<div class="chart-empty">Нет данных о весе</div>' : renderSVGLineChart(data, 'weight', 'кг', '#10b981', 'grad-weight', { textColor: '#065f46', titleColor: '#064e3b', gridColor: '#a7f3d0' });
    document.getElementById('weight-stats-container').innerHTML = data.length === 0 ? '' : renderStatsBlock(data, 'weight', 'кг');
}

function renderKbjuChart() {
    const period = document.getElementById('kbju-period').value;
    const data = collectKbjuData(period, currentKbjuMetric);
    const units = { cal: 'ккал', prot: 'г', fat: 'г', carb: 'г' };
    document.getElementById('kbju-chart-container').innerHTML = data.length === 0 ? '<div class="chart-empty">Нет данных КБЖУ</div>' : renderSVGLineChart(data, currentKbjuMetric, units[currentKbjuMetric], '#10b981', 'grad-kbju', { textColor: '#065f46', titleColor: '#064e3b', gridColor: '#a7f3d0' });
    document.getElementById('kbju-stats-container').innerHTML = data.length === 0 ? '' : renderStatsBlock(data, currentKbjuMetric, units[currentKbjuMetric]);
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