// Die Buchungsfunktion läuft standardmäßig im Demo-Modus: Es werden keine Daten
// gespeichert und keine E-Mails versendet. Der echte Betrieb (Upstash Redis +
// SMTP) wird nur aktiviert, wenn BOOKING_MODE=live gesetzt ist UND die
// Redis-Zugangsdaten vorhanden sind.

export type BookingMode = 'demo' | 'live'

export function getBookingMode(): BookingMode {
  const wantsLive = process.env.BOOKING_MODE === 'live'
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  return wantsLive && hasRedis ? 'live' : 'demo'
}

export function isLiveBooking(): boolean {
  return getBookingMode() === 'live'
}

export const DEMO_MODE_MESSAGE =
  'Konzept-Demo: Die Buchungsfunktion ist deaktiviert. Es werden keine Daten gespeichert oder versendet.'
