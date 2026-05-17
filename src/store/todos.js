import { promises as fs } from 'node:fs';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { uuid } from '../utils/uuid.js';

export const DEFAULT_FILE_PATH = path.join(
  os.homedir(),
  '.todo-app',
  'todos.json',
);

/**
 * Create a todo store backed by a JSON file.
 *
 * Returned API:
 *   list()                -> Todo[]
 *   filter(status)        -> Todo[]   (status: 'all' | 'active' | 'completed')
 *   get(id)               -> Todo | undefined
 *   add({title, description}) -> Todo
 *   toggle(id)            -> Todo
 *   remove(id)            -> void
 *   save()                -> Promise<void>
 *   reload()              -> Promise<void>
 *   filePath              -> string
 *
 * @param {object} [opts]
 * @param {string} [opts.filePath]
 */
export async function createStore({ filePath = DEFAULT_FILE_PATH } = {}) {
  let todos = [];

  async function ensureDir() {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  function ensureDirSync() {
    mkdirSync(path.dirname(filePath), { recursive: true });
  }

  async function load() {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      todos = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        todos = [];
        return;
      }
      // Corrupt or unreadable JSON — start fresh rather than crash so we
      // don't lose the ability to use the app. The next save will overwrite.
      todos = [];
    }
  }

  async function save() {
    await ensureDir();
    const tmp = `${filePath}.tmp`;
    const data = JSON.stringify(todos, null, 2);
    // Write to tmp then rename for atomicity so a crash mid-write doesn't
    // corrupt the data file.
    await fs.writeFile(tmp, data, 'utf8');
    await fs.rename(tmp, filePath);
  }

  // Synchronous persistence so mutations are durable before the call returns.
  // We use a tmp-file + rename for atomicity to guard against corruption on
  // crash/SIGINT, satisfying the "graceful exit without corrupting the data
  // file" acceptance criterion.
  function persist() {
    ensureDirSync();
    const tmp = `${filePath}.tmp`;
    const data = JSON.stringify(todos, null, 2);
    writeFileSync(tmp, data, 'utf8');
    renameSync(tmp, filePath);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function list() {
    return todos.slice();
  }

  function filter(status = 'all') {
    if (status === 'active') return todos.filter((t) => !t.completed);
    if (status === 'completed') return todos.filter((t) => t.completed);
    return list();
  }

  function get(id) {
    return todos.find((t) => t.id === id);
  }

  function add({ title, description } = {}) {
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error('title is required');
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
    persist();
    return todo;
  }

  function toggle(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) throw new Error(`todo not found: ${id}`);
    todo.completed = !todo.completed;
    todo.updatedAt = nowIso();
    persist();
    return todo;
  }

  function remove(id) {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`todo not found: ${id}`);
    todos.splice(idx, 1);
    persist();
  }

  async function reload() {
    await load();
  }

  await load();

  return {
    get filePath() {
      return filePath;
    },
    list,
    filter,
    get,
    add,
    toggle,
    remove,
    save,
    reload,
  };
}

export default createStore;
