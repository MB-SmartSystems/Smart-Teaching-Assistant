import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'crypto'

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Verify a password against the stored scrypt hash.
 * APP_PASSWORD_HASH format: <hex-salt>:<hex-hash>
 */
export function verifyPassword(password: string): boolean {
  const stored = process.env.APP_PASSWORD_HASH
  if (!stored) return false

  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const derivedHash = scryptSync(password, salt, 64).toString('hex')

  // Constant-time comparison
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(derivedHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Create a signed session token.
 * Format: <random>.<expiry>.<hmac>
 */
export function createSessionToken(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET not configured')

  const random = randomBytes(32).toString('hex')
  const expiry = (Date.now() + SESSION_DURATION_MS).toString()
  const payload = `${random}.${expiry}`

  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

/**
 * Validate a session token (HMAC + expiry check).
 * Works in both Node.js and Edge runtime (only uses HMAC, not scrypt).
 */
export function validateSessionToken(token: string): boolean {
  const secret = process.env.SESSION_SECRET
  if (!secret || !token) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [random, expiry, hmac] = parts
  if (!random || !expiry || !hmac) return false

  // Verify HMAC
  const payload = `${random}.${expiry}`
  const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex')

  const a = Buffer.from(hmac, 'hex')
  const b = Buffer.from(expectedHmac, 'hex')
  if (a.length !== b.length) return false
  if (!timingSafeEqual(a, b)) return false

  // Check expiry
  const expiryMs = parseInt(expiry, 10)
  if (isNaN(expiryMs) || Date.now() > expiryMs) return false

  return true
}
