import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from './components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL("https://friseur.lexerno.com"),
  title: "Royal Barbershop Potsdam – Herrenfrisuren & Bartpflege",
  description: "Konzept-Demo von LEXERNO: Website eines fiktiven Barbershops in Potsdam mit Online-Terminbuchung. Kein realer Salon, keine echten Termine.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Royal Barbershop – Konzept-Demo von LEXERNO",
    description: "Website eines fiktiven Barbershops mit Online-Terminbuchung – Design & Entwicklung: LEXERNO.",
    siteName: "Royal Barbershop (Konzept-Demo)",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/barber-1.webp", alt: "Barbershop-Interieur (digital erzeugtes Bild)" }],
  },
  manifest: "/manifest.json",
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <Navigation />
        {children}
      </body>
    </html>
  )
}
