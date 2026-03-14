// хранилище через localStorage + экспорт/импорт JSON-файлов
// эмулирует файловую систему, данные хранятся в localStorage

class FileStorage {
  constructor() {
    this.storageKey = 'notes_app_data';
  }

  init() {
    // localStorage не требует асинхронной инициализации
    // но делаем промис для единообразия с IndexedDB
    return new Promise((resolve) => {
      if (!localStorage.getItem(this.storageKey)) {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
      }
      resolve();
    });
  }

  // читаем все заметки из localStorage
  _readAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Ошибка чтения localStorage:', err);
      return [];
    }
  }

  // сохраняем массив обратно
  _writeAll(notes) {
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
  }

  // добавить заметку
  add(note) {
    return new Promise((resolve) => {
      const notes = this._readAll();
      if (!note.id) {
        note.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }
      note.createdAt = note.createdAt || new Date().toISOString();
      note.updatedAt = new Date().toISOString();
      notes.push(note);
      this._writeAll(notes);
      resolve(note);
    });
  }

  // обновить заметку
  update(note) {
    return new Promise((resolve, reject) => {
      const notes = this._readAll();
      const idx = notes.findIndex(n => n.id === note.id);
      if (idx === -1) {
        reject(new Error('Заметка не найдена'));
        return;
      }
      note.updatedAt = new Date().toISOString();
      notes[idx] = note;
      this._writeAll(notes);
      resolve(note);
    });
  }

  // удалить заметку
  delete(id) {
    return new Promise((resolve) => {
      let notes = this._readAll();
      notes = notes.filter(n => n.id !== id);
      this._writeAll(notes);
      resolve();
    });
  }

  // получить по id
  getById(id) {
    return new Promise((resolve) => {
      const notes = this._readAll();
      const found = notes.find(n => n.id === id) || null;
      resolve(found);
    });
  }

  // все заметки, отсортированные
  getAll() {
    return new Promise((resolve) => {
      const notes = this._readAll();
      notes.sort((a, b) => {
        return new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time);
      });
      resolve(notes);
    });
  }

  // поиск
  search(filters) {
    return new Promise(async (resolve) => {
      let notes = await this.getAll();

      if (filters.keyword && filters.keyword.trim()) {
        const kw = filters.keyword.toLowerCase().trim();
        notes = notes.filter(n =>
          n.title.toLowerCase().includes(kw) ||
          n.content.toLowerCase().includes(kw)
        );
      }

      if (filters.category && filters.category !== 'all') {
        notes = notes.filter(n => n.category === filters.category);
      }

      if (filters.dateFrom) {
        notes = notes.filter(n => n.date >= filters.dateFrom);
      }
      if (filters.dateTo) {
        notes = notes.filter(n => n.date <= filters.dateTo);
      }

      resolve(notes);
    });
  }

  // экспорт в JSON-файл (скачивание)
  exportToFile() {
    const notes = this._readAll();
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes_export_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // импорт из JSON-файла
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) {
            reject(new Error('Неверный формат файла'));
            return;
          }
          // мержим с существующими
          const existing = this._readAll();
          const existingIds = new Set(existing.map(n => n.id));
          let addedCount = 0;
          imported.forEach(note => {
            if (!existingIds.has(note.id)) {
              existing.push(note);
              addedCount++;
            }
          });
          this._writeAll(existing);
          resolve(addedCount);
        } catch (err) {
          reject(new Error('Ошибка парсинга JSON: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  getName() {
    return 'Файловое (localStorage)';
  }
}
