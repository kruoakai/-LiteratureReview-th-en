import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// All environment-driven settings in one place, validated at startup so a misconfigured deployment
// fails immediately with a clear message instead of on the first login.

function fail(message) {
  console.error(`Configuration error: ${message}`)
  process.exit(1)
}

function intEnv(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) fail(`${name} must be a positive whole number`)
  return n
}

// TOTP secrets are encrypted at rest with this key, so it must come from the environment and never
// have a default: a default committed to the repo would let anyone decrypt every stored secret.
const TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || ''
if (!/^[0-9a-fA-F]{64}$/.test(TOTP_ENCRYPTION_KEY)) {
  fail(
    'TOTP_ENCRYPTION_KEY must be set to 64 hex characters (32 bytes). Generate one with ' +
      '`bash scripts/generate-secrets.sh` or `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`'
  )
}

// "false" by default: only trust X-Forwarded-For when a real reverse proxy sits in front of the app.
// Trusting it without one lets any client spoof req.ip and dodge the IP rate limits / forge audit IPs.
function parseTrustProxy(raw) {
  if (!raw || raw === 'false') return false
  if (raw === 'true') return true
  if (/^\d+$/.test(raw)) return Number(raw)
  return raw // IP / subnet list, passed straight to Express
}

const STATE_DIR = path.resolve(process.env.STATE_DIR || path.join(process.cwd(), 'state'))
fs.mkdirSync(STATE_DIR, { recursive: true })

export const config = {
  port: Number(process.env.PORT || 4000),
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  stateDir: STATE_DIR,
  usersPath: process.env.USERS_PATH || path.join(STATE_DIR, 'users.json'),
  auditLogPath: process.env.AUDIT_LOG_PATH || path.join(STATE_DIR, 'audit.log'),
  // Older versions kept users + session secret as KEY=value lines here; read once for migration.
  legacyAuthEnvPath: process.env.AUTH_ENV_PATH || path.join(process.cwd(), '.env'),
  totpEncryptionKey: Buffer.from(TOTP_ENCRYPTION_KEY, 'hex'),
  twofaIssuer: process.env.TWOFA_ISSUER || 'Literature Review Tracker',
  loginMaxAttempts: intEnv('LOGIN_MAX_ATTEMPTS', 5),
  loginLockMinutes: intEnv('LOGIN_LOCK_MINUTES', 15),
  rateLimitLogin: intEnv('RATE_LIMIT_LOGIN', 20), // per IP per 15 minutes
  rateLimit2fa: intEnv('RATE_LIMIT_2FA', 10), // per IP per 5 minutes
  rateLimitApi: intEnv('RATE_LIMIT_API', 600), // per IP per minute, all requests
  preAuthMinutes: 5,
  sessionHours: 12,
}

// Session secret: SESSION_SECRET if set, otherwise generated once and kept in the state folder.
export function sessionSecret() {
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32) fail('SESSION_SECRET must be at least 32 characters')
    return process.env.SESSION_SECRET
  }
  const file = path.join(STATE_DIR, 'session.secret')
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim()
  const secret = crypto.randomBytes(32).toString('hex')
  fs.writeFileSync(file, secret + '\n', { mode: 0o600 })
  return secret
}
