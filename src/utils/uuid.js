import { randomUUID, randomBytes } from 'node:crypto';

/**
 * Generate a UUID v4 string.
 *
 * Uses Node's built-in `crypto.randomUUID()` when available (Node 14.17+).
 * Falls back to a manual implementation using `randomBytes` for older
 * environments or when `randomUUID` is unavailable for some reason.
 *
 * @returns {string} A RFC 4122 version 4 UUID.
 */
export function uuid() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  const bytes = randomBytes(16);
  // Per RFC 4122 §4.4: set version (4) and variant (10xx) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return (
    hex.substring(0, 8) +
    '-' +
    hex.substring(8, 12) +
    '-' +
    hex.substring(12, 16) +
    '-' +
    hex.substring(16, 20) +
    '-' +
    hex.substring(20, 32)
  );
}

export default uuid;
