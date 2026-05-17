import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { uuidv4 } from '../utils/uuid.js';

const DEFAULT_DIR = path.join(os.homedir(), '.todo-app');
const DEFAULT_FILE = path.join(DEFAULT_DIR, 'todos.json');

/**
 * Create a TodoStore instance.
 *
 * The store handles CRUD operations and persistence to a JSON file on disk.
 * All write operations are serialized through an internal promise queue so
 * that concurrent calls cannot corrupt the data file.
 *
 * @param {object} [options]
 * @param {string} [options.filePath] - Override the data file location.
 */
export function createTodoStore(options = {}) {
  const filePath = options.filePath || DEFAULT_FILE;
  const dirPath = path.dirname(filePath);

  /** @type {Array<object>} */
  let todos = [];
  let loaded = false;
  /** @type {Promise<unknown>} */
  let writeChain = Promise.resolve();

  async function ensureDir() {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async function load() {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        todos = parsed;
      } else if (parsed && Array.isArray(parsed.todos)) {
        todos = parsed.todos;
      } else {
        todos = [];
      }
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        todos = [];
      } else if (err instanceof SyntaxError) {
        // Corrupt file – start fresh rather than throw.
        todos = [];
      } else {
        throw err;
      }
    }
    loaded = true;
    return todos.slice();
  }

  function assertLoaded() {
    if (!loaded) {
      throw new Error('TodoStore not loaded. Call load() first.');
    }
  }

  async function persistNow() {
    await ensureDir();
    const tmp = filePath + '.tmp';
    const data = JSON.stringify(todos, null, 2);
    await fs.writeFile(tmp, data, 'utf8');
    await fs.rename(tmp, filePath);
  }

  function persist() {
    // Serialize writes so concurrent callers can't trample on each other.
    writeChain = writeChain.then(persistNow, persistNow);
    return writeChain;
  }

  function getAll() {
    assertLoaded();
    return todos.slice();
  }

  function getById(id) {
    assertLoaded();
    return todos.find((t) => t.id === id) || null;
  }

  async function add({ title, description = '' } = {}) {
    assertLoaded();
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Todo title is required');
    }
    const now = new Date().toISOString();
    const todo = {
      id: uuidv4(),
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
    if (typeof patch.title === 'string' && patch.title.trim()) {
      next.title = patch.title.trim();
    }
    if (typeof patch.description === 'string') {
      next.description = patch.description;
    }
    if (typeof patch.completed === 'boolean') {
      next.completed = patch.completed;
    }
    next.updatedAt = new Date().toISOString();
    todos[idx] = next;
    await persist();
    return next;
  }

  async function toggle(id) {
    const t = getById(id);
    if (!t) return null;
    return update(id, { completed: !t.completed });
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
    get filePath() {
      return filePath;
    },
    load,
    getAll,
    getById,
    add,
    update,
    toggle,
    remove,
    filter,
    sort,
    // Test helper: flush any pending writes.
    flush: () => writeChain,
  };
}

export default createTodoStore;
