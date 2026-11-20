import nodemailer from 'nodemailer'
import type { Appointment } from './appointments'

// Fiktive Kontaktdaten der Demo – bei echtem Einsatz über Umgebungsvariablen ersetzen
const SALON_NAME = 'Royal Barbershop'
const SALON_PHONE = process.env.SALON_PHONE || '030 23125 789'
const SALON_EMAIL = process.env.SALON_EMAIL || 'salon@friseur.lexerno.com'
const SITE_URL = process.env.SITE_URL || 'https://friseur.lexerno.com'

// Benutzereingaben niemals ungefiltert in HTML-E-Mails einsetzen
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.MAIL_FROM || user
  if (!host || !user || !pass || !from) return null
  return {
    from: from.includes('<') ? from : `"${SALON_NAME.toUpperCase()}" <${from}>`,
    replyTo: from,
    transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
  }
}

type Row = { icon: string; label: string; value: string; color: string }

function detailRows(rows: Row[], border: string, labelColor: string): string {
  return rows
    .map(
      (row, i) => `
      <div style="display:flex;align-items:center;padding:12px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${border}` : ''}">
        <div style="width:32px;height:32px;background:${row.color};border-radius:8px;display:flex;align-items:center;justify-content:center;margin-right:12px">
          <span style="color:#ffffff;font-size:14px">${row.icon}</span>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:${labelColor};font-weight:500">${row.label}</p>
          <p style="margin:0;font-size:14px;color:#1e293b;font-weight:700">${escapeHtml(row.value)}</p>
        </div>
      </div>`
    )
    .join('')
}

function layout(opts: { title: string; headerColor: string; subtitle: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title} – ${SALON_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
  <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:20px 10px">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <div style="background:${opts.headerColor};padding:30px 20px;text-align:center">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;line-height:1.2">ROYAL<br>BARBERSHOP</h1>
        <p style="margin:8px 0 0 0;font-size:11px;color:#fef3c7;font-weight:500">${opts.subtitle}</p>
      </div>
      <div style="padding:30px 20px">
        ${opts.body}
        <div style="border-top:2px solid #f1f5f9;padding-top:20px;text-align:center">
          <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;line-height:1.5">
            Fragen oder Änderungen? 📞 ${SALON_PHONE} · 📧 ${SALON_EMAIL}
          </p>
          <p style="margin:15px 0 0 0;font-size:10px;color:#94a3b8">
            Diese E-Mail wurde automatisch generiert • ${SALON_NAME} • © ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function sendConfirmationEmail(appointment: Appointment): Promise<void> {
  const transport = getTransport()
  if (!transport) {
    console.error('SMTP configuration missing, skipping confirmation email')
    return
  }

  const duration = appointment.service.duration ?? 30
  const notes = appointment.notes ? escapeHtml(appointment.notes) : ''

  const text =
    `Hallo ${appointment.name},\n\n` +
    `Ihr Termin wurde bestätigt.\n` +
    `Service: ${appointment.service.name}\n` +
    `Datum: ${appointment.date}\n` +
    `Uhrzeit: ${appointment.time}\n` +
    `Dauer: ${duration} Min\n` +
    (appointment.notes ? `\nHinweise: ${appointment.notes}\n` : '') +
    `\nFalls Sie den Termin absagen möchten, kontaktieren Sie uns bitte direkt:\n` +
    `Telefon: ${SALON_PHONE}\nE-Mail: ${SALON_EMAIL}\n` +
    `\nBis bald im ${SALON_NAME}!`

  const html = layout({
    title: 'Terminbestätigung',
    headerColor: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
    subtitle: 'Premium Barbering Experience',
    body: `
      <div style="text-align:center;margin-bottom:25px">
        <h2 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;font-weight:700">Terminbestätigung</h2>
        <p style="margin:0;font-size:14px;color:#64748b;line-height:1.5">Hallo ${escapeHtml(appointment.name)},<br>Ihr Termin wurde erfolgreich bestätigt!</p>
      </div>
      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:20px 25px;margin-bottom:25px">
        ${detailRows(
          [
            { icon: '✂️', label: 'Service', value: appointment.service.name, color: '#f59e0b' },
            { icon: '📅', label: 'Datum', value: appointment.date, color: '#3b82f6' },
            { icon: '🕐', label: 'Uhrzeit', value: appointment.time, color: '#10b981' },
            { icon: '⏱️', label: 'Dauer', value: `${duration} Minuten`, color: '#8b5cf6' },
          ],
          '#e2e8f0',
          '#64748b'
        )}
      </div>
      ${
        notes
          ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:12px;padding:15px;margin-bottom:20px">
               <p style="margin:0 0 4px 0;font-size:11px;color:#92400e;font-weight:600">Ihre Hinweise:</p>
               <p style="margin:0;font-size:13px;color:#78350f;line-height:1.4">${notes}</p>
             </div>`
          : ''
      }
      <p style="text-align:center;margin:0 0 25px 0;font-size:14px;color:#1e293b;font-weight:700">Wir freuen uns auf Ihren Besuch! 🎉</p>`,
  })

  await transport.transporter.sendMail({
    from: transport.from,
    replyTo: transport.replyTo,
    to: appointment.email,
    subject: `Terminbestätigung ${appointment.date} ${appointment.time}`,
    text,
    html,
  })
}

export async function sendCancellationEmail(appointment: Appointment): Promise<void> {
  const transport = getTransport()
  if (!transport) return

  const duration = appointment.service?.duration ?? 30

  const text =
    `Hallo ${appointment.name},\n\n` +
    `Ihr Termin wurde abgesagt.\n` +
    `Service: ${appointment.service.name}\n` +
    `Datum: ${appointment.date}\n` +
    `Uhrzeit: ${appointment.time}\n` +
    `\nEinen neuen Termin können Sie jederzeit unter ${SITE_URL}/booking buchen.\n` +
    `\nMit freundlichen Grüßen\n${SALON_NAME}`

  const html = layout({
    title: 'Termin abgesagt',
    headerColor: 'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)',
    subtitle: 'Termin abgesagt',
    body: `
      <div style="text-align:center;margin-bottom:25px">
        <h2 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;font-weight:700">Termin abgesagt</h2>
        <p style="margin:0;font-size:14px;color:#64748b;line-height:1.5">Hallo ${escapeHtml(appointment.name)},<br>Ihr Termin wurde abgesagt.</p>
      </div>
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:12px;padding:20px 25px;margin-bottom:25px">
        ${detailRows(
          [
            { icon: '✂️', label: 'Service', value: appointment.service.name, color: '#dc2626' },
            { icon: '📅', label: 'Datum', value: appointment.date, color: '#3b82f6' },
            { icon: '🕐', label: 'Uhrzeit', value: appointment.time, color: '#10b981' },
            { icon: '⏱️', label: 'Geplante Dauer', value: `${duration} Minuten`, color: '#8b5cf6' },
          ],
          '#fca5a5',
          '#991b1b'
        )}
      </div>
      <div style="text-align:center;margin-bottom:25px">
        <a href="${SITE_URL}/booking" style="display:inline-block;background:#f59e0b;border-radius:50px;padding:12px 24px;font-size:14px;color:#ffffff;font-weight:700;text-decoration:none">Neuen Termin buchen</a>
      </div>`,
  })

  await transport.transporter.sendMail({
    from: transport.from,
    replyTo: transport.replyTo,
    to: appointment.email,
    subject: `Termin abgesagt – ${appointment.date} ${appointment.time}`,
    text,
    html,
  })
}
