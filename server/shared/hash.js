import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs'

import { env } from './env.js'

/**
 * @param {string} str
 * @returns {Promise<string>}
 */
export async function createHash(str) {
  return bcryptHash(str, Number(env.PASSWORD_HASH_SALT_ROUNDS))
}

/**
 * @param {string} str
 * @param {string} hashed
 * @returns {Promise<boolean>}
 */
export async function compareHash(str, hashed) {
  return bcryptCompare(str, hashed)
}
