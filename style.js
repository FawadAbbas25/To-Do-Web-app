(function () {
  'use strict';

  const STORAGE_KEY = 'daily-tasks-v1';
  const MAX_LENGTH = 200;

  let tasks = loadTasks();
  let editingId = null;

  const form = document.getElementById('add-form');
  const input = document.getElementById('new-task');
  const pendingList = document.getElementById('pending-list');
  const completedList = document.getElementById('completed-list');
  const pendingCount = document.getElementById('pending-count');
  const completedCount = document.getElementById('completed-count');
  const pendingEmpty = document.getElementById('pending-empty');
  const completedEmpty = document.getElementById('completed-empty');

  /* ---------- Storage ---------- */

  function isValidTask(t) {
    return t &&
      typeof t.id === 'string' &&
      typeof t.text === 'string' &&
      typeof t.completed === 'boolean' &&
      typeof t.createdAt === 'number' &&
      (t.completedAt === null || typeof t.completedAt === 'number');
  }

  function loadTasks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
    } catch (err) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      // Storage unavailable: the app still works in memory.
    }
  }

  /* ---------- Helpers ---------- */

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function findTask(id) {
    return tasks.find(t => t.id === id);
  }

  /* ---------- Actions ---------- */

  function addTask(rawText) {
    const text = rawText.trim();
    if (!text) return false;

    tasks.unshift({
      id: makeId(),
      text: text.slice(0, MAX_LENGTH),
      completed: false,
      createdAt: Date.now(),
      completedAt: null
    });

    saveTasks();
    render();
    return true;
  }

  function toggleTask(id) {
    const task = findTask(id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;

    if (editingId === id) editingId = null;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    if (editingId === id) editingId = null;
    saveTasks();
    render();
  }

  function startEdit(id) {
    editingId = id;
    render();

    const field = document.querySelector('.edit-input');
    if (field) {
      field.focus();
      field.select();
    }
  }

  function cancelEdit() {
    editingId = null;
    render();
  }

  function saveEdit(id, rawText, field, hint) {
    const text = rawText.trim();

    if (!text) {
      field.classList.add('invalid');
      hint.textContent = 'A task cannot be empty. Type something or press Escape to cancel.';
      field.focus();
      return;
    }

    const task = findTask(id);
    if (task) task.text = text.slice(0, MAX_LENGTH);

    editingId = null;
    saveTasks();
    render();
  }

  /* ---------- Rendering ---------- */

  function buildTask(task) {
    const li = el('li', 'task' + (task.completed ? ' done' : ''));
    li.dataset.id = task.id;

    // Checkbox = "Mark Complete" toggle
    const toggle = el('input');
    toggle.type = 'checkbox';
    toggle.checked = task.completed;
    toggle.dataset.action = 'toggle';
    toggle.setAttribute(
      'aria-label',
      task.completed
        ? 'Mark "' + task.text + '" as pending'
        : 'Mark "' + task.text + '" as complete'
    );
    li.appendChild(toggle);

    const body = el('div', 'task-body');

    if (editingId === task.id) {
      const field = el('input', 'edit-input');
      field.type = 'text';
      field.maxLength = MAX_LENGTH;
      field.value = task.text;
      field.setAttribute('aria-label', 'Edit task');

      const hint = el('p', 'edit-hint');
      hint.setAttribute('aria-live', 'polite');

      field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveEdit(task.id, field.value, field, hint);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });

      field.addEventListener('input', () => {
        field.classList.remove('invalid');
        hint.textContent = '';
      });

      body.append(field, hint);
      li.appendChild(body);

      const actions = el('div', 'actions');
      const save = el('button', 'btn-primary', 'Save');
      save.type = 'button';
      save.dataset.action = 'save';

      const cancel = el('button', '', 'Cancel');
      cancel.type = 'button';
      cancel.dataset.action = 'cancel';

      actions.append(save, cancel);
      li.appendChild(actions);
      return li;
    }

    const text = el('span', 'task-text', task.text);
    const meta = el('span', 'task-meta');
    meta.textContent = task.completed && task.completedAt
      ? 'Added ' + formatDate(task.createdAt) + ' · Completed ' + formatDate(task.completedAt)
      : 'Added ' + formatDate(task.createdAt);

    body.append(text, meta);
    li.appendChild(body);

    const actions = el('div', 'actions');

    const edit = el('button', '', 'Edit');
    edit.type = 'button';
    edit.dataset.action = 'edit';
    edit.setAttribute('aria-label', 'Edit "' + task.text + '"');

    const del = el('button', 'btn-danger', 'Delete');
    del.type = 'button';
    del.dataset.action = 'delete';
    del.setAttribute('aria-label', 'Delete "' + task.text + '"');

    actions.append(edit, del);
    li.appendChild(actions);

    return li;
  }

  function renderEmpty(container, title, message) {
    container.innerHTML = '';
    const box = el('div', 'empty');
    box.append(el('strong', '', title), document.createTextNode(message));
    container.appendChild(box);
  }

  function render() {
    const pending = tasks.filter(t => !t.completed);
    const completed = tasks
      .filter(t => t.completed)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    pendingList.replaceChildren(...pending.map(buildTask));
    completedList.replaceChildren(...completed.map(buildTask));

    pendingCount.textContent = pending.length + ' pending';
    completedCount.textContent = completed.length + ' completed';

    if (pending.length === 0) {
      renderEmpty(
        pendingEmpty,
        'All caught up!',
        completed.length
          ? 'Nothing left to do. Enjoy the break.'
          : 'Add a task above to get started.'
      );
    } else {
      pendingEmpty.innerHTML = '';
    }

    if (completed.length === 0) {
      renderEmpty(completedEmpty, 'No completed tasks yet.', 'Finish a task and it will show up here.');
    } else {
      completedEmpty.innerHTML = '';
    }
  }

  /* ---------- Events ---------- */

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (addTask(input.value)) input.value = '';
    input.focus();
  });

  function handleToggle(e) {
    if (e.target.matches('input[type="checkbox"][data-action="toggle"]')) {
      toggleTask(e.target.closest('li.task').dataset.id);
    }
  }

  function handleClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const li = button.closest('li.task');
    if (!li) return;

    const id = li.dataset.id;

    switch (button.dataset.action) {
      case 'edit':
        startEdit(id);
        break;
      case 'delete':
        deleteTask(id);
        break;
      case 'save': {
        const field = li.querySelector('.edit-input');
        const hint = li.querySelector('.edit-hint');
        saveEdit(id, field.value, field, hint);
        break;
      }
      case 'cancel':
        cancelEdit();
        break;
    }
  }

  pendingList.addEventListener('change', handleToggle);
  completedList.addEventListener('change', handleToggle);
  pendingList.addEventListener('click', handleClick);
  completedList.addEventListener('click', handleClick);

  render();
})();