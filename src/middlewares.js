import {
  connect,
  createUser,
  deleteUser,
  getAllUsers,
  getUser,
  getUserByEmailWithPassword,
  updateUser,
} from './db.js';
import { env } from './env.js';
import { compareHash, createHash } from './hash.js';
import { generateToken, verifyToken } from './jwt.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function jwtGuard(req, res, next) {
  // 1 check if token exists
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).send('Unauthorized 1');
  }

  // 2. verify token signature
  let payload;
  try {
    payload = await verifyToken(token);
    console.log('JWT:', payload);
  } catch (err) {
    return res.status(401).send('Unauthorized 2');
  }

  // 3. check payload fields
  if (!payload.sub || !payload.ver || !payload.max) {
    return res.status(401).send('Unauthorized 3');
  }

  // 4. check user exists
  const db = await connect(env.SQLITE_DB_FILENAME);
  const user = await getUser(db, { id: payload.sub });
  db.close();

  if (!user) {
    return res.status(401).send('Unauthorized 4');
  }

  // 5. check user jwt version (ver)
  if (user.jwt_version !== payload.ver) {
    return res.status(401).send('Unauthorized 5');
  }

  // remove iat and exp fields from payload
  const { iat, exp, ...data } = payload;

  // attach user data to request object
  req.user = data;

  // refresh token if token can be refreshed
  if (payload.max > Date.now()) {
    const newToken = generateToken(data);

    res.cookie('access_token', newToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: payload.max,
    });
  }

  next();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const db = await connect(env.SQLITE_DB_FILENAME);

  const user = await getUserByEmailWithPassword(
    db,
    email,
    createHash(password),
  );

  if (!user) {
    res.status(401).send('Invalid email or password');
    return;
  }

  if (!compareHash(password, user.password)) {
    res.status(401).send('Invalid email or password');
    return;
  }

  const maxAge = Date.now() + 1000 * 60 * 60; // 1 hour

  const token = generateToken({
    sub: user.id,
    ver: user.jwt_version,
    max: maxAge,
  });

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge,
  });
  res.writeHead(200);
  res.end();
  db.close();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function list(req, res) {
  /** @type import('sqlite3').Database */
  const db = await connect(env.SQLITE_DB_FILENAME);
  const users = await getAllUsers(db);
  res.writeHead(200, {
    'Content-Type': 'application/json',
  });
  res.write(JSON.stringify(users));
  res.end();
  db.close();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function show(req, res) {
  const { id } = req.params;
  const db = await connect(env.SQLITE_DB_FILENAME);
  const user = await getUser(db, { id });

  if (!user) {
    res.status(404).send('User not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'application/json',
  });
  res.write(JSON.stringify(user));
  res.end();
  db.close();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function store(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).send('Missing required fields');
    return;
  }

  const db = await connect(env.SQLITE_DB_FILENAME);

  await createUser(db, name, email, createHash(password));

  res.writeHead(201);
  res.end();
  db.close();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function update(req, res) {
  const { id } = req.params;
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).send('Missing required fields');
    return;
  }

  const db = await connect(env.SQLITE_DB_FILENAME);

  await updateUser(db, id, name, email, createHash(password));

  res.writeHead(200);
  res.end();
  db.close();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function destroy(req, res) {
  const { id } = req.params;
  const db = await connect(env.SQLITE_DB_FILENAME);
  await deleteUser(db, id);
  res.end();
  db.close();
}
