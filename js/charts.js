// ============================================
// ОБЩИЙ МОДУЛЬ ДЛЯ SVG-ГРАФИКОВ
// ============================================

/**
 * Универсальная функция для отрисовки SVG-линейного графика
 * @param {Array} data - массив объектов с полями date и valueField
 * @param {string} field - имя поля со значениями (например 'weight', 'cal')
 * @param {string} unit - единица измерения (например 'кг', 'ккал')
 * @param {string} color - цвет линии (например '#10b981')
 * @param {string} gradientId - уникальный ID для градиента
 * @param {Object} options - дополнительные настройки
 * @param {string} options.title - заголовок графика
 * @param {string} options.textColor - цвет текста
 * @param {string} options.gridColor - цвет сетки
 * @returns {string} HTML/SVG строка
 */
function renderSVGLineChart(data, field, unit, color, gradientId, options) {
    options = options || {};
    var width = 800, height = 300;
    var padding = { top: 30, right: 30, bottom: 60, left: 60 };
    var chartW = width - padding.left - padding.right;
    var chartH = height - padding.top - padding.bottom;
    var values = data.map(function(d) { return d[field]; });
    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    var valRange = Math.max(maxVal - minVal, 0.01);
    var yMin = Math.max(0, minVal - Math.max(valRange * 0.1, 0.5));
    var yMax = maxVal + Math.max(valRange * 0.15, 0.5);
    var xOffset = 15;
    var xStep = data.length > 1 ? (chartW - xOffset * 2) / (data.length - 1) : chartW / 2;
    
    var points = data.map(function(d, i) {
        var x = padding.left + xOffset + (data.length > 1 ? i * xStep : chartW / 2);
        var y = padding.top + chartH - ((d[field] - yMin) / (yMax - yMin)) * chartH;
        return { x: x, y: y, value: d[field], date: d.date };
    });
    
    var linePath = points.map(function(p, i) { return (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y; }).join(' ');
    var areaPath = linePath + ' L ' + points[points.length - 1].x + ' ' + (padding.top + chartH) + ' L ' + points[0].x + ' ' + (padding.top + chartH) + ' Z';
    
    var gridColor = options.gridColor || '#a7f3d0';
    var textColor = options.textColor || '#065f46';
    var titleColor = options.titleColor || '#064e3b';
    var gradId = gradientId || ('grad-' + field);
    
    var gridLines = [];
    for (var i = 0; i <= 5; i++) {
        var val = yMin + (yMax - yMin) * (i / 5);
        var y = padding.top + chartH - (i / 5) * chartH;
        gridLines.push('<line x1="' + padding.left + '" y1="' + y + '" x2="' + (padding.left + chartW) + '" y2="' + y + '" stroke="' + gridColor + '" stroke-width="1" stroke-dasharray="2,4"/>');
        gridLines.push('<text x="' + (padding.left - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="' + textColor + '" font-weight="600">' + Math.round(val) + '</text>');
    }
    
    var pointsHtml = points.map(function(p, i) {
        var isFirst = i === 0, isLast = i === data.length - 1;
        var pointColor = isLast ? color : (isFirst ? '#2563eb' : color);
        var shortDate = p.date.slice(5).split('-').reverse().join('.');
        return '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (isFirst || isLast ? 6 : 4) + '" fill="' + pointColor + '" stroke="white" stroke-width="2"/>' +
               '<text x="' + p.x + '" y="' + (p.y - 10) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + titleColor + '">' + p.value + '</text>' +
               '<text x="' + p.x + '" y="' + (padding.top + chartH + 18) + '" text-anchor="middle" font-size="10" fill="' + textColor + '" font-weight="600">' + shortDate + '</text>';
    }).join('');
    
    var titleHtml = options.title ? '<text x="' + (width / 2) + '" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="' + titleColor + '">' + options.title + '</text>' : '';
    
    return '<div class="dashboard-chart"><svg class="chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet">' +
        '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.3"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
        gridLines.join('') +
        '<line x1="' + padding.left + '" y1="' + padding.top + '" x2="' + padding.left + '" y2="' + (padding.top + chartH) + '" stroke="' + textColor + '" stroke-width="1.5"/>' +
        '<line x1="' + padding.left + '" y1="' + (padding.top + chartH) + '" x2="' + (padding.left + chartW) + '" y2="' + (padding.top + chartH) + '" stroke="' + textColor + '" stroke-width="1.5"/>' +
        '<path d="' + areaPath + '" fill="url(#' + gradId + ')"/>' +
        '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
        pointsHtml +
        titleHtml +
    '</svg></div>';
}

/**
 * Универсальная функция для отрисовки блока статистики
 * @param {Array} data - массив объектов с полями date и valueField
 * @param {string} field - имя поля со значениями
 * @param {string} unit - единица измерения
 * @returns {string} HTML строка
 */
function renderStatsBlock(data, field, unit) {
    var values = data.map(function(d) { return d[field]; });
    var first = values[0], last = values[values.length - 1];
    var diff = last - first;
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var avg = values.reduce(function(s, v) { return s + v; }, 0) / values.length;
    var daysDiff = Math.round((new Date(data[data.length - 1].date) - new Date(data[0].date)) / (1000 * 60 * 60 * 24));
    var periodText = daysDiff === 0 ? 'в один день' : 'за ' + daysDiff + ' дней';
    var trendIcon = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➡️');
    var trendColor = diff > 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#6b7280');
    
    return '<div class="dashboard-stats">' +
        '<div class="stat-card"><div class="stat-label">Старт</div><div class="stat-value">' + first + ' ' + unit + '</div><div class="stat-sub">' + data[0].date + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Сейчас</div><div class="stat-value">' + last + ' ' + unit + '</div><div class="stat-sub">' + data[data.length - 1].date + '</div></div>' +
        '<div class="stat-card" style="border-left-color:' + trendColor + ';"><div class="stat-label">Изменение ' + trendIcon + '</div><div class="stat-value" style="color:' + trendColor + ';">' + (diff > 0 ? '+' : '') + Math.round(diff * 10) / 10 + ' ' + unit + '</div><div class="stat-sub">' + periodText + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Среднее</div><div class="stat-value">' + Math.round(avg * 10) / 10 + ' ' + unit + '</div><div class="stat-sub">мин: ' + min + ' • макс: ' + max + '</div></div>' +
    '</div>';
}

/**
 * Универсальная функция для отрисовки SVG donut chart
 * @param {Array} sectors - массив объектов {name, value, color}
 * @param {number} total - общая сумма
 * @param {string} centerText - текст в центре
 * @param {string} centerSubtext - подтекст в центре
 * @returns {string} HTML/SVG строка
 */
function renderDonutChart(sectors, total, centerText, centerSubtext) {
    var outerR = 90, innerR = 50;
    var cx = 120, cy = 120;
    var cumulativeAngle = 0;
    
    function polarToCartesian(cx, cy, r, angleDeg) {
        var rad = (angleDeg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }
    
    var donutHtml = sectors.map(function(s) {
        var startOuter = polarToCartesian(cx, cy, outerR, s.startAngle);
        var endOuter = polarToCartesian(cx, cy, outerR, s.startAngle + s.angle);
        var startInner = polarToCartesian(cx, cy, innerR, s.startAngle + s.angle);
        var endInner = polarToCartesian(cx, cy, innerR, s.startAngle);
        var largeArc = s.angle > 180 ? 1 : 0;
        return '<path d="M ' + startOuter.x + ' ' + startOuter.y + ' A ' + outerR + ' ' + outerR + ' 0 ' + largeArc + ' 1 ' + endOuter.x + ' ' + endOuter.y + ' L ' + startInner.x + ' ' + startInner.y + ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArc + ' 0 ' + endInner.x + ' ' + endInner.y + ' Z" fill="' + s.color + '" stroke="white" stroke-width="1.5"/>';
    }).join('');
    
    var legendHtml = sectors.map(function(s, i) {
        var pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
        return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
            '<div style="width:12px;height:12px;border-radius:3px;background:' + s.color + ';flex-shrink:0;"></div>' +
            '<span style="font-size:12px;color:#1e293b;">' + s.name + '</span>' +
            '<span style="font-size:12px;font-weight:700;color:#1e293b;margin-left:auto;">' + Math.round(s.value).toLocaleString('ru-RU') + ' ₽ (' + pct + '%)</span>' +
        '</div>';
    }).join('');
    
    return '<svg width="240" height="240" viewBox="0 0 240 240">' +
        donutHtml +
        '<text x="120" y="112" text-anchor="middle" font-size="15" font-weight="800" fill="#1e293b">' + (centerText || Math.round(total).toLocaleString('ru-RU')) + '</text>' +
        '<text x="120" y="132" text-anchor="middle" font-size="11" fill="#1e293b">' + (centerSubtext || 'всего расходов') + '</text>' +
    '</svg>' +
    '<div style="flex:1;min-width:150px;">' + legendHtml + '</div>';
}
