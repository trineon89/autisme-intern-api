import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password, pepper = '') {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = await scrypt(`${password}${pepper}`, salt, KEY_LENGTH);
  return `scrypt:v1:${salt}:${Buffer.from(hash).toString('base64url')}`;
}

export async function verifyPassword(password, stored, pepper = '') {
  if (!stored || !stored.startsWith('scrypt:v1:')) return false;
  const [, , salt, encoded] = stored.split(':');
  const expected = Buffer.from(encoded, 'base64url');
  const actual = await scrypt(`${password}${pepper}`, salt, KEY_LENGTH);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
