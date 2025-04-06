import sqlite3 from 'sqlite3';

export function connect(filename) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filename, (err) => {
      if (err) {
        reject(err);
      } else {
        db.on('trace', (sql) => {
          console.log(`SQL: ${sql}`);
        });
        resolve(db);
      }
    });
  });
}

/**
 * @param {sqlite3.Database} db
 * @returns {Promise<void>}
 */
export function migrate(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`DROP TABLE IF EXISTS users`, (err) => err && reject(err));
      db.run(
        `CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT NOT NULL,
          jwt_version INTEGER DEFAULT CURRENT_TIMESTAMP,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT DEFAULT NULL
        )`,
        (err) => err && reject(err),
      );
    });

    resolve();
  });
}

/**
 * Creates a new user in the database.
 *
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @param {string} name - The name of the user.
 * @param {string} email - The email address of the user.
 * @param {number} password - The age of the user.
 * @returns {Promise<void>}
 */
export function createUser(db, name, email, password) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
    db.run(query, [name, email, password], (err) => err && reject(err));
    resolve();
  });
}

/**
 * Updates a user in the database.
 *
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @param {number} id - The ID of the user to update.
 * @param {string} name - The new name of the user.
 * @param {string} email - The new email address of the user.
 * @param {string} password - The new password of the user.
 * @returns {Promise<void>}
 */
export function updateUser(db, id, name, email, password) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?`;
    db.run(query, [name, email, password, id], (err) => err && reject(err));
    resolve();
  });
}

/**
 * Deletes a user from the database.
 *
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @param {number} id - The ID of the user to delete.
 * @returns {Promise<void>}
 */
export function deleteUser(db, id) {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM users WHERE id = ?`;
    db.run(query, [id], (err) => err && reject(err));
    resolve();
  });
}

/**
 * Retrieves all users from the database.
 *
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @returns {Promise<Array>} - A promise that resolves to an array of users.
 */
export function getAllUsers(db) {
  return new Promise((resolve, reject) => {
    const query = `SELECT name, email FROM users`;
    db.all(query, [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

/**
 * Retrieves a user by ID from the database.
 *
 * @param {number} id - The ID of the user to retrieve.
 * @returns {Promise<Object>} - A promise that resolves to the user object.
 */
export function getUser(db, { id, email } = {}) {
  return new Promise((resolve, reject) => {
    if (id) {
      const query = `SELECT id, email FROM users WHERE id = ?`;
      db.get(query, [id], (err, row) => (err ? reject(err) : resolve(row)));
    } else if (email) {
      const query = `SELECT id, email FROM users WHERE email = ?`;
      db.get(query, [email], (err, row) => (err ? reject(err) : resolve(row)));
    } else {
      reject(new Error('Either id or email must be provided'));
    }
  });
}

/**
 * Retrieves a user by email from the database.
 *
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @param {string} email - The email of the user to retrieve.
 * @returns {Promise<Object>} - A promise that resolves to the user object.
 */
export function getUserByEmailWithPassword(db, email) {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, email, password, jwt_version FROM users WHERE email = ?`;
    db.get(query, [email], (err, row) =>
      err ? reject(err) : resolve(row),
    );
  });
}
