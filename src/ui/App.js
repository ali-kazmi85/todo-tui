import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import TodoList from './TodoList.js';
import TodoDetail from './TodoDetail.js';

const h = React.createElement;
// `ink-text-input` exports the component as default. When loaded via CJS
// interop the namespace may itself be the component, so be defensive.
const TextInputComp = TextInput && TextInput.default ? TextInput.default : TextInput;

const FILTERS = ['all', 'active', 'completed'];

/**
 * Root TUI component.
 *
 * Owns visible state (filter, selection, modal prompts) and delegates all
 * persistence to the `store` passed in via props. The store is expected
 * to be fully loaded already.
 */
export function App({ store }) {
  const { exit } = useApp();

  const [todos, setTodos] = useState(() => store.all());
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Modal state. Only one of these is active at a time.
  // 'list' | 'add-title' | 'add-desc' | 'confirm-delete' | 'search'
  const [mode, setMode] = useState('list');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(() => {
    setTodos(store.all());
  }, [store]);

  // Apply current filter + search to the list rendered.
  const visibleTodos = useMemo(() => {
    let list = store.filter(filterStatus);
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q),
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, todos, filterStatus, searchQuery]);

  // Keep selectedIndex within bounds when the visible list shrinks.
  useEffect(() => {
    if (selectedIndex >= visibleTodos.length) {
      setSelectedIndex(Math.max(0, visibleTodos.length - 1));
    }
  }, [visibleTodos.length, selectedIndex]);

  const selectedTodo = visibleTodos[selectedIndex] || null;

  useInput(
    (input, key) => {
      if (key.escape) {
        setMode('list');
        setTitleInput('');
        setDescInput('');
        setSearchInput('');
        setMessage('');
        return;
      }

      if (mode === 'list') {
        if (input === 'q' || (key.ctrl && input === 'c')) {
          exit();
          return;
        }
        if (key.upArrow || input === 'k') {
          setSelectedIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (key.downArrow || input === 'j') {
          setSelectedIndex((i) => Math.min(visibleTodos.length - 1, i + 1));
          return;
        }
        if (input === 'a') {
          setMode('add-title');
          setTitleInput('');
          setDescInput('');
          return;
        }
        if (input === ' ') {
          if (selectedTodo) {
            store.toggle(selectedTodo.id).then(refresh);
          }
          return;
        }
        if (input === 'd') {
          if (selectedTodo) setMode('confirm-delete');
          return;
        }
        if (input === '/') {
          setMode('search');
          setSearchInput(searchQuery);
          return;
        }
        if (input === 'f') {
          const idx = FILTERS.indexOf(filterStatus);
          setFilterStatus(FILTERS[(idx + 1) % FILTERS.length]);
          return;
        }
        return;
      }

      if (mode === 'confirm-delete') {
        if (input === 'y' || input === 'Y') {
          if (selectedTodo) {
            store.remove(selectedTodo.id).then(() => {
              refresh();
              setMode('list');
              setMessage('Todo deleted.');
            });
          } else {
            setMode('list');
          }
          return;
        }
        if (input === 'n' || input === 'N') {
          setMode('list');
          return;
        }
      }
    },
    { isActive: true },
  );

  // ---------- Prompt handlers ----------

  function handleTitleSubmit(value) {
    const trimmed = value.trim();
    if (trimmed === '') {
      setMode('list');
      return;
    }
    setMode('add-desc');
  }

  function handleDescSubmit(value) {
    store
      .add({ title: titleInput, description: value })
      .then(() => {
        refresh();
        setMode('list');
        setTitleInput('');
        setDescInput('');
        setMessage('Todo added.');
      })
      .catch((err) => {
        setMessage(`Error: ${err.message}`);
        setMode('list');
      });
  }

  function handleSearchSubmit(value) {
    setSearchQuery(value);
    setMode('list');
  }

  // ---------- Render ----------

  const header = `Todos (${visibleTodos.length}) — filter: ${filterStatus}${
    searchQuery ? ` — search: "${searchQuery}"` : ''
  }`;

  const statusBar = `↑/↓ navigate · a add · space toggle · d delete · / search · f filter · q quit${
    message ? `  |  ${message}` : ''
  }`;

  const modals = [];

  if (mode === 'add-title') {
    modals.push(
      h(
        Box,
        { key: 'add-title', borderStyle: 'single', paddingX: 1 },
        h(Text, null, 'Title: '),
        h(TextInputComp, {
          value: titleInput,
          onChange: setTitleInput,
          onSubmit: handleTitleSubmit,
        }),
      ),
    );
  }

  if (mode === 'add-desc') {
    modals.push(
      h(
        Box,
        { key: 'add-desc', borderStyle: 'single', paddingX: 1 },
        h(Text, null, 'Description (optional): '),
        h(TextInputComp, {
          value: descInput,
          onChange: setDescInput,
          onSubmit: handleDescSubmit,
        }),
      ),
    );
  }

  if (mode === 'search') {
    modals.push(
      h(
        Box,
        { key: 'search', borderStyle: 'single', paddingX: 1 },
        h(Text, null, 'Search: '),
        h(TextInputComp, {
          value: searchInput,
          onChange: setSearchInput,
          onSubmit: handleSearchSubmit,
        }),
      ),
    );
  }

  if (mode === 'confirm-delete') {
    modals.push(
      h(
        Box,
        { key: 'confirm-delete', borderStyle: 'single', paddingX: 1 },
        h(
          Text,
          { color: 'red' },
          `Delete "${selectedTodo ? selectedTodo.title : ''}"? (y/N)`,
        ),
      ),
    );
  }

  return h(
    Box,
    { flexDirection: 'column' },
    h(
      Box,
      null,
      h(
        Box,
        { flexDirection: 'column', width: '50%', borderStyle: 'round', paddingX: 1 },
        h(Text, { bold: true }, header),
        h(TodoList, { todos: visibleTodos, selectedIndex }),
      ),
      h(
        Box,
        { flexDirection: 'column', width: '50%', borderStyle: 'round', paddingX: 1 },
        h(Text, { bold: true }, 'Detail'),
        h(TodoDetail, { todo: selectedTodo }),
      ),
    ),
    ...modals,
    h(Box, { paddingX: 1 }, h(Text, { dimColor: true }, statusBar)),
  );
}

export default App;
