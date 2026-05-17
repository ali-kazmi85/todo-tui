import blessed from 'blessed';

/**
 * Build the list panel.
 * @param {blessed.Widgets.Screen} screen
 */
export function createTodoList(screen) {
  const list = blessed.list({
    parent: screen,
    label: ' Todos ',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%-1',
    border: { type: 'line' },
    keys: true,
    vi: true,
    mouse: false,
    style: {
      border: { fg: 'cyan' },
      selected: { bg: 'blue', fg: 'white' },
      item: { fg: 'white' },
    },
    tags: true,
    scrollable: true,
    alwaysScroll: true,
  });
  return list;
}

/**
 * Format a single todo as a list row.
 * @param {{title: string, completed: boolean}} todo
 */
export function formatRow(todo) {
  if (todo.completed) {
    // Green + strikethrough for completed items
    return `{green-fg}{strikethrough}[x] ${escape(todo.title)}{/}`;
  }
  return `[ ] ${escape(todo.title)}`;
}

function escape(s) {
  return String(s).replace(/[{}]/g, '');
}
