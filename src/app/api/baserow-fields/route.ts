import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN

// GET: Lade single_select Felder mit Optionen für eine Tabelle
export async function GET(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  const tableId = request.nextUrl.searchParams.get('table_id')
  if (!tableId) {
    return NextResponse.json({ error: 'table_id Parameter fehlt' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/fields/table/${tableId}/`,
      {
        headers: { 'Authorization': `Token ${BASEROW_TOKEN}` },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      throw new Error(`Baserow API Error: ${response.status}`)
    }

    const fields = await response.json()

    // Nur single_select Felder mit ihren Optionen zurückgeben
    const selectFields = fields
      .filter((f: Record<string, unknown>) => f.type === 'single_select')
      .map((f: Record<string, unknown>) => ({
        id: f.id,
        name: f.name,
        options: (f.select_options as Array<{ id: number; value: string; color: string }>) || []
      }))

    return NextResponse.json(selectFields)
  } catch (error) {
    console.error('Fehler beim Laden der Felder:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Felder' }, { status: 500 })
  }
}

// POST: Neue Option zu einem single_select Feld hinzufügen
export async function POST(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { fieldId, optionName, color } = body

    if (!fieldId || !optionName) {
      return NextResponse.json({ error: 'fieldId und optionName sind erforderlich' }, { status: 400 })
    }

    // 1. Aktuelles Feld laden
    const fieldRes = await fetch(
      `${BASEROW_BASE_URL}/api/database/fields/${fieldId}/`,
      { headers: { 'Authorization': `Token ${BASEROW_TOKEN}` } }
    )

    if (!fieldRes.ok) {
      throw new Error(`Feld ${fieldId} nicht gefunden`)
    }

    const field = await fieldRes.json()

    // 2. Neue Option hinzufügen
    const updatedOptions = [
      ...field.select_options,
      { value: optionName, color: color || 'blue' }
    ]

    // 3. Feld updaten
    const updateRes = await fetch(
      `${BASEROW_BASE_URL}/api/database/fields/${fieldId}/`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ select_options: updatedOptions })
      }
    )

    if (!updateRes.ok) {
      const errorText = await updateRes.text()
      console.error('Baserow Update Error:', errorText)
      return NextResponse.json({ error: 'Fehler beim Hinzufügen der Option', details: errorText }, { status: 502 })
    }

    const updated = await updateRes.json()
    const newOption = updated.select_options.find(
      (o: { value: string }) => o.value === optionName
    )

    return NextResponse.json({ success: true, option: newOption })
  } catch (error) {
    console.error('Fehler beim Erstellen der Option:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Option' }, { status: 500 })
  }
}
