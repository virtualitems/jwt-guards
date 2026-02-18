import { SqliteDatabase } from '../server/shared/sqlite.js'
import { env } from '../server/shared/env.js'
import { createHash } from '../server/shared/hash.js'

/**
 * @param {SqliteDatabase} db
 * @returns {Promise<void>}
 */
export async function migrate(db) {
  await db.run('DROP TABLE IF EXISTS users')
  await db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    jwt_version INTEGER DEFAULT 1
  )`)
}

/**
 * @param {SqliteDatabase} db
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<void>}
 */
export async function seed(db, username, email, password) {
  const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`
  await db.run(sql, [username, email, password])
}

async function run() {
  const db = new SqliteDatabase(env.SQLITE_DB_FILENAME)

  try {
    await migrate(db)

    const username = 'username'
    const email = 'user@example.com'
    const password = await createHash('password')

    await seed(db, username, email, password)

    console.log('Migration and seeding completed successfully.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
