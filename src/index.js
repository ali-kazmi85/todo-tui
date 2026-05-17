#!/usr/bin/env node
import { createTodoStore } from './store/todos.js';
import { createApp } from './ui/App.js';

async function main() {
  const store = createTodoStore();
  await store.load();
  const { screen } = createApp({ store });
  screen.render();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', err);
  process.exit(1);
});
