import { createHmac, timingSafeEqual } from 'node:crypto'

// Admin-Sitzung als signiertes, HttpOnly-Cookie. Das Passwort wird nur auf dem
// Server geprüft; der Browser erhält ausschließlich ein zeitlich begrenztes Token.

export const ADMIN_COOKIE = 'admin_session'
const SESSION_TTL_SECONDS = 8 * 60 * 60 // 8 Stunden

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET
  return secret && secret.length >= 32 ? secret : null
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && getSecret())
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function verifyPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof password !== 'string') return false
  // Gleich lange Hashes vergleichen, damit die Laufzeit nichts über das Passwort verrät
  const hash = (v: string) => createHmac('sha256', 'admin-password').update(v).digest()
  return timingSafeEqual(hash(password), hash(expected))
}

export function createSessionToken(): { token: string; maxAge: number } {
  const secret = getSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET fehlt oder ist zu kurz')
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  return { token: `${expires}.${sign(expires, secret)}`, maxAge: SESSION_TTL_SECONDS }
}

export function isValidSessionToken(token: string | undefined): boolean {
  const secret = getSecret()
  if (!secret || !token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || !/^\d+$/.test(expires)) return false
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false
  return safeEqual(signature, sign(expires, secret))
}

export function isAdminRequest(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${ADMIN_COOKIE}=`))
  return isValidSessionToken(match?.slice(ADMIN_COOKIE.length + 1))
}
