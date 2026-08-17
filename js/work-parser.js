// ============================================
// 📄 WORK PARSER — парсинг Obsidian Markdown
// ============================================
"use strict";

/**
 * Мини-парсер YAML frontmatter (поддерживает нужный подмножество)
 * Поддерживает: скаляры, даты, числа, boolean, inline-массивы [a, b], блочные списки - item, пустые значения
 */
function parseFrontmatter(fmText) {
    const data = {};
    const lines = fmText.split('\n');
    let i = 0;
    while (i < lines.length) {
        let line = lines[i].trim();
        if (!line) { i++; continue; }
        // Ключ: значение
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim();
            let val = line.substring(colonIdx + 1).trim();
            
            // Пустое значение
            if (!val) {
                // Проверяем следующий строки на блочный список
                if (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
                    val = [];
                    i++;
                    while (i < lines.length) {
                        const listLine = lines[i].trim();
                        if (listLine.startsWith('- ')) {
                            val.push(listLine.substring(2).trim());
                            i++;
                        } else if (listLine.startsWith('  - ')) {
                            // вложенный элемент (используем как есть)
                            val.push(listLine.substring(4).trim());
                            i++;
                        } else {
                            i--;
                            break;
                        }
                    }
                }
            } else if (val.startsWith('[') && val.endsWith(']')) {
                // Inline массив: [a, b, c]
                val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
            } else if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
                // Квадратичные/одинарные кавычки
                val = val.slice(1, -1);
            } else if (val === 'true') {
                val = true;
            } else if (val === 'false') {
                val = false;
            } else if (!isNaN(val) && val !== '' && !val.includes(':')) {
                // Число (но не время HH:MM)
                val = Number(val);
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                // Дата YYYY-MM-DD — оставляем строкой
            }
            // Иначе оставляем строкой как есть
            
            data[key] = val;
        } else if (line.startsWith('- ')) {
            // Блочный список без ключа — игнорируем
        }
        i++;
    }
    return data;
}

/**
 * Парсит markdown файл с frontmatter
 * @param {string} content — всё содержимое .md файла
 * @param {string} relPath — относительный путь от корня vault
 * @returns {object|null} { frontmatter, body, sections, path }
 */
function parseMarkdownFile(content, relPath) {
    // Ищем frontmatter между --- и ---
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let frontmatter = {};
    let body = content;
    if (fmMatch) {
        frontmatter = parseFrontmatter(fmMatch[1]);
        body = content.slice(fmMatch[0].length).trim();
    }
    
    // Парсим секции тела: ## Заголовок ... контент до следующего ##
    const sections = {};
    const sectionRegex = /^##\s+(.+?)\n([\s\S]*?)(?=\n##\s+|\n*$)/gm;
    let match;
    while ((match = sectionRegex.exec(body)) !== null) {
        const title = match[1].trim();
        const text = match[2].trim();
        sections[title] = text;
    }
    
    return { frontmatter, body, sections, path: relPath };
}

/**
 * Нормализует статус в строку (берёт первый элемент если массив)
 */
function normalizeStatus(status) {
    if (!status) return '';
    if (Array.isArray(status)) return status[0] || '';
    return String(status).trim();
}

/**
 * Извлекает имя проекта из wikilink [[Name]] или строки
 */
function extractProjectName(projField) {
    if (!projField) return 'Без проекта';
    if (Array.isArray(projField)) projField = projField[0] || '';
    const str = String(projField).trim();
    // Убираем [[ и ]] и кавычки
    return str.replace(/^["']?\[\[?/, '').replace(/\]?["']?$/, '');
}

/**
 * Парсит подзадачи из секции (строки - [ ] или - [x])
 */
function parseSubtasks(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const tasks = [];
    for (const line of lines) {
        const m = line.match(/^-\s*\[([ xX])\]\s*(.*)/);
        if (m) {
            tasks.push({ done: m[1].toLowerCase() === 'x', text: m[2].trim() });
        }
    }
    return tasks;
}

/**
 * Парсит теги из текста (#tag) и поля теги
 */
function parseTags(frontmatter, bodyText) {
    const tags = new Set();
    // Из frontmatter (если есть поле теги)
    if (frontmatter.теги) {
        const val = frontmatter.теги;
        if (Array.isArray(val)) val.forEach(t => tags.add(t.trim()));
        else if (typeof val === 'string') val.split(',').forEach(t => tags.add(t.trim()));
    }
    // Из тела — #tag
    if (bodyText) {
        const matches = bodyText.match(/#[\wа-яА-ЯёЁ_-]+/g);
        if (matches) matches.forEach(t => tags.add(t.slice(1)));
    }
    return Array.from(tags);
}

/**
 * Парсит дату/время встречи в ISO-строку для сортировки
 */
function parseMeetingDateTime(fm) {
    const date = fm.date || fm.дата_время; // полный календарь или шаблон
    const startTime = fm.startTime || '00:00';
    if (!date) return null;
    // date может быть "2026-08-17" или содержать время
    if (date.includes('T') || date.includes(' ')) return date;
    return `${date}T${startTime}`;
}

/**
 * Определяет тип встречи
 */
function getMeetingType(fm) {
    if (fm.type === 'recurring' || fm.startRecur) return 'recurring';
    return 'one-time';
}

/**
 * Основная функция: парсит все .md файлы и возвращает нормализованные сущности
 * @param {Array<{path, content}>} files — массив файлов с путями и содержимым
 * @param {string} vaultName — имя vault (для obsidian:// ссылок)
 * @returns {object} { projects, tasks, meetings, ideas }
 */
function parseWorkFiles(files, vaultName) {
    const projects = [];
    const tasks = [];
    const meetings = [];
    const ideas = [];
    
    for (const file of files) {
        const parsed = parseMarkdownFile(file.content, file.path);
        if (!parsed) continue;
        const fm = parsed.frontmatter;
        const sections = parsed.sections;
        const relPath = file.path;
        const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relPath)}`;
        
        const type = fm.тип || fm.type;
        
        if (type === 'проект' || type === 'project') {
            // ПРОЕКТ
            const project = {
                id: relPath,
                name: relPath.replace(/^01 Projects\//, '').replace(/\.md$/, ''),
                path: relPath,
                stream: Array.isArray(fm.стрим) ? fm.стрим : (fm.стрим ? [fm.стрим] : []),
                status: normalizeStatus(fm.статус),
                priority: fm.приоритет || 'средний',
                start: fm.начало || null,
                deadline: fm.дедлайн || null,
                tracker: fm.трекер || '',
                goal: sections['🎯 Цель'] || sections['Цель'] || '',
                context: sections['📌 Контекст'] || sections['Контекст'] || '',
                result: sections['✅ Результат'] || sections['Результат'] || '',
                participants: parseParticipants(sections['👥 Участники'] || sections['Участники'] || ''),
                materials: parseMaterials(sections['🔗 Материалы'] || sections['Материалы'] || ''),
                obsidianUrl,
                sprint: fm.sprint || null
            };
            projects.push(project);
        }
        else if (type === 'задача' || type === 'task') {
            // ЗАДАЧА
            const projectName = extractProjectName(fm.проект);
            const task = {
                id: relPath,
                name: relPath.replace(/^03 Tasks\//, '').replace(/^\[.+?\]\s*/, '').replace(/\.md$/, ''),
                path: relPath,
                status: normalizeStatus(fm.статус),
                priority: Array.isArray(fm.приоритет) ? fm.приоритет[0] : (fm.приоритет || 'средний'),
                deadline: fm.дедлайн || null,
                project: projectName,
                tracker: fm.трекер || '',
                waitFor: fm.жду_от || fm.waitFor || '',
                whatToDo: sections['Что нужно сделать'] || sections['## Что нужно сделать'] || '',
                subtasks: parseSubtasks(sections['Подзадачи'] || ''),
                dependsOn: sections['Зависит от'] || '',
                waitFrom: sections['Жду от'] || '',
                notes: sections['Заметки'] || '',
                result: sections['Результат'] || '',
                tags: parseTags(fm, parsed.body),
                obsidianUrl,
                sprint: fm.sprint || null
            };
            tasks.push(task);
        }
        else if (type === 'встреча' || type === 'meeting') {
            // ВСТРЕЧА
            const meeting = {
                id: relPath,
                title: fm.title || relPath.replace(/^02 Meetings\//, '').replace(/\.md$/, ''),
                path: relPath,
                date: fm.date || (fm.дата_время ? String(fm.дата_время).split('T')[0] : null) || null,
                startTime: fm.startTime || '00:00',
                endTime: fm.endTime || '',
                timezone: fm.timezone || 'Europe/Samara',
                type: getMeetingType(fm),
                startRecur: fm.startRecur || null,
                repeatInterval: fm.repeatInterval || null,
                daysOfWeek: fm.daysOfWeek || [],
                skipDates: fm.skipDates || [],
                agenda: sections['Повестка'] || '',
                discussed: sections['Обсудили'] || '',
                decisions: sections['Решения'] || '',
                actions: parseActionItems(sections['Задачи'] || ''),
                waitFor: sections['Жду от'] || '',
                nextSteps: sections['Следующие шаги'] || '',
                notes: sections['Заметки'] || '',
                project: Array.isArray(fm.проект) ? fm.проект.map(extractProjectName) : (fm.проект ? [extractProjectName(fm.проект)] : []),
                stream: Array.isArray(fm.стрим) ? fm.стрим : (fm.стрим ? [fm.стрим] : []),
                status: normalizeStatus(fm.статус) || 'запланирована',
                obsidianUrl,
                sprint: fm.sprint || null,
                // Для сортировки и отображения
                dateTime: parseMeetingDateTime(fm)
            };
            meetings.push(meeting);
        }
        // Идеи определяются по папке 04 Knowledge/Ideas, а не по типу
        // Будут обработаны отдельно в import
    }
    
    return { projects, tasks, meetings, ideas };
}

function parseParticipants(text) {
    if (!text) return [];
    return text.split('\n')
        .map(l => l.replace(/^-\s*/, '').trim())
        .filter(Boolean);
}

function parseMaterials(text) {
    if (!text) return [];
    return text.split('\n')
        .map(l => l.replace(/^-\s*/, '').trim())
        .filter(Boolean);
}

function parseActionItems(text) {
    if (!text) return [];
    const items = [];
    text.split('\n').forEach(line => {
        const m = line.match(/^-\s*\[([ xX])\]\s*(.+?)(?:\s*[–—-]\s*ответственный:\s*@?(\S+))?$/i);
        if (m) {
            items.push({ done: m[1].toLowerCase() === 'x', text: m[2].trim(), assignee: m[3] || '' });
        } else {
            // просто строка
            const clean = line.replace(/^-\s*/, '').trim();
            if (clean) items.push({ done: false, text: clean, assignee: '' });
        }
    });
    return items;
}

// Экспорт для других модулей
window.WorkParser = {
    parseMarkdownFile,
    parseFrontmatter,
    parseWorkFiles,
    parseSubtasks,
    parseTags,
    extractProjectName,
    normalizeStatus,
    parseMeetingDateTime
};