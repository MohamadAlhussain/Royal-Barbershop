import { NextResponse } from 'next/server'
import {
  createAppointment,
  isSlotTaken,
  readAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getAppointmentById,
  cleanupOldAppointments,
  type Appointment,
} from '@/lib/appointments'
import { isAdminRequest } from '@/lib/adminSession'
import { DEMO_MODE_MESSAGE, getBookingMode } from '@/lib/bookingMode'
import { sendCancellationEmail, sendConfirmationEmail } from '@/lib/emails'
import { checkRateLimit, getClientIP } from '@/lib/rateLimiter'
import { getServiceByName } from '@/lib/services'
import { validateBooking, validateDate, validateTime } from '@/lib/validation'

// Keine CORS-Freigabe: Die API wird nur von dieser Website selbst aufgerufen.
const noStore = { 'Cache-Control': 'no-store' }

function demoDisabled() {
  return NextResponse.json({ mode: 'demo', error: DEMO_MODE_MESSAGE }, { status: 403, headers: noStore })
}

function unauthorized() {
  return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401, headers: noStore })
}

/**
 * GET /api/appointments          → öffentlich: Modus + belegte Slots (ohne personenbezogene Daten)
 * GET /api/appointments?scope=admin → nur mit Admin-Sitzung: vollständige Terminliste
 */
export async function GET(req: Request) {
  const mode = getBookingMode()
  const isAdminScope = new URL(req.url).searchParams.get('scope') === 'admin'

  if (mode === 'demo') {
    return isAdminScope ? demoDisabled() : NextResponse.json({ mode, taken: [] }, { headers: noStore })
  }

  const rateLimit = checkRateLimit(getClientIP(req), isAdminScope ? 'admin' : 'general')
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }, { status: 429 })
  }

  try {
    if (isAdminScope) {
      if (!isAdminRequest(req)) return unauthorized()
      // Termine, die älter als 60 Tage sind, bei Admin-Aufrufen aufräumen
      await cleanupOldAppointments()
      return NextResponse.json({ mode, appointments: await readAppointments() }, { headers: noStore })
    }

    const taken = (await readAppointments())
      .filter(a => a.status !== 'cancelled')
      .map(a => ({ date: a.date, time: a.time }))
    return NextResponse.json({ mode, taken }, { headers: noStore })
  } catch {
    return NextResponse.json({ error: 'Termine konnten nicht geladen werden' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (getBookingMode() === 'demo') return demoDisabled()

  const rateLimit = checkRateLimit(getClientIP(req), 'booking')
  if (!rateLimit.allowed) {
    const minutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000)
    return NextResponse.json(
      {
        error: rateLimit.isBlocked
          ? `Ihre IP wurde aufgrund verdächtiger Aktivität blockiert. Bitte versuchen Sie es in ${minutes} Minuten erneut.`
          : `Zu viele Buchungsversuche. Bitte versuchen Sie es in ${minutes} Minuten erneut.`,
      },
      { status: 429 }
    )
  }

  try {
    const validation = validateBooking(await req.json())
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Validierungsfehler', details: validation.errors }, { status: 400 })
    }

    const { name, email, service, date, time, notes } = validation.sanitizedData!

    if (await isSlotTaken(date, time)) {
      return NextResponse.json(
        { error: 'Dieser Termin-Slot ist bereits belegt. Bitte wählen Sie eine andere Uhrzeit.' },
        { status: 409 }
      )
    }

    const serviceMeta = getServiceByName(String(service.name)) ?? { duration: 30, price: '€15' }

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      name,
      email,
      service: {
        id: Number(service.id),
        name: String(service.name),
        duration: serviceMeta.duration,
        price: serviceMeta.price,
      },
      date,
      time,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    }

    await createAppointment(appointment)

    try {
      await sendConfirmationEmail(appointment)
    } catch (error) {
      console.error('Error sending confirmation email:', error)
    }

    // Nur die Termindaten zurückgeben, keine personenbezogenen Angaben
    return NextResponse.json(
      { appointment: { date, time, service: appointment.service } },
      { status: 201, headers: noStore }
    )
  } catch {
    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 })
  }
}

// Stornieren – nur für den Admin
export async function DELETE(req: Request) {
  if (getBookingMode() === 'demo') return demoDisabled()
  if (!isAdminRequest(req)) return unauthorized()

  try {
    const appointmentId = new URL(req.url).searchParams.get('id')
    if (!appointmentId) {
      return NextResponse.json({ error: 'Termin-ID fehlt' }, { status: 400 })
    }

    const appointment = await getAppointmentById(appointmentId)
    if (!appointment || !(await cancelAppointment(appointmentId))) {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 })
    }

    try {
      await sendCancellationEmail(appointment)
    } catch (error) {
      console.error('Error sending cancellation email:', error)
    }

    return NextResponse.json({ message: 'Termin storniert' }, { status: 200, headers: noStore })
  } catch {
    return NextResponse.json({ error: 'Termin konnte nicht storniert werden' }, { status: 500 })
  }
}

// Verschieben – nur für den Admin
export async function PUT(req: Request) {
  if (getBookingMode() === 'demo') return demoDisabled()
  if (!isAdminRequest(req)) return unauthorized()

  try {
    const { appointmentId, newDate, newTime } = await req.json()
    if (typeof appointmentId !== 'string' || !validateDate(newDate).isValid || !validateTime(newTime).isValid) {
      return NextResponse.json({ error: 'Termin-ID, gültiges Datum und gültige Uhrzeit erforderlich' }, { status: 400 })
    }

    if (await rescheduleAppointment(appointmentId, newDate, newTime)) {
      return NextResponse.json({ message: 'Termin verschoben' }, { status: 200, headers: noStore })
    }
    return NextResponse.json(
      { error: 'Verschieben nicht möglich – Slot belegt oder Termin nicht gefunden' },
      { status: 400 }
    )
  } catch {
    return NextResponse.json({ error: 'Termin konnte nicht verschoben werden' }, { status: 500 })
  }
}
