// Verfügbare Schlagzeugbücher für Dropdown
// Basierend auf den bereits verwendeten Büchern in der Datenbank

export const DRUM_BOOKS = [
  '',  // Leer-Option
  'Schule für Snaredrum/Drumset 1',
  'Schule für Snaredrum/Drumset 2', 
  'Moder Drumming 1',
  'Kräsch, Bumm, Bäng',
  
  // Weitere übliche Schlagzeugbücher
  'Moder Drumming 2',
  'Stick Control',
  'Syncopation',
  'The New Breed',
  'Linear Playing',
  'Advanced Techniques',
  'Groove Essentials',
  'Coordination',
  'Rudiments',
  'Fill Power',
  'Rock Drumming',
  'Jazz Drumming',
  'Drum Techniques',
  'Modern Drummer',
  'Beats & Fills',
] as const

export type DrumBook = typeof DRUM_BOOKS[number]

// Helper: Buch-Namen für Display formatieren
export function formatBookName(book: string): string {
  if (!book) return 'Kein Buch ausgewählt'
  return book
}

// Helper: Prüft ob Buch in der Liste ist
export function isValidBook(book: string): boolean {
  return DRUM_BOOKS.includes(book as DrumBook)
}