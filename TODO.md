# TODO: Улучшение менеджера GIF упражнений

## Шаги реализации:

- [x] 1. Сгенерировать `js/exercise-gif-names.js` с маппингом всех 1324 GIF → названия упражнений
- [x] 2. **index.html**: добавить подключение `js/exercise-gif-names.js`
- [x] 3. **exercise-gif-manager.js**: заменить `getAvailableGifs()` на динамический вызов из `ExerciseGifNames`
- [x] 4. **exercise-gif-manager.js**: улучшить отображение в селекте — показывать название упражнения + имя файла
- [x] 5. **exercise-gif-manager.js**: добавить функцию `getExerciseNameByGifFromManager` для отображения названий
- [x] 6. **exercise-images.js**: добавить fallback поиск через `ExerciseGifNames`
- [x] 7. Удалить `generate_gif_names.py`

