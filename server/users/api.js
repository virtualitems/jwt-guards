import { SqliteDatabase } from '../shared/sqlite.js'
import { env } from '../shared/env.js'
import { compareHash } from '../shared/hash.js'
import { JsonWebToken } from './jwt.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function login(req, res) {
  if (req.body === undefined) {
    res.status(400).send('Invalid request body')
    return
  }

  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).send('Username and password are required')
    return
  }

  const db = new SqliteDatabase(env.SQLITE_DB_FILENAME)

  let user = null

  try {
    user = await db.get('SELECT * FROM users WHERE username = ?', [username])
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).send('Internal server error')
    return
  }

  if (user === null) {
    res.status(401).send('Invalid username or password')
    return
  }

  const passwordMatch = await compareHash(password, user.password)

  if (passwordMatch === false) {
    res.status(401).send('Invalid username or password')
    return
  }

  let permissions = []

  try {
    const permissionsRows = await db.all(
      'SELECT permission_id FROM user_permissions WHERE user_id = ?',
      [user.id]
    )
    permissions = permissionsRows.map((row) => row.permission_id)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
    return
  }

  const payload = {
    sub: user.id,
    ver: user.jwt_version,
    per: permissions
  }

  const accessToken = new JsonWebToken(
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRATION_TIME
  )

  const refreshToken = new JsonWebToken(
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRATION_TIME
  )

  const accessTokenStr = accessToken.generate(payload)
  const refreshTokenStr = refreshToken.generate(payload)

  res.cookie(env.JWT_ACCESS_COOKIE_NAME, accessTokenStr, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: Number(env.JWT_ACCESS_COOKIE_MAX_AGE) * 1000
  })

  res.cookie(env.JWT_REFRESH_COOKIE_NAME, refreshTokenStr, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: Number(env.JWT_REFRESH_COOKIE_MAX_AGE) * 1000
  })

  res.status(204).send()
}

export async function index(req, res) {
  res.send('Hello, authenticated user!')
}

export async function admin(req, res) {
  res.send('Hello, admin user!')
}

export async function logout(req, res) {
  res.clearCookie(env.JWT_ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  res.clearCookie(env.JWT_REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  res.status(204).send()
}
