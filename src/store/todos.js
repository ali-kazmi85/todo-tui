import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { uuid } from '../utils/uuid.js';

/**
 * Default location for the persistent JSON file.
 * Tests override this via `createStore({ filePath })`.
 */
export const DEFAULT_DATA_DIR = path.join(os.homedir(), '.todo-app');
export const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'todos.json');

function nowIso() {
  return new Date().toISOString();
}

/**
 * Validate that a value looks like a todo. Used when reading from disk so
 * we silently drop garbage instead of crashing the UI.
 */
function isValidTodo(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.completed === 'boolean'
  );
}

/**
 * Create a Todo store backed by a JSON file.
 *
 * The store keeps an in-memory cache so reads are synchronous after the
 * initial `load()`. All mutating operations persist to disk atomically
 * (write to a temp file then rename) so that an interrupted process
 * cannot leave the data file half-written.
 *
 * @param {object} [options]
 * @param {string} [options.filePath] - Path to the JSON file. Defaults to `~/.todo-app/todos.json`.
 */
export function createStore(options = {}) {
  const filePath = options.filePath || DEFAULT_DATA_FILE;
  const dir = path.dirname(filePath);

  /** @type {Array<object>} */
  let todos = [];
  let loaded = false;

  async function ensureDir() {
    await fs.mkdir(dir, { recursive: true });
  }

  async function load() {
    await ensureDir();
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        todos = parsed.filter(isValidTodo);
      } else {
        todos = [];
      }
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        todos = [];
      } else if (err instanceof SyntaxError) {
        // Corrupt file – start fresh but do NOT clobber the original; the
        // caller may want to inspect/recover it.
        todos = [];
      } else {
        throw err;
      }
    }
    loaded = true;
    return todos.slice();
  }

  async function persist() {
    await ensureDir();
    const tmp = filePath + '.tmp';
    const data = JSON.stringify(todos, null, 2);
    await fs.writeFile(tmp, data, 'utf8');
    await fs.rename(tmp, filePath);
  }

  function assertLoaded() {
    if (!loaded) {
      throw new Error('Store has not been loaded. Call load() first.');
    }
  }

  function all() {
    assertLoaded();
    return todos.slice();
  }

  function get(id) {
    assertLoaded();
    return todos.find((t) => t.id === id) || null;
  }

  async function add({ title, description = '' } = {}) {
    assertLoaded();
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error('Todo title is required');
    }
    const now = nowIso();
    const todo = {
      id: uuid(),
      title: title.trim(),
      description: typeof description === 'string' ? description : '',
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    todos.push(todo);
    await persist();
    return todo;
  }

  async function update(id, patch = {}) {
    assertLoaded();
    const idx = todos.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const current = todos[idx];
    const next = { ...current };
    if (typeof patch.title === 'string') next.title = patch.title.trim();
    if (typeof patch.description === 'string') next.description = patch.description;
    if (typeof patch.completed === 'boolean') next.completed = patch.completed;
    next.updatedAt = nowIso();

    todos[idx] = next;
    await persist();
    return next;
  }

  async function toggle(id) {
    assertLoaded();
    const current = get(id);
    if (!current) return null;
    return update(id, { completed: !current.completed });
  }

  async function remove(id) {
    assertLoaded();
    const idx = todos.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    todos.splice(idx, 1);
    await persist();
    return true;
  }

  function filter(status = 'all') {
    assertLoaded();
    switch (status) {
      case 'active':
        return todos.filter((t) => !t.completed);
      case 'completed':
        return todos.filter((t) => t.completed);
      case 'all':
      default:
        return todos.slice();
    }
  }

  function sort(by = 'createdAt') {
    assertLoaded();
    const copy = todos.slice();
    if (by === 'alpha' || by === 'title') {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      copy.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    }
    return copy;
  }

  return {
    filePath,
    load,
    all,
    get,
    add,
    update,
    toggle,
    remove,
    filter,
    sort,
  };
}

export default createStore;
