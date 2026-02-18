import { SqliteDatabase } from '../server/shared/sqlite.js'
import { env } from '../server/shared/env.js'
import { createHash } from '../server/shared/hash.js'

/**
 * @param {SqliteDatabase} db
 * @returns {Promise<void>}
 */
export async function migrate(db) {
  await db.run('DROP TABLE IF EXISTS user_permissions')
  await db.run('DROP TABLE IF EXISTS users')

  await db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    jwt_version INTEGER DEFAULT 1
  )`)

  await db.run(`CREATE TABLE user_permissions (
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`)
}

/**
 * @param {SqliteDatabase} db
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @param {number[]} permissions
 * @returns {Promise<void>}
 */
export async function seed(db, username, email, password, permissions = []) {
  const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`
  await db.run(sql, [username, email, password])

  const user = await db.get('SELECT id FROM users WHERE username = ?', [username])

  for (const permissionId of permissions) {
    await db.run(
      'INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)',
      [user.id, permissionId]
    )
  }
}

async function run() {
  const db = new SqliteDatabase(env.SQLITE_DB_FILENAME)

  try {
    await migrate(db)

    const username = 'username'
    const email = 'user@example.com'
    const password = await createHash('password')
    await seed(db, username, email, password, [1, 2])

    const basicUser = 'basicuser'
    const basicEmail = 'basic@example.com'
    const basicPassword = await createHash('basicpass')
    await seed(db, basicUser, basicEmail, basicPassword, [1])

    const adminUser = 'adminuser'
    const adminEmail = 'admin@example.com'
    const adminPassword = await createHash('adminpass')
    await seed(db, adminUser, adminEmail, adminPassword, [2])

    console.log('Migration and seeding completed successfully.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
