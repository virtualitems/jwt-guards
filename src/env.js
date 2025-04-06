import * as dotenv from 'dotenv';

export const { parsed: env = {} } = dotenv.config();

const keys = [
  'NODE_ENV',
  'LISTEN_TO',
  'HASH_SALT_ROUNDS',
  'SQLITE_DB_FILENAME',
  'JWT_SECRET',
  'JWT_EXPIRATION_TIME',
  'JWT_REFRESH_EXPIRATION_TIME',
  'JWT_COOKIE_NAME',
  'JWT_COOKIE_MAX_AGE',
];

for (const key of keys) {
  if (!(key in env)) {
    throw new Error(`${key} is not defined in .env file`);
  }
}
