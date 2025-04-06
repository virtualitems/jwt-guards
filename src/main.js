import Express from 'express';
import { env } from './env.js';
import {
  connect,
  createUser,
  deleteUser,
  getAllUsers,
  getUser,
  getUserByEmailWithPassword,
  migrate,
  updateUser,
} from './db.js';
import { generateToken, verifyToken } from './jwt.js';
import { createHash, compareHash } from './hash.js';
import cookieParser from 'cookie-parser';

async function protectedRoute(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    req.user = await verifyToken(token, env.JWT_SECRET);
    console.log('JWT:', req.user);
    next();
  } catch (err) {
    return res.status(401).send('Unauthorized');
  }
}

async function main() {
  const app = Express();

  app.use(Express.json());

  app.use(Express.urlencoded({ extended: true }));

  app.use(cookieParser());

  const PORT = env.LISTEN_TO;

  app.post('/login', async (req, res) => {
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

    const token = generateToken({ id: user.id });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 1000 * 60 * 60, // 1 hour
    });
    res.writeHead(200);
    res.end();
    db.close();
  });

  app.get('/', protectedRoute, async (req, res) => {
    /** @type import('sqlite3').Database */
    const db = await connect(env.SQLITE_DB_FILENAME);
    const users = await getAllUsers(db);
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    res.write(JSON.stringify(users));
    res.end();
    db.close();
  });

  app.get('/:id', protectedRoute, async (req, res) => {
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
  });

  app.post('/', async (req, res) => {
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
  });

  app.put('/:id', protectedRoute, async (req, res) => {
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
  });

  app.delete('/:id', protectedRoute, async (req, res) => {
    const { id } = req.params;
    const db = await connect(env.SQLITE_DB_FILENAME);
    await deleteUser(db, id);
    res.end();
    db.close();
  });

  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

connect(env.SQLITE_DB_FILENAME).then((db) => {
  migrate(db)
    .then(() => {
      db.close();
    })
    .then(() => {
      main().catch(console.error);
    });
});
