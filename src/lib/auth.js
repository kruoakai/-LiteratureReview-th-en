import { translateServerError } from './i18n.js'

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const err = new Error(translateServerError((data && data.error) || `Request failed (${res.status})`))
    err.status = res.status
    err.code = data?.code
    throw err
  }
  return data
}

const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body ?? {}) })

// ── Sign-in: password → forced 2FA setup or verify → full session ──
export const me = () => request('/api/auth/me').catch(() => null)
export const login = (email, password) => post('/api/auth/login', { email, password }) // { stage: 'setup_required' | 'verify_required' }
export const startTwoFactorSetup = () => post('/api/auth/2fa/setup') // { qrCodeDataUrl, secret }
export const confirmTwoFactorSetup = (code) => post('/api/auth/2fa/setup/confirm', { code }) // { backupCodes, user }
export const verifyTwoFactor = (code) => post('/api/auth/2fa/verify', { code }) // { user }
export const logout = () => post('/api/auth/logout')
export const changePassword = (currentPassword, newPassword) => post('/api/auth/change-password', { currentPassword, newPassword })
export const regenerateBackupCodes = () => post('/api/auth/2fa/backup-codes/regenerate')

// ── Corpus ──
export const fetchAppData = () => request('/api/app-data')
export const saveCollection = (name, value) => request(`/api/data/${name}`, { method: 'PUT', body: JSON.stringify(value) })

// ── User management (users:read / users:write) and audit log (audit:read) ──
export const listUsers = () => request('/api/admin/users')
export const createUser = (email, role, temporaryPassword) => post('/api/admin/users', { email, role, temporaryPassword })
export const updateUser = (id, changes) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) })
export const resetUserPassword = (id, temporaryPassword) => post(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, { temporaryPassword })
export const resetUserTwoFactor = (id) => post(`/api/admin/users/${encodeURIComponent(id)}/reset-2fa`)
export const deleteUser = (id) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const listAuditEvents = () => request('/api/admin/audit-logs')

export const can = (user, permission) => !!user?.permissions?.includes(permission)
