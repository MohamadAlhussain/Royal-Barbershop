import type { Metadata } from 'next'
import LegalPage from '../components/LegalPage'

export const metadata: Metadata = { title: 'Datenschutz – Royal Barbershop' }

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <div>
        <h2>Keine Datenerhebung durch die Demo</h2>
        <p>
          Das Buchungsformular dieser Demo sendet keine Daten. Ihre Eingaben verlassen Ihren Browser nicht und werden
          weder gespeichert noch per E-Mail versendet. Es werden keine Cookies gesetzt und keine Analyse- oder
          Tracking-Dienste eingesetzt.
        </p>
      </div>
      <div>
        <h2>Hosting</h2>
        <p>
          Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Zugriffsdaten (z. B. IP-Adresse, Zeitpunkt,
          aufgerufene Seite). Einzelheiten finden Sie in der{' '}
          <a href="https://lexerno.com/datenschutz" target="_blank" rel="noopener">
            Datenschutzerklärung von LEXERNO
          </a>
          .
        </p>
      </div>
      <div>
        <h2>Externe Links</h2>
        <p>
          Links zu Google Maps öffnen sich in einem neuen Tab. Erst dann gelten die Datenschutzbestimmungen von Google.
        </p>
      </div>
    </LegalPage>
  )
}
