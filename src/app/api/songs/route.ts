import { NextRequest, NextResponse } from 'next/server'

const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const SONG_TABLE_ID = 899

// GET: alle Songs laden
export async function GET() {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Config missing' }, { status: 500 })
  }
  try {
    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${SONG_TABLE_ID}/?user_field_names=false&size=200&order_by=field_8801`,
      { headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }, cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`Baserow error: ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data.results || [])
  } catch (e) {
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

// POST: neuen Song anlegen
export async function POST(req: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Config missing' }, { status: 500 })
  }
  try {
    const body = await req.json()
    const { titel, interpret, schwierigkeit, buch, mindest_seite, mindest_uebung, reihenfolge } = body
    if (!titel || !interpret || !buch) {
      return NextResponse.json({ error: 'Titel, Interpret und Buch sind Pflichtfelder' }, { status: 400 })
    }
    const payload: Record<string, unknown> = {
      field_8795: String(titel).slice(0, 500),
      field_8796: String(interpret).slice(0, 500),
      field_8798: String(buch).slice(0, 500),
      field_8799: Number(mindest_seite) || 1,
      field_8800: Number(mindest_uebung) || 1,
      field_8801: Number(reihenfolge) || 0,
    }
    // Schwierigkeit als Single-Select (Wert-String)
    if (schwierigkeit) {
      payload['field_8797'] = { value: schwierigkeit }
    }
    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${SONG_TABLE_ID}/?user_field_names=false`,
      {
        method: 'POST',
        headers: { 'Authorization': `Token ${BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }
    const created = await res.json()
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}

// PATCH: Song aktualisieren
export async function PATCH(req: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Config missing' }, { status: 500 })
  }
  try {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
    }
    const payload: Record<string, unknown> = {}
    if (fields.titel !== undefined) payload['field_8795'] = String(fields.titel).slice(0, 500)
    if (fields.interpret !== undefined) payload['field_8796'] = String(fields.interpret).slice(0, 500)
    if (fields.schwierigkeit !== undefined) payload['field_8797'] = { value: fields.schwierigkeit }
    if (fields.buch !== undefined) payload['field_8798'] = String(fields.buch).slice(0, 500)
    if (fields.mindest_seite !== undefined) payload['field_8799'] = Number(fields.mindest_seite) || 1
    if (fields.mindest_uebung !== undefined) payload['field_8800'] = Number(fields.mindest_uebung) || 1
    if (fields.reihenfolge !== undefined) payload['field_8801'] = Number(fields.reihenfolge) || 0
    const res = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${SONG_TABLE_ID}/${id}/?user_field_names=false`,
      {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: 'Fehler beim Update' }, { status: 500 })
  }
}
