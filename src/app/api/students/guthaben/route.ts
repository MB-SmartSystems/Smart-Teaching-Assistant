import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const TABLE_ID = '831'

/**
 * POST /api/students/guthaben
 * Body: { studentId: number }
 *
 * Liest Unterrichtsdauer_Min des Schülers und addiert die Minuten
 * zu Guthaben_Minuten in Baserow (Lehrerabsage-Guthaben).
 *
 * Sicherheitshinweis: BASEROW_TOKEN bleibt server-side, niemals im Client.
 */
export async function POST(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  let studentId: number
  try {
    const body = await request.json()
    studentId = body.studentId
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: 'studentId muss eine positive Ganzzahl sein' }, { status: 400 })
  }

  const headers = {
    'Authorization': `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json',
  }

  // 1. Schüler mit user_field_names=true laden (einfacherer Feldzugriff)
  const getRes = await fetch(
    `${BASEROW_BASE_URL}/api/database/rows/table/${TABLE_ID}/${studentId}/?user_field_names=true`,
    { headers }
  )

  if (!getRes.ok) {
    return NextResponse.json({ error: 'Schüler nicht gefunden' }, { status: 404 })
  }

  const schueler = await getRes.json()

  // 2. Unterrichtsdauer ermitteln
  const dauerOption = schueler['Unterrichtsdauer_Min']

  if (!dauerOption || !dauerOption.value) {
    return NextResponse.json(
      { error: 'Keine Unterrichtsdauer hinterlegt – bitte zuerst in der Schülerkarte festlegen.' },
      { status: 400 }
    )
  }

  let minuten = 0
  switch (dauerOption.value) {
    case '30': minuten = 30; break
    case '45': minuten = 45; break
    case '60': minuten = 60; break
    default:
      return NextResponse.json(
        { error: `Unterrichtsdauer "${dauerOption.value}" kann nicht gutgeschrieben werden – bitte 30, 45 oder 60 Min einstellen.` },
        { status: 400 }
      )
  }

  // 3. Aktuelles Guthaben lesen
  const altesGuthaben = Number(schueler['Guthaben_Minuten'] ?? 0)
  const neuesGuthaben = altesGuthaben + minuten

  // 4. Guthaben in Baserow speichern
  const patchRes = await fetch(
    `${BASEROW_BASE_URL}/api/database/rows/table/${TABLE_ID}/${studentId}/?user_field_names=true`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 'Guthaben_Minuten': neuesGuthaben }),
    }
  )

  if (!patchRes.ok) {
    return NextResponse.json({ error: 'Fehler beim Speichern des Guthabens in Baserow' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    minuten,
    altesGuthaben,
    neuesGuthaben,
  })
}
