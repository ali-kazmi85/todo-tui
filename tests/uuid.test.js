import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uuid } from '../src/utils/uuid.js';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('uuid() returns a v4 UUID string', () => {
  const id = uuid();
  assert.equal(typeof id, 'string');
  assert.match(id, UUID_V4_RE);
});

test('uuid() returns unique values across many calls', () => {
  const ids = new Set();
  for (let i = 0; i < 1000; i++) {
    ids.add(uuid());
  }
  assert.equal(ids.size, 1000);
});
