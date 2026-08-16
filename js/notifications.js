/* ============================================
   🔔 ОПОВЕЩЕНИЯ О ДЕДЛАЙНАХ ЗАДАЧ (Web Notifications API)
   ============================================ */

"use strict";

let deadlineCheckInterval = null;
let notifiedTaskIds = new Set();
let notifyLog = [];

function notifyAddLog(type, msg) {
  var time = new Date().toLocaleTimeString('ru-RU');
  notifyLog.push({ time: time, type: type, msg: msg });
  if (notifyLog.length > 100) notifyLog.shift();
}

window.initTaskDeadlineNotifications = function() {
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval);
    deadlineCheckInterval = null;
  }
  notifiedTaskIds.clear();
  notifyAddLog('info', 'Инициализация уведомлений');

  if (Notification.permission === 'granted') {
    notifyAddLog('ok', 'Разрешение на уведомления: granted');
    checkAllDeadlines();
    startDeadlineCheckLoop();
  }
  else if (Notification.permission !== 'denied') {
    notifyAddLog('warn', 'Разрешение не получено, запрашиваю...');
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        notifyAddLog('ok', 'Разрешение получено');
        checkAllDeadlines();
        startDeadlineCheckLoop();
      } else {
        notifyAddLog('err', 'Разрешение отклонено: ' + permission);
      }
    });
  } else {
    notifyAddLog('err', 'Уведомления заблокированы браузером');
  }
};

function startDeadlineCheckLoop() {
  deadlineCheckInterval = setInterval(checkAllDeadlines, 10 * 60 * 1000);
  notifyAddLog('info', 'Запущена проверка каждые 10 минут');
}

window.checkAllDeadlines = function() {
  var uid = window.currentUserId || currentUserId;
  if (!uid) {
    notifyAddLog('err', 'Нет currentUserId — пользователь не авторизован');
    return;
  }

  notifyAddLog('info', 'Проверка дедлайнов... uid=' + uid.slice(0, 8) + '...');
  var todoRef = db.ref('lera_todo_v1/' + uid);

  todoRef.get().then(function(snapshot) {
    if (!snapshot.exists()) {
      notifyAddLog('warn', 'Данные задач не найдены в Firebase');
      return;
    }

    var data = snapshot.val();
    var tasks = Array.isArray(data.tasks) ? data.tasks : [];
    var now = new Date();
    var sent = 0, skipped = 0, noDl = 0, done = 0, future = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (!t.deadline) { noDl++; continue; }
      if (t.completed) { done++; continue; }

      var dlDate = new Date(t.deadline);
      if (now < dlDate) { future++; continue; }

      var taskId = t.id || ('task-' + i);
      if (notifiedTaskIds.has(taskId)) {
        skipped++;
        notifyAddLog('skip', 'Уже отправлено: «' + (t.title || '?') + '» (' + t.deadline + ')');
        continue;
      }

      notifiedTaskIds.add(taskId);
      new Notification('⏰ Дедлайн задачи', {
        body: t.title || 'Задача с дедлайном',
        icon: 'favicon.png'
      });
      sent++;
      notifyAddLog('sent', 'Отправлено: «' + (t.title || '?') + '» — дедлайн ' + t.deadline);
    }

    notifyAddLog('ok', 'Итого: ' + tasks.length + ' задач, ' + sent + ' уведомлений, ' + skipped + ' пропущено (дубли), ' + future + ' в будущем, ' + done + ' выполнено, ' + noDl + ' без дедлайна');
  }).catch(function(error) {
    notifyAddLog('err', 'Ошибка Firebase: ' + (error.message || error));
  });
}

window.testDeadlineNotification = function() {
  if (Notification.permission === 'granted') {
    new Notification('🧪 Тест уведомления', {
      body: 'Это тестовое уведомление системы дедлайнов',
      icon: 'favicon.png'
    });
    notifyAddLog('sent', 'Тестовое уведомление отправлено');
  } else if (Notification.permission === 'denied') {
    alert('Уведомления заблокированы браузером. Разрешите уведомления в настройках сайта.');
  } else {
    Notification.requestPermission().then(function(p) {
      if (p === 'granted') {
        new Notification('🧪 Тест уведомления', {
          body: 'Это тестовое уведомление системы дедлайнов',
          icon: 'favicon.png'
        });
        notifyAddLog('sent', 'Тестовое уведомление отправлено (разрешение получено сейчас)');
      }
    });
  }
};

window.showNotifyLog = function() {
  var old = document.getElementById('notify-log-modal');
  if (old) old.remove();

  var perm = Notification.permission;
  var permColor = perm === 'granted' ? '#16a34a' : (perm === 'denied' ? '#dc2626' : '#ca8a04');
  var isRunning = !!deadlineCheckInterval;

  var logHtml = notifyLog.slice().reverse().map(function(entry) {
    var icon = { ok: '✅', sent: '📤', skip: '⏭️', warn: '⚠️', err: '❌', info: 'ℹ️' }[entry.type] || '•';
    var color = { ok: '#16a34a', sent: '#2563eb', skip: '#94a3b8', warn: '#ca8a04', err: '#dc2626', info: '#6b7280' }[entry.type] || '#6b7280';
    return '<div style="padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:12px;">' +
      '<span style="color:' + color + ';margin-right:6px;">' + icon + '</span>' +
      '<span style="color:#94a3b8;margin-right:6px;">' + entry.time + '</span>' +
      '<span>' + entry.msg + '</span></div>';
  }).join('');

  if (!logHtml) {
    logHtml = '<div style="color:#94a3b8;text-align:center;padding:20px;">Пока нет записей. Нажмите «Проверить сейчас».</div>';
  }

  var html = '<div class="modal-overlay visible" id="notify-log-modal" onclick="if(event.target===this)closeNotifyLog()">' +
    '<div class="modal" style="max-width:520px;">' +
      '<div class="modal-header">' +
        '<h3 class="modal-title">🔔 Журнал уведомлений</h3>' +
        '<button class="modal-close" onclick="closeNotifyLog()">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">' +
          '<div style="padding:6px 10px;border-radius:8px;background:#f8fafc;font-size:12px;">Разрешение: <b style="color:' + permColor + ';">' + perm + '</b></div>' +
          '<div style="padding:6px 10px;border-radius:8px;background:#f8fafc;font-size:12px;">Проверка: <b style="color:' + (isRunning ? '#16a34a' : '#dc2626') + ';">' + (isRunning ? 'активна (каждые 10 мин)' : 'остановлена') + '</b></div>' +
          '<div style="padding:6px 10px;border-radius:8px;background:#f8fafc;font-size:12px;">UID: <b>' + (currentUserId ? currentUserId.slice(0, 8) + '...' : 'нет') + '</b></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
          '<button class="btn primary" onclick="checkAllDeadlines();showNotifyLog();" style="font-size:12px;">🔍 Проверить сейчас</button>' +
          '<button class="btn ghost" onclick="clearNotifyLog();showNotifyLog();" style="font-size:12px;">🗑 Очистить лог</button>' +
          '<button class="btn ghost" onclick="testDeadlineNotification()" style="font-size:12px;">🧪 Тест</button>' +
        '</div>' +
        '<div style="max-height:340px;overflow-y:auto;">' + logHtml + '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn" onclick="closeNotifyLog()">Закрыть</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', html);
};

window.clearNotifyLog = function() {
  notifyLog = [];
};

window.closeNotifyLog = function() {
  var el = document.getElementById('notify-log-modal');
  if (el) el.remove();
};