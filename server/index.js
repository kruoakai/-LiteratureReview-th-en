import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import { config, sessionSecret } from './config.js'
import { FileSessionStore } from './sessionStore.js'
import { loadUsers, bootstrapAdmin, seedTestUsers } from './users.js'
import { requireAuth, requirePermission, sameOrigin, apiLimiter } from './middleware.js'
import { recordEvent } from './audit.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import { getAppData } from './appData.js'
import { loadPdfIndex, getPdfPath } from './papers.js'
import { DATA_DIR, loadConfig, loadData } from './data.js'
import { COLLECTION_NAMES, saveCollection, migrateCustomPapers } from './dataStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { count, migrated: migratedUsers } = loadUsers()
if (migratedUsers) console.log(`Moved ${migratedUsers} users from ${config.legacyAuthEnvPath} into ${config.usersPath}; each must set up 2FA at next sign-in`)
const admin = await bootstrapAdmin()
if (admin) console.log(`Created first admin account: ${admin}`)
else console.log(`Loaded ${count} users`)
const testUsers = await seedTestUsers()
if (testUsers.length) console.warn(`Development mode: created test accounts ${testUsers.join(', ')}. They are never created when NODE_ENV=production.`)
loadData() // fail fast on malformed JSON instead of on the first request
console.log(`Loaded corpus data from ${DATA_DIR}`)
const migratedPapers = migrateCustomPapers()
if (migratedPapers) console.log(`Moved ${migratedPapers} papers from the old custom-papers store into papers.json`)
console.log(`Indexed ${loadPdfIndex()} paper PDFs`)

const sessionStore = new FileSessionStore(path.join(config.stateDir, 'sessions.json'))
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    sessionStore.flush()
    process.exit(0)
  })
}

const app = express()
app.set('trust proxy', config.trustProxy)
app.disable('x-powered-by')

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // write-excel-file zips the workbook in a Web Worker started from a blob: URL
        'worker-src': ["'self'", 'blob:'],
        // Only upgrade requests when the app is actually served over HTTPS; on plain-HTTP LAN
        // installs this directive would make the browser fetch every asset over https and fail.
        'upgrade-insecure-requests': config.cookieSecure ? [] : null,
      },
    },
    strictTransportSecurity: config.cookieSecure,
  })
)
app.use(apiLimiter)
app.use(express.json({ limit: '5mb' }))
app.use('/api', sameOrigin)

app.use(
  session({
    name: 'lrt.sid',
    store: sessionStore,
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: config.sessionHours * 60 * 60 * 1000,
    },
  })
)

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Branding only (title/icon), public so the sign-in screen can show it.
app.get('/api/config', (req, res) => {
  const { title, subtitle, icon } = loadConfig()
  res.json({ title, subtitle, icon })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/app-data', requireAuth(), requirePermission('corpus:read'), (req, res) => {
  res.json(getAppData())
})

app.get('/api/papers/:id/pdf', requireAuth(), requirePermission('corpus:read'), (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid paper id' })
  const pdfPath = getPdfPath(req.params.id)
  if (!pdfPath) return res.status(404).json({ error: 'No PDF for this paper' })
  res.download(pdfPath)
})

// "Manage Data" tab: replaces one whole JSON file in DATA_DIR after validating it.
app.put('/api/data/:name', requireAuth(), requirePermission('corpus:write'), (req, res) => {
  if (!COLLECTION_NAMES.includes(req.params.name)) return res.status(404).json({ error: 'Unknown collection' })
  try {
    const saved = saveCollection(req.params.name, req.body)
    recordEvent(req, 'data_saved', { collection: req.params.name })
    res.json(saved)
  } catch (e) {
    if (['EROFS', 'EACCES', 'EPERM'].includes(e.code)) {
      return res.status(500).json({ error: `Cannot write to ${DATA_DIR}. Make sure the data folder is writable (not mounted read-only).` })
    }
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// Errors thrown by routes (validation errors carry a .status); anything else is a 500 without details.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))
// SPA fallback (Express 5 path syntax: a named wildcard instead of a bare '*')
app.get('/{*path}', (req, res) => res.sendFile(path.join(distPath, 'index.html')))

app.listen(config.port, () => {
  console.log(`literature-review-tracker listening on port ${config.port}`)
})
