import fs from 'fs'
import { config } from './config.js'

// Security audit trail: one JSON object per line in the state folder, append-only.
// Events: login_*, 2fa_*, password_changed, backup_codes_regenerated, admin_*, data_saved.

export function recordEvent(req, eventType, { actor, ...metadata } = {}) {
  const entry = {
    at: new Date().toISOString(),
    event: eventType,
    actor: actor ?? req.user?.email ?? null,
    ip: req.ip,
    ...(Object.keys(metadata).length && { metadata }),
  }
  try {
    fs.appendFileSync(config.auditLogPath, JSON.stringify(entry) + '\n', { mode: 0o600 })
  } catch (e) {
    console.error(`Could not write audit log: ${e.message}`)
  }
}

export function listEvents(limit = 200) {
  if (!fs.existsSync(config.auditLogPath)) return []
  const lines = fs.readFileSync(config.auditLogPath, 'utf8').trim().split('\n').filter(Boolean)
  return lines.slice(-limit).reverse().map((line) => {
    try {
      return JSON.parse(line)
    } catch {
      return { event: 'unreadable_entry' }
    }
  })
}
