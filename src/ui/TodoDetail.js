import blessed from 'blessed';

/**
 * Render the detail / preview pane on the right.
 *
 * @param {object} params
 * @param {blessed.Widgets.Screen} params.screen
 * @param {blessed.Widgets.Node} params.parent
 * @returns {blessed.Widgets.BoxElement}
 */
export function createTodoDetail({ screen, parent }) {
  const box = blessed.box({
    parent,
    label: ' Detail ',
    top: 0,
    right: 0,
    width: '50%',
    height: '100%-1',
    border: { type: 'line' },
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    style: {
      border: { fg: 'cyan' },
    },
    content: '{gray-fg}Select a todo to see details.{/gray-fg}',
  });

  /**
   * Render a single todo's details, or a placeholder.
   *
   * @param {object|null} todo
   */
  function setTodo(todo) {
    if (!todo) {
      box.setContent('{gray-fg}No todo selected.{/gray-fg}');
      screen.render();
      return;
    }
    const status = todo.completed
      ? '{green-fg}Completed{/green-fg}'
      : '{yellow-fg}Pending{/yellow-fg}';

    const lines = [
      `{bold}Title:{/bold} ${todo.title}`,
      `{bold}Status:{/bold} ${status}`,
      `{bold}Created:{/bold} ${todo.createdAt}`,
      `{bold}Updated:{/bold} ${todo.updatedAt}`,
      '',
      '{bold}Description:{/bold}',
      todo.description || '{gray-fg}(none){/gray-fg}',
    ];
    box.setContent(lines.join('\n'));
    screen.render();
  }

  return Object.assign(box, { setTodo });
}

export default createTodoDetail;
