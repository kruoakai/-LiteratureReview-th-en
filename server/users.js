import fs from 'fs'
import crypto from 'crypto'
import { config } from './config.js'
import { ROLES } from './permissions.js'
import { hashSecret, verifySecret, randomBackupCode, normalizeBackupCode, BACKUP_CODE_COUNT } from './crypto.js'

// Users live in one JSON file in the state folder (no database). The whole list is kept in memory
// and every change is written back atomically.
//
// User shape:
//   id, email, role ('admin'|'manager'|'user'), status ('active'|'disabled'), passwordHash,
//   mustChangePassword, failedLoginAttempts, lockedUntil (ISO|null),
//   totpEnabled, totpSecretEnc (AES-GCM, see crypto.js), totpLastStep (blocks code replay),
//   backupCodes [{ hash, usedAt }], sessionVersion (bump = sign out everywhere),
//   createdAt, lastLoginAt

let users = []

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function persist() {
  const tmp = `${config.usersPath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(tmp, config.usersPath)
}

function newUser({ email, passwordHash, role, mustChangePassword }) {
  return {
    id: crypto.randomUUID(),
    email: email.trim(),
    role: ROLES.includes(role) ? role : 'user',
    status: 'active',
    passwordHash,
    mustChangePassword: !!mustChangePassword,
    failedLoginAttempts: 0,
    lockedUntil: null,
    totpEnabled: false,
    totpSecretEnc: null,
    totpLastStep: null,
    backupCodes: [],
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  }
}

// Older versions stored users as APP_USER_<n>_EMAIL / _PASSWORD_HASH / _ROLE lines in AUTH_ENV_PATH.
// Their password hashes carry over; 2FA starts unset, so each of them is sent to forced setup.
function migrateLegacyUsers() {
  const file = config.legacyAuthEnvPath
  if (!fs.existsSync(file)) return 0
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  for (let i = 1; env[`APP_USER_${i}_EMAIL`]; i++) {
    users.push(newUser({
      email: env[`APP_USER_${i}_EMAIL`],
      passwordHash: env[`APP_USER_${i}_PASSWORD_HASH`],
      role: env[`APP_USER_${i}_ROLE`] === 'admin' ? 'admin' : 'user',
    }))
  }
  return users.length
}

export function loadUsers() {
  if (fs.existsSync(config.usersPath)) {
    users = JSON.parse(fs.readFileSync(config.usersPath, 'utf8'))
    return { count: users.length, migrated: 0 }
  }
  users = []
  const migrated = migrateLegacyUsers()
  if (migrated) persist()
  return { count: users.length, migrated }
}

// Outside production (NODE_ENV !== 'production'), ready-made accounts for every role so sign-in,
// 2FA and RBAC can be tried straight away. Each can be overridden in .env. They still have to set
// up 2FA like any account. Never created in production, which is what the Docker image runs as,
// so a default password can't end up on a real server.
export const DEV_ACCOUNTS = [
  { role: 'admin', emailVar: 'ADMIN_EMAIL', passwordVar: 'ADMIN_PASSWORD', email: 'admin@example.com', password: 'Admin@12345' },
  { role: 'manager', emailVar: 'TEST_MANAGER_EMAIL', passwordVar: 'TEST_MANAGER_PASSWORD', email: 'manager@example.com', password: 'Manager@12345' },
  { role: 'user', emailVar: 'TEST_USER_EMAIL', passwordVar: 'TEST_USER_PASSWORD', email: 'user@example.com', password: 'User@12345' },
]

const devAccountsEnabled = () => !config.isProduction && process.env.SEED_TEST_USERS !== 'false'

// First run: with no users yet, create an admin from ADMIN_EMAIL / ADMIN_PASSWORD
// (or, outside production, from the default admin above).
export async function bootstrapAdmin() {
  if (users.length) return null
  let { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if ((!ADMIN_EMAIL || !ADMIN_PASSWORD) && devAccountsEnabled()) {
    ADMIN_EMAIL ||= DEV_ACCOUNTS[0].email
    ADMIN_PASSWORD ||= DEV_ACCOUNTS[0].password
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('No users exist yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.')
    return null
  }
  validatePassword(ADMIN_PASSWORD)
  users.push(newUser({ email: ADMIN_EMAIL, passwordHash: await hashSecret(ADMIN_PASSWORD), role: 'admin' }))
  persist()
  return ADMIN_EMAIL
}

// Development only: make sure the manager and user test accounts exist (created once, never
// overwritten). Unlike admin-created accounts they skip the forced password change, for quick testing.
export async function seedTestUsers() {
  if (!devAccountsEnabled()) return []
  const created = []
  for (const a of DEV_ACCOUNTS.slice(1)) {
    const email = process.env[a.emailVar] || a.email
    const password = process.env[a.passwordVar] || a.password
    if (findByEmail(email)) continue
    validatePassword(password)
    users.push(newUser({ email, passwordHash: await hashSecret(password), role: a.role }))
    created.push(`${email} (${a.role})`)
  }
  if (created.length) persist()
  return created
}

export function validatePassword(password) {
  // bcrypt silently ignores bytes past 72, so cap the length instead of truncating without telling anyone.
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw httpError(400, 'Password must be 8 to 128 characters')
  }
}

export const findById = (id) => users.find((u) => u.id === id) || null
export const findByEmail = (email) => {
  const norm = String(email || '').trim().toLowerCase()
  return users.find((u) => u.email.toLowerCase() === norm) || null
}

function update(id, changes) {
  const user = findById(id)
  if (!user) throw httpError(404, 'User not found')
  Object.assign(user, changes)
  persist()
  return user
}

const isActiveAdmin = (u) => u.role === 'admin' && u.status === 'active'

export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    totpEnabled: u.totpEnabled,
    mustChangePassword: u.mustChangePassword,
    locked: isLocked(u),
    backupCodesRemaining: u.backupCodes.filter((c) => !c.usedAt).length,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }
}

export const listUsers = () => users.map(publicUser)

export async function createUser({ email, password, role }) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'A valid email is required')
  if (!ROLES.includes(role)) throw httpError(400, `Role must be one of: ${ROLES.join(', ')}`)
  validatePassword(password)
  if (findByEmail(email)) throw httpError(409, 'A user with that email already exists')
  // Admin-created accounts start with a temporary password the user must replace after first sign-in.
  const user = newUser({ email, passwordHash: await hashSecret(password), role, mustChangePassword: true })
  users.push(user)
  persist()
  return user
}

// Role / status changes. Guards keep at least one active admin so nobody can lock everyone out.
export function updateRoleStatus(actorId, id, { role, status }) {
  const target = findById(id)
  if (!target) throw httpError(404, 'User not found')
  if (role !== undefined && !ROLES.includes(role)) throw httpError(400, `Role must be one of: ${ROLES.join(', ')}`)
  if (status !== undefined && !['active', 'disabled'].includes(status)) throw httpError(400, 'Status must be active or disabled')
  if (id === actorId && ((role && role !== 'admin') || status === 'disabled')) {
    throw httpError(409, 'You cannot remove your own admin access or disable your own account')
  }
  const after = { ...target, ...(role !== undefined && { role }), ...(status !== undefined && { status }) }
  if (isActiveAdmin(target) && !isActiveAdmin(after) && users.filter(isActiveAdmin).length <= 1) {
    throw httpError(409, 'At least one active admin must remain')
  }
  const changes = {}
  if (role !== undefined) changes.role = role
  if (status !== undefined) changes.status = status
  if (status === 'disabled') changes.sessionVersion = target.sessionVersion + 1
  return update(id, changes)
}

export function deleteUser(actorId, id) {
  const target = findById(id)
  if (!target) throw httpError(404, 'User not found')
  if (id === actorId) throw httpError(409, 'You cannot delete your own account while signed in')
  if (isActiveAdmin(target) && users.filter(isActiveAdmin).length <= 1) {
    throw httpError(409, 'Cannot delete the last active admin')
  }
  users = users.filter((u) => u.id !== id)
  persist()
  return target
}

export async function setPassword(id, password, { mustChangePassword, signOutEverywhere = true }) {
  validatePassword(password)
  const user = findById(id)
  return update(id, {
    passwordHash: await hashSecret(password),
    mustChangePassword,
    // An admin reset also unlocks the account, otherwise the user still couldn't sign in until it expires.
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...(signOutEverywhere && { sessionVersion: user.sessionVersion + 1 }),
  })
}

// ── Lockout ──────────────────────────────────────────────────────────────────────────────────────

export const isLocked = (u) => !!u.lockedUntil && new Date(u.lockedUntil) > new Date()

export function recordFailedLogin(id) {
  const user = findById(id)
  const attempts = user.failedLoginAttempts + 1
  const lock = attempts >= config.loginMaxAttempts
  update(id, {
    failedLoginAttempts: lock ? 0 : attempts,
    lockedUntil: lock ? new Date(Date.now() + config.loginLockMinutes * 60_000).toISOString() : user.lockedUntil,
  })
  return lock
}

export function recordSuccessfulLogin(id) {
  update(id, { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() })
}

// ── 2FA state ────────────────────────────────────────────────────────────────────────────────────

// A new secret on every setup attempt; it only becomes active once a code from it is confirmed.
export const setPendingTotpSecret = (id, totpSecretEnc) => update(id, { totpSecretEnc, totpEnabled: false, totpLastStep: null })
export const enableTotp = (id, step) => update(id, { totpEnabled: true, totpLastStep: step })
export const setTotpLastStep = (id, step) => update(id, { totpLastStep: step })

// Admins can't switch 2FA off for anyone, only reset it: the next sign-in goes through forced setup.
export function resetTwoFactor(id) {
  const user = findById(id)
  if (!user) throw httpError(404, 'User not found')
  return update(id, { totpEnabled: false, totpSecretEnc: null, totpLastStep: null, backupCodes: [], sessionVersion: user.sessionVersion + 1 })
}

// Backup codes are low-entropy, single-use secrets, so only their bcrypt hashes are stored.
// The plaintext codes are returned once and never saved.
export async function issueBackupCodes(id) {
  const plain = Array.from({ length: BACKUP_CODE_COUNT }, randomBackupCode)
  const backupCodes = await Promise.all(plain.map(async (code) => ({ hash: await hashSecret(code), usedAt: null })))
  update(id, { backupCodes })
  return plain
}

export async function consumeBackupCode(id, code) {
  const user = findById(id)
  const normalized = normalizeBackupCode(code)
  for (const entry of user.backupCodes) {
    if (!entry.usedAt && (await verifySecret(normalized, entry.hash))) {
      entry.usedAt = new Date().toISOString()
      persist()
      return true
    }
  }
  return false
}

