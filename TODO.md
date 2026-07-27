# TODO: Исправление вкладки "Прогресс" (тренировки)

## Шаги:
- [x] 1. Проанализировать код, найти ошибки
- [x] 2. Исправить `renderTrainingProgress()` в `js/training-ui.js`:
  - [x] 2.1 Обернуть блок вариантов в `ex.variants.forEach(function(v) { var hist = ... })`
  - [x] 2.2 Добавить фильтрацию `hist.entries` по выбранному периоду
  - [x] 2.3 Добавить функцию `getVariantBestValue(overall, mt)`
  - [x] 2.4 Добавить функцию `renderVariantSparklineCustom()` для sparkline по отфильтрованным данным
- [ ] 3. Закоммитить и запушить на GitHub

