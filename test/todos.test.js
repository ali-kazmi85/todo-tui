import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTodoStore } from '../src/store/todos.js';

let tmpDir;
let filePath;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-'));
  filePath = path.join(tmpDir, 'todos.json');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('load() returns empty array when no file exists', async () => {
  const store = createTodoStore({ filePath });
  const items = await store.load();
  assert.deepEqual(items, []);
  assert.deepEqual(store.getAll(), []);
});

test('add() creates a todo with required fields', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const todo = await store.add({ title: 'Write tests', description: 'now' });

  assert.equal(typeof todo.id, 'string');
  assert.equal(todo.title, 'Write tests');
  assert.equal(todo.description, 'now');
  assert.equal(todo.completed, false);
  assert.equal(typeof todo.createdAt, 'string');
  assert.equal(typeof todo.updatedAt, 'string');
  assert.equal(store.getAll().length, 1);
});

test('add() trims title and rejects empty titles', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const t = await store.add({ title: '  hello  ' });
  assert.equal(t.title, 'hello');

  await assert.rejects(() => store.add({ title: '' }), /title is required/);
  await assert.rejects(() => store.add({}), /title is required/);
});

test('add() persists data to disk', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  await store.add({ title: 'Persist me' });
  await store.flush();

  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Persist me');
});

test('data survives a reload (persistence between sessions)', async () => {
  const store1 = createTodoStore({ filePath });
  await store1.load();
  await store1.add({ title: 'Session 1' });
  await store1.flush();

  const store2 = createTodoStore({ filePath });
  const items = await store2.load();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Session 1');
});

test('toggle() flips completed state', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const t = await store.add({ title: 'Toggle me' });
  assert.equal(t.completed, false);

  const toggled = await store.toggle(t.id);
  assert.equal(toggled.completed, true);

  const toggledAgain = await store.toggle(t.id);
  assert.equal(toggledAgain.completed, false);
});

test('toggle() returns null for unknown id', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const result = await store.toggle('does-not-exist');
  assert.equal(result, null);
});

test('update() patches title, description, completed and updatedAt', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const t = await store.add({ title: 'old' });
  const originalUpdatedAt = t.updatedAt;

  // Ensure the clock moves at least one millisecond.
  await new Promise((r) => setTimeout(r, 5));

  const next = await store.update(t.id, {
    title: 'new',
    description: 'desc',
    completed: true,
  });
  assert.equal(next.title, 'new');
  assert.equal(next.description, 'desc');
  assert.equal(next.completed, true);
  assert.notEqual(next.updatedAt, originalUpdatedAt);
});

test('update() returns null for unknown id', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const result = await store.update('missing', { title: 'x' });
  assert.equal(result, null);
});

test('remove() deletes a todo and returns true', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const t = await store.add({ title: 'doomed' });
  const ok = await store.remove(t.id);
  assert.equal(ok, true);
  assert.equal(store.getAll().length, 0);
});

test('remove() returns false for unknown id', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const ok = await store.remove('missing');
  assert.equal(ok, false);
});

test('filter() returns the right subset', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const a = await store.add({ title: 'a' });
  await store.add({ title: 'b' });
  await store.toggle(a.id);

  assert.equal(store.filter('all').length, 2);
  assert.equal(store.filter('active').length, 1);
  assert.equal(store.filter('completed').length, 1);
  assert.equal(store.filter('active')[0].title, 'b');
  assert.equal(store.filter('completed')[0].title, 'a');
});

test('sort() supports alpha and createdAt orderings', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  await store.add({ title: 'charlie' });
  await new Promise((r) => setTimeout(r, 2));
  await store.add({ title: 'alpha' });
  await new Promise((r) => setTimeout(r, 2));
  await store.add({ title: 'bravo' });

  const byAlpha = store.sort('alpha').map((t) => t.title);
  assert.deepEqual(byAlpha, ['alpha', 'bravo', 'charlie']);

  const byCreated = store.sort('createdAt').map((t) => t.title);
  assert.deepEqual(byCreated, ['charlie', 'alpha', 'bravo']);
});

test('getById() returns the matching todo or null', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  const t = await store.add({ title: 'find me' });
  assert.equal(store.getById(t.id).title, 'find me');
  assert.equal(store.getById('nope'), null);
});

test('load() recovers from a corrupt JSON file', async () => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, '{ not valid json', 'utf8');

  const store = createTodoStore({ filePath });
  const items = await store.load();
  assert.deepEqual(items, []);
});

test('writes are atomic via a temp file + rename', async () => {
  const store = createTodoStore({ filePath });
  await store.load();
  await store.add({ title: 'atomic' });
  await store.flush();

  const dir = path.dirname(filePath);
  const entries = await fs.readdir(dir);
  // The .tmp file should have been renamed away.
  assert.ok(!entries.includes(path.basename(filePath) + '.tmp'));
  assert.ok(entries.includes(path.basename(filePath)));
});

test('methods throw before load() is called', () => {
  const store = createTodoStore({ filePath });
  assert.throws(() => store.getAll(), /not loaded/);
});
