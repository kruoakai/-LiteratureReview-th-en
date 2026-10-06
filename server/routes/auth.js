import { Router } from 'express'
import { config } from '../config.js'
import { verifySecret, DUMMY_HASH, encryptSecret, decryptSecret, looksLikeBackupCode } from '../crypto.js'
import { permissionsFor } from '../permissions.js'
import { recordEvent } from '../audit.js'
import { generateTotpSecret, buildQrCode, matchTotpStep } from '../twofa.js'
import { requireAuth, requirePreAuth, loginLimiter, twoFaLimiter } from '../middleware.js'
import {
  findByEmail, isLocked, recordFailedLogin, recordSuccessfulLogin, setPendingTotpSecret, enableTotp,
  setTotpLastStep, issueBackupCodes, consumeBackupCode, setPassword, publicUser,
} from '../users.js'

const router = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// New session id at each privilege change, so a session id fixed before sign-in is worthless after it.
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())))

async function startFullSession(req, user) {
  await regenerate(req)
  req.session.auth = { userId: user.id, sessionVersion: user.sessionVersion }
  recordSuccessfulLogin(user.id)
}

function me(user) {
  return { ...publicUser(user), permissions: permissionsFor(user.role) }
}

// Step 1: password. Never opens a session by itself; it always leads to a 2FA stage.
router.post('/login', loginLimiter, wrap(async (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || password.length > 128) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = findByEmail(email)
  // Always one bcrypt comparison, user or not, so response time doesn't reveal which emails exist.
  const passwordOk = await verifySecret(password, user?.passwordHash || DUMMY_HASH)
  const invalid = () => res.status(401).json({ error: 'Invalid email or password' })

  if (!user) {
    recordEvent(req, 'login_failed', { actor: email.trim().toLowerCase() })
    return invalid()
  }
  if (isLocked(user)) {
    recordEvent(req, 'login_locked', { actor: user.email })
    return res.status(423).json({ error: `Account temporarily locked after repeated failed attempts. Try again in ${config.loginLockMinutes} minutes or ask an admin to reset your password.` })
  }
  if (!passwordOk) {
    const nowLocked = recordFailedLogin(user.id)
    recordEvent(req, nowLocked ? 'login_locked' : 'login_failed', { actor: user.email })
    return invalid()
  }
  // Only tell someone the account is disabled once they have proven they know its password.
  if (user.status !== 'active') {
    recordEvent(req, 'login_disabled', { actor: user.email })
    return res.status(403).json({ error: 'This account has been disabled. Contact an administrator.' })
  }

  await regenerate(req)
  const stage = user.totpEnabled ? 'verify' : 'setup'
  req.session.preAuth = { userId: user.id, stage, expiresAt: Date.now() + config.preAuthMinutes * 60_000 }
  recordEvent(req, 'login_password_verified', { actor: user.email })
  res.json({ stage: stage === 'setup' ? 'setup_required' : 'verify_required' })
}))

// Step 2a (first sign-in, or after an admin reset): enrol an authenticator app.
router.post('/2fa/setup', requirePreAuth('setup'), wrap(async (req, res) => {
  const user = req.preAuthUser
  const secret = generateTotpSecret()
  setPendingTotpSecret(user.id, encryptSecret(secret))
  const { qrCodeDataUrl, otpauthUrl } = await buildQrCode(secret, user.email)
  res.json({ qrCodeDataUrl, otpauthUrl, secret })
}))

router.post('/2fa/setup/confirm', twoFaLimiter, requirePreAuth('setup'), wrap(async (req, res) => {
  const user = req.preAuthUser
  if (!user.totpSecretEnc) return res.status(400).json({ error: 'No 2FA setup in progress. Please start again.' })
  const step = await matchTotpStep(decryptSecret(user.totpSecretEnc), req.body?.code)
  if (step === null) {
    recordEvent(req, '2fa_setup_failed', { actor: user.email })
    return res.status(400).json({ error: 'Invalid verification code' })
  }
  enableTotp(user.id, step)
  const backupCodes = await issueBackupCodes(user.id)
  await startFullSession(req, user)
  recordEvent(req, '2fa_setup_complete', { actor: user.email })
  res.json({ stage: 'complete', backupCodes, user: me(user) })
}))

// Step 2b (every later sign-in): a code from the app, or one unused backup code.
router.post('/2fa/verify', twoFaLimiter, requirePreAuth('verify'), wrap(async (req, res) => {
  const user = req.preAuthUser
  const code = String(req.body?.code || '')
  let ok = false
  let usedBackupCode = false
  if (looksLikeBackupCode(code)) {
    ok = usedBackupCode = await consumeBackupCode(user.id, code)
  } else {
    const step = await matchTotpStep(decryptSecret(user.totpSecretEnc), code, user.totpLastStep)
    ok = step !== null
    if (ok) setTotpLastStep(user.id, step)
  }
  if (!ok) {
    recordEvent(req, '2fa_verify_failed', { actor: user.email })
    return res.status(400).json({ error: 'Invalid or already used verification code' })
  }
  await startFullSession(req, user)
  recordEvent(req, usedBackupCode ? '2fa_backup_code_used' : '2fa_verify_success', { actor: user.email })
  res.json({ stage: 'complete', user: me(user) })
}))

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

router.get('/me', requireAuth({ allowPendingPasswordChange: true }), (req, res) => {
  res.json(me(req.user))
})

router.post('/change-password', requireAuth({ allowPendingPasswordChange: true }), wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const ok = typeof currentPassword === 'string' && currentPassword.length <= 128 && (await verifySecret(currentPassword, req.user.passwordHash))
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
  if (currentPassword === newPassword) return res.status(400).json({ error: 'Choose a password different from the current one' })
  // Signs out every other session; this one is moved to the new session version.
  const user = await setPassword(req.user.id, newPassword, { mustChangePassword: false })
  req.session.auth.sessionVersion = user.sessionVersion
  recordEvent(req, 'password_changed')
  res.json(me(user))
}))

router.post('/2fa/backup-codes/regenerate', requireAuth(), wrap(async (req, res) => {
  const backupCodes = await issueBackupCodes(req.user.id)
  recordEvent(req, 'backup_codes_regenerated')
  res.json({ backupCodes })
}))

export default router
