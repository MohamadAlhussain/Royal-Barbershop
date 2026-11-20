# Royal Barbershop – Konzept-Demo

Konzept-Demo von [LEXERNO](https://lexerno.com): Website eines **fiktiven** Barbershops in Potsdam mit
Online-Terminbuchung und Admin-Dashboard. Salon, Team, Adresse, Telefonnummer, Zahlen und Bewertungen sind frei
erfunden, alle Bilder digital erzeugt. Die Seite ist per `robots`-Metadaten und `X-Robots-Tag` von der
Indexierung ausgeschlossen.

Geplante Adresse: https://friseur.lexerno.com

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Upstash Redis · Nodemailer

## Zwei Betriebsarten

| | Demo-Modus (Standard) | Echter Betrieb |
|---|---|---|
| Aktivierung | keine Variablen nötig | `BOOKING_MODE=live` + Upstash-Zugangsdaten |
| Buchung | läuft komplett im Browser, nichts wird gespeichert oder versendet | Termin wird in Redis gespeichert, Bestätigungs-E-Mail per SMTP |
| Belegte Slots | alle frei | werden vom Server geladen, Doppelbuchungen werden abgelehnt (409) |
| Admin (`/admin`) | deaktiviert | Listen- und Kalenderansicht, Suche, Stornierung mit E-Mail |

Die öffentliche Demo läuft ohne Variablen und erhebt daher keine personenbezogenen Daten.

## Backend

- `src/app/api/appointments` – öffentlich nur Modus und belegte Slots (ohne Namen/E-Mails); Buchung per `POST`
  mit serverseitiger Validierung und Rate-Limit; vollständige Liste, Stornieren und Verschieben nur mit
  Admin-Sitzung.
- `src/app/api/admin/auth` – Anmeldung mit Passwortprüfung auf dem Server, Sitzung als signiertes
  HttpOnly-Cookie (HMAC, 8 Stunden).
- `src/lib/emails.ts` – HTML-E-Mails für Bestätigung und Stornierung; alle Eingaben werden escaped.
- `src/lib/bookingMode.ts` – Umschaltung zwischen Demo-Modus und echtem Betrieb.

Alle Variablen stehen in [`.env.example`](.env.example).

## Entwicklung

```bash
npm install
npm run dev
npm run lint
npm run build
```
