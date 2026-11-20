import type { Metadata } from 'next'
import LegalPage from '../components/LegalPage'

export const metadata: Metadata = { title: 'Impressum – Royal Barbershop' }

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <div>
        <h2>Anbieter dieser Website</h2>
        <p>
          Verantwortlich für Inhalt und Betrieb dieser Website ist LEXERNO. Die vollständigen Angaben nach § 5 DDG finden
          Sie im{' '}
          <a href="https://lexerno.com/impressum" target="_blank" rel="noopener">
            Impressum von LEXERNO
          </a>
          .
        </p>
      </div>
      <div>
        <h2>Haftung für Inhalte</h2>
        <p>
          Die Inhalte dieser Demo dienen ausschließlich der Darstellung gestalterischer und technischer Möglichkeiten,
          zum Beispiel einer Online-Terminbuchung. Es werden keine Friseurleistungen angeboten.
        </p>
      </div>
    </LegalPage>
  )
}
