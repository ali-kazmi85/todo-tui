import { randomUUID } from 'node:crypto';

/**
 * Generate a v4 UUID using Node's built-in crypto.randomUUID.
 * @returns {string}
 */
export function uuid() {
  return randomUUID();
}

export default uuid;
