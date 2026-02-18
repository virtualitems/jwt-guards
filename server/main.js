import cookieParser from 'cookie-parser'
import Express from 'express'

import { env } from './shared/env.js'
import { login, index, admin, logout } from './users/api.js'
import { jwtGuard, permissionsGuard } from './users/middlewares.js'

const server = Express()

server.use(Express.json())
server.use(Express.urlencoded({ extended: true }))
server.use(cookieParser())

server.post('/login', login)

server.get('/', jwtGuard, permissionsGuard([1]), index)

server.get('/admin', jwtGuard, permissionsGuard([2]), admin)

server.get('/logout', logout)

server.listen(env.LISTEN_TO, () =>
  console.log(`http://localhost:${env.LISTEN_TO}`)
)
