import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const TABLE_ID = '831'

/**
 * POST /api/students/guthaben-update
 * Body: { studentId: number, neuesGuthaben: number }
 *
 * Schreibt neues Guthaben direkt in Baserow (field_8172 / Guthaben_Minuten).
 * Wird für Guthaben-Abzug nach nachgeholten Stunden verwendet.
 */
export async function POST(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  let studentId: number
  let neuesGuthaben: number
  try {
    const body = await request.json()
    studentId = body.studentId
    neuesGuthaben = body.neuesGuthaben
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: 'studentId muss eine positive Ganzzahl sein' }, { status: 400 })
  }

  if (typeof neuesGuthaben !== 'number' || neuesGuthaben < 0) {
    return NextResponse.json({ error: 'neuesGuthaben muss eine nicht-negative Zahl sein' }, { status: 400 })
  }

  const headers = {
    'Authorization': `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const patchRes = await fetch(
    `${BASEROW_BASE_URL}/api/database/rows/table/${TABLE_ID}/${studentId}/?user_field_names=true`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 'Guthaben_Minuten': neuesGuthaben }),
    }
  )

  if (!patchRes.ok) {
    return NextResponse.json({ error: 'Fehler beim Speichern in Baserow' }, { status: 500 })
  }

  return NextResponse.json({ success: true, neuesGuthaben })
}
