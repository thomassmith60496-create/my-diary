# Архитектурная спецификация проекта "Core"

> **Статус:** Анализ завершён на основе кода из коммита `dbaed360d61d971b07eac7e47e4e8282a59d38fe` (19 августа 2026).  
> **Режим:** PLAN MODE — никаких изменений в код не внесено.

---

## 1. Общая архитектура

### Тип приложения и основной стек

| Параметр | Значение |
|---|---|
| **Тип** | SPA (Single Page Application) — одностраничное веб-приложение |
| **Технология** | Чистый HTML + CSS + Vanilla JavaScript (ES6+) |
| **Фреймворки** | Нет (никаких React/Vue/Angular) |
| **Библиотеки** | Firebase SDK 9.22.0 (compat), SheetJS xlsx 0.20.3 |
| **Хостинг** | GitHub Pages (файл `.nojekyll` в корне подтверждает) |
| **База данных** | Firebase Realtime Database |
| **Аутентификация** | Firebase Authentication (email/password) |

### Frontend / Backend

- **Frontend:** Полностью клиентский. Всё UI рендерится в браузере через `innerHTML`. Никакого серверного рендеринга.
- **Backend:** Отсутствует. Вся бизнес-логика и хранилище — на клиенте + Firebase.
- **Состояние:** Глобальные переменные в `js/globals.js` (см. раздел 8).

### Как пользователь взаимодействует с системой

1. Пользователь открывает страницу → видит **auth overlay** (вход/регистрация).
2. После входа/регистрации — overlay скрывается, загружаются данные пользователя из Firebase.
3. Пользователь переключается между **глобальными вкладками** (👤 Личное / 💼 Работа) и **основными вкладками** (🏠 Главная, 📘 Питание, 🏋️ Тренировки, 💰 Финансы, ✅ To-Do).
4. Все изменения сохраняются в локальном состоянии → через **debounce (5 сек)** синхронятся в Firebase.
5. Для вкладки **💼 Работа** пользователь вручную выбирает папку Obsidian vault → файлы парсятся и сохраняются в Firebase.

---

## 2. Структура приложения

### Глобальная навигация (index.html)

```
Глобальные вкладки:
├── 👤 Личное (personal)
│   ├── 🏠 Главная (home)
│   ├── 📘 Питание (food)
│   │   ├── 📅 Недели (weeks)
│   │   └── 📊 Дашборд (dashboard)
│   ├── 🏋️ Тренировки (train)
│   │   ├── 📊 Прогресс (progress)
│   │   ├── 🏋️ Упражнения (exercises)
│   │   └── 📋 Тренировки (workouts)
│   ├── 💰 Финансы (finance)
│   │   ├── 📊 Дашборд (dashboard)
│   │   ├── 💸 Операции (transactions)
│   │   ├── 🏦 Накопления (savings)
│   │   ├── 📅 Планируемые (planned)
│   │   ├── 🔄 Обязательные (mandatory)
│   │   └── 🏷 Категории (categories)
│   └── ✅ To-Do (todo)
│       ├── 📋 Задачи (tasks)
│       └── 🎯 Привычки (habits)
└── 💼 Работа (work)
    ├── 📊 Dashboard
    ├── 📁 Проекты
    ├── ✅ Задачи
    ├── 🗓 Встречи
    ├── 📈 Аналитика
    └── 💡 Идеи
```

### Модули и ключевые файлы

| Модуль | Файлы | Назначение |
|---|---|---|
| **Core / Bootstrap** | `index.html`, `js/app.js` | Точка входа, переключение вкладок, экспорт/импорт/reset, sync orchestration |
| **Firebase** | `js/firebase-config.js` | Инициализация Firebase SDK, создание `db` |
| **Globals** | `js/globals.js` | Все глобальные переменные состояния и константы |
| **Utils** | `js/utils.js` | Утилиты: `esc()`, `getLocalDateStr()`, `formatDateShort()`, `formatDateFull()` |
| **Auth** | `js/auth.js` | Auth overlay, вход/регистрация/выход, роли (admin/reader), read-only mode, access management, загрузка данных пользователя |
| **Custom Modals** | `js/custom-modals.js` | Замена `alert`/`confirm`/`prompt` на кастомные модалки |
| **Nutrition** | `js/nutrition.js` | Модель данных питания, импорт меню JSON, создание недели, рендер дней, расчёт КБЖУ, экспорт/печать меню |
| **Charts** | `js/charts.js` | SVG-графики: `renderSVGLineChart`, `renderDonutChart`, `renderMultiLineChart` |
| **Dashboard** | `js/dashboard.js` | Главная страница (home), карточки: питание, задачи, финансы, сон, привычки, активность |
| **Finance** | `js/finance-utils.js`, `js/finance-categories.js`, `js/finance-modals.js`, `js/finance-save.js`, `js/finance-render.js`, `js/finance-import.js`, `js/finance-export.js` | Полный модуль финансов: категории, операции, накопления, планируемые, обязательные платежи, импорт Excel, экспорт |
| **Training** | `js/training-seed.js`, `js/training-storage.js`, `js/training-data.js`, `js/exercise-images.js`, `js/exercise-gif-manager.js`, `js/exercise-gif-names.js`, `js/training-ui.js`, `js/training-import.js` | База упражнений (1324 GIF), тренировки, прогресс, импорт |
| **Todo** | `js/todo.js` | Календарь задач, регулярные задачи, теги, подзадачи, стрики |
| **Habits** | `js/habit.js` | Привычки с целями (дневные/недельные/месячные), stepper-интерфейс |
| **Activity** | `js/activity.js` | Хитмапы активности (streaks + heatmap) для всех модулей |
| **Work (Obsidian)** | `js/work-parser.js`, `js/work-data.js`, `js/work-import.js`, `js/work-render.js` | Синхронизация с Obsidian vault, парсинг markdown, read-only |
| **Notifications** | `js/notifications.js` | Web Notifications API — уведомления о дедлайнах задач |
| **Review** | `js/review.js` | Еженедельный и ежемесячный обзоры |

### Порядок загрузки скриптов (из index.html)

```
1. utils.js          → 2. firebase-config.js → 3. globals.js → 4. auth.js
→ 5. nutrition.js → 6. charts.js → 7-12. finance/* → 13. dashboard.js
→ 14. review.js → 15-22. training/* → 23. custom-modals.js → 24. todo.js
→ 25. habit.js → 26. activity.js → 27-30. work/* → 31. app.js → 32. notifications.js
```

**Ключевой порядок:** `app.js` загружается **последним** (перед `notifications.js`), а `notifications.js` — **в самом конце**. Это означает, что `app.js` инициализирует приложение после загрузки всех модулей, а уведомления инициализируются после всего.

---

## 3. Данные

### Основные сущности

#### 3.1 Пользователь (User)

Хранится в Firebase: `lera_diary_users/{uid}`

| Поле | Тип | Описание |
|---|---|---|
| `email` | string | Email пользователя |
| `role` | string | `'admin'` или `'reader'` |
| `ownerUid` | string | UID владельца (для readers) |
| `readers` | object | `{ readerUid: email }` — список читателей |
| `createdAt` | timestamp | `firebase.database.ServerValue.TIMESTAMP` |

#### 3.2 Питание (Diary / Nutrition)

Хранится в Firebase: `lera_diary_v1/{uid}`

```json
{
  "nutrition": {
    "weeks": [
      {
        "id": "week-1234567890",
        "startDate": "2024-01-01",
        "endDate": "2024-01-07",
        "title": "Неделя 01.01.2024 – 07.01.2024",
        "menu": [
          {
            "day": "Понедельник",
            "date": "01.01.2024",
            "training": false,
            "meals": [
              {
                "type": "breakfast|snack|lunch|dinner|preworkout|postworkout|prep",
                "name": "Завтрак",
                "items": ["Овсяная каша", "Яблоко"],
                "choices": [{"label": "БЖЖ", "items": ["продукт1", "продукт2"]}]
              }
            ]
          }
        ],
        "data": {
          "weight-0": "65.4",
          "mood-0": "5",
          "notes-0": "Как прошёл день?",
          "m-0-0-cal": "350",
          "m-0-0-prot": "20",
          "m-0-0-fat": "10",
          "m-0-0-carb": "40",
          "stars-0-0": "4",
          "comment-0-0": "Вкусно",
          "time-0-0": "08:00",
          "eaten-0-0-0": "1",
          "note-0-0-0": "без сахара"
        }
      }
    ],
    "currentWeekId": "week-1234567890"
  },
  "financeData": { ... },
  "lastUpdated": 1234567890
}
```

**Ключи данных в `week.data`:**
- `weight-{dayIndex}` — вес утром
- `mood-{dayIndex}` — самочувствие (1-5)
- `notes-{dayIndex}` — заметки дня
- `m-{dayIndex}-{mealIndex}-{cal|prot|fat|carb}` — КБЖУ приёма пищи
- `stars-{dayIndex}-{mealIndex}` — оценка приёма пищи (1-5)
- `comment-{dayIndex}-{mealIndex}` — комментарий к приёму пищи
- `time-{dayIndex}-{mealIndex}` — время приёма пищи
- `eaten-{dayIndex}-{mealIndex}-{itemIndex}` — съедено/нет (0/1)
- `note-{dayIndex}-{mealIndex}-{itemIndex}` — замена продукта

#### 3.3 Финансы (Finance)

Хранится в Firebase: `lera_finance_v1/{uid}` (отдельный path, но в `syncToCloud` используется `lera_diary_v1/{uid}` с ключом `financeData`)

```json
{
  "transactions": [
    {
      "id": "fin-1234567890",
      "date": "2024-01-15",
      "type": "expense|income",
      "amount": 1500,
      "category": "cat-food",
      "subcategory": "Продукты",
      "comment": "Магазин"
    }
  ],
  "savings": [
    {
      "id": "sav-1234567890",
      "date": "2024-01-15",
      "amount": 1000,
      "goal": "Отпуск|Машина|Подушка безопасности|other",
      "goalCustom": "Своя цель"
    }
  ],
  "planned": [
    {
      "id": "plan-1234567890",
      "date": "2024-02-01",
      "amount": 5000,
      "category": "cat-tech",
      "subcategory": "Телефон",
      "done": false
    }
  ],
  "mandatoryPayments": [
    {
      "id": "mp-1234567890",
      "name": "Аренда квартиры",
      "amount": 30000,
      "category": "cat-housing",
      "subcategory": "",
      "scheduleType": "monthly|interval",
      "day": 1,
      "interval": 30,
      "startDate": "2024-01-01"
    }
  ],
  "categories": [
    {
      "id": "cat-food",
      "name": "Еда",
      "type": "expense",
      "limit": 20000,
      "subcategories": ["Продукты", "Доставка", "Фастфуд", "Кафе"],
      "subcategoryLimits": {},
      "color": "#7e22ce"
    }
  ]
}
```

**Встроенные категории (дефолтные, из globals.js):**

| ID | Название | Тип | Лимит | Цвет |
|---|---|---|---|---|
| cat-food | Еда | expense | 20000 | #7e22ce |
| cat-transport | Транспорт | expense | 3000 | #a855f7 |
| cat-connection | Связь | expense | 1000 | #c084fc |
| cat-marketplace | Маркетплейсы | expense | 5000 | #d8b4fe |
| cat-sport | Спорт | expense | 5000 | #9333ea |
| cat-education | Обучение | expense | 15000 | #6366f1 |
| cat-tech | Техника | expense | 0 | #3b82f6 |

#### 3.4 Тренировки (Training)

Хранится в Firebase: `lera_training_v1/{uid}`

```json
{
  "version": 2,
  "exercises": [
    {
      "id": "ex-1234567890",
      "name": "Жим лёжа",
      "category": "chest",
      "bodyPart": "chest",
      "equipment": "barbell",
      "gif": "0025-EIeI8Vf.gif",
      "description": "..."
    }
  ],
  "workouts": [
    {
      "id": "wo-1234567890",
      "name": "Грудь и спина",
      "date": "2024-01-15",
      "exercises": [
        {
          "exerciseId": "ex-1234567890",
          "sets": 3,
          "reps": "8-10",
          "weight": 80,
          "notes": ""
        }
      ]
    }
  ],
  "lastUpdated": 1234567890
}
```

#### 3.5 Задачи (Todo)

Хранится в Firebase: `lera_todo_v1/{uid}`

```json
{
  "tasks": [
    {
      "id": "task-1234567890",
      "title": "Сделать отчёт",
      "description": "Ежемесячный отчёт",
      "date": "2024-01-15",
      "deadline": "2024-01-15T18:00",
      "completed": false,
      "important": true,
      "tags": ["работа", "отчёт"],
      "createdAt": 1234567890,
      "recId": null
    }
  ],
  "tags": [
    { "id": "tag-1234567890", "name": "работа", "color": "#3b82f6" }
  ],
  "recurring": [
    {
      "id": "rec-1234567890",
      "title": "Ежедневный план",
      "description": "",
      "important": false,
      "tags": [],
      "subtasks": [],
      "frequency": "daily|weekly|monthly|interval",
      "interval": 1,
      "weekDays": [1, 3, 5],
      "monthDay": 15,
      "lastDayOfMonth": false,
      "startDate": "2024-01-01",
      "endDate": null,
      "nextDate": "2024-01-16"
    }
  ],
  "sleep": {
    "2024-01-15": {
      "bedtime": "23:00",
      "wakeTime": "07:00",
      "duration": 480,
      "phases": { "deep": 90, "light": 200, "rem": 60 },
      "heartRate": 55,
      "factors": ["coffee", "training"],
      "customFactors": []
    }
  }
}
```

#### 3.6 Привычки (Habits)

Хранится в Firebase: `lera_habit_v1/{uid}`

```json
{
  "habits": [
    {
      "id": "hab-1234567890",
      "name": "Выпить воды",
      "goal": {
        "period": "day|week|month",
        "target": 8,
        "unit": "стаканов"
      },
      "color": "#3b82f6"
    }
  ],
  "completions": {
    "hab-1234567890": {
      "2024-01-15": 8
    }
  }
}
```

#### 3.7 Работа (Work / Obsidian)

Хранится в Firebase: `lera_work_v1/{uid}`

```json
{
  "vaultName": "my-vault",
  "lastSyncTime": 1234567890,
  "projects": [
    {
      "id": "proj-...",
      "name": "Проект",
      "path": "01 Projects/project.md",
      "status": "active|completed|on-hold",
      "tasks": [...],
      "meetings": [...],
      "text": "...",
      "obsidianUrl": "obsidian://open?vault=..."
    }
  ],
  "tasks": [...],
  "meetings": [...],
  "ideas": [...],
  "lastUpdated": 1234567890
}
```

### Firebase структура (paths)

| Path | Описание |
|---|---|
| `lera_diary_users/{uid}` | Пользователи (email, role, ownerUid, readers, createdAt) |
| `lera_diary_v1/{uid}` | Питание + финансы (в одном объекте) |
| `lera_finance_v1/{uid}` | Финансы (отдельный path, но в syncToCloud НЕ используется — финансы сохраняются в `lera_diary_v1`) |
| `lera_training_v1/{uid}` | Тренировки (отдельный path) |
| `lera_todo_v1/{uid}` | Задачи + теги + регулярные + сон (отдельный path) |
| `lera_habit_v1/{uid}` | Привычки (отдельный path) |
| `lera_work_v1/{uid}` | Работа/Obsidian (отдельный path) |

> **Важно:** В `syncToCloud()` (app.js) данные питания и финансы сохраняются вместе в `lera_diary_v1/{uid}`, а тренировки и задачи — в отдельные paths. В `resetAllData()` удаляются все 4 paths: `lera_diary_v1`, `lera_finance_v1`, `lera_training_v1`, `lera_todo_v1`.

---

## 4. Поток данных

### 4.1 Основной поток: Питание

```
Пользователь редактирует поле в UI (вес, КБЖУ, оценка, чекбокс)
    ↓ oninput / onchange
debouncedSaveNutrition() (300ms debounce)
    ↓
saveNutrition() — собирает данные из DOM в week.data
    ↓
syncToCloud() — 5000ms debounce
    ↓
db.ref('lera_diary_v1/{uid}').set({ nutrition, financeData, lastUpdated })
    ↓
Firebase Realtime Database
    ↓ (onAuthStateChanged → loadDataForUser)
loadDataForUser() — читает lera_diary_v1/{uid}
    ↓
nutritionData = diaryData.nutrition
    ↓
renderNutritionAll() → renderWeekSelector() + renderDays()
    ↓
UI обновляется
```

### 4.2 Основной поток: Финансы

```
Пользователь добавляет операцию через модалку
    ↓
saveFinanceTransaction() / saveSavingsEntry() / savePlannedEntry() / saveMandatoryPayment() / saveCategory()
    ↓
financeData обновляется в памяти
    ↓
syncToCloud() (5000ms debounce)
    ↓
db.ref('lera_diary_v1/{uid}').set({ nutrition, financeData, lastUpdated })
    ↓
Firebase Realtime Database
```

### 4.3 Основной поток: Тренировки

```
Пользователь редактирует упражнение/тренировку
    ↓
TrainingExerciseAPI.save()
    ↓
syncToCloud() → db.ref('lera_training_v1/{uid}').set({ version, exercises, workouts, lastUpdated })
    ↓
Firebase Realtime Database
```

### 4.4 Основной поток: Задачи (Todo)

```
Пользователь добавляет/отмечает задачу
    ↓
window.saveTodoState() / setTodoState()
    ↓
syncToCloud() → db.ref('lera_todo_v1/{uid}').set({ tasks, tags, recurring, lastUpdated })
    ↓
Firebase Realtime Database
```

### 4.5 Поток аутентификации

```
Пользователь вводит email + пароль
    ↓
loginUser() / registerUser()
    ↓
firebase.auth().signInWithEmailAndPassword() / createUserWithEmailAndPassword()
    ↓
onAuthStateChanged callback
    ↓
initUserSession(uid)
    ↓
usersRef.child(uid).once('value') → читает роль и ownerUid
    ↓
switchDataContext(uid) → loadDataForUser(uid)
    ↓
Promise.all([diaryLoad, financeLoad, trainingLoad, todoLoad, habitLoad])
    ↓
Распределение данных по глобальным переменным + рендер
```

### 4.6 Поток импорта/экспорта

**Экспорт (exportAllData):**
```
Пользователь нажимает "💾 Экспорт всего"
    ↓
exportAllData()
    ↓
Собирает: nutritionData + financeData + TrainingExerciseAPI.getRawData()
    ↓
JSON Blob → скачивание файла diary-{date}.json
```

**Импорт (importAllData):**
```
Пользователь выбирает файл .json
    ↓
importAllData(input)
    ↓
FileReader.readAsText → JSON.parse
    ↓
Объединение по ID (только новые записи добавляются):
  - nutrition.weeks (по week.id)
  - financeData.transactions/savings/planned/mandatoryPayments/categories (по id)
  - trainingData.exercises/workouts (по id)
    ↓
syncToCloud() + renderNutritionAll() + renderFinanceDashboard() + updateFinanceStats()
```

**Импорт меню (importMenu):**
```
Пользователь вставляет JSON меню в модалке
    ↓
importMenu()
    ↓
Создаёт новую неделю с menu + data:{}
    ↓
saveNutrition() → syncToCloud()
```

**Импорт из Excel (importFinanceExcel):**
```
Пользователь выбирает .xlsx/.xls/.csv файл
    ↓
importFinanceExcel(input)
    ↓
SheetJS (XLSX.read) парсит файл
    ↓
Создаёт транзакции в financeData
    ↓
syncToCloud()
```

### 4.7 Поток синхронизации с Obsidian

```
Пользователь нажимает "🔄 Синхронизировать с Obsidian"
    ↓
syncWorkFromObsidian() → открывает file input с webkitdirectory
    ↓
Пользователь выбирает папку vault
    ↓
handleWorkFolderSelected(input)
    ↓
Фильтр: только .md в папках 01 Projects/, 02 Meetings/, 03 Tasks/, 04 Knowledge/Ideas/, 06 Daily/
    ↓
WorkParser.parseWorkFiles() — парсит markdown (frontmatter + body)
    ↓
WorkData.buildSnapshot() — собирает entities
    ↓
WorkData.saveWorkSnapshot() → db.ref('lera_work_v1/{uid}').set(snapshot)
    ↓
updateWorkSyncInfo() + renderWorkSubTab()
```

### 4.8 Поток уведомлений

```
initUserSession(uid)
    ↓
initTaskDeadlineNotifications()
    ↓
Notification.requestPermission() (если не granted)
    ↓
checkAllDeadlines() — читает lera_todo_v1/{uid}
    ↓
Для каждой задачи с дедлайномом <= now и !completed:
  new Notification('⏰ Дедлайн задачи', { body: title })
    ↓
setInterval(checkAllDeadlines, 10 мин)
```

---

## 5. Связи между модулями

| Модуль | Использует данные из | Экспортирует / предоставляет |
|---|---|---|
| **app.js** | nutritionData, financeData, TrainingExerciseAPI, getTodoState() | syncToCloud(), exportAllData(), importAllData(), resetAllData() |
| **auth.js** | usersRef, db | initUserSession(), switchDataContext(), loadDataForUser() |
| **dashboard.js** | nutritionData, financeData, getTodoState(), getHabitDayHabits(), getTodoSleepAll() | renderHomePage(), renderHomeToday(), renderNutritionCard(), renderTodoCard(), renderFinanceCard(), renderSleepCard(), renderHabitCard(), renderHomeActivity() |
| **nutrition.js** | nutritionData | saveNutrition(), renderNutritionAll(), renderDays(), renderWeekSelector(), importMenu(), exportMenuAsText(), printMenu() |
| **charts.js** | (универсальная) | renderSVGLineChart(), renderDonutChart(), renderMultiLineChart() |
| **finance-render.js** | financeData | renderFinanceDashboard(), renderFinanceTransactions(), renderFinanceSavings(), renderFinancePlanned(), renderFinanceMandatory(), renderFinanceCategories() |
| **finance-save.js** | financeData | saveFinanceTransaction(), saveSavingsEntry(), savePlannedEntry(), saveMandatoryPayment(), saveCategory() |
| **finance-import.js** | financeData | importFinanceExcel() (через SheetJS) |
| **finance-export.js** | financeData | exportFinanceOperations() |
| **todo.js** | (собственное состояние) | getTodoState(), loadTodoFromFirebase(), saveTodoState() |
| **habit.js** | (собственное состояние) | getHabitDayHabits(), loadHabitsFromFirebase() |
| **activity.js** | nutritionData, financeData, getTodoState(), habitData | renderActivityStreaks(), renderActivityHeatmap() |
| **training-ui.js** | TrainingExerciseAPI | renderTrainingExercises(), renderTrainingWorkouts(), renderTrainingProgress() |
| **training-storage.js** | TrainingExerciseAPI | loadFromFirebase(), save(), getRawData() |
| **work-import.js** | WorkData, WorkParser | syncWorkFromObsidian(), handleWorkFolderSelected() |
| **work-render.js** | WorkData | renderWorkPage(), renderWorkSubTab() |
| **notifications.js** | getTodoState() / db.ref('lera_todo_v1/{uid}') | initTaskDeadlineNotifications(), checkAllDeadlines() |
| **review.js** | nutritionData, financeData, getTodoState() | renderWeeklyReview(), renderMonthlyReview() |

### Ключевые кросс-модульные зависимости

1. **Dashboard.js** → зависит почти на всех модулях: nutrition, finance, todo, habit, activity
2. **app.js** → оркестрирует sync/export/import между nutrition, finance, training, todo
3. **auth.js** → загружает данные для всех модулей через `loadDataForUser()`
4. **activity.js** → агрегирует данные из nutrition, finance, todo, habits для хитмапов
5. **notifications.js** → читает задачи из Firebase (`lera_todo_v1`) напрямую, минуя todo.js

---

## 6. Инфраструктура

### Внешние сервисы

| Сервис | Назначение | Конфиг |
|---|---|---|
| **Firebase Realtime Database** | Хранилище всех данных пользователей | `diary-51564` |
| **Firebase Authentication** | Email/password auth | `diary-51564` |
| **Firebase Hosting** | (возможно, но `.nojekyll` + GitHub Pages) | — |
| **GitHub Pages** | Хостинг статических файлов | `.nojekyll` в корне |
| **SheetJS (xlsx 0.20.3)** | Парсинг Excel-файлов для импорта финансов | CDN: `cdn.sheetjs.com` |

### Firebase конфигурация

```javascript
{
  apiKey: "AIzaSyDvOH_VAzHBJKeXiZ8adIHsaJ6C3aGurcE",
  authDomain: "diary-51564.firebaseapp.com",
  projectId: "diary-51564",
  storageBucket: "diary-51564.firebasestorage.app",
  messagingSenderId: "1021457298792",
  appId: "1:1021457298792:web:650fe99ac0b7ba234992dd",
  measurementId: "G-CYSH82Z6JY"
}
```

### Firebase Security Rules (database.rules.json)

**Принцип:** Каждый пользователь может читать и писать только свои данные. Readers могут только читать данные своего владельца.

| Path | Read | Write |
|---|---|---|
| `lera_diary_v1/{uid}` | `auth.uid === $uid` OR (reader с ownerUid === $uid) | `auth.uid === $uid` |
| `lera_finance_v1/{uid}` | `auth.uid === $uid` OR (reader с ownerUid === $uid) | `auth.uid === $uid` |
| `lera_training_v1/{uid}` | `auth.uid === $uid` OR (reader с ownerUid === $uid) | `auth.uid === $uid` |
| `lera_todo_v1/{uid}` | `auth.uid === $uid` OR (reader с ownerUid === $uid) | `auth.uid === $uid` |
| `lera_work_v1/{uid}` | `auth.uid === $uid` OR (reader с ownerUid === $uid) | `auth.uid === $uid` |
| `lera_diary_users/{uid}` | `auth.uid === $uid` | `auth.uid === $uid` OR admin |
| `lera_diary_users` (list) | Только admin | — |

### npm / build tools

- **Нет** `package.json`, `npm`, `webpack`, `vite` или других сборщиков.
- Проект — чистый статический набор файлов.
- `copy-gifs.bat` — батник для копирования GIF (локальная утилита).

---

## 7. Уже реализованные интеграции

### ✅ Реализовано

| Интеграция | Статус | Файлы |
|---|---|---|
| **Firebase Auth (email/password)** | ✅ Реализовано | `js/auth.js`, `js/firebase-config.js` |
| **Firebase Realtime Database sync** | ✅ Реализовано (debounce 5с) | `js/app.js` (syncToCloud) |
| **Экспорт всех данных (JSON)** | ✅ Реализовано | `js/app.js` (exportAllData) |
| **Импорт всех данных (JSON)** | ✅ Реализовано (с объединением по ID) | `js/app.js` (importAllData) |
| **Импорт меню питания (JSON)** | ✅ Реализовано | `js/nutrition.js` (importMenu) |
| **Экспорт меню (TXT)** | ✅ Реализовано | `js/nutrition.js` (exportMenuAsText) |
| **Печать меню (PDF через window.print)** | ✅ Реализовано | `js/nutrition.js` (printMenu) |
| **Импорт финансов из Excel** | ✅ Реализовано (SheetJS) | `js/finance-import.js` (importFinanceExcel) |
| **Экспорт финансовых операций** | ✅ Реализовано | `js/finance-export.js` |
| **Синхронизация с Obsidian** | ✅ Реализовано (через выбор папки vault) | `js/work-import.js`, `js/work-parser.js`, `js/work-data.js` |
| **Web Notifications (дедлайны задач)** | ✅ Реализовано | `js/notifications.js` |
| **Сброс всех данных** | ✅ Реализовано | `js/app.js` (resetAllData) |
| **Управление доступом (admin/reader)** | ✅ Реализовано | `js/auth.js` (openAccessModal, addReader, removeReader) |
| **Read-only режим** | ✅ Реализовано | `js/auth.js` (toggleViewMode, applyReadOnlyState) |
| **Хитмапы активности** | ✅ Реализовано | `js/activity.js` |
| **SVG графики** | ✅ Реализовано | `js/charts.js` |
| **База упражнений (1324 GIF)** | ✅ Реализовано | `js/exercise-gif-names.js`, `js/exercise-gif-manager.js` |
| **Регулярные задачи (recurring)** | ✅ Реализовано | `js/todo.js` |
| **Привычки (habits)** | ✅ Реализовано | `js/habit.js` |
| **Еженедельный/ежемесячный обзор** | ✅ Реализовано | `js/review.js` |

### 🟡 Планируемое / в разработке (на основе кода)

| Функция | Статус | Примечание |
|---|---|---|
| **Импорт из Obsidian через API** | ❌ Не реализовано | Только через ручной выбор папки (webkitdirectory) |
| **Push-уведомления (Firebase Cloud Messaging)** | ❌ Не реализовано | Только Web Notifications API (только когда вкладка открыта) |
| **Синхронизация в реальном времени (onValue listener)** | ❌ Не реализовано | Только one-time загрузка через `once('value')` |
| **Dark/Light theme toggle** | ❌ Не реализовано | Только CSS (styles.css) |
| **Мобильное приложение (PWA)** | ❌ Не реализовано | Нет манифеста, сервис-воркера |

---

## 8. Архитектурные особенности

### State Management

- **Нет** Redux, Vuex, Zustand или других state-менеджеров.
- **Глобальные переменные** в `js/globals.js` являются единственным хранилищем состояния:
  - `nutritionData` — питание
  - `financeData` — финансы
  - `currentKbjuMetric` — текущая метрика КБЖУ
  - `formStarsData` — состояние звёздных форм
  - `syncTimeout` — таймер синхронизации
  - `isInitialLoad` — флаг первичной загрузки
  - `currentUser`, `currentUserRole`, `currentUserId`, `isReadOnlyMode`, `viewingUserId` — auth state
  - `usersRef` — ссылка на Firebase users path
  - `homeActivityModule` — активный модуль хитмапа на главной

### Глобальные переменные (полный список из globals.js)

| Переменная | Описание |
|---|---|
| `nutritionData` | `{ weeks: [], currentWeekId: null }` |
| `financeData` | `{ transactions, savings, planned, mandatoryPayments, categories }` |
| `financeSelectedMonth` | Выбранный месяц для финансового дашборда |
| `currentKbjuMetric` | `'cal' \| 'prot' \| 'fat' \| 'carb'` |
| `formStarsData` | `{}` — состояние звёздных форм |
| `syncTimeout` | Таймер debounce для syncToCloud |
| `isInitialLoad` | Флаг первичной загрузки |
| `DEFAULT_SLEEP_FACTORS` | Константа: кофе, работа, тренировка, поздняя еда, проветривание |
| `mealIcons` | Константа: иконки приёмов пищи |
| `currentUser` | Firebase User объект |
| `currentUserRole` | `'admin' \| 'reader'` |
| `currentUserId` | UID текущего пользователя |
| `isReadOnlyMode` | Флаг режима просмотра (для admin) |
| `viewingUserId` | UID пользователя, чьи данные просматриваются |
| `usersRef` | `firebase.database().ref('lera_diary_users')` |

### Debounce / Sync

- **Nutrition:** `debouncedSaveNutrition()` — 300ms debounce → `saveNutrition()` → `syncToCloud()`
- **Sync to Cloud:** `syncToCloud()` — 5000ms debounce → запись в Firebase
- **Тренировки:** `TrainingExerciseAPI.save()` → прямой вызов `db.ref().set()` (без debounce)
- **Todo:** `saveTodoState()` → прямой вызов `db.ref().set()` (без debounce)
- **Habits:** аналогично — прямая запись в Firebase

### Модульность

- **Нет** модульной системы (нет `import`/`export`, нет ES modules).
- Все функции объявляются на `window` (глобальные).
- Связи между модулями — через глобальные функции и переменные.
- Порядок загрузки скриптов в `index.html` критичен (зависимости через глобальные функции).

### Права доступа

- **Admin:** полный доступ (чтение/запись своих данных, управление readers, переключение read-only режима)
- **Reader:** только чтение данных своего владельца (ownerUid), все input-ы отключаются
- **Firebase Rules:** строго по UID, readers читают через ownerUid

### Read-only режим

- `applyReadOnlyState()` отключает все `input`, `textarea`, `select`, `button` (кроме навигационных).
- Исключения для readers: селекторы периодов, кнопки экспорта, кнопки "Обновить", кнопка "Наверх".
- Баннер в шапке: "👁 Вы просматриваете дневник в режиме «только чтение»".

### Backup / Import / Export

- **Экспорт:** `exportAllData()` — JSON с nutrition + financeData + trainingData
- **Импорт:** `importAllData()` — JSON с объединением по ID (только новые записи)
- **Экспорт меню:** `exportMenuAsText()` — TXT
- **Печать меню:** `printMenu()` — через `window.print()`
- **Импорт Excel:** `importFinanceExcel()` — SheetJS, только транзакции
- **Сброс:** `resetAllData()` — удаление всех 4 paths в Firebase + очистка локального состояния

---

## 9. Для будущей архитектурной схемы

### Обязательные узлы (10–20)

| № | Узел | Тип |
|---|---|---|
| 1 | **Пользователь (Browser)** | Внешний |
| 2 | **index.html** | Точка входа |
| 3 | **Auth Overlay** | UI компонент |
| 4 | **User Bar** | UI компонент |
| 5 | **Глобальные вкладки** (Личное / Работа) | Навигация |
| 6 | **Основные вкладки** (Главная / Питание / Тренировки / Финансы / To-Do) | Навигация |
| 7 | **Глобальные переменные** (globals.js) | State |
| 8 | **Firebase Auth** | Внешний сервис |
| 9 | **Firebase Realtime DB** | Хранилище |
| 10 | **Модуль: Питание** (nutrition.js) | Бизнес-логика |
| 11 | **Модуль: Финансы** (finance-*.js) | Бизнес-логика |
| 12 | **Модуль: Тренировки** (training-*.js) | Бизнес-логика |
| 13 | **Модуль: To-Do / Задачи** (todo.js) | Бизнес-логика |
| 14 | **Модуль: Привычки** (habit.js) | Бизнес-логика |
| 15 | **Модуль: Работа / Obsidian** (work-*.js) | Бизнес-логика |
| 16 | **Модуль: Dashboard / Home** (dashboard.js) | Бизнес-логика |
| 17 | **Модуль: Графики** (charts.js) | Утилита |
| 18 | **Модуль: Уведомления** (notifications.js) | Сервис |
| 19 | **Модуль: Custom Modals** (custom-modals.js) | UI утилита |
| 20 | **Модуль: Activity / Хитмапы** (activity.js) | Бизнес-логика |

### Стрелки (связи)

```
Пользователь → index.html → [Auth Overlay] → Firebase Auth → [User Bar]
Пользователь → [Основные вкладки] → [Модуль: Питание/Финансы/Тренировки/To-Do]
[Модуль: Питание] → globals.js (nutritionData) → syncToCloud() → Firebase Realtime DB
[Модуль: Финансы] → globals.js (financeData) → syncToCloud() → Firebase Realtime DB
[Модуль: Тренировки] → TrainingExerciseAPI → Firebase Realtime DB (lera_training_v1)
[Модуль: To-Do] → getTodoState() → Firebase Realtime DB (lera_todo_v1)
[Модуль: Привычки] → habit.js → Firebase Realtime DB (lera_habit_v1)
[Модуль: Работа] → work-import.js → WorkParser → Firebase Realtime DB (lera_work_v1)
[Модуль: Dashboard] → читает из: nutritionData, financeData, getTodoState(), getHabitDayHabits()
[Модуль: Activity] → читает из: nutritionData, financeData, getTodoState(), habitData
[Модуль: Уведомления] → читает из: Firebase Realtime DB (lera_todo_v1) → Web Notifications API
[Модуль: Custom Modals] → используется всеми модулями (customAlert, customConfirm)
[Модуль: Графики] → используется: dashboard.js, finance-render.js
[Auth] → loadDataForUser() → загружает данные во все модули → рендер
[Экспорт/Импорт] → app.js → все модули
```

### Что объединить в один блок

| Объединённый блок | Содержит |
|---|---|
| **UI Navigation** | Auth Overlay, User Bar, Глобальные вкладки, Основные вкладки, Custom Modals |
| **State Management** | globals.js (все глобальные переменные) |
| **Модуль: Финансы** | finance-utils, finance-categories, finance-modals, finance-save, finance-render, finance-import, finance-export (7 файлов → 1 блок) |
| **Модуль: Тренировки** | training-seed, training-storage, training-data, exercise-images, exercise-gif-manager, exercise-gif-names, training-ui, training-import (8 файлов → 1 блок) |
| **Модуль: Работа** | work-parser, work-data, work-import, work-render (4 файла → 1 блок) |
| **Внешние сервисы** | Firebase Auth + Firebase Realtime DB + SheetJS + Web Notifications API |

### Что лучше не показывать (чтобы схема не перегружалась)

| Скрыть | Причина |
|---|---|
| **utils.js** | Утилиты (esc, formatDate) — слишком детально для архитектурной схемы |
| **review.js** | Еженедельный/ежемесячный обзор — вспомогательный, можно объединить с Dashboard |
| **TODO.md, copy-gifs.bat, .nojekyll** | Вспомогательные файлы, не часть архитектуры |
| **Все 1324 GIF** | exercise-gif-names.js — это данные, а не архитектурный узел |
| **Отдельные finance-*.js файлы** | Объединить в один блок "Финансы" |
| **Отдельные training-*.js файлы** | Объединить в один блок "Тренировки" |
| **Отдельные work-*.js файлы** | Объединить в один блок "Работа" |
| **exercise-images.js, exercise-gif-manager.js** | Вспомогательные для тренировок, объединить с блоком "Тренировки" |
| **Внутренние ключи Firebase** (lera_diary_v1, lera_finance_v1 и т.д.) | Показать как один блок "Firebase Realtime DB" с подписями paths |

---

## Технические детали (не для архитектурной схемы)

### Специфические реализации

- **`esc()` функция определена дважды:** в `utils.js` (через replace) и в `dashboard.js` (через div.createTextNode). Вторая версия в dashboard.js переопределяет первую на `window.esc`.
- **`formatDateWithYear()` в utils.js** просто делегирует `formatDateShort()` — обе возвращают `DD.MM.YY` (2 цифры года).
- **В `syncToCloud()`** финансы сохраняются в `lera_diary_v1/{uid}` (вместе с питанием), но в `resetAllData()` также удаляется `lera_finance_v1/{uid}` — этот path существует в rules, но не используется для записи.
- **`loadDataForUser()`** загружает 5 источников параллельно через `Promise.all`, но финансы загружаются из `lera_finance_v1/{uid}`, а не из `lera_diary_v1/{uid}` (где они на самом деле сохраняются в syncToCloud). Это **противоречие**: запись в `lera_diary_v1`, чтение из `lera_finance_v1`.
- **Work модуль** использует `WorkData.workState` и `WorkData.buildSnapshot()` — состояние хранится в `work-data.js`, а не в `globals.js`.
- **Todo модуль** использует собственное состояние внутри `todo.js` (не в globals.js), с функциями `getTodoState()`, `loadTodoFromFirebase()`, `saveTodoState()`.
- **Habits модуль** использует собственное состояние внутри `habit.js` с функциями `getHabitDayHabits()`, `loadHabitsFromFirebase()`.
- **Activity модуль** (`activity.js`) агрегирует данные из всех модулей для построения хитмапов и стриков.
- **SheetJS** используется только для импорта Excel в финансы (`finance-import.js`).
- **Web Notifications API** используется только для уведомлений о дедлайнах задач, требует ручного запроса разрешения.
- **Нет** единой функции `saveAll()` — каждый модуль сохраняет свои данные независимо.
- **Нет** реактивности — все изменения через ручной рендер (`renderXxx()` после изменения данных).
- **Нет** очереди синхронизации — `syncToCloud()` просто перезаписывает всё содержимое path целиком через `.set()`.