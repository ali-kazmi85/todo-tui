import React from 'react';
import { Box, Text } from 'ink';

const h = React.createElement;

/**
 * Right panel: detailed view of the currently selected todo.
 */
export function TodoDetail({ todo }) {
  if (!todo) {
    return h(
      Box,
      { flexDirection: 'column' },
      h(Text, { dimColor: true }, 'No todo selected.'),
    );
  }

  return h(
    Box,
    { flexDirection: 'column' },
    h(Text, { bold: true }, todo.title),
    h(
      Box,
      { marginTop: 1 },
      h(
        Text,
        null,
        'Status: ',
        h(
          Text,
          { color: todo.completed ? 'green' : 'yellow' },
          todo.completed ? 'completed' : 'pending',
        ),
      ),
    ),
    h(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      h(Text, { dimColor: true }, 'Description:'),
      h(Text, null, todo.description || '(none)'),
    ),
    h(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      h(Text, { dimColor: true }, `Created: ${todo.createdAt}`),
      h(Text, { dimColor: true }, `Updated: ${todo.updatedAt}`),
      h(Text, { dimColor: true }, `ID: ${todo.id}`),
    ),
  );
}

export default TodoDetail;
