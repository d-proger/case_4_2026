// модуль для работы с DOM — рендер заметок, формы, уведомления

const UI = {
  // категории на русском
  categories: {
    'совещание': 'Совещание',
    'собрание': 'Собрание',
    'конференция': 'Конференция',
    'другое': 'Другое'
  },

  // цвета для категорий (для бейджиков)
  categoryColors: {
    'совещание': '#2563eb',
    'собрание': '#7c3aed',
    'конференция': '#059669',
    'другое': '#6b7280'
  },

  // рендер списка заметок
  renderNotesList(notes, container) {
    container.innerHTML = '';

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Заметок пока нет</p>
          <p class="empty-hint">Нажмите «Новая заметка» чтобы создать</p>
        </div>
      `;
      return;
    }

    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.dataset.id = note.id;

      const catColor = this.categoryColors[note.category] || '#6b7280';
      const catLabel = this.categories[note.category] || note.category;

      // обрезаем контент для превью
      const preview = note.content.length > 120
        ? note.content.substring(0, 120) + '...'
        : note.content;

      card.innerHTML = `
        <div class="note-card-header">
          <h3 class="note-card-title">${this._escapeHtml(note.title)}</h3>
          <span class="note-badge" style="background: ${catColor}">${catLabel}</span>
        </div>
        <p class="note-card-preview">${this._escapeHtml(preview)}</p>
        <div class="note-card-footer">
          <span class="note-date">${this._formatDate(note.date)} ${note.time || ''}</span>
          <div class="note-actions">
            <button class="btn-icon btn-edit" data-id="${note.id}" title="Редактировать">✏️</button>
            <button class="btn-icon btn-delete" data-id="${note.id}" title="Удалить">🗑️</button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  },

  // рендер формы создания/редактирования
  renderNoteForm(note, container) {
    const isEdit = !!note;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);

    container.innerHTML = `
      <form class="note-form" id="noteForm">
        <h2>${isEdit ? 'Редактировать заметку' : 'Новая заметка'}</h2>

        <div class="form-group">
          <label for="noteTitle">Название *</label>
          <input type="text" id="noteTitle" name="title"
            value="${isEdit ? this._escapeHtml(note.title) : ''}"
            placeholder="Введите название" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="noteCategory">Категория</label>
            <select id="noteCategory" name="category">
              <option value="совещание" ${isEdit && note.category === 'совещание' ? 'selected' : ''}>Совещание</option>
              <option value="собрание" ${isEdit && note.category === 'собрание' ? 'selected' : ''}>Собрание</option>
              <option value="конференция" ${isEdit && note.category === 'конференция' ? 'selected' : ''}>Конференция</option>
              <option value="другое" ${isEdit && note.category === 'другое' ? 'selected' : ''}>Другое</option>
            </select>
          </div>

          <div class="form-group">
            <label for="noteDate">Дата</label>
            <input type="date" id="noteDate" name="date"
              value="${isEdit ? note.date : today}">
          </div>

          <div class="form-group">
            <label for="noteTime">Время</label>
            <input type="time" id="noteTime" name="time"
              value="${isEdit ? note.time : now}">
          </div>
        </div>

        <div class="form-group">
          <label for="noteContent">Содержание *</label>
          <textarea id="noteContent" name="content"
            placeholder="Введите текст заметки" required
            rows="8">${isEdit ? this._escapeHtml(note.content) : ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            ${isEdit ? '💾 Сохранить' : '➕ Создать заметку'}
          </button>
          <button type="button" class="btn btn-secondary" id="btnCancelForm">
            Отмена
          </button>
        </div>
      </form>
    `;
  },

  // рендер просмотра заметки
  renderNoteView(note, container) {
    const catColor = this.categoryColors[note.category] || '#6b7280';
    const catLabel = this.categories[note.category] || note.category;

    container.innerHTML = `
      <div class="note-view">
        <div class="note-view-header">
          <h2>${this._escapeHtml(note.title)}</h2>
          <span class="note-badge" style="background: ${catColor}">${catLabel}</span>
        </div>
        <div class="note-view-meta">
          <span>📅 ${this._formatDate(note.date)}</span>
          <span>🕐 ${note.time || '—'}</span>
          ${note.updatedAt ? `<span>Изменено: ${this._formatDateTime(note.updatedAt)}</span>` : ''}
        </div>
        <div class="note-view-content">${this._escapeHtml(note.content)}</div>
        <div class="note-view-actions">
          <button class="btn btn-primary" id="btnEditNote" data-id="${note.id}">✏️ Редактировать</button>
          <button class="btn btn-danger" id="btnDeleteNote" data-id="${note.id}">🗑️ Удалить</button>
          <button class="btn btn-secondary" id="btnBackToList">← Назад к списку</button>
        </div>
      </div>
    `;
  },

  // показываем тост-уведомление
  showToast(message, type = 'success') {
    // удаляем предыдущий тост если есть
    const old = document.querySelector('.toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // анимация появления
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // убираем через 3 секунды
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // диалог подтверждения удаления
  showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-dialog">
          <p>${message}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modalCancel">Отмена</button>
            <button class="btn btn-danger" id="modalConfirm">Удалить</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#modalConfirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector('#modalCancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
    });
  },

  // вспомогательные функции
  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  },

  _formatDateTime(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  }
};
