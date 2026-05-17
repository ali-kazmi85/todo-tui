import blessed from 'blessed';
import { createTodoList } from './TodoList.js';
import { createTodoDetail } from './TodoDetail.js';

const FILTERS = ['all', 'active', 'completed'];

/**
 * Build the root TUI application around a TodoStore.
 *
 * @param {object} params
 * @param {ReturnType<import('../store/todos.js').createTodoStore>} params.store
 * @param {blessed.Widgets.Screen} [params.screen]
 * @returns {{screen: blessed.Widgets.Screen, refresh: () => void}}
 */
export function createApp({ store, screen }) {
  const scr =
    screen ||
    blessed.screen({
      smartCSR: true,
      title: 'Todo TUI',
      fullUnicode: true,
    });

  let filter = 'all';
  let sortBy = 'createdAt';
  /** @type {Array<object>} */
  let visible = [];

  const list = createTodoList({ screen: scr, parent: scr });
  const detail = createTodoDetail({ screen: scr, parent: scr });

  const status = blessed.box({
    parent: scr,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { bg: 'blue', fg: 'white' },
    content:
      ' {bold}a{/bold}:add  {bold}space{/bold}:toggle  {bold}d{/bold}:delete  {bold}/{/bold}:filter  {bold}s{/bold}:sort  {bold}q{/bold}:quit ',
  });

  function selectedTodo() {
    const idx = list.selected || 0;
    return visible[idx] || null;
  }

  function refresh() {
    visible = store.sort(sortBy);
    if (filter !== 'all') {
      visible = visible.filter((t) =>
        filter === 'completed' ? t.completed : !t.completed,
      );
    }
    list.setLabel(` Todos (${filter}) `);
    list.setTodos(visible);
    detail.setTodo(selectedTodo());
  }

  list.on('select item', () => {
    detail.setTodo(selectedTodo());
  });

  /**
   * Prompt for input using a centered prompt box.
   *
   * @param {string} label
   * @returns {Promise<string|null>}
   */
  function prompt(label) {
    return new Promise((resolve) => {
      const p = blessed.prompt({
        parent: scr,
        border: 'line',
        height: 'shrink',
        width: '50%',
        top: 'center',
        left: 'center',
        label: ` ${label} `,
        tags: true,
        keys: true,
        vi: true,
      });
      p.input('', '', (err, value) => {
        p.destroy();
        scr.render();
        if (err) return resolve(null);
        resolve(value == null ? null : value);
      });
    });
  }

  /**
   * Ask a yes/no question.
   *
   * @param {string} question
   * @returns {Promise<boolean>}
   */
  function confirm(question) {
    return new Promise((resolve) => {
      const q = blessed.question({
        parent: scr,
        border: 'line',
        height: 'shrink',
        width: '50%',
        top: 'center',
        left: 'center',
        label: ' Confirm ',
        keys: true,
        vi: true,
      });
      q.ask(question, (err, ok) => {
        q.destroy();
        scr.render();
        resolve(Boolean(ok && !err));
      });
    });
  }

  async function addTodo() {
    const title = await prompt('New todo title');
    if (!title || !title.trim()) {
      list.focus();
      return;
    }
    const description = await prompt('Description (optional)');
    await store.add({ title: title.trim(), description: description || '' });
    refresh();
    list.focus();
  }

  async function toggleTodo() {
    const t = selectedTodo();
    if (!t) return;
    await store.toggle(t.id);
    refresh();
  }

  async function deleteTodo() {
    const t = selectedTodo();
    if (!t) return;
    const ok = await confirm(`Delete "${t.title}"?`);
    if (!ok) {
      list.focus();
      return;
    }
    await store.remove(t.id);
    refresh();
    list.focus();
  }

  async function cycleFilter() {
    const i = FILTERS.indexOf(filter);
    filter = FILTERS[(i + 1) % FILTERS.length];
    refresh();
  }

  function cycleSort() {
    sortBy = sortBy === 'createdAt' ? 'alpha' : 'createdAt';
    refresh();
  }

  // Global keybindings
  scr.key(['q', 'C-c'], () => {
    scr.destroy();
    process.exit(0);
  });
  scr.key('a', () => {
    addTodo().catch(() => {});
  });
  scr.key('space', () => {
    toggleTodo().catch(() => {});
  });
  scr.key('d', () => {
    deleteTodo().catch(() => {});
  });
  scr.key('/', () => {
    cycleFilter().catch(() => {});
  });
  scr.key('s', () => {
    cycleSort();
  });
  scr.key('enter', () => {
    detail.setTodo(selectedTodo());
  });

  list.focus();
  refresh();

  return { screen: scr, refresh };
}

export default createApp;
