import sqlite3 from 'sqlite3'

export class SqliteDatabase {
  constructor(filename) {
    this.filename = filename
  }

  /**
   * @param {string} filename
   * @returns {Promise<sqlite3.Database>}
   */
  async connect(filename) {
    return await new Promise((res, rej) => {
      const db = new sqlite3.Database(filename, (err) => {
        if (err) rej(err)
        else res(db)
      })
    })
  }

  /**
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<void>}
   */
  async run(sql, params = null) {
    const db = await this.connect(this.filename)
    return await new Promise((res, rej) => {
      if (params) {
        db.run(sql, params, (err) => (err ? rej(err) : res()))
      } else {
        db.run(sql, (err) => (err ? rej(err) : res()))
      }
    })
  }

  /**
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<Object>}
   */
  async get(sql, params = null) {
    const db = await this.connect(this.filename)
    return await new Promise((res, rej) => {
      if (params) {
        db.get(sql, params, (err, row) => (err ? rej(err) : res(row)))
      } else {
        db.get(sql, (err, row) => (err ? rej(err) : res(row)))
      }
    })
  }

  /**
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<Array>}
   */
  async all(sql, params = null) {
    const db = await this.connect(this.filename)
    return await new Promise((res, rej) => {
      if (params) {
        db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows)))
      } else {
        db.all(sql, (err, rows) => (err ? rej(err) : res(rows)))
      }
    })
  }
}
