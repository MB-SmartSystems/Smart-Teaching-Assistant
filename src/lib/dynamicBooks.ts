// Dynamische Bücher-Verwaltung
// Neue Bücher werden global gespeichert und für alle Schüler verfügbar

// Bücher aus Baserow API laden (fresh data)
export async function fetchBooksFromDatabase(): Promise<string[]> {
  try {
    const response = await fetch('/api/books')
    if (!response.ok) throw new Error('API Error')
    
    const data = await response.json()
    return data.books || []
  } catch (error) {
    console.warn('Fehler beim Laden der Bücher aus DB:', error)
    // Fallback auf Basis-Bücher
    return [
      'Schule für Snaredrum/Drumset 1',
      'Schule für Snaredrum/Drumset 2', 
      'Moder Drumming 1',
      'Kräsch, Bumm, Bäng',
    ]
  }
}

const CUSTOM_BOOKS_KEY = 'teaching_assistant_custom_books'

// Custom Books aus localStorage laden
export function getCustomBooks(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(CUSTOM_BOOKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Fehler beim Laden der Custom Books:', error)
    return []
  }
}

// Custom Book hinzufügen
export function addCustomBook(bookName: string): void {
  if (typeof window === 'undefined') return
  
  const trimmedName = bookName.trim()
  if (!trimmedName) return
  
  const customBooks = getCustomBooks()
  const allBooks = getAllBooks()
  
  // Prüfen ob Buch bereits existiert (case-insensitive)
  const bookExists = allBooks.some(book => 
    book.toLowerCase() === trimmedName.toLowerCase()
  )
  
  if (!bookExists) {
    const updatedCustomBooks = [...customBooks, trimmedName]
    localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(updatedCustomBooks))
  }
}

// Alle verfügbaren Bücher (DB + Custom) - Async Version
export async function getAllBooksAsync(): Promise<string[]> {
  const dbBooks = await fetchBooksFromDatabase()
  const customBooks = getCustomBooks()
  
  // Kombinieren und sortieren
  const allBooks = [...dbBooks, ...customBooks]
  return [...new Set(allBooks)].sort()
}

// Synchrone Version für backwards compatibility (verwendet Cache)
export function getAllBooks(): string[] {
  const customBooks = getCustomBooks()
  
  // Fallback Basis-Bücher + Custom
  const fallbackBooks = [
    'Schule für Snaredrum/Drumset 1',
    'Schule für Snaredrum/Drumset 2', 
    'Moder Drumming 1',
    'Kräsch, Bumm, Bäng',
  ]
  
  const allBooks = [...fallbackBooks, ...customBooks]
  return [...new Set(allBooks)].sort()
}

// Vollständige Dropdown-Liste mit Leer-Option
export function getBookDropdownOptions(): string[] {
  return ['', ...getAllBooks()]
}

// Prüfen ob ein Buch custom ist (für UI-Hinweise)
export function isCustomBook(bookName: string): boolean {
  return getCustomBooks().includes(bookName)
}

// Custom Book entfernen (falls mal nötig)
export function removeCustomBook(bookName: string): void {
  if (typeof window === 'undefined') return
  
  const customBooks = getCustomBooks()
  const filtered = customBooks.filter(book => book !== bookName)
  localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(filtered))
}

// Custom Book Namen bearbeiten (bei Schreibfehlern etc.)
export function updateCustomBook(oldName: string, newName: string): boolean {
  if (typeof window === 'undefined') return false
  
  const trimmedNewName = newName.trim()
  if (!trimmedNewName) return false
  
  const customBooks = getCustomBooks()
  const oldBookIndex = customBooks.findIndex(book => book === oldName)
  
  // Nur Custom Books können bearbeitet werden
  if (oldBookIndex === -1) return false
  
  // Prüfen ob neuer Name bereits existiert
  const allBooks = getAllBooks()
  const nameExists = allBooks.some(book => 
    book.toLowerCase() === trimmedNewName.toLowerCase() && book !== oldName
  )
  
  if (nameExists) return false
  
  // Name aktualisieren
  const updatedCustomBooks = [...customBooks]
  updatedCustomBooks[oldBookIndex] = trimmedNewName
  localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(updatedCustomBooks))
  
  return true
}

// Stats für Debug/Info
export function getBookStats() {
  const fallbackBaseBooks = [
    'Schule für Snaredrum/Drumset 1',
    'Schule für Snaredrum/Drumset 2', 
    'Moder Drumming 1',
    'Kräsch, Bumm, Bäng',
  ]
  
  return {
    baseBooks: fallbackBaseBooks.length,
    customBooks: getCustomBooks().length,
    totalBooks: getAllBooks().length,
    customBooksList: getCustomBooks()
  }
}