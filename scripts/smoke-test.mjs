#!/usr/bin/env node
// End-to-end smoke test for sign-in (forced 2FA), RBAC, and the data API. CI runs it on every push.
//
//   npm run build && npm test                          starts its own server on throwaway data
//   BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/smoke-test.mjs
//                                                      runs against a fresh, already-running instance
//                                                      (its first admin must not have set up 2FA yet)
//
// Exits non-zero on the first failed check. If a sign-in, 2FA or permission flow changes, add a check here.
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'smoke-test-admin-pw'
let BASE_URL = process.env.BASE_URL
let server = null
let tmpDir = null
let passed = 0

function pass(msg) {
  passed++
  console.log(`PASS  ${msg}`)
}
class CheckFailed extends Error {}
function fail(msg, detail) {
  console.error(`FAIL  ${msg}${detail !== undefined ? `\n      ${JSON.stringify(detail)}` : ''}`)
  throw new CheckFailed(msg)
}
function check(cond, msg, detail) {
  if (!cond) fail(msg, detail)
  pass(msg)
}
async function cleanup() {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve))
    server.kill()
    await exited // Windows keeps the temp folder locked until the server process is gone
  }
  if (!tmpDir) return
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  } catch {
    console.warn(`(could not remove ${tmpDir}; delete it by hand)`)
  }
}

// ── RFC 6238 TOTP, so the test needs no authenticator library ──
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of input.toUpperCase().replace(/=+$/, '')) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}
// stepOffset 0 = the current 30 s window, 1 = the next one (the server accepts ±1 for clock drift).
function totp(secret, stepOffset = 0) {
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest()
  const o = hmac[hmac.length - 1] & 0xf
  const code = (((hmac[o] & 0x7f) << 24) | (hmac[o + 1] << 16) | (hmac[o + 2] << 8) | hmac[o + 3]) % 1_000_000
  return String(code).padStart(6, '0')
}

// A tiny cookie-keeping client: one per simulated browser.
function client() {
  let cookie = ''
  async function call(method, url, body, extraHeaders = {}) {
    const res = await fetch(BASE_URL + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const set = res.headers.getSetCookie?.() || []
    for (const c of set) if (c.startsWith('lrt.sid=')) cookie = c.split(';')[0]
    let data = null
    try {
      data = await res.json()
    } catch {}
    return { status: res.status, data, headers: res.headers }
  }
  return {
    get: (u) => call('GET', u),
    post: (u, b = {}) => call('POST', u, b),
    put: (u, b, h) => call('PUT', u, b, h),
    patch: (u, b) => call('PATCH', u, b),
    del: (u) => call('DELETE', u),
  }
}

// Password + forced first-time 2FA setup (+ forced password change for admin-created accounts).
async function enrol(email, password, newPassword) {
  const c = client()
  const login = await c.post('/api/auth/login', { email, password })
  check(login.data?.stage === 'setup_required', `${email}: password sign-in leads to forced 2FA setup`, login)
  const setup = await c.post('/api/auth/2fa/setup')
  check(setup.status === 200 && setup.data.secret && setup.data.qrCodeDataUrl?.startsWith('data:image/png'), `${email}: gets a TOTP secret and QR code`, setup.status)
  const confirm = await c.post('/api/auth/2fa/setup/confirm', { code: totp(setup.data.secret) })
  check(confirm.status === 200 && confirm.data.backupCodes?.length === 10, `${email}: confirming a code turns 2FA on and returns 10 backup codes`, confirm)
  if (newPassword) {
    const blocked = await c.get('/api/app-data')
    check(blocked.status === 403 && blocked.data.code === 'password_change_required', `${email}: data is blocked until the temporary password is changed`, blocked)
    const changed = await c.post('/api/auth/change-password', { currentPassword: password, newPassword })
    check(changed.status === 200 && changed.data.mustChangePassword === false, `${email}: changes temporary password`, changed)
  }
  return { c, secret: setup.data.secret, backupCodes: confirm.data.backupCodes, user: confirm.data.user }
}

let serverEnv = null
async function startServer() {
  if (!serverEnv) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lrt-smoke-'))
    fs.cpSync(path.join(ROOT, 'data'), path.join(tmpDir, 'data'), { recursive: true })
    const port = 4600 + Math.floor(Math.random() * 300)
    BASE_URL = `http://localhost:${port}`
    serverEnv = {
      ...process.env,
      PORT: String(port),
      DATA_DIR: path.join(tmpDir, 'data'),
      STATE_DIR: path.join(tmpDir, 'state'),
      AUTH_ENV_PATH: path.join(tmpDir, 'none.env'),
      TOTP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      // The functional checks below make more sign-in calls than the production limits allow.
      RATE_LIMIT_LOGIN: '500',
      RATE_LIMIT_2FA: '500',
      RATE_LIMIT_API: '5000',
      SEED_TEST_USERS: 'false', // the test creates its own manager/user accounts
    }
  }
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: tmpDir,
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  server.stdout.on('data', (d) => (log += d))
  server.stderr.on('data', (d) => (log += d))
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE_URL}/api/health`)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  fail('server did not start', log)
}

async function restartServer() {
  await new Promise((r) => setTimeout(r, 800)) // let the session store finish its batched write
  const exited = new Promise((resolve) => server.once('exit', resolve))
  server.kill()
  await exited
  await startServer()
}

async function main() {
  if (!BASE_URL) await startServer()
  console.log(`Smoke testing ${BASE_URL}\n`)

  const anon = client()
  const health = await anon.get('/api/health')
  check(health.status === 200, 'health endpoint is up')
  check(/script-src 'self'/.test(health.headers.get('content-security-policy') || ''), 'security headers (CSP) are set')
  check((await anon.get('/api/app-data')).status === 401, 'corpus data needs a session')
  const deep = await fetch(`${BASE_URL}/some/deep/link`)
  check(deep.status === 200 && (await deep.text()).includes('<div id="app">'), 'any non-API path serves the app (SPA fallback)')
  check((await anon.get('/api/nope')).status === 404, 'unknown API paths return 404 JSON, not the app')

  // ── Bootstrap admin: password alone never opens a session ──
  const pre = client()
  await pre.post('/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  check((await pre.get('/api/app-data')).status === 401, 'password-only (pre-2FA) session cannot read data')
  check((await pre.post('/api/auth/2fa/verify', { code: '000000' })).status === 401, 'pre-2FA session cannot jump to the verify stage')
  await pre.post('/api/auth/2fa/setup')
  check((await pre.post('/api/auth/2fa/setup/confirm', { code: '000000' })).status === 400, 'wrong setup code is rejected')

  const wrongPw = await client().post('/api/auth/login', { email: ADMIN_EMAIL, password: 'definitely-wrong' })
  const unknown = await client().post('/api/auth/login', { email: 'nobody@example.com', password: 'definitely-wrong' })
  check(wrongPw.status === 401 && unknown.status === 401 && wrongPw.data.error === unknown.data.error, 'unknown email and wrong password give the same answer')

  const admin = await enrol(ADMIN_EMAIL, ADMIN_PASSWORD)
  check(admin.user.permissions.includes('users:write') && admin.user.permissions.includes('audit:read'), 'admin has every permission')
  check((await admin.c.get('/api/app-data')).status === 200, 'admin reads corpus data after 2FA')

  // ── Admin creates a manager and a plain user ──
  const mgrEmail = 'manager@example.com'
  const userEmail = 'user@example.com'
  const created1 = await admin.c.post('/api/admin/users', { email: mgrEmail, role: 'manager', temporaryPassword: 'temp-manager-pw' })
  const created2 = await admin.c.post('/api/admin/users', { email: userEmail, role: 'user', temporaryPassword: 'temp-user-pw-1' })
  check(created1.status === 201 && created2.status === 201 && created2.data.mustChangePassword, 'admin creates users with temporary passwords')
  check((await admin.c.post('/api/admin/users', { email: userEmail, role: 'user', temporaryPassword: 'another-pw-1' })).status === 409, 'duplicate email is rejected')
  check((await admin.c.post('/api/admin/users', { email: 'x@example.com', role: 'user', temporaryPassword: 'short' })).status === 400, 'too-short password is rejected')
  check((await admin.c.post('/api/admin/users', { email: 'y@example.com', role: 'superuser', temporaryPassword: 'long-enough-pw' })).status === 400, 'unknown role is rejected')

  const user = await enrol(userEmail, 'temp-user-pw-1', 'user-own-password')
  const mgr = await enrol(mgrEmail, 'temp-manager-pw', 'manager-own-password')

  // ── RBAC ──
  const config = (await user.c.get('/api/app-data')).data.config
  check(!!config, 'user can read corpus data')
  check((await user.c.put('/api/data/config', config)).status === 403, 'user cannot edit data (corpus:write)')
  check((await user.c.get('/api/admin/users')).status === 403, 'user cannot list users (users:read)')
  check((await user.c.get('/api/admin/audit-logs')).status === 403, 'user cannot read the audit log')
  check((await mgr.c.put('/api/data/config', config)).status === 200, 'manager can edit data')
  check((await mgr.c.put('/api/data/config', config, { Origin: 'https://evil.example' })).status === 403, 'cross-site write is blocked (CSRF Origin check)')
  check((await mgr.c.put('/api/data/config', config, { Origin: BASE_URL })).status === 200, 'same-origin write with an Origin header is allowed')
  check((await mgr.c.get('/api/admin/users')).status === 200, 'manager can list users')
  check((await mgr.c.post('/api/admin/users', { email: 'z@example.com', role: 'admin', temporaryPassword: 'long-enough-pw' })).status === 403, 'manager cannot create users (users:write)')
  check((await mgr.c.get('/api/admin/audit-logs')).status === 403, 'manager cannot read the audit log')
  const bad = await mgr.c.put('/api/data/papers', [{ id: 1, domain: 999, score: 5, title: 't', authors: 'a', venue: 'v', year: 2020 }])
  check(bad.status === 400, 'data validation still applies (unknown domain rejected)')

  // ── Later sign-ins: TOTP (no replay) or single-use backup codes ──
  const relogin = async (code) => {
    const c = client()
    const r = await c.post('/api/auth/login', { email: userEmail, password: 'user-own-password' })
    check(r.data?.stage === 'verify_required', 'returning user is asked for a 2FA code')
    return { c, res: await c.post('/api/auth/2fa/verify', { code }) }
  }
  const nextCode = totp(user.secret, 1)
  const first = (await relogin(nextCode)).res
  check(first.status === 200, 'sign-in with an authenticator code works', first)
  check((await relogin(nextCode)).res.status === 400, 'the same code cannot be used twice (replay blocked)')
  const backup = user.backupCodes[0]
  check((await relogin(backup.toLowerCase().replace('-', ''))).res.status === 200, 'sign-in with a backup code works (any case, dash optional)')
  check((await relogin(backup)).res.status === 400, 'a backup code works only once')

  // ── Lockout and admin recovery ──
  const attacker = client()
  for (let i = 0; i < 5; i++) await attacker.post('/api/auth/login', { email: userEmail, password: 'wrong-guess' })
  const locked = await attacker.post('/api/auth/login', { email: userEmail, password: 'user-own-password' })
  check(locked.status === 423, 'account locks after 5 wrong passwords, even for the right password', locked)
  const userList = (await admin.c.get('/api/admin/users')).data
  const target = userList.find((u) => u.email === userEmail)
  check(target.locked === true, 'admin sees the account as locked')
  check((await admin.c.post(`/api/admin/users/${target.id}/reset-password`, { temporaryPassword: 'reset-temp-pw-1' })).status === 200, 'admin resets the password')
  check((await user.c.get('/api/app-data')).status === 401, "password reset signs the user's existing sessions out")
  const afterReset = await client().post('/api/auth/login', { email: userEmail, password: 'reset-temp-pw-1' })
  check(afterReset.data?.stage === 'verify_required', 'password reset unlocks the account and keeps 2FA in place')

  // ── Disable, 2FA reset, self-protection ──
  const mgrId = userList.find((u) => u.email === mgrEmail).id
  check((await admin.c.patch(`/api/admin/users/${mgrId}`, { status: 'disabled' })).status === 200, 'admin disables an account')
  check((await mgr.c.get('/api/app-data')).status === 401, 'disabling ends that user’s active session immediately')
  check((await client().post('/api/auth/login', { email: mgrEmail, password: 'manager-own-password' })).status === 403, 'disabled account cannot sign in')
  await admin.c.patch(`/api/admin/users/${mgrId}`, { status: 'active' })
  check((await admin.c.post(`/api/admin/users/${mgrId}/reset-2fa`)).status === 200, 'admin resets 2FA')
  const again = await client().post('/api/auth/login', { email: mgrEmail, password: 'manager-own-password' })
  check(again.data?.stage === 'setup_required', 'after a 2FA reset the next sign-in forces setup again (2FA is never just off)')

  const adminId = userList.find((u) => u.email === ADMIN_EMAIL).id
  check((await admin.c.patch(`/api/admin/users/${adminId}`, { role: 'user' })).status === 409, 'admin cannot demote themselves')
  check((await admin.c.del(`/api/admin/users/${adminId}`)).status === 409, 'admin cannot delete themselves')

  const audit = await admin.c.get('/api/admin/audit-logs')
  const events = new Set(audit.data.map((e) => e.event))
  check(['login_failed', 'login_locked', '2fa_setup_complete', '2fa_backup_code_used', 'admin_password_reset', 'admin_2fa_reset', 'data_saved'].every((e) => events.has(e)), 'audit log records sign-in, 2FA, admin and data events', [...events])

  if (serverEnv) {
    await restartServer()
    check((await admin.c.get('/api/auth/me')).status === 200, 'sessions survive a server restart (file session store)')
  }

  await admin.c.post('/api/auth/logout')
  check((await admin.c.get('/api/auth/me')).status === 401, 'logout ends the session')

  console.log(`\nAll ${passed} checks passed`)
}

main()
  .then(() => cleanup())
  .catch(async (e) => {
    if (!(e instanceof CheckFailed)) console.error(`FAIL  unexpected error\n      ${e.stack || e}`)
    await cleanup()
    process.exit(1)
  })
