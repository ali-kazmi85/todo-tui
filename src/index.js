#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './ui/App.js';
import { createStore } from './store/todos.js';

async function main() {
  const store = createStore();
  await store.load();

  // Handle Ctrl+C cleanly so we never leave a half-written file behind.
  const onExit = () => process.exit(0);
  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);

  const { waitUntilExit } = render(React.createElement(App, { store }));
  await waitUntilExit();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
