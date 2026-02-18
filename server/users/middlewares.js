import { SqliteDatabase } from '../shared/sqlite.js'
import { env } from '../shared/env.js'
import { JsonWebToken } from './jwt.js'

/**
 * Middleware para validar JWT en solicitudes protegidas
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function jwtGuard(req, res, next) {
  try {
    const token = req.cookies[env.JWT_ACCESS_COOKIE_NAME] ?? null

    if (token === null) {
      return res.status(401).end()
    }

    let accessPayload

    try {
      accessPayload = await verifyAccessToken(token)
    } catch (err) {
      return await jwtRefreshGuard(req, res, next)
    }

    if (accessPayload.sub === undefined || accessPayload.ver === undefined) {
      return res.status(401).end()
    }

    let user

    try {
      user = await getUser(accessPayload.sub)
    } catch (err) {
      console.error(err)
      return res.status(500).end()
    }

    if (user === null || user.jwt_version !== accessPayload.ver) {
      clearAuthCookies(res)
      return res.status(401).end()
    }

    req.user = {
      sub: accessPayload.sub,
      ver: accessPayload.ver,
      per: accessPayload.per
    }

    next()
  } catch (err) {
    console.error(err)
    return res.status(500).end()
  }
}

/**
 * Verifica la firma y expiración del access token
 * @param {string} token
 * @returns {Promise<Object>}
 * @throws {Error}
 */
async function verifyAccessToken(token) {
  const verifier = new JsonWebToken(
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRATION_TIME
  )
  return await verifier.verify(token)
}

/**
 * Verifica la firma y expiración del refresh token
 * @param {string} token
 * @returns {Promise<Object>}
 * @throws {Error}
 */
async function verifyRefreshToken(token) {
  const verifier = new JsonWebToken(
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRATION_TIME
  )
  return await verifier.verify(token)
}

/**
 * Obtiene un usuario de la base de datos
 * @param {number} userId
 * @returns {Promise<Object|null>}
 * @throws {Error}
 */
async function getUser(userId) {
  const db = new SqliteDatabase(env.SQLITE_DB_FILENAME)
  return await db.get('SELECT * FROM users WHERE id = ?', [userId])
}

/**
 * Genera un nuevo access token
 * @param {Object} payload
 * @returns {string}
 */
function generateAccessToken(payload) {
  const generator = new JsonWebToken(
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRATION_TIME
  )
  return generator.generate(payload)
}

/**
 * Establece el access token en la cookie
 * @param {import('express').Response} res
 * @param {string} token
 */
function setAccessTokenCookie(res, token) {
  res.cookie(env.JWT_ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: Number(env.JWT_ACCESS_COOKIE_MAX_AGE) * 1000
  })
}

/**
 * Limpia ambas cookies de autenticación
 * @param {import('express').Response} res
 */
function clearAuthCookies(res) {
  res.clearCookie(env.JWT_ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict'
  })
  res.clearCookie(env.JWT_REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict'
  })
}

/**
 * Maneja el flujo de refresco de tokens cuando el access token ha expirado
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
async function jwtRefreshGuard(req, res, next) {
  const refreshToken = req.cookies[env.JWT_REFRESH_COOKIE_NAME] || null

  if (refreshToken === null) {
    clearAuthCookies(res)
    return res.status(401).end()
  }

  let refreshPayload
  try {
    refreshPayload = await verifyRefreshToken(refreshToken)
  } catch (err) {
    clearAuthCookies(res)
    return res.status(401).end()
  }

  if (refreshPayload.sub === undefined || refreshPayload.ver === undefined) {
    clearAuthCookies(res)
    return res.status(401).end()
  }

  let user
  try {
    user = await getUser(refreshPayload.sub)
  } catch (err) {
    console.error(err)
    return res.status(500).end()
  }

  if (user === null || user.jwt_version !== refreshPayload.ver) {
    clearAuthCookies(res)
    return res.status(401).end()
  }

  const newAccessToken = generateAccessToken({
    sub: refreshPayload.sub,
    ver: refreshPayload.ver,
    per: refreshPayload.per
  })

  setAccessTokenCookie(res, newAccessToken)
  req.user = {
    sub: refreshPayload.sub,
    ver: refreshPayload.ver,
    per: refreshPayload.per
  }
  next()
}
