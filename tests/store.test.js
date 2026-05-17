import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store/todos.js';

async function tmpFile() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-'));
  return path.join(dir, 'todos.json');
}

describe('store/todos', () => {
  let file;
  let store;

  beforeEach(async () => {
    file = await tmpFile();
    store = await createStore({ filePath: file });
  });

  afterEach(async () => {
    try {
      await fs.rm(path.dirname(file), { recursive: true, force: true });
    } catch {}
  });

  test('initializes with an empty list when file does not exist', () => {
    expect(store.list()).toEqual([]);
  });

  test('add() creates a todo with id, timestamps, completed=false', () => {
    const todo = store.add({ title: 'Buy milk', description: 'whole milk' });
    expect(todo.id).toEqual(expect.any(String));
    expect(todo.title).toBe('Buy milk');
    expect(todo.description).toBe('whole milk');
    expect(todo.completed).toBe(false);
    expect(todo.createdAt).toEqual(expect.any(String));
    expect(todo.updatedAt).toEqual(expect.any(String));
    // ISO 8601 parseable
    expect(Number.isNaN(Date.parse(todo.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(todo.updatedAt))).toBe(false);
    expect(store.list()).toHaveLength(1);
  });

  test('add() requires a non-empty title', () => {
    expect(() => store.add({ title: '' })).toThrow();
    expect(() => store.add({})).toThrow();
  });

  test('add() defaults description to empty string', () => {
    const todo = store.add({ title: 'No desc' });
    expect(todo.description).toBe('');
  });

  test('toggle() flips the completed flag and updates updatedAt', async () => {
    const todo = store.add({ title: 'Task' });
    const originalUpdated = todo.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const toggled = store.toggle(todo.id);
    expect(toggled.completed).toBe(true);
    expect(toggled.updatedAt).not.toBe(originalUpdated);
    const toggledAgain = store.toggle(todo.id);
    expect(toggledAgain.completed).toBe(false);
  });

  test('toggle() throws when id not found', () => {
    expect(() => store.toggle('nope')).toThrow();
  });

  test('remove() deletes a todo by id', () => {
    const a = store.add({ title: 'A' });
    const b = store.add({ title: 'B' });
    store.remove(a.id);
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].id).toBe(b.id);
  });

  test('remove() throws when id not found', () => {
    expect(() => store.remove('nope')).toThrow();
  });

  test('get() returns a single todo or undefined', () => {
    const a = store.add({ title: 'A' });
    expect(store.get(a.id)).toMatchObject({ title: 'A' });
    expect(store.get('missing')).toBeUndefined();
  });

  test('persists to disk after add', async () => {
    store.add({ title: 'Persisted' });
    const raw = await fs.readFile(file, 'utf8');
    const data = JSON.parse(raw);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Persisted');
  });

  test('persists to disk after toggle and remove', async () => {
    const t = store.add({ title: 'T' });
    store.toggle(t.id);
    let raw = JSON.parse(await fs.readFile(file, 'utf8'));
    expect(raw[0].completed).toBe(true);
    store.remove(t.id);
    raw = JSON.parse(await fs.readFile(file, 'utf8'));
    expect(raw).toEqual([]);
  });

  test('reload reads existing todos from disk', async () => {
    store.add({ title: 'First' });
    store.add({ title: 'Second' });
    const reloaded = await createStore({ filePath: file });
    expect(reloaded.list()).toHaveLength(2);
    expect(reloaded.list().map((t) => t.title)).toEqual(['First', 'Second']);
  });

  test('handles corrupted/invalid JSON gracefully by starting empty', async () => {
    await fs.writeFile(file, 'not json{{{', 'utf8');
    const recovered = await createStore({ filePath: file });
    expect(recovered.list()).toEqual([]);
  });

  test('filter() supports all/active/completed', () => {
    const a = store.add({ title: 'A' });
    const b = store.add({ title: 'B' });
    store.toggle(b.id);
    expect(store.filter('all')).toHaveLength(2);
    expect(store.filter('active').map((t) => t.id)).toEqual([a.id]);
    expect(store.filter('completed').map((t) => t.id)).toEqual([b.id]);
  });

  test('creates parent directory if it does not exist', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-tui-nested-'));
    const nested = path.join(dir, 'a', 'b', 'todos.json');
    const s = await createStore({ filePath: nested });
    s.add({ title: 'nested' });
    const raw = JSON.parse(await fs.readFile(nested, 'utf8'));
    expect(raw).toHaveLength(1);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
