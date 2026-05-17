#!/usr/bin/env node
import { createStore, DEFAULT_FILE_PATH } from './store/todos.js';
import { createApp } from './ui/App.js';

async function main() {
  const store = await createStore({ filePath: DEFAULT_FILE_PATH });
  const app = createApp(store);

  // Ensure graceful shutdown without corrupting the data file.
  const shutdown = () => {
    try {
      app.screen.destroy();
    } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
