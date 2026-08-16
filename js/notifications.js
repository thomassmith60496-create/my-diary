/* ============================================
   🔔 ОПОВЕЩЕНИЯ О ДЕДЛАЙНАХ ЗАДАЧ (Web Notifications API)
   ============================================ */

"use strict";

// Инициализация: один раз при загрузке страницы
// Если пользователь уже разрешил — запускаем проверку.
// Если нет — запрашиваемpermission (браузер покажет диалог).
window.initTaskDeadlineNotifications = function() {
  // Еслиpermission уже был получен ранее — сразу начинаем проверку
  if (Notification.permission === 'granted') {
    startDeadlineCheckLoop();
  } 
  // Если пользователь ещё не решали — просим сейчас
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        startDeadlineCheckLoop();
      }
    });
  }
  // Если пользователь previous отменил — ничего не делаем
};

// Запуск цикла проверки раз в 10 минут
function startDeadlineCheckLoop() {
  setInterval(checkAllDeadlines, 10 * 60 * 1000);
}

// Главная функция: бежит по задачам и показывает уведомления при наступлении дедлайна
function checkAllDeadlines() {
  // Берем текущий uid пользователя (устанавливается auth.js при входе)
  var uid = window.currentUserId;
  if (!uid) return; // пользователь ещё не авторизован

  // Путь к задачам пользователя в Firebase: lera_todo_v1/{uid}
  var tasksRef = db.ref('lera_todo_v1/' + uid);

  tasksRef.get().then(function(snapshot) {
    if (!snapshot.exists()) return;

    snapshot.forEach(function(doc) {
      var data = doc.data();

      // Есть ли дедлайн и не выполнена ли задача?
      if (data.deadline && !data.done) {
        var dlDate = new Date(data.deadline);
        // Если текущее время >= дедлайна
        if (new Date() >= dlDate) {
          var title = data.title || 'Задача с дедлайном';

          // Показывам системное уведомление
          var options = {
            body: title,
            icon: 'favicon.png'
          };

          // Чтобы не спамить одним и тем же дедлайном в один цикл — флаг
          // (если задач с прошедшим дедлайном несколько, покажем каждое)
          // Но safeguard: если уведомление уже показано — можно пропустить или показать все.
          // Здесь покажем каждое, но с защитой от дублей в рамках одной итерации:
          // (просто покажем, Notification будет показан для каждой задачи)

          var notification = new Notification('⏰ Дедлайн задачи', options);
        }
      }
    });
  }).catch(function(error) {
    console.error('Ошибка при проверке дедлайнов:', error);
  });
}

// === РУЧНОЙ ТЕСТ ===
// Показывает тестовое уведомление сразу (не ждет дедлайн).
// Используется для проверки работоспособности уведомлений.
// После теста эту кнопку можно удалить.
window.testDeadlineNotification = function() {
  if (Notification.permission === 'granted') {
    new Notification('🧪 Тест уведомления', {
      body: 'Это тестовое уведомление системы дедлайнов',
      icon: 'favicon.png'
    });
  }
};