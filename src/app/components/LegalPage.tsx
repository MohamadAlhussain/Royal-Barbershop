import type { ReactNode } from 'react'
import Footer from './Footer'

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="pt-32 pb-8 px-4 bg-gradient-to-b from-gray-900 to-black">
        <div className="container-max text-center">
          <h1 className="heading-primary mb-4 fade-in">{title}</h1>
        </div>
      </section>
      <section className="pb-24 px-4 bg-black">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-amber-500/10 border border-amber-400/40 text-amber-100 px-6 py-4 rounded-2xl text-sm leading-relaxed">
            <strong className="block text-amber-300 mb-1">Konzept-Demo</strong>
            Diese Website ist eine Konzept-Demo von LEXERNO. Der dargestellte „Royal Barbershop“, sein Team, seine
            Adresse, Telefonnummer, Zahlen und Bewertungen sind frei erfunden. Ähnlichkeiten mit realen Salons oder
            Personen sind nicht beabsichtigt. Alle Bilder sind digital erzeugt. Es werden keine Termine vergeben.
          </div>
          <div className="card space-y-8 text-body [&_h2]:heading-tertiary [&_h2]:text-amber-400 [&_h2]:mb-3 [&_a]:text-amber-400 [&_a]:underline [&_a]:underline-offset-4">
            {children}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
