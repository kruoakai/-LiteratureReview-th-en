import fs from 'fs'
import crypto from 'crypto'
import session from 'express-session'

// Session store for a single self-hosted instance: sessions live in memory and are mirrored to one
// JSON file in the state folder, so a restart doesn't sign everyone out. Expired sessions are pruned
// on a timer (express-session's MemoryStore never does that, so it leaks memory).
// Session ids are stored only as SHA-256 hashes: a leaked file can't be replayed as cookies.

const hash = (sid) => crypto.createHash('sha256').update(sid).digest('hex')
const PRUNE_EVERY_MS = 15 * 60 * 1000

export class FileSessionStore extends session.Store {
  constructor(filePath) {
    super()
    this.filePath = filePath
    this.sessions = new Map() // hashed sid -> { expires, data }
    this.writeTimer = null
    try {
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      for (const [key, entry] of Object.entries(saved)) this.sessions.set(key, entry)
    } catch {
      // no file yet, or unreadable: start empty (everyone just signs in again)
    }
    this.prune()
    setInterval(() => this.prune(), PRUNE_EVERY_MS).unref()
  }

  prune() {
    const now = Date.now()
    let removed = false
    for (const [key, entry] of this.sessions) {
      if (entry.expires <= now) {
        this.sessions.delete(key)
        removed = true
      }
    }
    if (removed) this.scheduleWrite()
  }

  // Batch writes: many requests in a burst cause one file write.
  scheduleWrite() {
    if (this.writeTimer) return
    this.writeTimer = setTimeout(() => this.flush(), 500)
    this.writeTimer.unref()
  }

  // Also called on shutdown (SIGTERM from `docker stop`) so a pending write isn't lost.
  flush() {
    clearTimeout(this.writeTimer)
    this.writeTimer = null
    try {
      const tmp = `${this.filePath}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.sessions)), { mode: 0o600 })
      fs.renameSync(tmp, this.filePath)
    } catch (e) {
      console.error(`Could not save sessions: ${e.message}`)
    }
  }

  expiryOf(sess) {
    const expires = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : NaN
    return Number.isFinite(expires) ? expires : Date.now() + 24 * 60 * 60 * 1000
  }

  get(sid, cb) {
    const entry = this.sessions.get(hash(sid))
    if (!entry) return cb(null, null)
    if (entry.expires <= Date.now()) {
      this.sessions.delete(hash(sid))
      this.scheduleWrite()
      return cb(null, null)
    }
    cb(null, JSON.parse(entry.data))
  }

  set(sid, sess, cb) {
    this.sessions.set(hash(sid), { expires: this.expiryOf(sess), data: JSON.stringify(sess) })
    this.scheduleWrite()
    cb?.(null)
  }

  touch(sid, sess, cb) {
    const entry = this.sessions.get(hash(sid))
    if (entry) {
      entry.expires = this.expiryOf(sess)
      entry.data = JSON.stringify(sess)
      this.scheduleWrite()
    }
    cb?.(null)
  }

  destroy(sid, cb) {
    this.sessions.delete(hash(sid))
    this.scheduleWrite()
    cb?.(null)
  }
}
