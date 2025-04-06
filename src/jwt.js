import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function generateToken(expirationTime, refreshTime, data) {
  const payload = {
    ...data,
    rex: Date.now() + refreshTime * 1000, // refresh expiration
  };

  const options = {
    expiresIn: expirationTime,
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, env.JWT_SECRET, (err, decoded) =>
      err ? reject(err) : resolve(decoded),
    );
  });
}
