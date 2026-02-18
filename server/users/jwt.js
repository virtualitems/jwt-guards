import jwt from 'jsonwebtoken'

export const TokenExpiredError = jwt.TokenExpiredError

export const JsonWebTokenError = jwt.JsonWebTokenError

export const NotBeforeError = jwt.NotBeforeError

export class JsonWebToken {
  /**
   * @param {string} secret - JWT secret key
   * @param {number} expiresIn - Expiration time in seconds
   */
  constructor(secret, expiresIn) {
    this.secret = secret

    const expiresInNum = Number(expiresIn)

    if (isNaN(expiresInNum) || expiresInNum <= 0) {
      throw new Error(`expiresIn must be a positive number, got: ${expiresIn}`)
    }

    this.expiresIn = expiresInNum
  }

  /**
   * Generate a JWT token
   * @param {Object} payload - Token payload
   * @returns {string} JWT token
   */
  generate(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn
    })
  }

  /**
   * Verify a JWT token
   * @param {string} token - Token to verify
   * @returns {Promise<Object>} Decoded token payload
   */
  verify(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secret, (err, decoded) => {
        if (err) reject(err)
        else resolve(decoded)
      })
    })
  }
}
