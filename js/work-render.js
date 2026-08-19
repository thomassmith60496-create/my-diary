// ============================================
// 📊 WORK RENDER — рендеринг подвкладок Работы
// ============================================
"use strict";

/**
 * Инициализация страницы Работы (загрузка snapshot из Firebase)
 */
window.renderWorkPage = async function() {
    try {
        if (typeof WorkData === 'undefined' || !WorkData.workState) {
            console.error('WorkData не инициализирован');
            renderWorkEmptyState();
            return;
        }
        const loaded = await WorkData.loadWorkSnapshot();
        if (loaded) {
            if (typeof WorkImport !== 'undefined' && WorkImport.updateWorkSyncInfo) {
                WorkImport.updateWorkSyncInfo();
            }
        }
        // Рендерим активную подвкладку
        const activeBtn = document.querySelector('#global-tab-work .work-sub-tab-btn.active');
        if (activeBtn) {
            const tab = activeBtn.getAttribute('onclick').match(/'([^']+)'/);
            if (tab) renderWorkSubTab(tab[1]);
        }
    } catch (e) {
        console.error('Ошибка при рендеринге страницы Работы:', e);
        renderWorkEmptyState();
    }
};

/**
 * Главный диспетчер рендеринга подвкладок
 */
window.renderWorkSubTab = function(tab) {
    if (!WorkData.workState.currentSnapshot) {
        renderWorkEmptyState();
        return;
    }
    switch (tab) {
        case 'dashboard': renderWorkDashboard(); break;
        case 'projects': renderWorkProjects(); break;
        case 'tasks': renderWorkTasks(); break;
        case 'meetings': renderWorkMeetings(); break;
        case 'analytics': renderWorkAnalytics(); break;
        case 'ideas': renderWorkIdeas(); break;
    }
};

/**
 * Пустое состояние — нет данных
 */
function renderWorkEmptyState() {
    const tabs = ['dashboard', 'projects', 'tasks', 'meetings', 'analytics', 'ideas'];
    tabs.forEach(t => {
        const el = document.getElementById('work-sub-' + t);
        if (el) {
            el.innerHTML = `<div class="empty-state">
                <div class="empty-state-icon">💼</div>
                <div class="empty-state-title">Нет данных</div>
                <div class="empty-state-text">Нажмите «🔄 Синхронизировать с Obsidian» чтобы импортировать данные</div>
            </div>`;
        }
    });
}

// ============================================
// 📊 DASHBOARD
// ============================================
function renderWorkDashboard() {
    const container = document.getElementById('work-sub-dashboard');
    const stats = WorkData.computeDashboardStats();
    if (!stats) { renderWorkEmptyState(); return; }
    
    const today = new Date(); today.setHours(0,0,0,0);
    
    // Stat cards
    const statCards = `
        <div class="work-stat-grid">
            <div class="work-stat-card">
                <div class="work-stat-icon">📁</div>
                <div class="work-stat-value">${stats.activeProjects}</div>
                <div class="work-stat-label">Активных проектов</div>
            </div>
            <div class="work-stat-card">
                <div class="work-stat-icon">✅</div>
                <div class="work-stat-value">${stats.openTasks}</div>
                <div class="work-stat-label">Открытых задач</div>
            </div>
            <div class="work-stat-card">
                <div class="work-stat-icon">📈</div>
                <div class="work-stat-value">${stats.completionRate}%</div>
                <div class="work-stat-label">Completion rate</div>
            </div>
            <div class="work-stat-card ${stats.overdueTasks > 0 ? 'danger' : ''}">
                <div class="work-stat-icon">⏰</div>
                <div class="work-stat-value">${stats.overdueTasks}</div>
                <div class="work-stat-label">Просрочено</div>
            </div>
        </div>
    `;
    
    // Status breakdown
    const statusColors = { 'открыт': '#3b82f6', 'в работе': '#f59e0b', 'требуется информация': '#8b5cf6', 'закрыт': '#16a34a' };
    const statusBars = Object.entries(stats.byStatus).map(([status, count]) => {
        const pct = stats.totalTasks ? Math.round(count / stats.totalTasks * 100) : 0;
        return `<div class="work-status-row">
            <span class="work-status-label">${status}</span>
            <div class="work-progress-track"><div class="work-progress-fill" style="width:${pct}%;background:${statusColors[status] || '#94a3b8'}"></div></div>
            <span class="work-status-count">${count}</span>
        </div>`;
    }).join('');
    
    // Upcoming deadlines
    const upcomingDeadlines = WorkData.workState.currentSnapshot.tasks
        .filter(t => WorkData.normalizeTaskStatus(t.status) !== 'закрыт' && t.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
    
    const deadlinesHtml = upcomingDeadlines.length ? upcomingDeadlines.map(t => {
        const d = new Date(t.deadline);
        const isOverdue = d < today;
        return `<div class="work-deadline-item ${isOverdue ? 'overdue' : ''}">
            <span class="work-deadline-date">${formatDateShort(t.deadline)}</span>
            <span class="work-deadline-name">${esc(t.name)}</span>
            <span class="work-deadline-project">${esc(t.project)}</span>
        </div>`;
    }).join('') : '<div class="work-empty-mini">Нет ближайших дедлайнов</div>';
    
    // Upcoming meetings
    const meetingsHtml = stats.upcomingMeetings.length ? stats.upcomingMeetings.map(m => {
        const dt = new Date(m.dateTime);
        return `<div class="work-meeting-item">
            <span class="work-meeting-date">${formatDateShort(m.date)}</span>
            <span class="work-meeting-time">${m.startTime}</span>
            <span class="work-meeting-title">${esc(m.title)}</span>
        </div>`;
    }).join('') : '<div class="work-empty-mini">Нет ближайших встреч</div>';
    
    // Changes from diff
    const changesHtml = stats.changes.length ? stats.changes.map(c => {
        const icon = c.action === 'added' ? '🆕' : c.action === 'closed' ? '✅' : c.action === 'status' ? '🔄' : c.action === 'removed' ? '🗑' : '✏️';
        return `<div class="work-change-item">
            <span class="work-change-icon">${icon}</span>
            <span class="work-change-text">${esc(c.detail)}</span>
        </div>`;
    }).join('') : '<div class="work-empty-mini">Нет изменений с прошлой синхронизации</div>';
    
    // 🗓 Представление на день
    const dayOverviewHtml = renderDayOverviewBlock();
    
    container.innerHTML = `
        ${statCards}
        ${dayOverviewHtml}
        <div class="work-dashboard-grid">
            <div class="work-dashboard-card">
                <h3 class="work-card-title">📊 Задачи по статусам</h3>
                ${statusBars}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">⏰ Ближайшие дедлайны</h3>
                ${deadlinesHtml}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">🗓 Ближайшие встречи</h3>
                ${meetingsHtml}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">🔄 Изменения с прошлой синхронизации</h3>
                ${changesHtml}
            </div>
        </div>
    `;
}

/**
 * 🗓 Представление на день — блок под карточками статистики на Dashboard
 */
function renderDayOverviewBlock() {
    const overview = WorkData.getDayOverview();
    if (!overview) return '';
    
    const today = new Date();
    const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const dateLabel = `${today.getDate()} ${monthNames[today.getMonth()]}, ${dayNames[today.getDay()]}`;
    
    // 📋 Задачи из дейли-ноута
    const dailyTasks = (overview.dailyNote && overview.dailyNote.tasks) || [];
    const tasksHtml = dailyTasks.length ? dailyTasks.map(t => `
        <div class="work-day-task ${t.done ? 'done' : ''}">
            <span class="work-day-check">${t.done ? '☑️' : '☐'}</span>
            <span class="work-day-task-text">${esc(t.text)}</span>
        </div>
    `).join('') : '<div class="work-empty-mini">Нет задач на день</div>';
    
    const dailyLink = overview.dailyNote
        ? `<a href="${overview.dailyNote.obsidianUrl}" class="work-open-link">📄 Открыть дейли в Obsidian</a>`
        : '<div class="work-empty-mini">Дейли-ноут не найден</div>';
    
    // 🗓 Встречи на сегодня
    const meetingsHtml = overview.meetings.length ? overview.meetings.map(m => `
        <div class="work-day-meeting">
            <span class="work-day-meeting-time">${esc(m.startTime || '—')}</span>
            <span class="work-day-meeting-title">${esc(m.title)} ${m.type === 'recurring' ? '<span class="work-chip small orange">🔁</span>' : ''}</span>
            <a href="${m.obsidianUrl}" class="work-open-link" onclick="event.stopPropagation()">📄</a>
        </div>
    `).join('') : '<div class="work-empty-mini">Встреч нет</div>';
    
    // ⏰ Дедлайны на сегодня
    const deadlinesHtml = overview.deadlines.length ? overview.deadlines.map(d => `
        <div class="work-day-deadline">
            <span class="work-day-deadline-icon">${d.kind === 'project' ? '📁' : '✅'}</span>
            <span class="work-day-deadline-name">${esc(d.name)}</span>
            ${d.project ? `<span class="work-chip small blue">${esc(d.project)}</span>` : ''}
            <a href="${d.obsidianUrl}" class="work-open-link" onclick="event.stopPropagation()">📄</a>
        </div>
    `).join('') : '<div class="work-empty-mini">Дедлайнов нет</div>';
    
    return `
        <div class="work-day-overview">
            <div class="work-day-overview-header">
                <div class="work-day-date">📍 Сегодня · ${dateLabel}</div>
                <div class="work-day-header-links">${dailyLink}</div>
            </div>
            <div class="work-day-grid">
                <div class="work-day-column">
                    <h4 class="work-day-title">📋 Задачи на день</h4>
                    <div class="work-day-column-body">${tasksHtml}</div>
                </div>
                <div class="work-day-column">
                    <h4 class="work-day-title">🗓 Встречи сегодня</h4>
                    <div class="work-day-column-body">${meetingsHtml}</div>
                </div>
                <div class="work-day-column">
                    <h4 class="work-day-title">⏰ Дедлайны сегодня</h4>
                    <div class="work-day-column-body">${deadlinesHtml}</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// 📁 ПРОЕКТЫ
// ============================================
function renderWorkProjects() {
    const container = document.getElementById('work-sub-projects');
    const projects = WorkData.filterProjects(WorkData.workState.currentSnapshot.projects);
    const tasks = WorkData.workState.currentSnapshot.tasks;
    
    if (!projects.length) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <div class="empty-state-title">Нет проектов</div>
            <div class="empty-state-text">Синхронизируйте с Obsidian чтобы увидеть проекты</div>
        </div>`;
        return;
    }
    
    const statusColors = { 'активен': '#16a34a', 'в работе': '#f59e0b', 'пауза': '#94a3b8', 'закрыт': '#dc2626', 'завершён': '#dc2626' };
    
    const cards = projects.map(p => {
        const projTasks = tasks.filter(t => {
            const tn = String(t.project || '').trim().toLowerCase();
            const pn = String(p.name || '').trim().toLowerCase();
            const pid = String(p.id || '').trim().toLowerCase();
            return tn === pn || tn === pid || (p.id && tn === String(p.id).replace(/^01 Projects\//, '').replace(/\.md$/, '').trim().toLowerCase());
        });
        const closedCount = projTasks.filter(t => WorkData.normalizeTaskStatus(t.status) === 'закрыт').length;
        const totalCount = projTasks.length;
        const progressPct = totalCount ? Math.round(closedCount / totalCount * 100) : 0;
        const statusColor = statusColors[p.status] || '#94a3b8';
        
        const streamChips = (p.stream || []).map(s => `<span class="work-chip">${esc(s)}</span>`).join('');
        const participants = (p.participants || []).map(pp => `<span class="work-chip gray">${esc(pp)}</span>`).join('');
        
        return `<div class="work-project-card" onclick="toggleWorkProjectDetails('${esc(p.id)}')">
            <div class="work-project-header">
                <div class="work-project-name">${esc(p.name)}</div>
                <span class="work-status-badge" style="background:${statusColor}">${esc(p.status || '—')}</span>
            </div>
            ${p.goal ? `<div class="work-project-goal">${esc(p.goal)}</div>` : ''}
            <div class="work-project-meta">
                ${streamChips}
                ${p.deadline ? `<span class="work-chip orange">⏰ ${formatDateShort(p.deadline)}</span>` : ''}
                ${p.priority ? `<span class="work-chip purple">${esc(p.priority)}</span>` : ''}
            </div>
            <div class="work-project-progress">
                <div class="work-progress-track"><div class="work-progress-fill" style="width:${progressPct}%;background:var(--color-success)"></div></div>
                <span class="work-progress-label">${closedCount}/${totalCount} задач</span>
            </div>
            ${participants ? `<div class="work-project-participants">${participants}</div>` : ''}
            <div class="work-project-details" id="work-proj-details-${esc(p.id)}" style="display:none">
                ${p.context ? `<div class="work-detail-section"><b>📌 Контекст:</b> ${esc(p.context)}</div>` : ''}
                ${p.result ? `<div class="work-detail-section"><b>✅ Результат:</b> ${esc(p.result)}</div>` : ''}
                ${p.tracker ? `<div class="work-detail-section"><b>📊 Трекер:</b> ${esc(p.tracker)}</div>` : ''}
                ${p.sprint ? `<div class="work-detail-section"><b>🏃 Спринт:</b> ${esc(p.sprint)}</div>` : ''}
                ${projTasks.length ? `<div class="work-detail-section"><b>📋 Задачи:</b><ul>${projTasks.slice(0, 10).map(t => `<li>${esc(t.name)} ${t.sprint ? `<span class="work-chip small orange">🏃 ${esc(t.sprint)}</span>` : ''} <span class="work-chip small">${esc(t.status)}</span></li>`).join('')}</ul></div>` : ''}
                <a href="${p.obsidianUrl}" class="btn small" onclick="event.stopPropagation()">📄 Открыть в Obsidian</a>
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = `<div class="work-projects-grid">${cards}</div>`;
}

function toggleWorkProjectDetails(id) {
    const el = document.getElementById('work-proj-details-' + id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ============================================
// ✅ ЗАДАЧИ (Kanban)
// ============================================
function renderWorkTasks() {
    const container = document.getElementById('work-sub-tasks');
    const tasks = WorkData.filterTasks(WorkData.workState.currentSnapshot.tasks);
    const groups = WorkData.groupTasksByStatus(tasks);
    const options = WorkData.getFilterOptions();
    
    const filterBar = `
        <div class="work-filter-bar">
            <select class="work-filter-select" onchange="setWorkFilter('sprint', this.value)">
                <option value="">🏃 Все спринты</option>
                ${options.sprints.map(s => `<option value="${esc(s)}" ${WorkData.workState.filters.sprint === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
            <select class="work-filter-select" onchange="setWorkFilter('project', this.value)">
                <option value="">📁 Все проекты</option>
                ${options.projects.map(p => `<option value="${esc(p)}" ${WorkData.workState.filters.project === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
            </select>
            <select class="work-filter-select" onchange="setWorkFilter('stream', this.value)">
                <option value="">🌊 Все стримы</option>
                ${options.streams.map(s => `<option value="${esc(s)}" ${WorkData.workState.filters.stream === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
            <select class="work-filter-select" onchange="setWorkFilter('priority', this.value)">
                <option value="">⚡ Все приоритеты</option>
                ${options.priorities.map(p => `<option value="${esc(p)}" ${WorkData.workState.filters.priority === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
            </select>
            <select class="work-filter-select" onchange="setWorkFilter('deadline', this.value)">
                <option value="">📅 Все дедлайны</option>
                <option value="overdue" ${WorkData.workState.filters.deadline === 'overdue' ? 'selected' : ''}>⏰ Просрочено</option>
                <option value="upcoming" ${WorkData.workState.filters.deadline === 'upcoming' ? 'selected' : ''}>📅 Ближайшие 7 дней</option>
                <option value="none" ${WorkData.workState.filters.deadline === 'none' ? 'selected' : ''}>🚫 Без дедлайна</option>
            </select>
            <button class="btn small" onclick="resetWorkFilters()">✖ Сбросить</button>
        </div>
    `;
    
    const priorityColors = { 'высокий': '#dc2626', 'средний': '#f59e0b', 'низкий': '#16a34a' };
    const columnColors = { 'открыт': '#3b82f6', 'в работе': '#f59e0b', 'требуется информация': '#8b5cf6', 'закрыт': '#16a34a' };
    
    const columns = Object.entries(groups).map(([status, statusTasks]) => {
        const cards = statusTasks.map(t => {
            const tags = (t.tags || []).map(tag => `<span class="work-chip small">#${esc(tag)}</span>`).join('');
            const prioColor = priorityColors[t.priority] || '#94a3b8';
            return `<div class="work-kanban-card">
                <div class="work-kanban-card-title">${esc(t.name)}</div>
                <div class="work-kanban-card-meta">
                    <span class="work-chip small blue">${esc(t.project)}</span>
                    <span class="work-chip small" style="background:${prioColor};color:white">${esc(t.priority)}</span>
                </div>
                ${t.sprint ? `<div class="work-kanban-card-sprint">🏃 ${esc(t.sprint)}</div>` : ''}
                ${t.deadline ? `<div class="work-kanban-card-deadline">⏰ ${formatDateShort(t.deadline)}</div>` : ''}
                ${tags}
                <a href="${t.obsidianUrl}" class="work-open-link" onclick="event.stopPropagation()">📄 Открыть в Obsidian</a>
            </div>`;
        }).join('');
        
        return `<div class="work-kanban-column">
            <div class="work-kanban-header" style="border-color:${columnColors[status]}">
                <span class="work-kanban-title">${status}</span>
                <span class="work-kanban-count">${statusTasks.length}</span>
            </div>
            <div class="work-kanban-body">${cards || '<div class="work-empty-mini">Нет задач</div>'}</div>
        </div>`;
    }).join('');
    
    container.innerHTML = filterBar + `<div class="work-kanban">${columns}</div>`;
}

window.setWorkFilter = function(key, value) {
    WorkData.workState.filters[key] = value;
    renderWorkSubTab('tasks');
};

window.resetWorkFilters = function() {
    WorkData.workState.filters = { sprint: '', project: '', stream: '', priority: '', deadline: '' };
    renderWorkSubTab('tasks');
};

// ============================================
// 🗓 ВСТРЕЧИ
// ============================================
function renderWorkMeetings() {
    const container = document.getElementById('work-sub-meetings');
    const meetings = WorkData.filterMeetings(WorkData.workState.currentSnapshot.meetings)
        .filter(m => m.dateTime)
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    if (!meetings.length) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🗓</div>
            <div class="empty-state-title">Нет встреч</div>
            <div class="empty-state-text">Синхронизируйте с Obsidian чтобы увидеть встречи</div>
        </div>`;
        return;
    }
    
    // Группируем по датам
    const byDate = {};
    meetings.forEach(m => {
        const dateKey = m.date || (m.dateTime ? m.dateTime.split('T')[0] : 'unknown');
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(m);
    });
    
    const today = new Date(); today.setHours(0,0,0,0);
    
    const html = Object.entries(byDate).map(([date, dayMeetings]) => {
        const d = new Date(date);
        const isToday = date === getLocalDateStr();
        const isPast = d < today;
        const dayLabel = isToday ? 'Сегодня' : formatDateFull(date);
        
        const items = dayMeetings.map(m => {
            const projChips = (m.project || []).map(p => `<span class="work-chip small blue">${esc(p)}</span>`).join('');
            const recurringBadge = m.type === 'recurring' ? '<span class="work-chip small orange">🔁</span>' : '';
            return `<div class="work-meeting-card ${isPast ? 'past' : ''}">
                <div class="work-meeting-time">${m.startTime}${m.endTime ? ' – ' + m.endTime : ''}</div>
                <div class="work-meeting-info">
                    <div class="work-meeting-name">${esc(m.title)} ${recurringBadge}</div>
                    <div class="work-meeting-meta">${projChips}</div>
                    ${m.agenda ? `<div class="work-meeting-agenda">${esc(m.agenda)}</div>` : ''}
                    <a href="${m.obsidianUrl}" class="work-open-link">📄 Открыть в Obsidian</a>
                </div>
            </div>`;
        }).join('');
        
        return `<div class="work-meeting-day">
            <div class="work-meeting-day-header ${isToday ? 'today' : ''}">${dayLabel}</div>
            ${items}
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

// ============================================
// 📈 АНАЛИТИКА
// ============================================
function renderWorkAnalytics() {
    const container = document.getElementById('work-sub-analytics');
    const stats = WorkData.computeDashboardStats();
    if (!stats) { renderWorkEmptyState(); return; }
    
    const { projects, tasks } = WorkData.workState.currentSnapshot;
    const options = WorkData.getFilterOptions();
    
    // Фильтр по спринту
    const sprintFilter = `
        <div class="work-filter-bar">
            <select class="work-filter-select" onchange="setAnalyticsSprint(this.value)">
                <option value="">🏃 Все спринты</option>
                ${options.sprints.map(s => `<option value="${esc(s)}" ${WorkData.workState.filters.sprint === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
        </div>
    `;
    
    // Completion rate donut
    const donutSectors = [
        { name: 'Закрыто', value: stats.closedTasks, color: '#16a34a', startAngle: 0, angle: stats.totalTasks ? stats.closedTasks / stats.totalTasks * 360 : 0 },
        { name: 'Открыто', value: stats.openTasks, color: '#3b82f6', startAngle: stats.totalTasks ? stats.closedTasks / stats.totalTasks * 360 : 0, angle: stats.totalTasks ? stats.openTasks / stats.totalTasks * 360 : 0 }
    ];
    const donutHtml = renderDonutChart(donutSectors, stats.totalTasks, stats.completionRate + '%', 'completion rate', '');
    
    // Задачи по статусам — SVG bars
    const statusData = Object.entries(stats.byStatus).map(([s, c]) => ({ label: s, value: c }));
    const statusBars = renderSVGBars(statusData, '#3b82f6');
    
    // Задачи по проектам — SVG bars
    const projectData = Object.entries(stats.byProject).map(([p, c]) => ({ label: p, value: c })).sort((a, b) => b.value - a.value).slice(0, 8);
    const projectBars = renderSVGBars(projectData, '#8b5cf6');
    
    // Задачи по стримам — SVG bars
    const streamData = Object.entries(stats.byStream).map(([s, c]) => ({ label: s, value: c })).sort((a, b) => b.value - a.value).slice(0, 8);
    const streamBars = renderSVGBars(streamData, '#f59e0b');
    
    // Просроченные задачи
    const today = new Date(); today.setHours(0,0,0,0);
    const overdueTasks = tasks
        .filter(t => WorkData.normalizeTaskStatus(t.status) !== 'закрыт' && t.deadline && new Date(t.deadline) < today)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    const overdueHtml = overdueTasks.length ? overdueTasks.map(t => `
        <div class="work-overdue-item">
            <span class="work-overdue-date">${formatDateShort(t.deadline)}</span>
            <span class="work-overdue-name">${esc(t.name)}</span>
            <span class="work-chip small blue">${esc(t.project)}</span>
        </div>
    `).join('') : '<div class="work-empty-mini">Нет просроченных задач 🎉</div>';
    
    // Недавно закрытые (из diff)
    const diff = WorkData.computeWorkDiff();
    const recentlyClosed = diff.filter(c => c.action === 'closed' || (c.action === 'status' && c.new === 'закрыт'));
    const closedHtml = recentlyClosed.length ? recentlyClosed.map(c => `
        <div class="work-change-item">
            <span class="work-change-icon">✅</span>
            <span class="work-change-text">${esc(c.detail)}</span>
        </div>
    `).join('') : '<div class="work-empty-mini">Нет недавно закрытых задач</div>';
    
    container.innerHTML = `
        ${sprintFilter}
        <div class="work-dashboard-grid">
            <div class="work-dashboard-card">
                <h3 class="work-card-title">📈 Completion rate</h3>
                <div class="work-donut-wrap">${donutHtml}</div>
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">📊 Задачи по статусам</h3>
                ${statusBars}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">📁 Задачи по проектам</h3>
                ${projectBars}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">🌊 Задачи по стримам</h3>
                ${streamBars}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">⏰ Просроченные задачи</h3>
                ${overdueHtml}
            </div>
            <div class="work-dashboard-card">
                <h3 class="work-card-title">✅ Недавно закрытые</h3>
                ${closedHtml}
            </div>
        </div>
    `;
}

window.setAnalyticsSprint = function(value) {
    WorkData.workState.filters.sprint = value;
    renderWorkSubTab('analytics');
};

/**
 * Простые SVG-бары для аналитики
 */
function renderSVGBars(data, color) {
    if (!data.length) return '<div class="work-empty-mini">Нет данных</div>';
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barHeight = 20;
    const gap = 6;
    const labelWidth = 140;
    const valueWidth = 40;
    const chartWidth = 300;
    const totalWidth = labelWidth + chartWidth + valueWidth;
    const height = data.length * (barHeight + gap) + 20;
    
    const bars = data.map((d, i) => {
        const width = Math.max(d.value / maxVal * chartWidth, 2);
        const y = 10 + i * (barHeight + gap);
        return `<rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="4" fill="${color}" opacity="0.85"/>
            <text x="${labelWidth + width + 6}" y="${y + barHeight - 5}" font-size="11" fill="#475569" font-weight="600">${d.value}</text>
            <text x="0" y="${y + barHeight - 5}" font-size="11" fill="#64748b">${esc(d.label)}</text>`;
    }).join('');
    
    return `<svg class="work-svg-bars" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;max-width:${totalWidth}px">${bars}</svg>`;
}

// ============================================
// 💡 ИДЕИ
// ============================================
function renderWorkIdeas() {
    const container = document.getElementById('work-sub-ideas');
    const ideas = WorkData.filterIdeas(WorkData.workState.currentSnapshot.ideas);
    
    if (!ideas.length) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">💡</div>
            <div class="empty-state-title">Нет идей</div>
            <div class="empty-state-text">Синхронизируйте с Obsidian чтобы увидеть идеи</div>
        </div>`;
        return;
    }
    
    const cards = ideas.map(idea => {
        const preview = (idea.text || '').replace(/^#+\s+/gm, '').replace(/[#*_`>]/g, '').trim().slice(0, 200);
        return `<div class="work-idea-card">
            <div class="work-idea-header">
                <div class="work-idea-name">💡 ${esc(idea.name)}</div>
                <span class="work-chip small purple">${esc(idea.status)}</span>
            </div>
            ${preview ? `<div class="work-idea-preview">${esc(preview)}${preview.length >= 200 ? '…' : ''}</div>` : ''}
            <a href="${idea.obsidianUrl}" class="work-open-link">📄 Открыть в Obsidian</a>
        </div>`;
    }).join('');
    
    container.innerHTML = `<div class="work-ideas-grid">${cards}</div>`;
}

// Экспорт
window.WorkRender = {
    renderWorkPage,
    renderWorkSubTab,
    renderWorkDashboard,
    renderWorkProjects,
    renderWorkTasks,
    renderWorkMeetings,
    renderWorkAnalytics,
    renderWorkIdeas,
    toggleWorkProjectDetails,
    setWorkFilter,
    resetWorkFilters,
    setAnalyticsSprint
};