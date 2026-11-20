import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  createSessionToken,
  isAdminConfigured,
  isAdminRequest,
  verifyPassword,
} from '@/lib/adminSession'
import { getBookingMode } from '@/lib/bookingMode'
import { checkRateLimit, getClientIP } from '@/lib/rateLimiter'

// Status der Sitzung (für das Admin-Dashboard)
export async function GET(req: Request) {
  return NextResponse.json({
    mode: getBookingMode(),
    configured: isAdminConfigured(),
    authenticated: isAdminRequest(req),
  })
}

// Anmeldung
export async function POST(req: Request) {
  if (getBookingMode() === 'demo' || !isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Konzept-Demo: Der Admin-Bereich ist deaktiviert.' },
      { status: 503 }
    )
  }

  const rateLimit = checkRateLimit(getClientIP(req), 'admin', { maxRequests: 10 })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' }, { status: 429 })
  }

  try {
    const { password } = await req.json()
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 })
    }

    const { token, maxAge } = createSessionToken()
    const res = NextResponse.json({ success: true })
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }
}

// Abmeldung
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
