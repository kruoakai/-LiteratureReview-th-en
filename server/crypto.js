import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from './config.js'

// TOTP secrets must be decryptable to check future codes, so unlike passwords they can't be
// one-way hashed. AES-256-GCM gives confidentiality plus tamper detection via the auth tag.
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export function encryptSecret(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, config.totpEncryptionKey, iv, { authTagLength: AUTH_TAG_LENGTH })
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString('base64')).join('.')
}

export function decryptSecret(payload) {
  const [iv, authTag, ciphertext] = String(payload).split('.').map((part) => Buffer.from(part || '', 'base64'))
  // Pinning the tag length blocks truncated-tag forgeries, where a short tag is easier to brute-force.
  if (authTag.length !== AUTH_TAG_LENGTH) throw new Error('Invalid auth tag length')
  const decipher = crypto.createDecipheriv(ALGORITHM, config.totpEncryptionKey, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

const SALT_ROUNDS = 10

export const hashSecret = (plainText) => bcrypt.hash(plainText, SALT_ROUNDS)
export const verifySecret = (plainText, hash) => bcrypt.compare(plainText, hash)

// Compared against when there is no real hash (unknown email) so a failed login always costs one
// bcrypt comparison: otherwise "no such user" answers faster and leaks which emails exist.
// Generated at startup from random bytes, so it matches no real password.
export const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), SALT_ROUNDS)

// Backup codes: 10 single-use codes like "K7QX-9MPA". Ambiguous characters (0/O, 1/I/L) are left out.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const BACKUP_CODE_COUNT = 10

export function randomBackupCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)]
    if (i === 3) code += '-'
  }
  return code
}

export function normalizeBackupCode(code) {
  const c = String(code).trim().toUpperCase().replace(/[\s-]+/g, '')
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c
}

export function looksLikeBackupCode(code) {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizeBackupCode(code))
}
