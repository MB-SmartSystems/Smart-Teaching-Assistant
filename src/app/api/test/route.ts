import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(
      'https://baserow.mb-smartsystems.de/api/database/rows/table/831/?page_size=1',
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
    
    return NextResponse.json({ 
      success: true,
      count: data.count,
      firstStudent: data.results[0]?.field_7818 || 'Keine Schüler gefunden'
    })
    
  } catch (error) {
    console.error('Baserow API Test Fehler:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}