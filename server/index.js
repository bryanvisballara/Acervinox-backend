import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDb } from './db.js'
import { seedAdmin, seedWorkshop } from './seed.js'
import { authRouter } from './routes/auth.js'
import { leadsRouter } from './routes/leads.js'
import { clientsRouter } from './routes/clients.js'
import { productsRouter } from './routes/products.js'
import { maintenancesRouter } from './routes/maintenances.js'
import { dashboardRouter } from './routes/dashboard.js'
import { quotesRouter } from './routes/quotes.js'
import { portalRouter } from './routes/portal.js'
import { visitsRouter } from './routes/visits.js'
import { paymentsRouter } from './routes/payments.js'
import { accountingRouter } from './routes/accounting.js'
import { pushRouter } from './routes/push.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '12mb' }))

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
app.use('/api/clients', clientsRouter)
app.use('/api/products', productsRouter)
app.use('/api/maintenances', maintenancesRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/quotes', quotesRouter)
app.use('/api/portal', portalRouter)
app.use('/api/visits', visitsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/accounting', accountingRouter)
app.use('/api/push', pushRouter)

const dist = path.join(__dirname, '..', 'dist')
const publicDir = path.join(__dirname, '..', 'public')
app.use(express.static(publicDir))
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
  await seedWorkshop()
  app.listen(PORT, () => {
    console.log(`acervinox listo en puerto ${PORT}`)
  })
} catch (err) {
  console.error('No se pudo arrancar el servidor', err)
  process.exit(1)
}
