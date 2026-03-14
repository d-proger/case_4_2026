// главный модуль приложения
// тут вся логика: роутинг, обработчики, переключение хранилища

const App = {
  storage: null,       // текущее хранилище
  storageIDB: null,    // экземпляр IndexedDB
  storageFile: null,   // экземпляр FileStorage
  currentNoteId: null, // id открытой заметки

  // инициализация приложения
  async init() {
    // создаём экземпляры хранилищ
    this.storageIDB = new IndexedDBStorage();
    this.storageFile = new FileStorage();

    // инициализируем оба хранилища
    try {
      await this.storageIDB.init();
    } catch (e) {
      console.warn('IndexedDB недоступна:', e);
    }
    await this.storageFile.init();

    // по умолчанию используем IndexedDB
    this.storage = this.storageIDB;

    // восстанавливаем выбор хранилища из localStorage
    const savedStorage = localStorage.getItem('preferredStorage') || 'indexeddb';
    const toggle = document.getElementById('storageToggle');
    if (toggle) {
      toggle.value = savedStorage;
      this._applyStorageChoice(savedStorage);
    }

    // навешиваем обработчики
    this._bindEvents();

    // регистрируем service worker
    this._registerSW();

    // показываем список заметок
    this.showNotesList();
  },

  // переключение хранилища
  _applyStorageChoice(value) {
    if (value === 'file') {
      this.storage = this.storageFile;
    } else {
      this.storage = this.storageIDB;
    }

    // обновляем индикатор
    const indicator = document.getElementById('storageIndicator');
    if (indicator) indicator.textContent = this.storage.getName();

    // показываем/скрываем кнопки импорта/экспорта
    const fileControls = document.getElementById('fileControls');
    if (fileControls) {
      fileControls.style.display = value === 'file' ? 'flex' : 'none';
    }
  },

  // навешиваем все обработчики событий
  _bindEvents() {
    // кнопка «Новая заметка»
    const btnNewNote = document.getElementById('btnNewNote');
    if (btnNewNote) {
      btnNewNote.addEventListener('click', () => this.showNewNoteForm());
    }

    // переключатель хранилища
    const toggle = document.getElementById('storageToggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const val = e.target.value;
        localStorage.setItem('preferredStorage', val);
        this._applyStorageChoice(val);
        this.showNotesList(); // перезагружаем список
        UI.showToast(`Хранилище переключено на: ${this.storage.getName()}`);
      });
    }

    // экспорт
    const btnExport = document.getElementById('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.storageFile.exportToFile();
        UI.showToast('Файл экспортирован');
      });
    }

    // импорт
    const btnImport = document.getElementById('btnImport');
    const importFile = document.getElementById('importFile');
    if (btnImport && importFile) {
      btnImport.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const count = await this.storageFile.importFromFile(file);
          UI.showToast(`Импортировано заметок: ${count}`);
          if (this.storage === this.storageFile) {
            this.showNotesList();
          }
        } catch (err) {
          UI.showToast(err.message, 'error');
        }
        importFile.value = '';
      });
    }

    // бургер-меню (мобильная версия)
    const btnBurger = document.getElementById('btnBurger');
    const sidebar = document.querySelector('.sidebar');
    if (btnBurger && sidebar) {
      btnBurger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      // закрываем сайдбар при клике на контент
      document.getElementById('mainContent')?.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }
  },

  // отображаем список заметок
  async showNotesList(filters = {}) {
    const container = document.getElementById('mainContent');
    if (!container) return;

    // рендерим поисковую панель + список
    container.innerHTML = `
      <h2 class="page-title">Все заметки</h2>
      <div class="search-panel">
        <div class="search-row">
          <div class="search-input-wrap form-group">
            <label for="searchKeyword">Поиск</label>
            <input type="text" id="searchKeyword" placeholder="Ключевые слова...">
          </div>
          <div class="form-group">
            <label for="searchCategory">Категория</label>
            <select id="searchCategory">
              <option value="all">Все категории</option>
              <option value="совещание">Совещание</option>
              <option value="собрание">Собрание</option>
              <option value="конференция">Конференция</option>
              <option value="другое">Другое</option>
            </select>
          </div>
        </div>
        <div class="search-row">
          <div class="form-group">
            <label for="searchDateFrom">Дата с</label>
            <input type="date" id="searchDateFrom">
          </div>
          <div class="form-group">
            <label for="searchDateTo">Дата по</label>
            <input type="date" id="searchDateTo">
          </div>
          <div class="form-group" style="align-self: flex-end">
            <button class="btn btn-secondary" id="btnSearch">🔍 Найти</button>
            <button class="btn btn-secondary" id="btnClearSearch" style="margin-left:6px">✕ Сброс</button>
          </div>
        </div>
      </div>
      <div class="notes-list" id="notesList"></div>
    `;

    // восстанавливаем значения фильтров
    if (filters.keyword) document.getElementById('searchKeyword').value = filters.keyword;
    if (filters.category) document.getElementById('searchCategory').value = filters.category;
    if (filters.dateFrom) document.getElementById('searchDateFrom').value = filters.dateFrom;
    if (filters.dateTo) document.getElementById('searchDateTo').value = filters.dateTo;

    // обработчики поиска
    document.getElementById('btnSearch')?.addEventListener('click', () => {
      this.showNotesList(this._getSearchFilters());
    });

    document.getElementById('searchKeyword')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.showNotesList(this._getSearchFilters());
    });

    document.getElementById('btnClearSearch')?.addEventListener('click', () => {
      this.showNotesList({});
    });

    // загружаем заметки
    try {
      const notes = await this.storage.search(filters);
      const notesList = document.getElementById('notesList');
      UI.renderNotesList(notes, notesList);

      // обработчики кликов на карточках
      notesList.addEventListener('click', (e) => {
        const card = e.target.closest('.note-card');
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnDelete) {
          e.stopPropagation();
          this.deleteNote(btnDelete.dataset.id);
        } else if (btnEdit) {
          e.stopPropagation();
          this.showEditNoteForm(btnEdit.dataset.id);
        } else if (card) {
          this.showNoteView(card.dataset.id);
        }
      });
    } catch (err) {
      console.error('Ошибка загрузки заметок:', err);
      UI.showToast('Ошибка загрузки заметок', 'error');
    }
  },

  // получаем текущие значения фильтров из формы
  _getSearchFilters() {
    return {
      keyword: document.getElementById('searchKeyword')?.value || '',
      category: document.getElementById('searchCategory')?.value || 'all',
      dateFrom: document.getElementById('searchDateFrom')?.value || '',
      dateTo: document.getElementById('searchDateTo')?.value || ''
    };
  },

  // показываем форму создания заметки
  showNewNoteForm() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    UI.renderNoteForm(null, container);

    // обработчик сабмита формы
    document.getElementById('noteForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = this._getFormData();
      try {
        await this.storage.add(note);
        UI.showToast('Заметка создана!');
        this.showNotesList();
      } catch (err) {
        UI.showToast('Ошибка создания заметки', 'error');
        console.error(err);
      }
    });

    // кнопка отмены
    document.getElementById('btnCancelForm')?.addEventListener('click', () => {
      this.showNotesList();
    });
  },

  // показываем форму редактирования
  async showEditNoteForm(id) {
    const note = await this.storage.getById(id);
    if (!note) {
      UI.showToast('Заметка не найдена', 'error');
      return;
    }

    const container = document.getElementById('mainContent');
    UI.renderNoteForm(note, container);
    this.currentNoteId = id;

    document.getElementById('noteForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = { ...note, ...this._getFormData() };
      try {
        await this.storage.update(updated);
        UI.showToast('Заметка обновлена!');
        this.showNoteView(id);
      } catch (err) {
        UI.showToast('Ошибка обновления', 'error');
        console.error(err);
      }
    });

    document.getElementById('btnCancelForm')?.addEventListener('click', () => {
      this.showNoteView(id);
    });
  },

  // показываем заметку
  async showNoteView(id) {
    const note = await this.storage.getById(id);
    if (!note) {
      UI.showToast('Заметка не найдена', 'error');
      this.showNotesList();
      return;
    }

    const container = document.getElementById('mainContent');
    UI.renderNoteView(note, container);

    document.getElementById('btnEditNote')?.addEventListener('click', () => {
      this.showEditNoteForm(id);
    });

    document.getElementById('btnDeleteNote')?.addEventListener('click', () => {
      this.deleteNote(id);
    });

    document.getElementById('btnBackToList')?.addEventListener('click', () => {
      this.showNotesList();
    });
  },

  // удаляем заметку
  async deleteNote(id) {
    const confirmed = await UI.showConfirm('Удалить эту заметку?');
    if (!confirmed) return;

    try {
      await this.storage.delete(id);
      UI.showToast('Заметка удалена');
      this.showNotesList();
    } catch (err) {
      UI.showToast('Ошибка удаления', 'error');
      console.error(err);
    }
  },

  // читаем данные из формы
  _getFormData() {
    return {
      title: document.getElementById('noteTitle')?.value.trim() || '',
      category: document.getElementById('noteCategory')?.value || 'совещание',
      date: document.getElementById('noteDate')?.value || '',
      time: document.getElementById('noteTime')?.value || '',
      content: document.getElementById('noteContent')?.value.trim() || ''
    };
  },

  // регистрируем service worker
  _registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('SW зарегистрирован:', reg.scope);
          })
          .catch((err) => {
            console.warn('SW не зарегистрирован:', err);
          });
      });
    }
  }
};

// запускаем приложение когда DOM готов
document.addEventListener('DOMContentLoaded', () => App.init());
