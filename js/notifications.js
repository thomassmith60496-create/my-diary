/* ============================================
   🔔 ОПОВЕЩЕНИЯ О ДЕДЛАЙНАХ ЗАДАЧ (Web Notifications API)
   ============================================ */

"use strict";

let deadlineCheckInterval = null;
let notifiedTaskIds = new Set(); // защита от дублей в рамках сессии

window.initTaskDeadlineNotifications = function() {
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval);
    deadlineCheckInterval = null;
  }
  notifiedTaskIds.clear();

  if (Notification.permission === 'granted') {
    checkAllDeadlines();
    startDeadlineCheckLoop();
  }
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        checkAllDeadlines();
        startDeadlineCheckLoop();
      }
    });
  }
};

function startDeadlineCheckLoop() {
  deadlineCheckInterval = setInterval(checkAllDeadlines, 10 * 60 * 1000);
}

function checkAllDeadlines() {
  var uid = window.currentUserId;
  if (!uid) return;

  var todoRef = db.ref('lera_todo_v1/' + uid);

  todoRef.get().then(function(snapshot) {
    if (!snapshot.exists()) return;

    var data = snapshot.val();
    var tasks = Array.isArray(data.tasks) ? data.tasks : [];
    var now = new Date();

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (!t.deadline || t.completed) continue;

      var dlDate = new Date(t.deadline);
      if (now < dlDate) continue;

      var taskId = t.id || ('task-' + i);
      if (notifiedTaskIds.has(taskId)) continue;
      notifiedTaskIds.add(taskId);

      new Notification('⏰ Дедлайн задачи', {
        body: t.title || 'Задача с дедлайном',
        icon: 'favicon.png'
      });
    }
  }).catch(function(error) {
    console.error('Ошибка при проверке дедлайнов:', error);
  });
}

window.testDeadlineNotification = function() {
  if (Notification.permission === 'granted') {
    new Notification('🧪 Тест уведомления', {
      body: 'Это тестовое уведомление системы дедлайнов',
      icon: 'favicon.png'
    });
  }
};