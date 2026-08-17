// ============================================
// 💾 WORK DATA — состояние, Firebase, diff
// ============================================
"use strict";

let workState = {
    currentSnapshot: null,    // { projects, tasks, meetings, ideas, syncedAt }
    previousSnapshot: null,
    filters: {
        sprint: '',
        project: '',
        stream: '',
        priority: '',
        deadline: '' // 'overdue', 'upcoming', 'none', или дата
    },
    vaultName: 'my vault',
    vaultPath: '',
    lastSyncTime: null
};

// Получает целевой UID (для viewer mode)
function getWorkTargetUid() {
    return viewingUserId || currentUserId;
}

// Путь в Firebase
function getWorkDbRef() {
    const uid = getWorkTargetUid();
    if (!uid) return null;
    return db.ref(`lera_work_v1/${uid}`);
}

/**
 * Сохраняет snapshot в Firebase
 */
async function saveWorkSnapshot(snapshot) {
    const ref = getWorkDbRef();
    if (!ref) return false;
    
    const data = {
        current: snapshot,
        previous: workState.currentSnapshot, // старый current становится previous
        lastSyncAt: Date.now()
    };
    
    try {
        await ref.set(data);
        workState.previousSnapshot = workState.currentSnapshot;
        workState.currentSnapshot = snapshot;
        workState.lastSyncTime = data.lastSyncAt;
        return true;
    } catch (e) {
        console.error('Work snapshot save error:', e);
        return false;
    }
}

/**
 * Загружает snapshot из Firebase
 */
async function loadWorkSnapshot() {
    const ref = getWorkDbRef();
    if (!ref) return false;
    
    try {
        const snap = await ref.once('value');
        const data = snap.val();
        if (data) {
            workState.currentSnapshot = data.current || null;
            workState.previousSnapshot = data.previous || null;
            workState.lastSyncTime = data.lastSyncAt || null;
            return true;
        }
    } catch (e) {
        console.error('Work snapshot load error:', e);
    }
    return false;
}

/**
 * Сравнивает текущий и предыдущий snapshot, возвращает список изменений
 */
function computeWorkDiff() {
    if (!workState.currentSnapshot || !workState.previousSnapshot) return [];
    
    const curr = workState.currentSnapshot;
    const prev = workState.previousSnapshot;
    const changes = [];
    
    // Helper: ключ сущности — path (относительный путь файла)
    const makeMap = (arr) => new Map(arr.map(e => [e.id, e]));
    
    const currProjects = makeMap(curr.projects);
    const prevProjects = makeMap(prev.projects);
    const currTasks = makeMap(curr.tasks);
    const prevTasks = makeMap(prev.tasks);
    const currMeetings = makeMap(curr.meetings);
    const prevMeetings = makeMap(prev.meetings);
    const currIdeas = makeMap(curr.ideas);
    const prevIdeas = makeMap(prev.ideas);
    
    // Проекты
    for (const [id, proj] of currProjects) {
        if (!prevProjects.has(id)) {
            changes.push({ type: 'project', action: 'added', entity: proj, detail: `Новый проект: ${proj.name}` });
        } else {
            const old = prevProjects.get(id);
            if (old.status !== proj.status) {
                changes.push({ type: 'project', action: 'status', entity: proj, old: old.status, new: proj.status, detail: `${proj.name}: статус ${old.status} → ${proj.status}` });
            }
            if (old.deadline !== proj.deadline) {
                changes.push({ type: 'project', action: 'deadline', entity: proj, old: old.deadline, new: proj.deadline, detail: `${proj.name}: дедлайн ${old.deadline || '—'} → ${proj.deadline || '—'}` });
            }
        }
    }
    for (const [id, proj] of prevProjects) {
        if (!currProjects.has(id)) {
            changes.push({ type: 'project', action: 'removed', entity: proj, detail: `Проект удалён: ${proj.name}` });
        }
    }
    
    // Задачи
    for (const [id, task] of currTasks) {
        if (!prevTasks.has(id)) {
            changes.push({ type: 'task', action: 'added', entity: task, detail: `Новая задача: ${task.name} (${task.project})` });
        } else {
            const old = prevTasks.get(id);
            if (old.status !== task.status) {
                changes.push({ type: 'task', action: 'status', entity: task, old: old.status, new: task.status, detail: `${task.name}: ${old.status} → ${task.status}` });
            }
            if (old.deadline !== task.deadline) {
                changes.push({ type: 'task', action: 'deadline', entity: task, old: old.deadline, new: task.deadline, detail: `${task.name}: дедлайн ${old.deadline || '—'} → ${task.deadline || '—'}` });
            }
            if (old.project !== task.project) {
                changes.push({ type: 'task', action: 'project', entity: task, old: old.project, new: task.project, detail: `${task.name}: проект ${old.project} → ${task.project}` });
            }
        }
    }
    for (const [id, task] of prevTasks) {
        if (!currTasks.has(id)) {
            const isClosed = task.status === 'закрыт';
            changes.push({ type: 'task', action: isClosed ? 'closed' : 'removed', entity: task, detail: `${isClosed ? 'Задача закрыта' : 'Задача удалена'}: ${task.name}` });
        }
    }
    
    // Встречи
    for (const [id, mtg] of currMeetings) {
        if (!prevMeetings.has(id)) {
            changes.push({ type: 'meeting', action: 'added', entity: mtg, detail: `Новая встреча: ${mtg.title} (${mtg.date})` });
        }
    }
    for (const [id, mtg] of prevMeetings) {
        if (!currMeetings.has(id)) {
            changes.push({ type: 'meeting', action: 'removed', entity: mtg, detail: `Встреча удалена: ${mtg.title}` });
        }
    }
    
    // Идеи
    for (const [id, idea] of currIdeas) {
        if (!prevIdeas.has(id)) {
            changes.push({ type: 'idea', action: 'added', entity: idea, detail: `Новая идея: ${idea.name}` });
        }
    }
    
    // Сортируем: добавленные/статусы/дедлайны сначала
    changes.sort((a, b) => {
        const order = { added: 0, status: 1, deadline: 2, project: 3, closed: 4, removed: 5 };
        return (order[a.action] || 9) - (order[b.action] || 9);
    });
    
    return changes;
}

/**
 * Формирует snapshot из распарсенных сущностей
 */
function buildSnapshot(entities, vaultName) {
    return {
        projects: entities.projects || [],
        tasks: entities.tasks || [],
        meetings: entities.meetings || [],
        ideas: entities.ideas || [],
        syncedAt: new Date().toISOString(),
        vaultName
    };
}

/**
 * Фильтрует задачи по текущим фильтрам
 */
function filterTasks(tasks) {
    const f = workState.filters;
    return tasks.filter(t => {
        if (f.sprint && t.sprint !== f.sprint) return false;
        if (f.project && t.project !== f.project) return false;
        // stream фильтруется через проект — нужно найти проект и проверить его stream
        if (f.stream && workState.currentSnapshot) {
            const proj = workState.currentSnapshot.projects.find(p => p.name === t.project);
            if (!proj || !proj.stream.includes(f.stream)) return false;
        }
        if (f.priority && t.priority !== f.priority) return false;
        if (f.deadline) {
            const today = new Date(); today.setHours(0,0,0,0);
            if (f.deadline === 'overdue' && (!t.deadline || new Date(t.deadline) >= today)) return false;
            if (f.deadline === 'upcoming' && (!t.deadline || new Date(t.deadline) > new Date(today.getTime() + 7*86400000))) return false;
            if (f.deadline === 'none' && t.deadline) return false;
        }
        return true;
    });
}

/**
 * Фильтрует проекты
 */
function filterProjects(projects) {
    const f = workState.filters;
    return projects.filter(p => {
        if (f.sprint && p.sprint !== f.sprint) return false;
        if (f.stream && !p.stream.includes(f.stream)) return false;
        return true;
    });
}

/**
 * Фильтрует встречи
 */
function filterMeetings(meetings) {
    const f = workState.filters;
    return meetings.filter(m => {
        if (f.project && m.project && !m.project.includes(f.project)) return false;
        if (f.stream && m.stream && !m.stream.includes(f.stream)) return false;
        return true;
    });
}

/**
 * Фильтрует идеи
 */
function filterIdeas(ideas) {
    return ideas; // пока без фильтров
}

/**
 * Группирует задачи по статусу для канбана
 */
function groupTasksByStatus(tasks) {
    const order = ['открыт', 'в работе', 'требуется информация', 'закрыт'];
    const groups = {};
    order.forEach(s => groups[s] = []);
    tasks.forEach(t => {
        const status = normalizeTaskStatus(t.status);
        if (groups[status]) groups[status].push(t);
        else groups['открыт'].push(t);
    });
    return groups;
}

function normalizeTaskStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    if (s.includes('открыт')) return 'открыт';
    if (s.includes('работ')) return 'в работе';
    if (s.includes('треб') || s.includes('информ')) return 'требуется информация';
    if (s.includes('закрыт') || s.includes('done') || s.includes('closed')) return 'закрыт';
    return 'открыт';
}

/**
 * Статистика для дашборда
 */
function computeDashboardStats() {
    if (!workState.currentSnapshot) return null;
    const { projects, tasks, meetings, ideas } = workState.currentSnapshot;
    const today = new Date(); today.setHours(0,0,0,0);
    const weekLater = new Date(today.getTime() + 7*86400000);
    
    const activeProjects = projects.filter(p => p.status !== 'закрыт');
    const openTasks = tasks.filter(t => normalizeTaskStatus(t.status) !== 'закрыт');
    const closedTasks = tasks.filter(t => normalizeTaskStatus(t.status) === 'закрыт');
    const overdueTasks = openTasks.filter(t => t.deadline && new Date(t.deadline) < today);
    const upcomingTasks = openTasks.filter(t => t.deadline && new Date(t.deadline) >= today && new Date(t.deadline) <= weekLater);
    
    // Ближайшие встречи (следующие 7 дней)
    const upcomingMeetings = meetings
        .filter(m => m.dateTime && new Date(m.dateTime) >= today && new Date(m.dateTime) <= weekLater)
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
        .slice(0, 5);
    
    // Completion rate
    const totalTasks = tasks.length;
    const doneTasks = closedTasks.length;
    const completionRate = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
    
    // Задачи по статусам
    const byStatus = {};
    ['открыт', 'в работе', 'требуется информация', 'закрыт'].forEach(s => byStatus[s] = tasks.filter(t => normalizeTaskStatus(t.status) === s).length);
    
    // Задачи по проектам
    const byProject = {};
    tasks.forEach(t => { byProject[t.project] = (byProject[t.project] || 0) + 1; });
    
    // Задачи по стримам
    const byStream = {};
    projects.forEach(p => {
        p.stream.forEach(s => { byStream[s] = (byStream[s] || 0) + tasks.filter(t => t.project === p.name).length; });
    });
    
    // Изменения с прошлой синхронизации
    const changes = computeWorkDiff();
    
    return {
        activeProjects: activeProjects.length,
        totalProjects: projects.length,
        totalTasks,
        openTasks: openTasks.length,
        closedTasks: doneTasks,
        completionRate,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length,
        upcomingMeetings,
        byStatus,
        byProject,
        byStream,
        changes: changes.slice(0, 10),
        totalIdeas: ideas.length
    };
}

/**
 * Получает уникальные значения для фильтров
 */
function getFilterOptions() {
    if (!workState.currentSnapshot) return { sprints: [], projects: [], streams: [], priorities: [] };
    const { projects, tasks } = workState.currentSnapshot;
    
    const sprints = [...new Set(tasks.map(t => t.sprint).filter(Boolean))].sort();
    const projectNames = [...new Set(tasks.map(t => t.project).filter(Boolean))].sort();
    const streams = [...new Set(projects.flatMap(p => p.stream).filter(Boolean))].sort();
    const priorities = [...new Set(tasks.map(t => t.priority).filter(Boolean))].sort();
    
    return { sprints, projects: projectNames, streams, priorities };
}

// Экспорт
window.WorkData = {
    workState,
    getWorkTargetUid,
    getWorkDbRef,
    saveWorkSnapshot,
    loadWorkSnapshot,
    computeWorkDiff,
    buildSnapshot,
    filterTasks,
    filterProjects,
    filterMeetings,
    filterIdeas,
    groupTasksByStatus,
    computeDashboardStats,
    getFilterOptions,
    normalizeTaskStatus
};