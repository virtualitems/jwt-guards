import cookieParser from 'cookie-parser';
import Express from 'express';

import { connect, migrate } from './db.js';
import { env } from './env.js';
import {
  destroy,
  jwtGuard,
  list,
  login,
  store,
  update,
} from './middlewares.js';

async function main() {
  const app = Express();

  app.use(Express.json());

  app.use(Express.urlencoded({ extended: true }));

  app.use(cookieParser());

  const PORT = env.LISTEN_TO;

  app.post('/login', login);

  app.get('/', jwtGuard, list);

  app.get('/:id', jwtGuard);

  app.post('/', store);

  app.put('/:id', jwtGuard, update);

  app.delete('/:id', jwtGuard, destroy);

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
