# Корпоративные заметки — PWA

Progressive Web Application для ведения заметок на корпоративных мероприятиях: совещаниях, собраниях, конференциях.

## Возможности

- Создание, просмотр, редактирование и удаление заметок
- Категории: совещание, собрание, конференция, другое
- Поиск по ключевым словам, дате и категории
- Два режима хранения данных:
  - **IndexedDB** — локальная база данных в браузере
  - **Файловое хранилище** — через localStorage с экспортом/импортом JSON
- Работа офлайн благодаря Service Worker
- Адаптивный дизайн (мобильные + десктоп)
- Возможность установки как приложения на телефон

## Структура проекта

```
case_4_notes_app/
├── index.html              — главная страница
├── manifest.json           — манифест PWA
├── sw.js                   — service worker
├── css/
│   └── style.css           — стили
├── js/
│   ├── app.js              — основная логика, роутинг
│   ├── storage-indexeddb.js — адаптер IndexedDB
│   ├── storage-file.js     — адаптер localStorage/файлы
│   └── ui.js               — работа с DOM, рендер
├── icons/
│   ├── app-icon-192.svg    — иконка 192x192
│   └── app-icon-512.svg    — иконка 512x512
└── README.md
```

## Запуск

Для корректной работы PWA (Service Worker) нужен HTTP-сервер. Можно использовать любой локальный сервер, например:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Затем открыть `http://localhost:8080` в браузере.

## Технологии

- HTML5, CSS3, JavaScript (ES6+)
- IndexedDB API
- Web Storage API (localStorage)
- Service Worker API
- Web App Manifest

Без фреймворков и сборщиков — чистый браузерный JS.
