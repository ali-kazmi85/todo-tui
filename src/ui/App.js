import blessed from 'blessed';
import { createTodoList, formatRow } from './TodoList.js';
import { createTodoDetail, renderDetail } from './TodoDetail.js';

const FILTERS = ['all', 'active', 'completed'];

/**
 * Mount the TUI and wire up keybindings.
 * @param {object} store - a store created by createStore()
 */
export function createApp(store) {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'todo-tui',
    fullUnicode: true,
  });

  const list = createTodoList(screen);
  const detail = createTodoDetail(screen);

  const statusBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: { bg: 'blue', fg: 'white' },
    tags: true,
    content: keybindHelp('all'),
  });

  let filterMode = 'all';

  function visible() {
    return store.filter(filterMode);
  }

  function refresh() {
    const items = visible();
    list.setItems(items.map(formatRow));
    if (list.selected >= items.length) {
      list.select(Math.max(0, items.length - 1));
    }
    statusBar.setContent(keybindHelp(filterMode));
    updateDetail();
    screen.render();
  }

  function selectedTodo() {
    const items = visible();
    return items[list.selected];
  }

  function updateDetail() {
    detail.setContent(renderDetail(selectedTodo()));
  }

  // ---------- Add modal ----------
  function promptAdd() {
    const form = blessed.form({
      parent: screen,
      keys: true,
      vi: false,
      left: 'center',
      top: 'center',
      width: '60%',
      height: 11,
      border: { type: 'line' },
      label: ' Add Todo ',
      style: { border: { fg: 'yellow' } },
    });

    blessed.text({ parent: form, top: 0, left: 1, content: 'Title:' });
    const titleInput = blessed.textbox({
      parent: form,
      name: 'title',
      top: 1,
      left: 1,
      right: 1,
      height: 1,
      inputOnFocus: true,
      style: { bg: 'black', fg: 'white', focus: { bg: 'gray' } },
    });

    blessed.text({ parent: form, top: 3, left: 1, content: 'Description:' });
    const descInput = blessed.textbox({
      parent: form,
      name: 'description',
      top: 4,
      left: 1,
      right: 1,
      height: 1,
      inputOnFocus: true,
      style: { bg: 'black', fg: 'white', focus: { bg: 'gray' } },
    });

    blessed.text({
      parent: form,
      bottom: 0,
      left: 1,
      content: 'Enter=next/submit  Esc=cancel',
      style: { fg: 'gray' },
    });

    function cleanup() {
      form.destroy();
      list.focus();
      refresh();
    }

    titleInput.key(['escape'], cleanup);
    descInput.key(['escape'], cleanup);

    titleInput.on('submit', (value) => {
      if (!value || !value.trim()) {
        // Skip add — empty title is invalid
        cleanup();
        return;
      }
      descInput.focus();
      descInput.readInput();
    });

    descInput.on('submit', (value) => {
      const title = titleInput.getValue();
      try {
        store.add({ title, description: value || '' });
      } catch {
        // ignore invalid input
      }
      cleanup();
    });

    titleInput.focus();
    titleInput.readInput();
    screen.render();
  }

  // ---------- Delete confirm ----------
  function promptDelete() {
    const todo = selectedTodo();
    if (!todo) return;
    const q = blessed.question({
      parent: screen,
      border: 'line',
      height: 'shrink',
      width: 'half',
      top: 'center',
      left: 'center',
      label: ' Confirm ',
      style: { border: { fg: 'red' } },
      keys: true,
      mouse: false,
    });
    q.ask(`Delete "${todo.title}"? (y/n)`, (err, ok) => {
      if (ok) {
        try {
          store.remove(todo.id);
        } catch {}
      }
      list.focus();
      refresh();
    });
  }

  // ---------- Filter prompt ----------
  function cycleFilter() {
    const idx = FILTERS.indexOf(filterMode);
    filterMode = FILTERS[(idx + 1) % FILTERS.length];
    list.select(0);
    refresh();
  }

  // ---------- Key bindings ----------
  screen.key(['q', 'C-c'], () => {
    // Graceful exit — store persists synchronously so data is already safe.
    screen.destroy();
    process.exit(0);
  });

  list.key(['a'], promptAdd);
  list.key(['d', 'delete'], promptDelete);
  list.key(['space'], () => {
    const t = selectedTodo();
    if (!t) return;
    try {
      store.toggle(t.id);
    } catch {}
    refresh();
  });
  list.key(['enter'], () => {
    updateDetail();
    screen.render();
  });
  list.key(['/'], cycleFilter);
  list.on('select item', () => {
    updateDetail();
    screen.render();
  });

  list.focus();
  refresh();

  return {
    screen,
    refresh,
    render: () => screen.render(),
  };
}

function keybindHelp(filter) {
  return (
    ` {bold}↑/↓{/bold} navigate  ` +
    `{bold}a{/bold} add  ` +
    `{bold}Space{/bold} toggle  ` +
    `{bold}Enter{/bold} detail  ` +
    `{bold}d{/bold} delete  ` +
    `{bold}/{/bold} filter:${filter}  ` +
    `{bold}q{/bold} quit`
  );
}

export default createApp;
