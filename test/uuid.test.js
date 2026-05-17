import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uuidv4 } from '../src/utils/uuid.js';

test('uuidv4 returns a string', () => {
  const id = uuidv4();
  assert.equal(typeof id, 'string');
});

test('uuidv4 returns a valid v4 UUID format', () => {
  const id = uuidv4();
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(id, re);
});

test('uuidv4 produces unique values', () => {
  const set = new Set();
  for (let i = 0; i < 1000; i += 1) {
    set.add(uuidv4());
  }
  assert.equal(set.size, 1000);
});
