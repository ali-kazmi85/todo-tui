import blessed from 'blessed';

/**
 * Render a scrollable list of todos in the left pane.
 *
 * @param {object} params
 * @param {blessed.Widgets.Screen} params.screen
 * @param {blessed.Widgets.Node} params.parent
 * @returns {blessed.Widgets.ListElement}
 */
export function createTodoList({ screen, parent }) {
  const list = blessed.list({
    parent,
    label: ' Todos ',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%-1',
    border: { type: 'line' },
    keys: true,
    vi: true,
    mouse: false,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    style: {
      selected: { bg: 'blue', fg: 'white' },
      item: { fg: 'white' },
      border: { fg: 'cyan' },
    },
  });

  /**
   * Format a todo into a single line of text.
   * Completed items are rendered green with a check.
   *
   * @param {object} todo
   */
  function formatTodo(todo) {
    if (todo.completed) {
      return `{green-fg}{strikethrough}[x] ${todo.title}{/strikethrough}{/green-fg}`;
    }
    return `[ ] ${todo.title}`;
  }

  /**
   * Update the list contents.
   *
   * @param {Array<object>} todos
   */
  function setTodos(todos) {
    const items = todos.map(formatTodo);
    list.setItems(items);
    if (items.length > 0) {
      const idx = Math.min(list.selected || 0, items.length - 1);
      list.select(idx);
    }
    screen.render();
  }

  return Object.assign(list, { setTodos, formatTodo });
}

export default createTodoList;
