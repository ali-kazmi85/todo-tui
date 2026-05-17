import { uuid } from '../src/utils/uuid.js';

describe('uuid', () => {
  test('returns a string', () => {
    expect(typeof uuid()).toBe('string');
  });

  test('returns a valid v4 UUID format', () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('returns unique values on subsequent calls', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) ids.add(uuid());
    expect(ids.size).toBe(1000);
  });
});
