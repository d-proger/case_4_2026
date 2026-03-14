// хранилище на IndexedDB
// работает как локальная БД, похожая на SQLite

class IndexedDBStorage {
  constructor() {
    this.dbName = 'NotesAppDB';
    this.storeName = 'notes';
    this.db = null;
  }

  // открываем/создаём базу данных
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          // индексы для поиска
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = (e) => {
        console.error('Ошибка открытия IndexedDB:', e);
        reject(e);
      };
    });
  }

  // получить транзакцию
  _getStore(mode) {
    const tx = this.db.transaction(this.storeName, mode);
    return tx.objectStore(this.storeName);
  }

  // добавить заметку
  add(note) {
    return new Promise((resolve, reject) => {
      const store = this._getStore('readwrite');
      // генерируем id если его нет
      if (!note.id) {
        note.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }
      note.createdAt = note.createdAt || new Date().toISOString();
      note.updatedAt = new Date().toISOString();

      const req = store.add(note);
      req.onsuccess = () => resolve(note);
      req.onerror = (e) => reject(e);
    });
  }

  // обновить заметку
  update(note) {
    return new Promise((resolve, reject) => {
      const store = this._getStore('readwrite');
      note.updatedAt = new Date().toISOString();
      const req = store.put(note);
      req.onsuccess = () => resolve(note);
      req.onerror = (e) => reject(e);
    });
  }

  // удалить по id
  delete(id) {
    return new Promise((resolve, reject) => {
      const store = this._getStore('readwrite');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  }

  // получить заметку по id
  getById(id) {
    return new Promise((resolve, reject) => {
      const store = this._getStore('readonly');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e);
    });
  }

  // получить все заметки
  getAll() {
    return new Promise((resolve, reject) => {
      const store = this._getStore('readonly');
      const req = store.getAll();
      req.onsuccess = () => {
        // сортируем по дате, новые сверху
        const notes = req.result.sort((a, b) => {
          return new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time);
        });
        resolve(notes);
      };
      req.onerror = (e) => reject(e);
    });
  }

  // поиск с фильтрами
  search(filters) {
    return new Promise(async (resolve, reject) => {
      try {
        let notes = await this.getAll();

        // фильтр по ключевому слову
        if (filters.keyword && filters.keyword.trim()) {
          const kw = filters.keyword.toLowerCase().trim();
          notes = notes.filter(n => {
            return n.title.toLowerCase().includes(kw) ||
                   n.content.toLowerCase().includes(kw);
          });
        }

        // фильтр по категории
        if (filters.category && filters.category !== 'all') {
          notes = notes.filter(n => n.category === filters.category);
        }

        // фильтр по дате
        if (filters.dateFrom) {
          notes = notes.filter(n => n.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
          notes = notes.filter(n => n.date <= filters.dateTo);
        }

        resolve(notes);
      } catch (e) {
        reject(e);
      }
    });
  }

  // название для UI
  getName() {
    return 'IndexedDB';
  }
}
