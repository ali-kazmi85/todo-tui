import { randomUUID, randomBytes } from 'node:crypto';

/**
 * Generate a UUID v4 string.
 * Uses Node's built-in crypto.randomUUID when available, otherwise
 * falls back to a hand-rolled v4 implementation backed by randomBytes.
 *
 * @returns {string} UUID v4 (lower-case, hyphenated).
 */
export function uuidv4() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  const bytes = randomBytes(16);
  // Per RFC 4122 §4.4 set the version and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex = bytes.toString('hex');
  return (
    hex.substring(0, 8) + '-' +
    hex.substring(8, 12) + '-' +
    hex.substring(12, 16) + '-' +
    hex.substring(16, 20) + '-' +
    hex.substring(20, 32)
  );
}

export default uuidv4;
