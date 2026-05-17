import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createStore } from '../src/store/todos.js';

/**
 * Make a unique temp file path for each test so they're fully isolated.
 */
async function makeTempStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-test-'));
  const filePath = path.join(dir, 'todos.json');
  const store = createStore({ filePath });
  await store.load();
  return { store, filePath, dir };
}

test('load() returns empty list when file does not exist', async () => {
  const { store, filePath } = await makeTempStore();
  assert.deepEqual(store.all(), []);
  // File should not be created until we write something.
  await assert.rejects(fs.access(filePath));
});

test('add() persists a new todo to disk', async () => {
  const { store, filePath } = await makeTempStore();
  const todo = await store.add({ title: 'Buy milk', description: '2%' });

  assert.equal(typeof todo.id, 'string');
  assert.equal(todo.title, 'Buy milk');
  assert.equal(todo.description, '2%');
  assert.equal(todo.completed, false);
  assert.equal(typeof todo.createdAt, 'string');
  assert.equal(typeof todo.updatedAt, 'string');

  // File written
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Buy milk');
});

test('add() trims title and requires a non-empty string', async () => {
  const { store } = await makeTempStore();
  const todo = await store.add({ title: '  hello  ' });
  assert.equal(todo.title, 'hello');

  await assert.rejects(() => store.add({ title: '' }));
  await assert.rejects(() => store.add({ title: '   ' }));
  await assert.rejects(() => store.add({}));
});

test('todos survive a reload (persistence)', async () => {
  const { store, filePath } = await makeTempStore();
  await store.add({ title: 'A' });
  await store.add({ title: 'B' });

  const store2 = createStore({ filePath });
  await store2.load();
  const items = store2.all();
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((t) => t.title).sort(),
    ['A', 'B'],
  );
});

test('toggle() flips completed and updates updatedAt', async () => {
  const { store } = await makeTempStore();
  const todo = await store.add({ title: 'task' });
  const originalUpdatedAt = todo.updatedAt;

  // Force a measurable delay so updatedAt changes.
  await new Promise((r) => setTimeout(r, 5));

  const toggled = await store.toggle(todo.id);
  assert.equal(toggled.completed, true);
  assert.notEqual(toggled.updatedAt, originalUpdatedAt);

  const again = await store.toggle(todo.id);
  assert.equal(again.completed, false);
});

test('toggle() returns null for unknown id', async () => {
  const { store } = await makeTempStore();
  const result = await store.toggle('does-not-exist');
  assert.equal(result, null);
});

test('update() patches fields and ignores unknown ids', async () => {
  const { store } = await makeTempStore();
  const todo = await store.add({ title: 'old', description: 'old desc' });

  const updated = await store.update(todo.id, {
    title: 'new',
    description: 'new desc',
    completed: true,
  });
  assert.equal(updated.title, 'new');
  assert.equal(updated.description, 'new desc');
  assert.equal(updated.completed, true);

  const missing = await store.update('nope', { title: 'x' });
  assert.equal(missing, null);
});

test('remove() deletes a todo and returns boolean status', async () => {
  const { store } = await makeTempStore();
  const a = await store.add({ title: 'A' });
  await store.add({ title: 'B' });

  assert.equal(await store.remove(a.id), true);
  assert.equal(store.all().length, 1);
  assert.equal(store.all()[0].title, 'B');

  assert.equal(await store.remove(a.id), false);
});

test('get() returns the matching todo or null', async () => {
  const { store } = await makeTempStore();
  const t = await store.add({ title: 'find me' });
  assert.equal(store.get(t.id).title, 'find me');
  assert.equal(store.get('missing'), null);
});

test('filter() returns todos matching status', async () => {
  const { store } = await makeTempStore();
  const a = await store.add({ title: 'A' });
  const b = await store.add({ title: 'B' });
  await store.toggle(b.id);

  assert.equal(store.filter('all').length, 2);
  assert.equal(store.filter('active').length, 1);
  assert.equal(store.filter('active')[0].id, a.id);
  assert.equal(store.filter('completed').length, 1);
  assert.equal(store.filter('completed')[0].id, b.id);
});

test('sort() orders by createdAt or alphabetically', async () => {
  const { store } = await makeTempStore();
  await store.add({ title: 'Charlie' });
  await new Promise((r) => setTimeout(r, 2));
  await store.add({ title: 'Alpha' });
  await new Promise((r) => setTimeout(r, 2));
  await store.add({ title: 'Bravo' });

  const byDate = store.sort('createdAt').map((t) => t.title);
  assert.deepEqual(byDate, ['Charlie', 'Alpha', 'Bravo']);

  const byAlpha = store.sort('alpha').map((t) => t.title);
  assert.deepEqual(byAlpha, ['Alpha', 'Bravo', 'Charlie']);
});

test('load() recovers from a corrupt JSON file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-test-'));
  const filePath = path.join(dir, 'todos.json');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, '{ not valid json', 'utf8');

  const store = createStore({ filePath });
  await store.load();
  assert.deepEqual(store.all(), []);
});

test('load() ignores invalid entries in the JSON array', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-test-'));
  const filePath = path.join(dir, 'todos.json');
  await fs.writeFile(
    filePath,
    JSON.stringify([
      { id: 'a', title: 'good', completed: false, createdAt: 'x', updatedAt: 'x' },
      { id: 'b' }, // missing fields
      null,
      'string',
      42,
    ]),
    'utf8',
  );

  const store = createStore({ filePath });
  await store.load();
  const items = store.all();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'good');
});

test('operations throw if called before load()', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-test-'));
  const filePath = path.join(dir, 'todos.json');
  const store = createStore({ filePath });
  assert.throws(() => store.all(), /not been loaded/);
  assert.throws(() => store.get('x'), /not been loaded/);
});

test('write is atomic: no .tmp file remains after add()', async () => {
  const { store, filePath, dir } = await makeTempStore();
  await store.add({ title: 'atomic' });
  const entries = await fs.readdir(dir);
  // Only todos.json should be present (no .tmp leftover).
  assert.deepEqual(entries.sort(), ['todos.json']);
  // Sanity: file contents are valid JSON.
  const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
  assert.equal(parsed.length, 1);
});
