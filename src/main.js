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

async function main(port) {
  const app = Express();

  app.use(Express.json());

  app.use(Express.urlencoded({ extended: true }));

  app.use(cookieParser());

  app.post('/login', login);

  app.get('/', jwtGuard, list);

  app.get('/:id', jwtGuard);

  app.post('/', store);

  app.put('/:id', jwtGuard, update);

  app.delete('/:id', jwtGuard, destroy);

  app.listen(port, () => console.log(`http://localhost:${port}`));
}

connect(env.SQLITE_DB_FILENAME).then((db) => {
  migrate(db)
    .then(() => {
      db.close();
    })
    .then(() => {
      main(env.LISTEN_TO).catch(console.error);
    });
});
