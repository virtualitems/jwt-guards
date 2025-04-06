import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, env.JWT_SECRET, (err, decoded) =>
      err ? reject(err) : resolve(decoded),
    );
  });
}
