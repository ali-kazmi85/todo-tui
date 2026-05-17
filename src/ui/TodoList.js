import React from 'react';
import { Box, Text } from 'ink';

const h = React.createElement;

/**
 * Left panel: scrollable list of todos with the selected row highlighted.
 *
 * The list is simply "windowed": we only render `height` rows around the
 * selected index so very large lists stay performant and don't overflow
 * the terminal.
 */
export function TodoList({ todos, selectedIndex, height = 15 }) {
  if (!todos || todos.length === 0) {
    return h(
      Box,
      { flexDirection: 'column' },
      h(Text, { dimColor: true }, 'No todos yet. Press "a" to add one.'),
    );
  }

  // Compute the visible window so the selected row stays on screen.
  const half = Math.floor(height / 2);
  let start = Math.max(0, selectedIndex - half);
  let end = Math.min(todos.length, start + height);
  start = Math.max(0, end - height);

  const visible = todos.slice(start, end);

  return h(
    Box,
    { flexDirection: 'column' },
    visible.map((todo, i) => {
      const realIndex = start + i;
      const isSelected = realIndex === selectedIndex;
      const marker = todo.completed ? '[x]' : '[ ]';
      const cursor = isSelected ? '>' : ' ';
      const color = todo.completed ? 'green' : undefined;

      return h(
        Text,
        {
          key: todo.id,
          inverse: isSelected,
          color,
          strikethrough: todo.completed,
        },
        `${cursor} ${marker} ${todo.title}`,
      );
    }),
  );
}

export default TodoList;
