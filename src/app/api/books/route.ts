import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Alle Schüler aus Baserow laden
    const response = await fetch(
      'https://baserow.mb-smartsystems.de/api/database/rows/table/831/',
      {
        headers: {
          'Authorization': 'Token 3jzvKnX08FXtXMtFNweGRaMoJHhDQFeb',
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    // Alle verwendeten Bücher extrahieren
    const books = data.results
      .map((student: any) => student.field_7835) // Buch-Feld
      .filter((book: string) => book && book.trim()) // Nur gefüllte Bücher
      .filter((book: string, index: number, array: string[]) => 
        array.indexOf(book) === index // Duplikate entfernen
      )
      .sort() // Alphabetisch sortieren
    
    return NextResponse.json({ 
      success: true,
      books,
      count: books.length 
    })
    
  } catch (error) {
    console.error('Fehler beim Laden der Bücher:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      books: [] // Fallback
    }, { status: 500 })
  }
}