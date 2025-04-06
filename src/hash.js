import { hashSync, compareSync } from 'bcryptjs';
import { env } from './env.js';

/**
 * @param {string} str
 * @returns {string}
 */
export function createHash(str) {
  return hashSync(str, Number(env.HASH_SALT_ROUNDS));
}

/**
 * @param {string} str
 * @returns {boolean}
 */
export function compareHash(str, hash) {
  return compareSync(str, hash);
}
