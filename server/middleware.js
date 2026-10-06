import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { findById } from './users.js'
import { roleHasPermission } from './permissions.js'

// A session goes through two states:
//   req.session.preAuth = { userId, stage: 'setup'|'verify', expiresAt }  password OK, 2FA still pending
//   req.session.auth    = { userId, sessionVersion }                      password + 2FA done
// Only `auth` opens the API. There is no route that sets it from a password alone.

export function requirePreAuth(stage) {
  return (req, res, next) => {
    const pre = req.session.preAuth
    if (pre && Date.now() > pre.expiresAt) delete req.session.preAuth
    if (!req.session.preAuth || pre.stage !== stage) {
      return res.status(401).json({ error: 'Your sign-in step expired. Please sign in again.' })
    }
    const user = findById(pre.userId)
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'Please sign in again.' })
    req.preAuthUser = user
    next()
  }
}

// The user is re-read on every request, so a role change, disable, password reset or 2FA reset
// (which bumps sessionVersion) takes effect immediately on all of that user's sessions.
export function requireAuth({ allowPendingPasswordChange = false } = {}) {
  return (req, res, next) => {
    const auth = req.session.auth
    const user = auth && findById(auth.userId)
    if (!user || user.status !== 'active' || user.sessionVersion !== auth.sessionVersion || !user.totpEnabled) {
      delete req.session.auth
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (user.mustChangePassword && !allowPendingPasswordChange) {
      return res.status(403).json({ error: 'You must change your password first', code: 'password_change_required' })
    }
    req.user = user
    next()
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !roleHasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'You do not have permission to do this' })
    }
    next()
  }
}

const limiter = (windowMinutes, limit, message) =>
  rateLimit({ windowMs: windowMinutes * 60_000, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } })

// CSRF defence on top of SameSite=Lax cookies: a state-changing request whose Origin (or Referer)
// names another site is refused. Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE.
export function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const source = req.get('origin') || req.get('referer')
  if (!source) return next() // non-browser clients (curl, the smoke test) send neither
  let host
  try {
    host = new URL(source).host
  } catch {
    host = null
  }
  if (host !== req.get('host')) return res.status(403).json({ error: 'Cross-site request blocked' })
  next()
}

// General ceiling for every request that reads files (API and the SPA fallback), against floods.
export const apiLimiter = limiter(1, config.rateLimitApi, 'Too many requests. Please slow down.')

export const loginLimiter = limiter(15, config.rateLimitLogin, 'Too many sign-in attempts. Please try again later.')
// Stricter than login: a 6-digit code is far easier to guess than a password.
export const twoFaLimiter = limiter(5, config.rateLimit2fa, 'Too many verification attempts. Please try again later.')
