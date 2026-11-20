// Ein gemeinsamer Leistungskatalog für Leistungsseite, Buchung und API,
// damit Preise und Dauer überall übereinstimmen.

export type Service = {
  id: number
  name: string
  price: string
  duration: number // Minuten
  description: string
}

export const SERVICES: Service[] = [
  { id: 1, name: 'Herrenhaarschnitt', price: '€15', duration: 30, description: 'Präziser Herrenhaarschnitt – klassisch oder modern' },
  { id: 2, name: 'Herrenhaarschnitt mit Waschen', price: '€20', duration: 30, description: 'Herrenhaarschnitt inklusive Haarwäsche' },
  { id: 3, name: 'Kinderhaarschnitt', price: '€15', duration: 30, description: 'Entspannter Haarschnitt für Kinder' },
  { id: 4, name: 'Kinderhaarschnitt mit Waschen', price: '€18', duration: 30, description: 'Kinderhaarschnitt inklusive Haarwäsche' },
  { id: 5, name: 'Bart Styling', price: '€12', duration: 30, description: 'Bartformung, Konturen und Pflege' },
  { id: 6, name: 'Gesichtsreinigung', price: '€15', duration: 30, description: 'Reinigung und Pflege für die Gesichtshaut' },
]

export function getServiceByName(name: string): Service | undefined {
  return SERVICES.find(service => service.name === name)
}
