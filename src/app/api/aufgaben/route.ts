import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const AUFGABEN_TABLE_ID = "879"

const headers = () => ({
  'Authorization': `Token ${BASEROW_TOKEN}`,
  'Content-Type': 'application/json'
})

// GET: Alle Aufgaben laden
export async function GET() {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${AUFGABEN_TABLE_ID}/?user_field_names=true&size=200`,
      { headers: headers(), cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error(`Baserow API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data.results)
  } catch (error) {
    console.error('Fehler beim Laden der Aufgaben:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Aufgaben' }, { status: 500 })
  }
}

// POST: Neue Aufgabe erstellen
export async function POST(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { titel, beschreibung, typ, prioritaet, schueler_id, faellig_am } = body

    if (!titel || typeof titel !== 'string') {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {
      Titel: titel,
      Status: 3859, // Offen
      Erstellt_am: new Date().toISOString().split('T')[0],
    }

    if (beschreibung) payload.Beschreibung = beschreibung
    if (typ) payload.Typ = typ // Option-ID
    if (prioritaet) payload.Priorität = prioritaet // Option-ID
    if (schueler_id) payload.Verknüpfung_Schueler = [schueler_id]
    if (faellig_am) payload.Fällig_am = faellig_am

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${AUFGABEN_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Baserow Create Error:', errorText)
      return NextResponse.json({ error: 'Fehler beim Erstellen', details: errorText }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Fehler beim Erstellen der Aufgabe:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Aufgabe' }, { status: 500 })
  }
}

// PATCH: Aufgabe aktualisieren
export async function PATCH(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { aufgabeId, updates } = body

    if (!aufgabeId || !Number.isInteger(aufgabeId) || aufgabeId <= 0) {
      return NextResponse.json({ error: 'Ungültige Aufgaben-ID' }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates sind erforderlich' }, { status: 400 })
    }

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${AUFGABEN_TABLE_ID}/${aufgabeId}/?user_field_names=true`,
      {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(updates)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Baserow Update Error:', errorText)
      return NextResponse.json({ error: 'Fehler beim Update', details: errorText }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Aufgabe:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}
