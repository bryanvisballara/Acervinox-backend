import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDb } from './db.js'
import { seedAdmin } from './seed.js'
import { authRouter } from './routes/auth.js'
import { leadsRouter } from './routes/leads.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'acervinox',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/leads', leadsRouter)

const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) next(err)
  })
})

try {
  await connectDb()
  await seedAdmin()
  app.listen(PORT, () => {
    console.log(`acervinox listo en puerto ${PORT}`)
  })
} catch (err) {
  console.error('No se pudo arrancar el servidor', err)
  process.exit(1)
}
