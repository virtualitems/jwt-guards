import * as dotenv from 'dotenv'

const dotenvOptions = { path: '.env', override: true, quiet: true }

export const { parsed: env = {} } = dotenv.config(dotenvOptions)

const keys = [
  'NODE_ENV',
  'LISTEN_TO',
  'PASSWORD_HASH_SALT_ROUNDS',
  'SQLITE_DB_FILENAME',
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRATION_TIME',
  'JWT_ACCESS_COOKIE_NAME',
  'JWT_ACCESS_COOKIE_MAX_AGE',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRATION_TIME',
  'JWT_REFRESH_COOKIE_NAME',
  'JWT_REFRESH_COOKIE_MAX_AGE'
]

for (const key of keys) {
  if (!(key in env)) {
    throw new Error(`${key} is not defined in .env file`)
  }
}
