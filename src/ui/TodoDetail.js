import blessed from 'blessed';

export function createTodoDetail(screen) {
  const box = blessed.box({
    parent: screen,
    label: ' Detail ',
    top: 0,
    left: '50%',
    width: '50%',
    height: '100%-1',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
    tags: true,
    padding: { left: 1, right: 1 },
    scrollable: true,
    alwaysScroll: true,
    keys: false,
  });
  return box;
}

export function renderDetail(todo) {
  if (!todo) return '{gray-fg}(no todo selected){/}';
  const status = todo.completed
    ? '{green-fg}completed{/}'
    : '{yellow-fg}pending{/}';
  const lines = [
    `{bold}${escape(todo.title)}{/bold}`,
    '',
    `Status:    ${status}`,
    `Created:   ${todo.createdAt}`,
    `Updated:   ${todo.updatedAt}`,
    '',
    '{underline}Description{/underline}',
    todo.description ? escape(todo.description) : '{gray-fg}(none){/}',
  ];
  return lines.join('\n');
}

function escape(s) {
  return String(s).replace(/[{}]/g, '');
}
